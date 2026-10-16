import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { PermissionGate } from "@/components/trove/PermissionGate";
import { useAuth } from "@/lib/auth";
import { formatZar } from "@/lib/format";
import { useHostPayouts } from "@/lib/queries";

export const Route = createFileRoute("/payouts")({
  head: () => ({
    meta: [
      { title: "Payouts - Trove Engine" },
      {
        name: "description",
        content:
          "Track what you've earned on TROVE and when it's paid into your account.",
      },
    ],
  }),
  component: PayoutsPage,
});

function PayoutsPage() {
  const { hostProfile } = useAuth();
  const payoutsQuery = useHostPayouts();
  const payouts = payoutsQuery.data ?? [];

  const totalPaid = payouts
    .filter((payout) => payout.status === "paid")
    .reduce((sum, payout) => sum + payout.amount_kobo, 0);

  const totalPending = payouts
    .filter((payout) => payout.status === "pending" || payout.status === "processing")
    .reduce((sum, payout) => sum + payout.amount_kobo, 0);

  // Same source as Settings → Payout account: the account TradeSafe holds.
  // (payout_bank_json is a legacy Paystack-era field and is no longer shown.)
  const tradesafeStatus = hostProfile?.tradesafe_status ?? "not_started";
  const payoutsAccepted = tradesafeStatus === "escrow_ready";
  const bankVerified = payoutsAccepted && hostProfile?.tradesafe_verified === true;
  const hasBank = Boolean(hostProfile?.tradesafe_bank_name || hostProfile?.tradesafe_bank_last4);
  const verificationLabel = bankVerified
    ? "Verified · payouts on"
    : payoutsAccepted
      ? "Accepted · bank check pending"
      : tradesafeStatus === "escrow_failed"
        ? "Verification failed"
        : "Not verified";

  return (
    <AppShell>
      <PermissionGate perm="payouts.view">
      <PageHeader
        eyebrow="Finance"
        title="Earnings & payouts"
        subtitle="Track what you've earned and when it lands in your bank account."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          eyebrow="Pending"
          value={formatZar(totalPending)}
          sub="On its way to your bank account."
          featured
        />
        <Stat eyebrow="Paid out" value={formatZar(totalPaid)} sub="Already paid into your account." />
        <Stat
          eyebrow="Payouts"
          value={String(payouts.length)}
          sub="Payouts made to date."
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="min-w-0 rounded-card border border-border/60 bg-card p-6 shadow-card">
          <h2 className="font-display text-2xl font-semibold">Bank profile</h2>
          {!hasBank && (
            <p className="mt-4 text-sm text-muted-foreground">
              You haven&apos;t added a payout bank account yet. Add one in Settings.
            </p>
          )}
          {hasBank && (
            <div className="mt-4 space-y-3">
              <InfoRow label="Bank" value={hostProfile?.tradesafe_bank_name ?? "—"} />
              <InfoRow label="Account type" value={hostProfile?.tradesafe_account_type ?? "—"} />
              <InfoRow
                label="Account number"
                value={
                  hostProfile?.tradesafe_bank_last4 ? `•••• ${hostProfile.tradesafe_bank_last4}` : "—"
                }
              />
              <InfoRow label="Verification" value={verificationLabel} />
            </div>
          )}
        </section>

        <section className="min-w-0 rounded-card border border-border/60 bg-card p-6 shadow-card">
          <h2 className="font-display text-2xl font-semibold">Payout history</h2>
          <PayoutTable payouts={payouts} />
        </section>
      </div>
      </PermissionGate>
    </AppShell>
  );
}

function Stat({
  eyebrow,
  value,
  sub,
  featured,
}: {
  eyebrow: string;
  value: string;
  sub: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-tile p-5 ${featured ? "bg-gradient-brand text-primary-foreground shadow-glow-sm" : "card-flat"}`}
    >
      <p className={`eyebrow ${featured ? "text-primary-foreground/80" : ""}`}>{eyebrow}</p>
      <p className="mt-3 font-display text-3xl font-bold">{value}</p>
      <p className={`mt-2 text-xs ${featured ? "text-white/80" : "text-muted-foreground"}`}>
        {sub}
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-semibold">{value}</span>
    </div>
  );
}

function PayoutTable({
  payouts,
}: {
  payouts: Array<{ id: string; amount_kobo: number; status: string; created_at: string }>;
}) {
  if (payouts.length === 0) {
    return (
      <p className="mt-5 rounded-2xl border border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
        No payouts yet. They&apos;ll show here once guests have paid for completed bookings.
      </p>
    );
  }
  return (
    // Scrolls inside the card on narrow screens instead of widening the page.
    <div
      className="mt-5 overflow-x-auto rounded-2xl border border-border/60"
      tabIndex={0}
      role="region"
      aria-label="Payout history"
    >
      <table className="w-full min-w-[26rem] text-sm">
        <thead className="bg-muted/35 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Payout</th>
            <th className="px-4 py-3 text-right">Status</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3 text-right">Created</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((payout) => (
            <tr key={payout.id} className="border-t border-border/60">
              <td className="px-4 py-3 font-medium">#{payout.id.slice(0, 8)}</td>
              <td className="px-4 py-3 text-right capitalize">{payout.status}</td>
              <td className="px-4 py-3 text-right">{formatZar(payout.amount_kobo)}</td>
              <td className="px-4 py-3 text-right">
                {new Date(payout.created_at).toLocaleDateString("en-ZA")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

