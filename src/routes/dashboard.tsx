import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { ArrowUpRight, TrendingUp, Ticket, ScanLine, DollarSign, Users } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { useTroveData, totals, salesByDay, ZAR } from "@/lib/trove-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Trove Engine" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { events } = useTroveData();
  const t = totals(events);
  const sales = salesByDay(events, 14);
  const live = events.filter((e) => e.status === "live");

  const recent = events
    .flatMap((e) => e.attendees.map((a) => ({ ...a, eventTitle: e.title, eventId: e.id })))
    .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
    .slice(0, 6);

  const kpis = [
    { label: "Revenue", value: ZAR(t.revenue), icon: DollarSign, delta: "+18%" },
    { label: "Tickets sold", value: t.sold.toLocaleString(), icon: Ticket, delta: "+12%" },
    { label: "Capacity used", value: `${Math.round((t.sold / Math.max(t.capacity, 1)) * 100)}%`, icon: Users, delta: `${t.sold}/${t.capacity}` },
    { label: "Checked in", value: t.checkedIn.toLocaleString(), icon: ScanLine, delta: "live" },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Tonight's command centre"
        title="Welcome back to the Engine"
        subtitle="Real-time view of your sales, scans and what's coming up."
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-card"
          >
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-brand opacity-10 blur-2xl" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k.label}</p>
                <p className="mt-2 font-display text-3xl font-bold">{k.value}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand-soft text-primary">
                <k.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-success">
              <TrendingUp className="h-3 w-3" /> {k.delta}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart + tickets per event */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Sales · last 14 days</h3>
              <p className="text-xs text-muted-foreground">Revenue and tickets sold across all live events</p>
            </div>
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
                  contentStyle={{
                    background: "oklch(0.17 0.025 320)",
                    border: "1px solid oklch(0.30 0.04 320 / 0.6)",
                    borderRadius: 12, fontSize: 12,
                  }}
                  formatter={(val) => [ZAR(Number(val)), "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.68 0.27 350)" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
          <h3 className="font-display text-lg font-semibold">Live events</h3>
          <p className="mb-4 text-xs text-muted-foreground">Now selling on Trove Seekers</p>
          <div className="space-y-3">
            {live.slice(0, 4).map((e) => {
              const sold = e.tiers.reduce((s, t) => s + t.sold, 0);
              const cap = e.tiers.reduce((s, t) => s + t.inventory, 0);
              const pct = Math.round((sold / cap) * 100);
              return (
                <Link
                  key={e.id}
                  to="/events/$eventId"
                  params={{ eventId: e.id }}
                  className="block rounded-xl border border-border/60 bg-background/50 p-3 transition-colors hover:border-primary/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{e.title}</p>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{e.venue}</div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-brand" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{sold}/{cap} sold</span>
                    <span className="text-primary">{pct}%</span>
                  </div>
                </Link>
              );
            })}
            {live.length === 0 && <p className="text-sm text-muted-foreground">No live events yet.</p>}
          </div>
        </div>
      </div>

      {/* Tickets per event + recent sales */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card lg:col-span-2">
          <h3 className="mb-4 font-display text-lg font-semibold">Tickets sold per event</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={events.map((e) => ({
                name: e.title.length > 18 ? e.title.slice(0, 16) + "…" : e.title,
                sold: e.tiers.reduce((s, t) => s + t.sold, 0),
              }))} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.27 0.04 320 / 0.4)" />
                <XAxis dataKey="name" stroke="oklch(0.68 0.04 320)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.04 320)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.17 0.025 320)",
                    border: "1px solid oklch(0.30 0.04 320 / 0.6)",
                    borderRadius: 12, fontSize: 12,
                  }}
                  cursor={{ fill: "oklch(0.68 0.27 350 / 0.1)" }}
                />
                <Bar dataKey="sold" fill="oklch(0.68 0.27 350)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
          <h3 className="mb-4 font-display text-lg font-semibold">Recent sales</h3>
          <div className="space-y-3">
            {recent.map((r) => (
              <div key={r.id} className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-brand text-[11px] font-semibold text-primary-foreground">
                  {r.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.tierName} · {r.eventTitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
