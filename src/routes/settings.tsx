import { createFileRoute } from "@tanstack/react-router";
import { Bell as BellIcon, KeyRound, Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { getVerificationCopy } from "@/lib/host-workspace";
import {
  useSubmitVerification,
  useUpdateBankingDetails,
  useUpdateNotificationPrefs,
} from "@/lib/queries";

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
  const { user, hostProfile, updateEmail, updatePassword } = useAuth();
  const updateBanking = useUpdateBankingDetails();
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
      toast.error(error instanceof Error ? error.message : "Could not submit verification.");
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
      toast.error(error instanceof Error ? error.message : "Could not save preferences.");
    }
  };

  // ---- banking (existing) ----
  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("business");

  useEffect(() => {
    setBank(typeof bankJson.bank === "string" ? bankJson.bank : "");
    setAccountNumber(typeof bankJson.account_number === "string" ? bankJson.account_number : "");
    setAccountName(typeof bankJson.account_name === "string" ? bankJson.account_name : "");
    setAccountType(typeof bankJson.account_type === "string" ? bankJson.account_type : "business");
  }, [hostProfile?.payout_bank_json]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveBanking = async () => {
    if (!bank.trim() || !accountNumber.trim()) {
      toast.error("Bank and account number are required.");
      return;
    }
    try {
      await updateBanking.mutateAsync({ bank, accountNumber, accountName, accountType });
      toast.success("Banking details updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update banking details.");
    }
  };

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
            <Field label="Registered legal name">
              <Input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="As it appears on CIPC"
              />
            </Field>
            <Field label="Registration number">
              <Input
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
                placeholder="e.g. 2021/123456/07"
              />
            </Field>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button
              onClick={saveVerification}
              disabled={submitVerification.isPending}
              className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95"
            >
              {submitVerification.isPending
                ? "Submitting…"
                : alreadySubmitted
                  ? "Resubmit for review"
                  : "Submit for verification"}
            </Button>
            {alreadySubmitted && (
              <span className="text-xs text-muted-foreground">
                {hostProfile?.kyc_status === "verified"
                  ? "Your business is verified."
                  : "Submitted — Trove is reviewing your details."}
              </span>
            )}
          </div>
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
                          <Switch
                            checked={prefs[event.key]?.[channel.key] ?? true}
                            onCheckedChange={(value) => togglePref(event.key, channel.key, value)}
                          />
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

        {/* Banking (live) */}
        <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow text-primary">Payout setup</p>
              <h2 className="mt-2 font-display text-2xl font-semibold">Banking details</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Spots can skip this during onboarding, but payouts stay paused until these details
                are captured.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                bank && accountNumber ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
              }`}
            >
              {bank && accountNumber ? "Ready" : "Needs banking"}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Bank">
              <Input value={bank} onChange={(event) => setBank(event.target.value)} />
            </Field>
            <Field label="Account number">
              <Input
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
                inputMode="numeric"
              />
            </Field>
            <Field label="Account name">
              <Input value={accountName} onChange={(event) => setAccountName(event.target.value)} />
            </Field>
            <Field label="Account type">
              <select
                value={accountType}
                onChange={(event) => setAccountType(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-input px-3 text-sm"
              >
                <option value="business">Business</option>
                <option value="current">Current</option>
                <option value="savings">Savings</option>
              </select>
            </Field>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={saveBanking}
              disabled={updateBanking.isPending}
              className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95"
            >
              {updateBanking.isPending ? "Saving..." : "Save banking details"}
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function LockedPref({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-semibold">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">Locked</p>
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
    <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
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
            className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${toneClass}`}
          >
            {badge.label}
          </span>
        )}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
