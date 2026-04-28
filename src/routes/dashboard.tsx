import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { ArrowUpRight, TrendingUp, DollarSign, Ticket, Users, ScanLine } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import {
  useTroveData, salesByDay, ZAR, kpisForSpotType,
  listingRevenue, listingBookingsCount, listingCapacity, listingTypeLabel,
} from "@/lib/trove-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Trove Engine" },
      { name: "description", content: "Real-time view of your Spot's sales, bookings and check-ins." },
    ],
  }),
  component: Dashboard,
});

const ICONS = [DollarSign, Ticket, Users, ScanLine];

function Dashboard() {
  const { listings, profile } = useTroveData();
  const sales = salesByDay(listings, 14);
  const kpis = kpisForSpotType(profile.spotType, listings);
  const live = listings.filter((l) => l.status === "live");

  // Recent bookings flattened across all types
  const recent = listings.flatMap((l) => {
    if (l.type === "event") return l.attendees.map((a) => ({ id: a.id, name: a.name, sub: `${a.tierName} · ${l.title}`, ts: a.purchasedAt }));
    if (l.type === "timeslot") return l.bookings.map((b) => ({ id: b.id, name: b.name, sub: `${b.date} ${b.slotTime} · ${l.title}`, ts: b.purchasedAt }));
    if (l.type === "stay") return l.reservations.map((r) => ({ id: r.id, name: r.name, sub: `${r.roomName} · ${l.title}`, ts: r.purchasedAt }));
    if (l.type === "open_pass") return l.passes.map((p) => ({ id: p.id, name: p.name, sub: `${p.passTypeName} · ${l.title}`, ts: p.purchasedAt }));
    return l.groupBookings.map((g) => ({ id: g.id, name: g.name, sub: `Group of ${g.groupSize} · ${l.title}`, ts: g.purchasedAt }));
  }).sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 6);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Command centre"
        title="Welcome back to the Engine"
        subtitle="Real-time view of your sales, bookings and what's coming up."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = ICONS[i] ?? DollarSign;
          return (
            <motion.div key={k.label}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-card">
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-brand opacity-10 blur-2xl" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</p>
                  <p className="mt-2 font-display text-3xl font-bold">{k.value}</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand-soft text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-success">
                <TrendingUp className="h-3 w-3" /> {k.delta}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card lg:col-span-2">
          <div className="mb-4">
            <h3 className="font-display text-lg font-semibold">Sales · last 14 days</h3>
            <p className="text-xs text-muted-foreground">Revenue across all live listings</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sales} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                  formatter={(val) => [ZAR(Number(val)), "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.68 0.27 350)" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
          <h3 className="font-display text-lg font-semibold">Live listings</h3>
          <p className="mb-4 text-xs text-muted-foreground">Now selling on Trove Seekers</p>
          <div className="space-y-3">
            {live.slice(0, 4).map((l) => {
              const sold = listingBookingsCount(l);
              const cap = listingCapacity(l);
              const pct = cap > 0 ? Math.min(100, Math.round((sold / cap) * 100)) : 0;
              return (
                <Link key={l.id} to="/listings/$listingId" params={{ listingId: l.id }}
                  className="block rounded-xl border border-border/60 bg-background/50 p-3 transition-colors hover:border-primary/50">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{l.title}</p>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{listingTypeLabel(l.type)}</span>
                    <span className="truncate">{l.venue}</span>
                  </div>
                  {cap > 0 && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-gradient-brand" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{sold}{cap > 0 ? `/${cap}` : ""} bookings</span>
                    <span className="text-primary">{ZAR(listingRevenue(l))}</span>
                  </div>
                </Link>
              );
            })}
            {live.length === 0 && <p className="text-sm text-muted-foreground">No live listings yet.</p>}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card lg:col-span-2">
          <h3 className="mb-4 font-display text-lg font-semibold">Revenue by listing</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={listings.map((l) => ({
                name: l.title.length > 18 ? l.title.slice(0, 16) + "…" : l.title,
                revenue: listingRevenue(l),
              }))} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.27 0.04 320 / 0.4)" />
                <XAxis dataKey="name" stroke="oklch(0.68 0.04 320)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.04 320)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.17 0.025 320)", border: "1px solid oklch(0.30 0.04 320 / 0.6)", borderRadius: 12, fontSize: 12 }}
                  cursor={{ fill: "oklch(0.68 0.27 350 / 0.1)" }}
                  formatter={(v) => [ZAR(Number(v)), "Revenue"]}
                />
                <Bar dataKey="revenue" fill="oklch(0.68 0.27 350)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
          <h3 className="mb-4 font-display text-lg font-semibold">Recent bookings</h3>
          <div className="space-y-3">
            {recent.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
            {recent.map((r) => (
              <div key={r.id} className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-brand text-[11px] font-semibold text-primary-foreground">
                  {r.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
