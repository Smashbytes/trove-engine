import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon, KeyRound, ShieldCheck, Bell as BellIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useUpdateBankingDetails } from "@/lib/queries";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · Trove Engine" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { hostProfile } = useAuth();
  const updateBanking = useUpdateBankingDetails();

  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("business");

  useEffect(() => {
    const bankProfile =
      hostProfile?.payout_bank_json &&
      typeof hostProfile.payout_bank_json === "object" &&
      !Array.isArray(hostProfile.payout_bank_json)
        ? (hostProfile.payout_bank_json as Record<string, unknown>)
        : null;

    setBank(typeof bankProfile?.bank === "string" ? bankProfile.bank : "");
    setAccountNumber(
      typeof bankProfile?.account_number === "string" ? bankProfile.account_number : "",
    );
    setAccountName(typeof bankProfile?.account_name === "string" ? bankProfile.account_name : "");
    setAccountType(
      typeof bankProfile?.account_type === "string" ? bankProfile.account_type : "business",
    );
  }, [hostProfile?.payout_bank_json]);

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
        subtitle="Account, security, verification, and notification preferences."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card icon={KeyRound} title="Account & security" sub="Email, password, two-factor (P2)." />
        <Card
          icon={ShieldCheck}
          title="Business verification"
          sub="CIPC, ID, bank account, payout BAV."
        />
        <Card
          icon={BellIcon}
          title="Notification preferences"
          sub="WhatsApp, email, in-app channel toggles."
        />
        <Card
          icon={SettingsIcon}
          title="Preferences"
          sub="Currency (ZAR locked), time format, language (EN locked)."
        />
      </div>

      <section className="mt-6 rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-primary">Payout setup</p>
            <h2 className="mt-2 font-display text-2xl font-semibold">Banking details</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Spots can skip this during onboarding, but payouts stay paused until these details are
              captured.
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

function Card({ icon: Icon, title, sub }: { icon: typeof KeyRound; title: string; sub: string }) {
  return (
    <button className="rounded-2xl card-flat p-5 text-left shadow-card transition-colors hover:border-primary/50">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        </div>
      </div>
    </button>
  );
}
