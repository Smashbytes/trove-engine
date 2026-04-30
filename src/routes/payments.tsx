import { createFileRoute } from "@tanstack/react-router";
import { Wallet, ArrowDownToLine, Clock, CheckCircle2, CreditCard } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { useTroveData, totals, ZAR } from "@/lib/trove-store";
import { toast } from "sonner";

export const Route = createFileRoute("/payments")({
  head: () => ({ meta: [{ title: "Payments · Trove Engine" }] }),
  component: Payments,
});

function Payments() {
  const { events, payouts } = useTroveData();
  const t = totals(events);
  const fee = Math.round(t.revenue * 0.045); // simulated 4.5% PayFast + Trove fee
  const net = t.revenue - fee;
  const pending = payouts.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Get paid"
        title="Payments & payouts"
        subtitle="Powered by PayFast (simulated). Funds settled to your bank on rolling payouts."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-primary/30 bg-gradient-brand-soft p-6 shadow-glow-sm md:col-span-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Wallet className="h-4 w-4" /> Available balance
          </div>
          <p className="mt-3 font-display text-4xl font-bold text-gradient">{ZAR(net)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Net of {ZAR(fee)} processing fees</p>
          <Button onClick={() => toast.success("Payout requested · arrives in 1–2 business days")}
            className="mt-5 w-full bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95">
            <ArrowDownToLine className="mr-1.5 h-4 w-4" /> Withdraw to bank
          </Button>
        </div>

        <div className="rounded-2xl card-flat p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gross revenue</p>
          <p className="mt-3 font-display text-3xl font-bold">{ZAR(t.revenue)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t.sold} tickets across {events.length} events</p>
        </div>

        <div className="rounded-2xl card-flat p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending payouts</p>
          <p className="mt-3 font-display text-3xl font-bold">{ZAR(pending)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Settling within 48 hours</p>
        </div>
      </div>

      {/* PayFast strip */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl card-flat p-5 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">PayFast connected · LIVE mode (simulated)</p>
            <p className="text-xs text-muted-foreground">Cards · EFT · Mobicred · SnapScan accepted at checkout.</p>
          </div>
        </div>
        <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">Active</span>
      </div>

      <h3 className="mt-8 mb-3 font-display text-xl font-semibold">Payout history</h3>
      <div className="overflow-hidden rounded-2xl card-flat shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 text-left">Reference</th>
              <th className="px-5 py-3 text-left">Date</th>
              <th className="px-5 py-3 text-right">Amount</th>
              <th className="px-5 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => (
              <tr key={p.id} className="border-t border-border/40">
                <td className="px-5 py-3 font-mono text-xs">{p.reference}</td>
                <td className="px-5 py-3">{new Date(p.date).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</td>
                <td className="px-5 py-3 text-right font-semibold">{ZAR(p.amount)}</td>
                <td className="px-5 py-3 text-right">
                  {p.status === "paid" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold text-success">
                      <CheckCircle2 className="h-3 w-3" /> Paid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-semibold text-warning">
                      <Clock className="h-3 w-3" /> Pending
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
