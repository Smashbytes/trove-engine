import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { HostProfile, Profile } from "./database.types";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  hostProfile: HostProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isHost: boolean;
  showAuthModal: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    spotName: string,
  ) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Tracks which user we've already fetched the profile for, so that
    // background auth events (TOKEN_REFRESHED, USER_UPDATED, focus-triggered
    // re-emits) don't re-toggle the global loader and blank the page.
    let loadedForUserId: string | null = null;

    // Safety net: if Supabase never resolves (cold network, broken cookie,
    // service down), stop showing the loader after 8s so the user at least
    // sees the auth modal instead of an infinite spinner.
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

      // Recovery: Supabase fires PASSWORD_RECOVERY when the user lands on
      // the app via a reset-password email. Route them to the form.
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
        setHostProfile(null);
        setIsLoading(false);
        setShowAuthModal(false);
        loadedForUserId = null;
        return;
      }

      setShowAuthModal(false);

      // Re-fetch the profile only when the user identity actually changes
      // (sign in / account switch). TOKEN_REFRESHED, USER_UPDATED, and
      // tab-focus re-emits keep the same user id, and refetching there
      // was flipping `isLoading` back on and blanking the page with a
      // spinner every time the tab refocused.
      if (session.user.id !== loadedForUserId) {
        loadedForUserId = session.user.id;
        void fetchProfile(session.user.id, { showLoader: true });
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

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

      if (p?.is_host) {
        const { data: hp, error: hpErr } = await supabase
          .from("host_profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        if (hpErr) console.error("[auth] host_profiles fetch failed:", hpErr);
        setHostProfile(hp ?? null);
      } else {
        setHostProfile(null);
      }
    } catch (error) {
      console.error("[auth] fetchProfile threw:", error);
    } finally {
      if (opts.showLoader) setIsLoading(false);
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUpWithEmail = async (email: string, password: string, spotName: string) => {
    const trimmedSpotName = spotName.trim();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: trimmedSpotName, spot_name: trimmedSpotName },
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });
    return { error: error?.message ?? null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    // Caller-triggered refresh (e.g. after onboarding submit) — don't
    // toggle the global loader; let the caller manage its own UI.
    if (session) await fetchProfile(session.user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        hostProfile,
        isLoading,
        isAuthenticated: !!session,
        isHost: !!profile?.is_host,
        showAuthModal,
        openAuthModal: () => setShowAuthModal(true),
        closeAuthModal: () => setShowAuthModal(false),
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
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
