import { createFileRoute } from "@tanstack/react-router";
import { Settings as SettingsIcon, KeyRound, ShieldCheck, Bell as BellIcon } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · Trove Engine" }] }),
  component: SettingsPage,
});

function SettingsPage() {
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
    </AppShell>
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
