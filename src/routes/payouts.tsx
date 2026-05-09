import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { useAuth } from "@/lib/auth";
import { useHostPayouts } from "@/lib/queries";

export const Route = createFileRoute("/payouts")({
  head: () => ({
    meta: [
      { title: "Payouts - Trove Engine" },
      {
        name: "description",
        content:
          "Read live payout history and stored bank profile data for the signed-in host account.",
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

  const bankDetails = hostProfile?.payout_bank_json as Record<string, string> | null;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Finance"
        title="Earnings & payouts"
        subtitle="This page now reads the actual payout ledger for the signed-in host instead of placeholder cards."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          eyebrow="Pending"
          value={formatZar(totalPending)}
          sub="Pending or processing payout rows."
          featured
        />
        <Stat eyebrow="Paid out" value={formatZar(totalPaid)} sub="Total amount already settled." />
        <Stat
          eyebrow="Payout count"
          value={String(payouts.length)}
          sub="Rows stored against this host account."
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
          <h2 className="font-display text-2xl font-semibold">Bank profile</h2>
          {!bankDetails && (
            <p className="mt-4 text-sm text-muted-foreground">
              No payout bank profile has been captured on the host record yet.
            </p>
          )}
          {bankDetails && (
            <div className="mt-4 space-y-3">
              <InfoRow label="Bank" value={bankDetails.bank ?? "—"} />
              <InfoRow label="Account type" value={bankDetails.account_type ?? "—"} />
              <InfoRow label="Account number" value={maskAccount(bankDetails.account_number)} />
              <InfoRow label="Verification" value={hostProfile?.kyc_status ?? "pending"} />
            </div>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
          <h2 className="font-display text-2xl font-semibold">Payout history</h2>
          <PayoutTable payouts={payouts} />
        </section>
      </div>
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
      className={`relative overflow-hidden rounded-[1.5rem] p-5 ${featured ? "bg-gradient-brand text-primary-foreground shadow-glow-sm" : "card-flat"}`}
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
    <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function PayoutTable({
  payouts,
}: {
  payouts: Array<{ id: string; amount_kobo: number; status: string; created_at: string }>;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
      <table className="w-full text-sm">
        <thead className="bg-muted/35 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Payout</th>
            <th className="px-4 py-3 text-right">Status</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3 text-right">Created</th>
          </tr>
        </thead>
        <tbody>
          {payouts.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                No payout rows yet.
              </td>
            </tr>
          )}
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

function formatZar(kobo: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

function maskAccount(value: string | undefined) {
  if (!value) return "—";
  const visible = value.slice(-4);
  return `••••${visible}`;
}
