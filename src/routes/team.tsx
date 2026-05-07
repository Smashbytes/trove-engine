import { createFileRoute } from "@tanstack/react-router";
import { Users, Shield, ScanLine, Wallet } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [{ title: "Team · Trove Engine" }] }),
  component: TeamPage,
});

function TeamPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Delegate the door"
        title="Team & roles"
        subtitle="Add staff with scoped access — managers, finance, scanners. P1 in PRD scope."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <RoleCard icon={Shield}    name="Manager"  blurb="Full access to listings, bookings, and team." />
        <RoleCard icon={Wallet}    name="Finance"  blurb="Payouts, transactions, and reports only." />
        <RoleCard icon={ScanLine}  name="Scanner"  blurb="Door scan only — no dashboard access." />
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-12 text-center shadow-card">
        <Users className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-3 font-display text-lg font-semibold">No team members yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">Invite staff to help run your spot.</p>
      </div>
    </AppShell>
  );
}

function RoleCard({ icon: Icon, name, blurb }: { icon: typeof Users; name: string; blurb: string }) {
  return (
    <div className="rounded-2xl card-flat p-5 shadow-card">
      <div className="flex items-center gap-2 text-primary">
        <Icon className="h-4 w-4" />
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider">{name}</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{blurb}</p>
    </div>
  );
}
