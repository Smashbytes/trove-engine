import { createFileRoute } from "@tanstack/react-router";
import { Wallet, Building2, Clock, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";

export const Route = createFileRoute("/payouts")({
  head: () => ({
    meta: [
      { title: "Payouts · Trove Engine" },
      { name: "description", content: "Track your earnings, payouts, and bank account." },
    ],
  }),
  component: PayoutsPage,
});

function PayoutsPage() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Get paid"
        title="Earnings & payouts"
        subtitle="Powered by Paystack. Settled to your SA bank account on a T+3 schedule after each event."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat icon={Wallet} eyebrow="Available balance" value="—" sub="Pending Paystack integration" featured />
        <Stat icon={Clock}  eyebrow="In escrow"         value="—" sub="Funds held until event date" />
        <Stat icon={CheckCircle2} eyebrow="Paid out (30d)" value="—" sub="Net of 7% platform fee" />
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="font-display text-lg font-semibold">Bank account</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify your SA bank account via Paystack BAV before your first payout (PAY-09).
        </p>
        <div className="mt-4 rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          BAV flow not yet wired — Phase 3.
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5 shadow-card">
        <h3 className="font-display text-lg font-semibold">Payout history</h3>
        <p className="mt-1 text-sm text-muted-foreground">No payouts yet.</p>
      </div>
    </AppShell>
  );
}

function Stat({ icon: Icon, eyebrow, value, sub, featured }: {
  icon: typeof Wallet; eyebrow: string; value: string; sub: string; featured?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 ${featured ? "bg-gradient-brand text-primary-foreground shadow-glow-sm" : "card-flat"}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`eyebrow ${featured ? "text-primary-foreground/80" : ""}`}>{eyebrow}</p>
          <p className="mt-3 font-display text-3xl font-bold">{value}</p>
          <p className={`mt-1 text-xs ${featured ? "text-white/80" : "text-muted-foreground"}`}>{sub}</p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${featured ? "bg-white/15 text-white" : "bg-primary/10 text-primary"}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
