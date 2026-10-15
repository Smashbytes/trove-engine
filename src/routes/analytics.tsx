import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Link2, MousePointerClick, Percent, Ticket, Wallet } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { PermissionGate } from "@/components/trove/PermissionGate";
import { useAuth } from "@/lib/auth";
import { summarizeShareLinks, useShareLinks, type ShareLinkRow } from "@/lib/share-links";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics · Trove Engine" }] }),
  component: AnalyticsPage,
});

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X",
  tiktok: "TikTok",
  qr: "Poster QR",
  link: "Other",
  email: "Email",
  guest: "Guest shares",
};

interface Bucket {
  key: string;
  label: string;
  clicks: number;
  bookings: number;
  salesKobo: number | null;
}

function bucketBy(links: ShareLinkRow[], keyOf: (l: ShareLinkRow) => string, labelOf: (l: ShareLinkRow) => string) {
  const m = new Map<string, Bucket>();
  for (const l of links) {
    const key = keyOf(l);
    const b = m.get(key) ?? { key, label: labelOf(l), clicks: 0, bookings: 0, salesKobo: null };
    b.clicks += l.clicks;
    b.bookings += l.bookings;
    if (l.sales_kobo != null) b.salesKobo = (b.salesKobo ?? 0) + l.sales_kobo;
    m.set(key, b);
  }
  return [...m.values()].sort((a, b) => b.bookings - a.bookings || b.clicks - a.clicks);
}

function AnalyticsPage() {
  const { activeHostId } = useAuth();
  const linksQuery = useShareLinks(activeHostId);
  const links = linksQuery.data ?? [];
  const totals = summarizeShareLinks(links);
  const clicks = totals.hostClicks + totals.guestClicks;

  // Guest referral links are rolled into one "Guest shares" row.
  const channels = useMemo(
    () =>
      bucketBy(
        links,
        (l) => (l.kind === "guest" ? "guest" : l.channel),
        (l) => CHANNEL_LABEL[l.kind === "guest" ? "guest" : l.channel] ?? l.channel,
      ),
    [links],
  );
  const listings = useMemo(
    () => bucketBy(links, (l) => l.listing_id, (l) => l.listing_title).slice(0, 8),
    [links],
  );

  return (
    <AppShell>
      <PermissionGate perm="payouts.view">
        <PageHeader
          eyebrow="What's working"
          title="Analytics"
          subtitle="Where your crowd comes from — clicks and bookings from your share links and guests' shares."
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi icon={MousePointerClick} label="Link clicks" value={clicks.toLocaleString("en-ZA")} />
          <Kpi icon={Ticket} label="Bookings from shares" value={totals.bookings.toLocaleString("en-ZA")} />
          <Kpi icon={Percent} label="Click → booking" value={rate(totals.bookings, clicks)} />
          <Kpi
            icon={Wallet}
            label="Ticket sales from shares"
            value={totals.salesKobo == null ? "—" : formatZar(totals.salesKobo)}
          />
        </div>

        {linksQuery.isLoading ? (
          <div className="mt-6 rounded-[1.75rem] border border-border/60 bg-card p-12 text-center text-sm text-muted-foreground shadow-card">
            Loading share stats…
          </div>
        ) : links.length === 0 ? (
          <div className="mt-6 rounded-[1.75rem] border border-border/60 bg-card p-12 text-center shadow-card">
            <Link2 className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-3 font-display text-lg font-semibold">No share links yet</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Open any listing and use its Share kit to grab a WhatsApp, Instagram or poster link.
              Clicks and bookings from each one show up here.
            </p>
            <Link
              to="/listings"
              className="mt-4 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Go to listings
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 2xl:grid-cols-2">
            <BreakdownTable title="By channel" firstColumn="Channel" rows={channels} />
            <BreakdownTable title="Top listings" firstColumn="Listing" rows={listings} />
          </div>
        )}

        <div className="mt-6 rounded-[1.75rem] border border-border/60 bg-card p-8 text-center shadow-card">
          <BarChart3 className="mx-auto h-7 w-7 text-muted-foreground" />
          <h3 className="mt-3 font-display text-base font-semibold">More analytics on the way</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Revenue trends, fill rates and repeat-guest cohorts land here once you have a few completed
            bookings.
          </p>
        </div>
      </PermissionGate>
    </AppShell>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof Link2; label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-border/60 bg-card p-4 shadow-card">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function BreakdownTable({ title, firstColumn, rows }: { title: string; firstColumn: string; rows: Bucket[] }) {
  const showSales = rows.some((r) => r.salesKobo != null);
  return (
    <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-muted/35 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">{firstColumn}</th>
              <th className="px-4 py-3 text-right">Clicks</th>
              <th className="px-4 py-3 text-right">Bookings</th>
              <th className="px-4 py-3 text-right">Conv.</th>
              {showSales && <th className="px-4 py-3 text-right">Sales</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-border/60">
                <td className="max-w-[14rem] truncate px-4 py-3 text-left font-medium">{r.label}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.clicks.toLocaleString("en-ZA")}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.bookings.toLocaleString("en-ZA")}</td>
                <td className="px-4 py-3 text-right tabular-nums">{rate(r.bookings, r.clicks)}</td>
                {showSales && (
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.salesKobo == null ? "—" : formatZar(r.salesKobo)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function rate(bookings: number, clicks: number) {
  if (clicks === 0) return "—";
  return `${((bookings / clicks) * 100).toFixed(bookings / clicks < 0.1 ? 1 : 0)}%`;
}

function formatZar(kobo: number) {
  // `_kobo` is only the column name — values are ZAR cents.
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}
