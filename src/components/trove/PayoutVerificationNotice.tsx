import { BadgeCheck, Clock, ShieldAlert, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { takeJustOnboarded } from "@/lib/onboarding-flag";
import { VerifyPayoutDialog } from "./VerifyPayoutDialog";

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  escrow_provisioning: {
    title: "Verifying your payout account…",
    body: "TradeSafe is checking your details. This usually takes a few seconds — refresh if it sticks.",
  },
  escrow_needs_review: {
    title: "Your payout account needs attention",
    body: "TradeSafe couldn't finish verifying you yet. Re-check your bank details and make sure your ID or CIPC document is uploaded.",
  },
  escrow_failed: {
    title: "Payout verification failed",
    body: "TradeSafe rejected the details we sent. Verify again with your correct bank account and ID.",
  },
};
const DEFAULT_COPY = {
  title: "Verify your account to receive payouts",
  body: "Guests pay into TradeSafe escrow. Until you verify your bank account, paid listings can't go live and funds can't be released to you.",
};

/**
 * Persistent banner (while the Spot can't receive escrow payouts) plus a
 * one-time welcome pop-up right after sign-up onboarding completes.
 */
export function PayoutVerificationNotice() {
  const { hostProfile, isOwner, can } = useAuth();
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  const status = hostProfile?.tradesafe_status ?? "not_started";
  // TradeSafe has two steps: `ready` = details accepted, the Spot can sell
  // (guest money is held in escrow); `bankVerified` = TradeSafe verified the
  // bank account, which it needs before it pays anything out.
  const ready = status === "escrow_ready";
  const bankVerified = ready && hostProfile?.tradesafe_verified === true;
  const last4 = hostProfile?.tradesafe_bank_last4;

  useEffect(() => {
    if (hostProfile && takeJustOnboarded()) setWelcomeOpen(true);
  }, [hostProfile]);

  if (!hostProfile) return null;
  const canAct = isOwner || can("payouts.manage");
  const copy = STATUS_COPY[status] ?? DEFAULT_COPY;
  const tone = status === "escrow_failed" ? "destructive" : "warning";

  return (
    <>
      {!ready && canAct && (
        <div
          className={`flex flex-wrap items-start gap-3 rounded-2xl border p-4 ${
            tone === "destructive"
              ? "border-destructive/35 bg-destructive/8"
              : "border-warning/35 bg-warning/8"
          }`}
        >
          <ShieldAlert
            className={`mt-0.5 size-5 shrink-0 ${tone === "destructive" ? "text-destructive" : "text-warning"}`}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p
              className={`text-sm font-semibold ${tone === "destructive" ? "text-destructive" : "text-warning"}`}
            >
              {copy.title}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">{copy.body}</p>
          </div>
          {status !== "escrow_provisioning" && (
            <Button
              size="sm"
              onClick={() => setVerifyOpen(true)}
              className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95"
            >
              <Wallet className="mr-1.5 h-4 w-4" />
              Verify account
            </Button>
          )}
        </div>
      )}

      {ready && !bankVerified && canAct && (
        <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-primary/30 bg-primary/8 p-4">
          <Clock className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold text-primary">TradeSafe is verifying your bank account</p>
            <p className="text-xs leading-5 text-muted-foreground">
              Your payout details were accepted{last4 ? ` (account ending ${last4})` : ""}, so you can
              publish listings and take bookings now. Guest payments are held safely in escrow, and
              TradeSafe releases them to you once it has verified the account.
            </p>
          </div>
        </div>
      )}

      <Dialog open={welcomeOpen} onOpenChange={setWelcomeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div
              className={`mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl ${
                ready ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
              }`}
            >
              {ready ? <BadgeCheck className="h-7 w-7" /> : <ShieldAlert className="h-7 w-7" />}
            </div>
            <DialogTitle className="text-center">
              {bankVerified
                ? "You're verified — payouts are on"
                : ready
                  ? "You're set up to sell"
                  : "One last step: verify your account"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {bankVerified
                ? `Welcome to TROVE${hostProfile.display_name ? `, ${hostProfile.display_name}` : ""}! TradeSafe has verified your bank account${
                    last4 ? ` ending in ${last4}` : ""
                  }. Guest payments are held safely in escrow and released to you after each experience.`
                : ready
                  ? `Welcome to TROVE${hostProfile.display_name ? `, ${hostProfile.display_name}` : ""}! TradeSafe accepted your payout details${
                      last4 ? ` for the account ending in ${last4}` : ""
                    } and is now verifying the bank account. You can publish listings straight away; payouts start once TradeSafe confirms the account.`
                  : "Your Spot is set up, but TradeSafe hasn't verified your payout account yet. Verify now so paid listings can go live and you can receive funds."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            {ready ? (
              <Button onClick={() => setWelcomeOpen(false)}>Let's go</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setWelcomeOpen(false)}>
                  Later
                </Button>
                {canAct && (
                  <Button
                    onClick={() => {
                      setWelcomeOpen(false);
                      setVerifyOpen(true);
                    }}
                    className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95"
                  >
                    Verify account
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VerifyPayoutDialog open={verifyOpen} onOpenChange={setVerifyOpen} />
    </>
  );
}
