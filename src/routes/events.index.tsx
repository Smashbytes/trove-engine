import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, MapPin, Plus, Ticket, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { useTroveData, ZAR } from "@/lib/trove-store";
import { motion } from "framer-motion";

export const Route = createFileRoute("/events")({
  head: () => ({ meta: [{ title: "Events · Trove Engine" }] }),
  component: EventsPage,
});

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

function EventsPage() {
  const { events } = useTroveData();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Your line-up"
        title="Events"
        subtitle="Every event you've published — live, sold out, or in the books."
        actions={
          <Link to="/events/new">
            <Button className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95">
              <Plus className="mr-1.5 h-4 w-4" /> Create Event
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {events.map((e, i) => {
          const sold = e.tiers.reduce((s, t) => s + t.sold, 0);
          const cap = e.tiers.reduce((s, t) => s + t.inventory, 0);
          const pct = Math.round((sold / cap) * 100);
          const revenue = e.tiers.reduce((s, t) => s + t.sold * t.price, 0);
          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Link
                to="/events/$eventId"
                params={{ eventId: e.id }}
                className="group block overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card transition-all hover:border-primary/40 hover:shadow-glow-sm"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img src={e.cover} alt={e.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                  <div className="absolute left-3 top-3 flex gap-2">
                    {statusBadge(e.status)}
                    <span className="rounded-full border border-border/60 bg-background/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">
                      {e.category}
                    </span>
                  </div>
                  <div className="absolute right-3 top-3 rounded-full bg-background/80 p-1.5 backdrop-blur opacity-0 transition group-hover:opacity-100">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-lg font-semibold leading-tight">{e.title}</h3>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(e.date).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.venue}</span>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-brand" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground"><Ticket className="mr-1 inline h-3 w-3" />{sold}/{cap}</span>
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
