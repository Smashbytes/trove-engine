import { useNavigate } from "@tanstack/react-router";
import { UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { closingDate, useCancelAccountClosure } from "@/lib/account-closure";
import { friendlyError } from "@/lib/errors";

/**
 * Shown instead of the Engine while the signed-in account is closing (the 14
 * days after a close request): keep it, or sign out and let it close.
 */
export function AccountClosingScreen({ requestedAt }: { requestedAt: string }) {
  const { signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const keep = useCancelAccountClosure();
  const wipeOn = closingDate(new Date(new Date(requestedAt).getTime() + 14 * 86_400_000).toISOString());

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-card border border-border/60 bg-card p-8 text-center shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <UserX className="h-5 w-5" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold">Your account is closing</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          On {wipeOn} we'll remove your personal details and your Spot's public profile from TROVE. Your listings
          are paused; bookings, payouts and verification records stay on file. Changed your mind?
        </p>
        <Button
          className="mt-6 w-full bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95"
          disabled={keep.isPending}
          onClick={() =>
            keep.mutate(undefined, {
              onSuccess: async (kept) => {
                if (!kept) {
                  toast.error("This account can't be reopened any more.");
                  return;
                }
                await refreshProfile();
                toast.success("Your account is staying open. Republish your listings when you're ready.");
              },
              onError: (e) => toast.error(friendlyError(e, "Couldn't keep your account. Try again.")),
            })
          }
        >
          {keep.isPending ? "Keeping it…" : "Keep my account"}
        </Button>
        <Button
          variant="ghost"
          className="mt-2 w-full"
          onClick={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
        >
          Sign out
        </Button>
      </div>
    </main>
  );
}
