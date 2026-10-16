import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, LogIn, Loader2, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ACTIVE_WORKSPACE_KEY, useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { TroveLogo } from "@/components/trove/Logo";

export const Route = createFileRoute("/join/$token")({
  head: () => ({ meta: [{ title: "Join a spot · Trove Engine" }] }),
  component: JoinPage,
});

type Status = "checking" | "needs-auth" | "accepting" | "done" | "error";

function JoinPage() {
  const { token } = useParams({ from: "/join/$token" });
  const { isAuthenticated, isLoading, openAuthModal, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const attempted = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      setStatus("needs-auth");
      openAuthModal();
      return;
    }

    if (attempted.current) return;
    attempted.current = true;

    (async () => {
      setStatus("accepting");
      const { data, error } = await supabase.rpc("accept_team_invite", { p_token: token });
      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
        return;
      }
      // Pre-select the joined workspace, then reload so the context picks it up.
      if (typeof window !== "undefined" && data) {
        localStorage.setItem(ACTIVE_WORKSPACE_KEY, data as string);
      }
      await refreshProfile();
      setStatus("done");
      toast.success("You've joined the spot.");
      setTimeout(() => navigate({ to: "/dashboard" }), 800);
    })();
  }, [isAuthenticated, isLoading, token, openAuthModal, refreshProfile, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-10 text-center shadow-card">
        <div className="mb-6 flex justify-center">
          <TroveLogo />
        </div>

        {(status === "checking" || status === "accepting") && (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h1 className="mt-4 font-display text-xl font-semibold">
              {status === "accepting" ? "Joining the spot…" : "Checking your invite…"}
            </h1>
          </>
        )}

        {status === "needs-auth" && (
          <>
            <LogIn className="mx-auto h-8 w-8 text-primary" />
            <h1 className="mt-4 font-display text-xl font-semibold">Sign in to accept</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You've been invited to join a spot on Trove. Sign in or create an account with the
              email your invite was sent to, and we'll add you automatically.
            </p>
            <Button className="mt-6" onClick={() => openAuthModal()}>
              Sign in / Sign up
            </Button>
          </>
        )}

        {status === "done" && (
          <>
            <PartyPopper className="mx-auto h-8 w-8 text-success" />
            <h1 className="mt-4 font-display text-xl font-semibold">You're in!</h1>
            <p className="mt-2 text-sm text-muted-foreground">Taking you to the dashboard…</p>
          </>
        )}

        {status === "error" && (
          <>
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
            <h1 className="mt-4 font-display text-xl font-semibold">Invite not valid</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {errorMsg || "This invite has expired or already been used."}
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => navigate({ to: "/dashboard" })}
            >
              Go to dashboard
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
