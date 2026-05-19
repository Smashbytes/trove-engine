import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Reset your password · Trove Engine" }],
  }),
  component: ResetPasswordPage,
});

type Phase = "verifying" | "ready" | "invalid" | "success";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("verifying");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  // Supabase sends users here from the recovery email. The URL carries the
  // recovery token in either the query string (PKCE flow, ?code=…) or the
  // hash (legacy implicit flow, #access_token=…&type=recovery). The
  // @supabase/ssr browser client auto-handles both on mount, then fires a
  // PASSWORD_RECOVERY event once a recovery session is active. We watch for
  // that and flip into the form. If no recovery session arrives within a
  // short window, we treat the link as invalid/expired.
  useEffect(() => {
    let timedOut = false;

    // Verify a usable session is live (works for both flows once supabase-js
    // has parsed the URL).
    const verify = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (timedOut) return;
        if (error) {
          setErrorMsg(error.message);
          setPhase("invalid");
          return;
        }
        if (data.session) {
          setPhase("ready");
        }
      } catch (e) {
        if (timedOut) return;
        setErrorMsg(e instanceof Error ? e.message : "Unable to verify reset link.");
        setPhase("invalid");
      }
    };

    // First check — might already have a session.
    void verify();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (timedOut) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setPhase("ready");
      }
    });

    // If nothing has resolved after 6s the link is almost certainly bad.
    const fallback = setTimeout(() => {
      timedOut = true;
      setPhase((p) => (p === "verifying" ? "invalid" : p));
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setPhase("success");
    toast.success("Password updated.");
    // Brief pause so users can see the success state before we move on.
    setTimeout(() => navigate({ to: "/dashboard" }), 1400);
  }

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
            <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
          </div>
        )}

        {phase === "invalid" && (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="mb-2 font-display text-2xl font-bold">Link expired</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              {errorMsg ??
                "This password reset link is invalid or has expired. Request a new one to continue."}
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

        {phase === "success" && (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="mb-2 font-display text-2xl font-bold">Password updated</h1>
            <p className="text-sm text-muted-foreground">Taking you to your dashboard…</p>
          </div>
        )}

        {phase === "ready" && (
          <>
            <p className="eyebrow text-primary mb-1">Account recovery</p>
            <h1 className="mb-1 font-display text-3xl font-bold">Set a new password</h1>
            <p className="mb-7 text-sm text-muted-foreground">
              Pick something at least 8 characters long. You will be signed in straight away.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rp-pw" className="text-sm font-medium">
                  New password
                </Label>
                <div className="relative">
                  <Input
                    id="rp-pw"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    minLength={8}
                    required
                    className="h-11 rounded-xl border-border/60 bg-surface-1 pr-10 focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rp-confirm" className="text-sm font-medium">
                  Confirm password
                </Label>
                <Input
                  id="rp-confirm"
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter password"
                  minLength={8}
                  required
                  className="h-11 rounded-xl border-border/60 bg-surface-1 focus:border-primary/60 focus:ring-1 focus:ring-primary/30"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-glow-sm transition-all hover:opacity-95 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? (
                  "Updating…"
                ) : (
                  <>
                    Update password
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
