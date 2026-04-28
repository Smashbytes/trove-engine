import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, MapPin, Plus, ArrowUpRight, Filter } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import {
  useTroveData, ZAR,
  listingRevenue, listingBookingsCount, listingCapacity, listingDateLabel,
  listingTypeLabel, type ListingType,
} from "@/lib/trove-store";

export const Route = createFileRoute("/listings/")({
  head: () => ({
    meta: [
      { title: "Listings · Trove Engine" },
      { name: "description", content: "Every listing your Spot has published — events, stays, slots, exhibits and packages." },
    ],
  }),
  component: ListingsPage,
});

const FILTER_TYPES: Array<{ id: ListingType | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "event", label: "Events" },
  { id: "timeslot", label: "Slots" },
  { id: "stay", label: "Stays" },
  { id: "open_pass", label: "Passes" },
  { id: "package", label: "Packages" },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    live: "bg-success/15 text-success border-success/30",
    sold_out: "bg-primary/15 text-primary border-primary/30",
    draft: "bg-muted text-muted-foreground border-border",
    ended: "bg-muted/50 text-muted-foreground border-border",
  };
  const label = status === "sold_out" ? "Sold Out" : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${map[status]}`}>
      {status === "live" && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
      {label}
    </span>
  );
}

function typeChip(t: ListingType) {
  const colors: Record<ListingType, string> = {
    event:     "bg-pink-500/15 text-pink-300 border-pink-500/30",
    timeslot:  "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    stay:      "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    open_pass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    package:   "bg-violet-500/15 text-violet-300 border-violet-500/30",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${colors[t]}`}>
      {listingTypeLabel(t)}
    </span>
  );
}

function ListingsPage() {
  const { listings } = useTroveData();
  const [filter, setFilter] = useState<ListingType | "all">("all");

  const filtered = filter === "all" ? listings : listings.filter((l) => l.type === filter);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Your line-up"
        title="Listings"
        subtitle="Everything your Spot is selling — events, stays, slots, passes and packages."
        actions={
          <Link to="/listings/new">
            <Button className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95">
              <Plus className="mr-1.5 h-4 w-4" /> Create listing
            </Button>
          </Link>
        }
      />

      {/* Filter chips */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {FILTER_TYPES.map((f) => {
          const count = f.id === "all" ? listings.length : listings.filter((l) => l.type === f.id).length;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                active
                  ? "border-primary bg-gradient-brand text-primary-foreground shadow-glow-sm"
                  : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {f.label} <span className="opacity-60">· {count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center">
          <p className="text-muted-foreground">No listings of this type yet.</p>
          <Link to="/listings/new"><Button className="mt-4 bg-gradient-brand text-primary-foreground">Create one</Button></Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((l, i) => {
          const sold = listingBookingsCount(l);
          const cap = listingCapacity(l);
          const pct = cap > 0 ? Math.min(100, Math.round((sold / cap) * 100)) : 0;
          const revenue = listingRevenue(l);
          return (
            <motion.div key={l.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.04 }}>
              <Link
                to="/listings/$listingId" params={{ listingId: l.id }}
                className="group block overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card transition-all hover:border-primary/40 hover:shadow-glow-sm"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img src={l.cover} alt={l.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                  <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                    {typeChip(l.type)}
                    {statusBadge(l.status)}
                  </div>
                  <div className="absolute right-3 top-3 rounded-full bg-background/80 p-1.5 backdrop-blur opacity-0 transition group-hover:opacity-100">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-semibold leading-tight">{l.title}</h3>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{listingDateLabel(l)}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{l.venue}</span>
                  </div>
                  {cap > 0 && (
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-gradient-brand" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {sold} {l.type === "stay" ? "bookings" : l.type === "package" ? "groups" : "sold"}
                      {cap > 0 ? ` · ${pct}%` : ""}
                    </span>
                    <span className="font-semibold text-gradient">{ZAR(revenue)}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </AppShell>
  );
}
