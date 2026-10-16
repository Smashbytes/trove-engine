import { createFileRoute } from "@tanstack/react-router";
import {
  Bell as BellIcon,
  KeyRound,
  MessageCircle,
  Settings as SettingsIcon,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { VerifyPayoutDialog } from "@/components/trove/VerifyPayoutDialog";
import { Field } from "@/components/trove/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { isAnalyticsEnabled, setAnalyticsEnabled } from "@/lib/analytics";
import { useAuth } from "@/lib/auth";
import { getVerificationCopy } from "@/lib/host-workspace";
import { useSubmitVerification, useUpdateNotificationPrefs } from "@/lib/queries";
import {
  useDisconnectWhatsApp,
  useStartWhatsAppConnect,
  useWhatsAppStatus,
} from "@/lib/whatsapp";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · Trove Engine" }] }),
  component: SettingsPage,
});

const NOTIFY_EVENTS = [
  { key: "new_booking", label: "New booking" },
  { key: "new_follower", label: "New follower" },
  { key: "payout_sent", label: "Payout sent" },
  { key: "new_review", label: "New review" },
] as const;

const NOTIFY_CHANNELS = [
  { key: "email", label: "Email" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "in_app", label: "In-app" },
] as const;

// Event × channel pairs that a sender actually honours today. Everything else
// is shown as "soon" rather than a switch that silently does nothing.
//   new_booking.whatsapp → _shared/whatsapp.ts notifyHostNewBooking
//   *.in_app             → useHostNotifications filters the feed
const WIRED = new Set(["new_booking.whatsapp", "new_booking.in_app", "new_follower.in_app"]);

type NotifyPrefs = Record<string, Record<string, boolean>>;

function coercePrefs(raw: unknown): NotifyPrefs {
  const out: NotifyPrefs = {};
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  for (const event of NOTIFY_EVENTS) {
    const row = obj[event.key];
    const rowObj = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    out[event.key] = {};
    for (const channel of NOTIFY_CHANNELS) {
      // default ON when unset
      out[event.key][channel.key] = rowObj[channel.key] !== false;
    }
  }
  return out;
}

function SettingsPage() {
  const { user, hostProfile, isOwner, can, updateEmail, updatePassword } = useAuth();
  const [verifyPayoutOpen, setVerifyPayoutOpen] = useState(false);
  const submitVerification = useSubmitVerification();
  const updatePrefs = useUpdateNotificationPrefs();

  // ---- account & security ----
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setEmail(user?.email ?? "");
  }, [user?.email]);

  const saveEmail = async () => {
    if (!email.trim() || email.trim() === user?.email) {
      toast.error("Enter a new email address.");
      return;
    }
    setSavingEmail(true);
    const { error } = await updateEmail(email);
    setSavingEmail(false);
    if (error) toast.error(error);
    else toast.success("Check both inboxes — confirm the change from the email we just sent.");
  };

  const savePassword = async () => {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }
    setSavingPassword(true);
    const { error } = await updatePassword(password);
    setSavingPassword(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Password updated.");
      setPassword("");
      setConfirmPassword("");
    }
  };

  // ---- verification ----
  const verification = getVerificationCopy(hostProfile?.kyc_status);
  const bankJson =
    hostProfile?.payout_bank_json && typeof hostProfile.payout_bank_json === "object"
      ? (hostProfile.payout_bank_json as Record<string, unknown>)
      : {};
  const [legalName, setLegalName] = useState("");
  const [registration, setRegistration] = useState("");

  useEffect(() => {
    setLegalName(typeof bankJson.legal_name === "string" ? bankJson.legal_name : "");
    setRegistration(typeof bankJson.registration === "string" ? bankJson.registration : "");
  }, [hostProfile?.payout_bank_json]); // eslint-disable-line react-hooks/exhaustive-deps

  const alreadySubmitted =
    hostProfile?.kyc_status === "submitted" || hostProfile?.kyc_status === "verified";

  const saveVerification = async () => {
    if (!legalName.trim() || !registration.trim()) {
      toast.error("Legal name and registration number are required.");
      return;
    }
    try {
      await submitVerification.mutateAsync({ legalName, registration });
      toast.success("Verification submitted for review.");
    } catch (error) {
      toast.error(friendlyError(error, "Could not submit verification."));
    }
  };

  // ---- notification preferences ----
  const [prefs, setPrefs] = useState<NotifyPrefs>(() =>
    coercePrefs(hostProfile?.notification_prefs),
  );
  useEffect(() => {
    setPrefs(coercePrefs(hostProfile?.notification_prefs));
  }, [hostProfile?.notification_prefs]);

  const togglePref = (event: string, channel: string, value: boolean) =>
    setPrefs((prev) => ({ ...prev, [event]: { ...prev[event], [channel]: value } }));

  const savePrefs = async () => {
    try {
      await updatePrefs.mutateAsync(prefs);
      toast.success("Notification preferences saved.");
    } catch (error) {
      toast.error(friendlyError(error, "Could not save preferences."));
    }
  };

  // ---- payout account (TradeSafe) ----
  const tradesafeStatus = hostProfile?.tradesafe_status ?? "not_started";
  // escrow_ready = TradeSafe accepted the details (can sell); the bank account
  // itself is verified separately (tradesafe_verified) before any payout.
  const payoutsVerified = tradesafeStatus === "escrow_ready";
  const bankVerified = payoutsVerified && hostProfile?.tradesafe_verified === true;
  const canManagePayouts = isOwner || can("payouts.manage");

  return (
    <AppShell>
      <PageHeader
        eyebrow="Your account"
        title="Settings"
        subtitle="Account, security, verification, notifications, and payouts."
      />

      <div className="space-y-6">
        {/* Account & security */}
        <Section
          icon={KeyRound}
          title="Account & security"
          sub="Update your sign-in email and password."
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <Field label="Email">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
              </Field>
              <Button variant="outline" onClick={saveEmail} disabled={savingEmail}>
                {savingEmail ? "Sending…" : "Update email"}
              </Button>
            </div>
            <div className="space-y-3">
              <Field label="New password">
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="At least 8 characters"
                />
              </Field>
              <Field label="Confirm new password">
                <Input
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password"
                />
              </Field>
              <Button variant="outline" onClick={savePassword} disabled={savingPassword}>
                {savingPassword ? "Saving…" : "Update password"}
              </Button>
            </div>
          </div>
        </Section>

        {/* Business verification */}
        <Section
          icon={ShieldCheck}
          title="Business verification"
          sub="Submit your legal details so Trove can verify the business and unlock live publishing."
          badge={{ label: verification.label, tone: verification.tone }}
        >
          <p className="mb-4 text-sm text-muted-foreground">{verification.message}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Registered business name"
              hint="As registered with CIPC, e.g. Neon Underground (Pty) Ltd. Used by TradeSafe; guests see your Spot name instead."
            >
              <Input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="As it appears on CIPC"
                disabled={alreadySubmitted}
              />
            </Field>
            <Field label="Registration number">
              <Input
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
                placeholder="e.g. 2021/123456/07"
                disabled={alreadySubmitted}
              />
            </Field>
          </div>
          <div className="mt-4 flex items-center gap-3">
            {/* submit_host_verification is a no-op once submitted/verified, so
                offering "resubmit" there would silently drop the edits. */}
            {!alreadySubmitted && (
              <Button
                onClick={saveVerification}
                disabled={submitVerification.isPending}
                className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95"
              >
                {submitVerification.isPending
                  ? "Submitting…"
                  : hostProfile?.kyc_status === "rejected"
                    ? "Resubmit for review"
                    : "Submit for verification"}
              </Button>
            )}
            {alreadySubmitted && (
              <span className="text-xs text-muted-foreground">
                {hostProfile?.kyc_status === "verified"
                  ? "Your business is verified."
                  : "Submitted — Trove is reviewing your details. Need to correct something? Contact support."}
              </span>
            )}
          </div>
        </Section>

        {/* WhatsApp connection */}
        <Section
          icon={MessageCircle}
          title="WhatsApp"
          sub="Connect your WhatsApp to get bookings, payouts and alerts the moment they happen."
        >
          <WhatsAppCard />
        </Section>

        {/* Notification preferences */}
        <Section
          icon={BellIcon}
          title="Notification preferences"
          sub="Choose how Trove reaches you for each kind of update."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="pb-3 font-semibold">Event</th>
                  {NOTIFY_CHANNELS.map((channel) => (
                    <th key={channel.key} className="pb-3 text-center font-semibold">
                      {channel.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NOTIFY_EVENTS.map((event) => (
                  <tr key={event.key} className="border-t border-border/50">
                    <td className="py-3 font-medium">{event.label}</td>
                    {NOTIFY_CHANNELS.map((channel) => (
                      <td key={channel.key} className="py-3 text-center">
                        <div className="flex justify-center">
                          {WIRED.has(`${event.key}.${channel.key}`) ? (
                            <Switch
                              aria-label={`${event.label} by ${channel.label}`}
                              checked={prefs[event.key]?.[channel.key] ?? true}
                              onCheckedChange={(value) => togglePref(event.key, channel.key, value)}
                            />
                          ) : (
                            <span className="text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              Soon
                            </span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={savePrefs} disabled={updatePrefs.isPending}>
              {updatePrefs.isPending ? "Saving…" : "Save preferences"}
            </Button>
          </div>
        </Section>

        {/* Preferences (locked) */}
        <Section
          icon={SettingsIcon}
          title="Preferences"
          sub="Regional defaults for this workspace."
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <LockedPref label="Currency" value="ZAR" />
            <LockedPref label="Language" value="English" />
            <LockedPref label="Time format" value="24-hour" />
          </div>
        </Section>

        {/* Privacy & data */}
        <Section
          icon={ShieldCheck}
          title="Privacy & data"
          sub="Anonymous product analytics, per our Privacy Policy — switch it off any time."
        >
          <PrivacyDataCard />
        </Section>

        {/* Payout account (TradeSafe) */}
        <Section
          icon={Wallet}
          title="Payout account"
          sub="Guests pay into TradeSafe escrow; TradeSafe releases your share to this account after each experience."
          badge={
            bankVerified
              ? { label: "Verified · payouts on", tone: "success" }
              : payoutsVerified
                ? { label: "Accepted · bank check pending", tone: "warning" }
                : tradesafeStatus === "escrow_failed"
                ? { label: "Verification failed", tone: "destructive" }
                : tradesafeStatus === "escrow_provisioning"
                  ? { label: "Verifying…", tone: "warning" }
                  : { label: "Not verified", tone: "warning" }
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <LockedPref
              label="Bank"
              value={hostProfile?.tradesafe_bank_name ?? "Not set"}
              note="Held by TradeSafe"
            />
            <LockedPref
              label="Account"
              value={
                hostProfile?.tradesafe_bank_last4
                  ? `•••• ${hostProfile.tradesafe_bank_last4}`
                  : "Not set"
              }
              note="Only the last 4 digits are stored"
            />
            <LockedPref
              label="Account type"
              value={hostProfile?.tradesafe_account_type ?? "—"}
              note={
                bankVerified && hostProfile?.tradesafe_verified_at
                  ? `Verified ${new Date(hostProfile.tradesafe_verified_at).toLocaleDateString("en-ZA")}`
                  : hostProfile?.tradesafe_ready_at
                    ? `Accepted ${new Date(hostProfile.tradesafe_ready_at).toLocaleDateString("en-ZA")}`
                    : "Not yet verified"
              }
            />
          </div>

          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            {bankVerified
              ? "TradeSafe has verified this bank account. Paid listings can go live, and funds are released here once each booking's escrow window closes."
              : payoutsVerified
                ? "TradeSafe accepted your payout details, so paid listings can go live and take bookings. It is now verifying the bank account itself; guest payments stay safely in escrow and are released here once that check is done."
                : "Until TradeSafe accepts your payout details, paid listings stay in draft and no funds can be released to you."}
            {hostProfile?.tradesafe_last_error && !payoutsVerified && (
              <span className="mt-1 block text-destructive">
                Last TradeSafe response: {hostProfile.tradesafe_last_error}
              </span>
            )}
          </p>

          <div className="mt-6 flex justify-end">
            {canManagePayouts ? (
              <Button
                onClick={() => setVerifyPayoutOpen(true)}
                variant={payoutsVerified ? "outline" : "default"}
                className={
                  payoutsVerified
                    ? undefined
                    : "bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95"
                }
              >
                {payoutsVerified ? "Change payout account" : "Verify account"}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Only the Spot owner or a finance teammate can manage payouts.
              </p>
            )}
          </div>
        </Section>
        <VerifyPayoutDialog open={verifyPayoutOpen} onOpenChange={setVerifyPayoutOpen} />
      </div>
    </AppShell>
  );
}

function PrivacyDataCard() {
  const [analytics, setAnalytics] = useState(() => isAnalyticsEnabled());

  function toggle(value: boolean) {
    setAnalytics(value);
    setAnalyticsEnabled(value);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="max-w-xl">
        <p id="analytics-label" className="text-sm font-medium">
          Product analytics
        </p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Anonymous usage stats (PostHog) that help us improve the Engine. We
          never link them to your account. Details in the{" "}
          <a
            href="https://www.welovetrove.co.za/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
      <Switch aria-labelledby="analytics-label" checked={analytics} onCheckedChange={toggle} />
    </div>
  );
}


function LockedPref({
  label,
  value,
  note = "Locked",
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-semibold">{value}</p>
      <p className="mt-1 text-caption text-muted-foreground">{note}</p>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  sub,
  badge,
  children,
}: {
  icon: typeof KeyRound;
  title: string;
  sub: string;
  badge?: { label: string; tone: "success" | "warning" | "destructive" | "muted" };
  children: ReactNode;
}) {
  const toneClass =
    badge?.tone === "success"
      ? "bg-success/15 text-success"
      : badge?.tone === "warning"
        ? "bg-warning/15 text-warning"
        : badge?.tone === "destructive"
          ? "bg-destructive/15 text-destructive"
          : "bg-white/10 text-white/75";
  return (
    <section className="rounded-card border border-border/60 bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>
          </div>
        </div>
        {badge && (
          <span
            className={`max-w-full rounded-full px-3 py-1 text-2xs font-semibold uppercase tracking-[0.18em] ${toneClass}`}
          >
            {badge.label}
          </span>
        )}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function WhatsAppCard() {
  const [waiting, setWaiting] = useState(false);
  const status = useWhatsAppStatus({ poll: waiting });
  const start = useStartWhatsAppConnect();
  const disconnect = useDisconnectWhatsApp();

  // Stop polling + celebrate the moment the webhook confirms the connection.
  useEffect(() => {
    if (waiting && status.data?.number) {
      setWaiting(false);
      toast.success("WhatsApp connected! Your updates will land there from now on.");
    }
  }, [waiting, status.data?.number]);

  const connect = async () => {
    try {
      const res = await start.mutateAsync();
      if (!res.waLink) {
        toast.error(res.error ?? "WhatsApp isn't enabled yet — check back soon.");
        return;
      }
      window.open(res.waLink, "_blank", "noopener");
      setWaiting(true);
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't start the connection."));
    }
  };

  if (status.isLoading) {
    return <p className="text-sm text-muted-foreground">Checking your WhatsApp connection…</p>;
  }

  if (status.data?.number) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_10px] shadow-success/60" />
          <div>
            <p className="font-medium">{status.data.number}</p>
            <p className="text-xs text-muted-foreground">
              Connected
              {status.data.verifiedAt
                ? ` · verified ${new Date(status.data.verifiedAt).toLocaleDateString("en-ZA")}`
                : ""}{" "}
              — use the matrix below to choose which updates arrive here.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => disconnect.mutate()}
          disabled={disconnect.isPending}
        >
          {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
        </Button>
      </div>
    );
  }

  if (status.data && !status.data.configured) {
    return (
      <p className="text-sm text-muted-foreground">
        WhatsApp notifications are nearly here — Trove&apos;s WhatsApp line is being set up. This
        button will go live the moment it&apos;s ready.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="max-w-md text-sm text-muted-foreground">
        {waiting
          ? "WhatsApp should have opened with a pre-filled message — just tap send. We'll connect you the second it arrives."
          : "One tap: we open WhatsApp with a pre-filled message, you hit send, and you're connected. No codes to type."}
      </p>
      <Button
        onClick={connect}
        disabled={start.isPending || waiting}
        className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95"
      >
        {waiting ? "Waiting for your message…" : start.isPending ? "Preparing…" : "Connect WhatsApp"}
      </Button>
    </div>
  );
}
