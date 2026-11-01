import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { HostProfile, Profile, TeamRole } from "./database.types";
import { ALL_PERMISSIONS, type PermissionKey } from "./permissions";
import { passwordErrorCopy } from "./password";

// ---------------------------------------------------------------------------
// Spot details any team member may read (SHR-L04-01)
// ---------------------------------------------------------------------------
// Signed-in users can only select these host_profiles columns. Bank, legal and
// WhatsApp details come from host_private_details(): the owner and staff with
// payouts.view get the bank details, only the owner gets the legal name,
// registration number and WhatsApp number (D-060).

const HOST_PROFILE_COLUMNS = [
  "user_id, slug, display_name, bio, hero_url, city, host_type, social_links, notification_prefs",
  "address, address_number, lat, lng, location_place_id, location_json",
  "kyc_status, kyc_rejection_reason, verified, verified_at, response_rate",
  "suspended, suspended_at, suspended_reason, payouts_frozen, payouts_frozen_at, payouts_paused",
  "bank_account_verified, whatsapp_verified_at",
  "tradesafe_status, tradesafe_ready_at, tradesafe_token_created_at, tradesafe_verified, tradesafe_verified_at",
  "created_at, updated_at",
].join(", ");

async function withPrivateDetails(hp: HostProfile, allowed: boolean): Promise<HostProfile> {
  if (!allowed) return hp;
  const { data, error } = await (
    supabase as unknown as {
      rpc: (
        f: string,
        a: Record<string, unknown>,
      ) => Promise<{ data: Partial<HostProfile> | null; error: { message: string } | null }>;
    }
  ).rpc("host_private_details", { p_host_id: hp.user_id });
  if (error) console.error("[auth] host_private_details failed:", error);
  return { ...hp, ...(data ?? {}) };
}

// ---------------------------------------------------------------------------
// Sign-out after 14 days without use (D-059)
// ---------------------------------------------------------------------------
// The Free plan can't time-box sessions on the server, so the Engine does it:
// every visit and interaction stamps this device; a session found more than 14
// days after the last stamp is signed out before anything loads.

const LAST_ACTIVE_KEY = "trove:last-active";
const IDLE_LIMIT_MS = 14 * 24 * 60 * 60 * 1000;
const STAMP_EVERY_MS = 5 * 60 * 1000;
/** Shown once on the next screen after the app signs someone out by itself. */
export const SIGNED_OUT_NOTICE_KEY = "trove:signed-out-notice";

function readLastActive(): number | null {
  try {
    const value = Number(localStorage.getItem(LAST_ACTIVE_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function stampActive(force = false) {
  try {
    const last = readLastActive();
    if (force || !last || Date.now() - last > STAMP_EVERY_MS) {
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    }
  } catch {
    // Storage blocked (private mode): the idle rule just doesn't apply.
  }
}

function idleTooLong(): boolean {
  const last = readLastActive();
  return last !== null && Date.now() - last > IDLE_LIMIT_MS;
}

function leaveNotice(message: string) {
  try {
    sessionStorage.setItem(SIGNED_OUT_NOTICE_KEY, message);
  } catch {
    // ignore
  }
}

// supabase-js keeps the session when the logout request fails (no signal),
// with any scope: it returns the error before removing the stored session.
// Drop this device's copy ourselves; the caller reloads so the client starts
// from the cleared cookies.
function forgetSessionOnThisDevice() {
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (name?.startsWith("sb-") && name.includes("-auth-token")) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    }
  }
  try {
    localStorage.removeItem(LAST_ACTIVE_KEY);
  } catch {
    // ignore
  }
}

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
  /** Settings: needs the current password (Supabase checks it). /reset-password doesn't, it has the recovery link. */
  updatePassword: (currentPassword: string, password: string) => Promise<{ error: string | null }>;
  /** Signs out everywhere; if the request fails, at least this device is signed out (page reloads). */
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
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let loadedForUserId: string | null = null;

    const safetyTimeout = setTimeout(() => {
      if (!cancelled) setIsLoading(false);
    }, 8000);

    // Email links (/reset-password, /auth/confirm) sign the user in on purpose,
    // so an old stamp must not sign them straight back out.
    const fromEmailLink = /^\/(reset-password|auth\/confirm)/.test(window.location.pathname);

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (cancelled) return;
        if (session && !fromEmailLink && idleTooLong()) {
          leaveNotice(
            "You were signed out because this device hadn't used TROVE Engine for 14 days. Sign in again to continue.",
          );
          const { error } = await supabase.auth.signOut({ scope: "local" });
          if (error) {
            forgetSessionOnThisDevice();
            window.location.reload();
            return;
          }
          if (cancelled) return;
          session = null;
        } else if (session) {
          stampActive(fromEmailLink);
        }
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
        // Nothing from the last user (bookings, guests, revenue) stays in memory.
        if (event === "SIGNED_OUT") queryClient.clear();
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // D-059: keep stamping while the host uses the app; a tab left open for 14
  // days is signed out the moment it's looked at again.
  const signedIn = !!session;
  useEffect(() => {
    if (!signedIn) return;
    const onActivity = () => stampActive();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (idleTooLong()) {
        leaveNotice(
          "You were signed out because this device hadn't used TROVE Engine for 14 days. Sign in again to continue.",
        );
        void supabase.auth.signOut({ scope: "local" }).then(({ error }) => {
          if (error) forgetSessionOnThisDevice();
          window.location.replace("/");
        });
        return;
      }
      stampActive();
    };
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [signedIn]);

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
      .select(`host_id, role, permissions, status, host_profiles(${HOST_PROFILE_COLUMNS})`)
      .eq("member_user_id", userId)
      .eq("status", "active");
    if (error) console.error("[auth] memberships fetch failed:", error);

    const rows = ((data ?? []) as unknown as MembershipRow[]).filter(
      (row) => row.host_profiles && row.host_id !== own?.user_id, // own spot wins
    );
    const profiles = await Promise.all(
      rows.map((row) =>
        withPrivateDetails(row.host_profiles!, (row.permissions ?? []).includes("payouts.view")),
      ),
    );
    rows.forEach((row, i) => {
      list.push({
        hostId: row.host_id,
        hostProfile: profiles[i],
        role: row.role,
        permissions: row.permissions ?? [],
        isOwner: false,
        label: workspaceLabel(profiles[i], "Team spot"),
      });
    });

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
          .select(HOST_PROFILE_COLUMNS)
          .eq("user_id", userId)
          .maybeSingle();
        if (hpErr) console.error("[auth] host_profiles fetch failed:", hpErr);
        own = hp ? await withPrivateDetails(hp as unknown as HostProfile, true) : null;
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
    if (!error) stampActive(true);
    const unconfirmed =
      !!error &&
      (error.code === "email_not_confirmed" || /email not confirmed/i.test(error.message));
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
    if (error)
      return {
        error: passwordErrorCopy(error.message),
        needsCode: false,
        alreadyRegistered: false,
      };
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
    if (!error) stampActive(true);
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

  const updatePassword = async (currentPassword: string, password: string) => {
    // Supabase refuses a password change without the current one (SHR-L04-05);
    // only a recovery link skips it.
    const { error } = await supabase.auth.updateUser({
      password,
      current_password: currentPassword,
    });
    return { error: error ? passwordErrorCopy(error.message, error.code) : null };
  };

  const signOut = async () => {
    let failed = false;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("[auth] sign-out failed:", error);
        failed = true;
      }
    } catch (error) {
      console.error("[auth] sign-out threw:", error);
      failed = true;
    }
    queryClient.clear();
    if (!failed) {
      try {
        localStorage.removeItem(LAST_ACTIVE_KEY);
      } catch {
        // ignore
      }
      return;
    }
    // ENG-L04-03: the request didn't reach TROVE. Sign this device out anyway
    // and say so: the session may still be live on other devices.
    forgetSessionOnThisDevice();
    leaveNotice(
      "Signed out on this device. We couldn't reach TROVE, so you may still be signed in on other devices. Sign in and out again when you're back online.",
    );
    window.location.replace("/");
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
