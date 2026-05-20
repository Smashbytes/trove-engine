import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/confirm")({
  head: () => ({ meta: [{ title: "Confirming your email · Trove Engine" }] }),
  component: AuthConfirmPage,
});

type Phase = "verifying" | "invalid";

function AuthConfirmPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("verifying");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handles the token-hash flow for signup confirmation and email-change
  // confirmation. The email template links here with
  // `?token_hash=…&type=signup&next=/onboarding`. We verify the OTP, then
  // route the user to `next` (or /onboarding by default).
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type") as
          | "signup"
          | "email"
          | "email_change"
          | "invite"
          | "magiclink"
          | null;
        const next = url.searchParams.get("next") ?? "/onboarding";

        if (!tokenHash || !type) {
          setErrorMsg("Confirmation link is missing required parameters.");
          setPhase("invalid");
          return;
        }

        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          // verifyOtp's type union covers signup/email/email_change/invite/magiclink/recovery.
          // We narrow above so TS is satisfied.
          type: type === "email_change" ? "email_change" : type,
        });
        if (cancelled) return;

        if (error) {
          console.error("[auth/confirm] verifyOtp failed:", error);
          setErrorMsg(error.message);
          setPhase("invalid");
          return;
        }

        // Safe redirect: only allow same-origin relative paths.
        const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/onboarding";
        navigate({ to: safeNext as "/onboarding" });
      } catch (e) {
        if (cancelled) return;
        console.error("[auth/confirm] unexpected error:", e);
        setErrorMsg(e instanceof Error ? e.message : "Unable to confirm email.");
        setPhase("invalid");
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,0,115,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(143,92,255,0.12),transparent_28%)]" />
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-25" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-full max-w-[420px] rounded-3xl border border-border/60 bg-card/95 p-8 shadow-card backdrop-blur-md sm:p-10"
      >
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand shadow-glow-sm">
            <Sparkles className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            TROVE <span className="text-gradient">Engine</span>
          </span>
        </div>

        {phase === "verifying" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Confirming your email…</p>
          </div>
        )}

        {phase === "invalid" && (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="mb-2 font-display text-2xl font-bold">Link invalid</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              {errorMsg ??
                "This confirmation link is invalid or has expired. Sign in again to request a fresh one."}
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow-sm transition-all hover:opacity-95"
            >
              Back to sign in
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
