import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { HostProfile, Profile, TeamRole } from "./database.types";
import { ALL_PERMISSIONS, type PermissionKey } from "./permissions";

// ---------------------------------------------------------------------------
// Workspace model
// ---------------------------------------------------------------------------
// A "workspace" is a Spot the signed-in user can act in: either their own spot
// (they are the owner) or a spot they were added to as a team member. The
// active workspace drives every host-scoped query in the app.

export const ACTIVE_WORKSPACE_KEY = "trove:active-workspace";

export interface Workspace {
  hostId: string; // host_profiles.user_id (= host_id on listings, payouts, …)
  hostProfile: HostProfile;
  role: TeamRole | "owner";
  permissions: string[]; // owner => all permissions
  isOwner: boolean;
  label: string;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** The user's OWN spot (for onboarding / owner-only flows). Null for pure members. */
  ownHostProfile: HostProfile | null;
  /** The ACTIVE workspace's host profile — what host-scoped UI should read. */
  hostProfile: HostProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isHost: boolean;
  // Workspaces / permissions
  workspaces: Workspace[];
  activeHostId: string | null;
  activeRole: TeamRole | "owner" | null;
  permissions: Set<string>;
  isOwner: boolean;
  /** True when the user can reach a workspace (owns a spot or is a team member). */
  hasWorkspace: boolean;
  can: (perm: PermissionKey) => boolean;
  setActiveWorkspace: (hostId: string) => void;
  showAuthModal: boolean;
  /** Which tab the auth modal should open on (website links deep-link this). */
  authModalView: "signin" | "signup";
  openAuthModal: (view?: "signin" | "signup") => void;
  closeAuthModal: () => void;
  /** `unconfirmed` = right password but the sign-up code was never entered. */
  signInWithEmail: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; unconfirmed: boolean }>;
  /**
   * Create the account. `needsCode` is true when Supabase sent a sign-up code
   * (email confirmation on) — the caller must collect it via verifySignupCode.
   * `alreadyRegistered` means the email already has a confirmed account.
   */
  signUpWithEmail: (
    email: string,
    password: string,
    spotName: string,
  ) => Promise<{ error: string | null; needsCode: boolean; alreadyRegistered: boolean }>;
  /** Confirm a new account with the code from the sign-up email. Signs the user in. */
  verifySignupCode: (email: string, code: string) => Promise<{ error: string | null }>;
  /** Send the sign-up code again (also used when an unconfirmed user tries to sign in). */
  resendSignupCode: (email: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updateEmail: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

type MembershipRow = {
  host_id: string;
  role: TeamRole;
  permissions: string[] | null;
  status: string;
  host_profiles: HostProfile | null;
};

function workspaceLabel(hp: HostProfile | null, fallback: string): string {
  return hp?.display_name?.trim() || hp?.slug?.trim() || fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ownHostProfile, setOwnHostProfile] = useState<HostProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeHostId, setActiveHostId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalView, setAuthModalView] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    let cancelled = false;
    let loadedForUserId: string | null = null;

    const safetyTimeout = setTimeout(() => {
      if (!cancelled) setIsLoading(false);
    }, 8000);

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (cancelled) return;
        setSession(session);
        if (session) {
          loadedForUserId = session.user.id;
          fetchProfile(session.user.id, { showLoader: true });
        } else {
          setIsLoading(false);
          setShowAuthModal(false);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[auth] getSession failed:", error);
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      setSession(session);

      if (event === "PASSWORD_RECOVERY") {
        setShowAuthModal(false);
        setIsLoading(false);
        if (typeof window !== "undefined" && window.location.pathname !== "/reset-password") {
          window.location.replace("/reset-password");
        }
        return;
      }

      if (!session) {
        setProfile(null);
        setOwnHostProfile(null);
        setWorkspaces([]);
        setActiveHostId(null);
        setIsLoading(false);
        // Only a real sign-out should close the modal. INITIAL_SESSION also
        // lands here with a null session and must not stomp a modal that a
        // landing CTA or ?auth= deep link just opened.
        if (event === "SIGNED_OUT") setShowAuthModal(false);
        loadedForUserId = null;
        return;
      }

      setShowAuthModal(false);

      if (session.user.id !== loadedForUserId) {
        loadedForUserId = session.user.id;
        const userId = session.user.id;
        // Never call Supabase from inside this callback: supabase-js still holds
        // its auth lock while listeners run, and every query asks that same
        // lock for the access token. Querying here deadlocked
        // signInWithPassword / verifyOtp — the session was saved but the call
        // never resolved, so the modal sat on "Signing in…" forever.
        setTimeout(() => {
          if (!cancelled) void fetchProfile(userId, { showLoader: true });
        }, 0);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  async function loadWorkspaces(userId: string, own: HostProfile | null) {
    const list: Workspace[] = [];

    if (own) {
      list.push({
        hostId: own.user_id,
        hostProfile: own,
        role: "owner",
        permissions: [...ALL_PERMISSIONS],
        isOwner: true,
        label: workspaceLabel(own, "My spot"),
      });
    }

    const { data, error } = await supabase
      .from("host_team_members")
      .select("host_id, role, permissions, status, host_profiles(*)")
      .eq("member_user_id", userId)
      .eq("status", "active");
    if (error) console.error("[auth] memberships fetch failed:", error);

    for (const row of (data ?? []) as unknown as MembershipRow[]) {
      if (!row.host_profiles) continue;
      if (list.some((w) => w.hostId === row.host_id)) continue; // own spot wins
      list.push({
        hostId: row.host_id,
        hostProfile: row.host_profiles,
        role: row.role,
        permissions: row.permissions ?? [],
        isOwner: false,
        label: workspaceLabel(row.host_profiles, "Team spot"),
      });
    }

    setWorkspaces(list);

    // Reconcile the active workspace against the available set.
    setActiveHostId((current) => {
      const stored =
        typeof window !== "undefined" ? localStorage.getItem(ACTIVE_WORKSPACE_KEY) : null;
      const candidates = [current, stored, own?.user_id ?? null, list[0]?.hostId ?? null];
      const next = candidates.find((id) => id && list.some((w) => w.hostId === id)) ?? null;
      if (next && typeof window !== "undefined") localStorage.setItem(ACTIVE_WORKSPACE_KEY, next);
      return next;
    });
  }

  async function fetchProfile(userId: string, opts: { showLoader?: boolean } = {}) {
    if (opts.showLoader) setIsLoading(true);
    try {
      const { data: p, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (pErr) console.error("[auth] profiles fetch failed:", pErr);
      setProfile(p ?? null);

      let own: HostProfile | null = null;
      if (p?.is_host) {
        const { data: hp, error: hpErr } = await supabase
          .from("host_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        if (hpErr) console.error("[auth] host_profiles fetch failed:", hpErr);
        own = hp ?? null;
      }
      setOwnHostProfile(own);
      await loadWorkspaces(userId, own);
    } catch (error) {
      console.error("[auth] fetchProfile threw:", error);
    } finally {
      if (opts.showLoader) setIsLoading(false);
    }
  }

  const setActiveWorkspace = (hostId: string) => {
    setActiveHostId((current) => {
      if (!workspaces.some((w) => w.hostId === hostId)) return current;
      if (typeof window !== "undefined") localStorage.setItem(ACTIVE_WORKSPACE_KEY, hostId);
      return hostId;
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    const unconfirmed =
      !!error && (error.code === "email_not_confirmed" || /email not confirmed/i.test(error.message));
    return { error: error?.message ?? null, unconfirmed };
  };

  const signUpWithEmail = async (email: string, password: string, spotName: string) => {
    const trimmedSpotName = spotName.trim();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: trimmedSpotName, spot_name: trimmedSpotName },
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });
    if (error) return { error: error.message, needsCode: false, alreadyRegistered: false };
    // Supabase hides whether an email is taken: for an already-CONFIRMED
    // account it returns a user with no identities and sends nothing.
    const alreadyRegistered = !!data.user && (data.user.identities?.length ?? 0) === 0;
    return { error: null, needsCode: !data.session && !alreadyRegistered, alreadyRegistered };
  };

  const verifySignupCode = async (email: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "signup",
    });
    return { error: error?.message ?? null };
  };

  const resendSignupCode = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    });
    return { error: error?.message ?? null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  };

  const updateEmail = async (email: string) => {
    const { error } = await supabase.auth.updateUser(
      { email: email.trim() },
      { emailRedirectTo: `${window.location.origin}/settings` },
    );
    return { error: error?.message ?? null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (session) await fetchProfile(session.user.id);
  };

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.hostId === activeHostId) ?? null,
    [workspaces, activeHostId],
  );

  const permissions = useMemo(() => new Set(activeWorkspace?.permissions ?? []), [activeWorkspace]);

  const isOwner = activeWorkspace?.isOwner ?? false;
  const can = (perm: PermissionKey) => isOwner || permissions.has(perm);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        ownHostProfile,
        hostProfile: activeWorkspace?.hostProfile ?? null,
        isLoading,
        isAuthenticated: !!session,
        isHost: !!profile?.is_host,
        workspaces,
        activeHostId,
        activeRole: activeWorkspace?.role ?? null,
        permissions,
        isOwner,
        hasWorkspace: workspaces.length > 0,
        can,
        setActiveWorkspace,
        showAuthModal,
        authModalView,
        openAuthModal: (view = "signin") => {
          setAuthModalView(view);
          setShowAuthModal(true);
        },
        closeAuthModal: () => setShowAuthModal(false),
        signInWithEmail,
        signUpWithEmail,
        verifySignupCode,
        resendSignupCode,
        resetPassword,
        updateEmail,
        updatePassword,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
