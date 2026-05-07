import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { ArrowUpRight, TrendingUp, DollarSign, Ticket, Users, ScanLine, Sparkles } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { useDashboardKpis, useHostListings, useRecentBookings, useSalesByDay } from "@/lib/queries";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Trove Engine" },
      { name: "description", content: "Real-time view of your Spot's sales, bookings and check-ins." },
    ],
  }),
  component: Dashboard,
});

const ZAR = (kobo: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 })
    .format(kobo / 100);

function Dashboard() {
  const kpisQ      = useDashboardKpis();
  const listingsQ  = useHostListings();
  const recentQ    = useRecentBookings(6);
  const salesQ     = useSalesByDay(14);

  const k = kpisQ.data;
  const live = (listingsQ.data ?? []).filter((l) => l.status === "live");

  const KPIS = [
    { label: "Revenue · 7d",   value: k ? ZAR(k.revenueKobo7d) : "—",     icon: DollarSign, delta: "vs prev. 7d" },
    { label: "Bookings · 7d",  value: k?.bookings7d?.toString() ?? "—",   icon: Ticket,     delta: "confirmed + completed" },
    { label: "Avg fill rate",  value: k ? `${k.fillRatePct}%` : "—",      icon: Users,      delta: "across live listings" },
    { label: "Scans · 7d",     value: k?.scans7d?.toString() ?? "—",      icon: ScanLine,   delta: "successful check-ins" },
  ];

  const isEmpty = !kpisQ.isLoading && (listingsQ.data?.length ?? 0) === 0;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Command centre"
        title="Welcome back to the Engine"
        subtitle="Real-time view of your sales, bookings and what's coming up."
      />

      {isEmpty && <FirstRunEmpty />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi, i) => {
          const featured = i === 0;
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className={`relative overflow-hidden rounded-2xl p-5 ${featured
                ? "bg-gradient-brand text-primary-foreground shadow-glow-sm"
                : "card-flat"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`eyebrow ${featured ? "text-primary-foreground/80" : ""}`}>{kpi.label}</p>
                  <p className="mt-3 font-display text-3xl font-bold">{kpi.value}</p>
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${featured
                  ? "bg-white/15 text-white"
                  : "bg-primary/10 text-primary"}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className={`mt-3 flex items-center gap-1 text-xs ${featured ? "text-white/85" : "text-muted-foreground"}`}>
                <TrendingUp className="h-3 w-3" /> {kpi.delta}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card lg:col-span-2">
          <div className="mb-4">
            <h3 className="font-display text-lg font-semibold">Sales · last 14 days</h3>
            <p className="text-xs text-muted-foreground">Revenue across all listings (net of fees)</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={(salesQ.data ?? []).map(p => ({ date: p.date, revenue: p.revenueKobo / 100 }))}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.68 0.27 350)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="oklch(0.68 0.27 350)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.27 0.04 320 / 0.4)" />
                <XAxis dataKey="date" stroke="oklch(0.68 0.04 320)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.04 320)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.17 0.025 320)", border: "1px solid oklch(0.30 0.04 320 / 0.6)", borderRadius: 12, fontSize: 12 }}
                  formatter={(val) => [`R ${Number(val).toLocaleString("en-ZA")}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.68 0.27 350)" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
          <h3 className="font-display text-lg font-semibold">Live listings</h3>
          <p className="mb-4 text-xs text-muted-foreground">Now selling on TROVE</p>
          <div className="space-y-3">
            {live.length === 0 && <p className="text-sm text-muted-foreground">No live listings yet.</p>}
            {live.slice(0, 4).map((l) => {
              const cap = l.capacity ?? 0;
              const sold = l.capacity_booked;
              const pct = cap > 0 ? Math.min(100, Math.round((sold / cap) * 100)) : 0;
              return (
                <Link key={l.id} to="/listings/$listingId" params={{ listingId: l.id }}
                  className="block rounded-xl border border-border/60 bg-background/50 p-3 transition-colors hover:border-primary/50">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{l.title}</p>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary capitalize">
                      {l.listing_type}
                    </span>
                    {l.city && <span className="truncate">{l.city}</span>}
                  </div>
                  {cap > 0 && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-gradient-brand" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{sold}{cap > 0 ? `/${cap}` : ""} booked</span>
                    <span className="text-primary">{ZAR((l.base_price_kobo ?? 0) * sold)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card lg:col-span-2">
          <h3 className="mb-4 font-display text-lg font-semibold">Capacity by listing</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(listingsQ.data ?? []).slice(0, 8).map((l) => ({
                  name: l.title.length > 18 ? l.title.slice(0, 16) + "…" : l.title,
                  booked: l.capacity_booked,
                  remaining: Math.max(0, (l.capacity ?? 0) - l.capacity_booked),
                }))}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.27 0.04 320 / 0.4)" />
                <XAxis dataKey="name" stroke="oklch(0.68 0.04 320)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.04 320)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.17 0.025 320)", border: "1px solid oklch(0.30 0.04 320 / 0.6)", borderRadius: 12, fontSize: 12 }}
                  cursor={{ fill: "oklch(0.68 0.27 350 / 0.1)" }}
                />
                <Bar dataKey="booked"    stackId="a" fill="oklch(0.68 0.27 350)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="remaining" stackId="a" fill="oklch(0.30 0.04 320)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
          <h3 className="mb-4 font-display text-lg font-semibold">Recent bookings</h3>
          <div className="space-y-3">
            {(recentQ.data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
            {(recentQ.data ?? []).map((b) => (
              <div key={b.id} className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                  {b.id.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    Party of {b.party_size} · <span className="capitalize text-muted-foreground">{b.status}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{b.listing_title}</p>
                </div>
                <span className="text-xs font-semibold text-primary">{ZAR(b.total_kobo)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function FirstRunEmpty() {
  return (
    <div className="mb-6 rounded-2xl border border-primary/30 bg-gradient-brand-soft p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow text-primary">Get started</p>
          <h3 className="mt-1 font-display text-xl font-semibold">No listings yet — let's publish your first spot.</h3>
          <p className="mt-1 text-sm text-muted-foreground">Bookings, scans, and revenue will start appearing here once you go live.</p>
        </div>
        <Link to="/listings/new">
          <Button className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95">
            <Sparkles className="mr-1.5 h-4 w-4" /> Create your first listing
          </Button>
        </Link>
      </div>
    </div>
  );
}
