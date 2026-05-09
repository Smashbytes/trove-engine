import { createFileRoute, Link } from "@tanstack/react-router";
import { Filter, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { getHostWorkspace } from "@/lib/host-workspace";
import { useHostListings } from "@/lib/queries";

export const Route = createFileRoute("/listings/")({
  head: () => ({
    meta: [
      { title: "Listings - Trove Engine" },
      {
        name: "description",
        content:
          "Real host listings grouped by live, draft, and archived state inside the focused Trove Engine workspace.",
      },
    ],
  }),
  component: ListingsPage,
});

type StatusFilter = "all" | "live" | "draft" | "archived" | "paused";

function ListingsPage() {
  const { hostProfile } = useAuth();
  const workspace = getHostWorkspace(hostProfile?.host_type);
  const listingsQuery = useHostListings();
  const [filter, setFilter] = useState<StatusFilter>("all");

  const listings = listingsQuery.data ?? [];
  const counts = useMemo(
    () => ({
      all: listings.length,
      live: listings.filter((listing) => listing.status === "live").length,
      draft: listings.filter((listing) => listing.status === "draft").length,
      archived: listings.filter((listing) => listing.status === "archived").length,
      paused: listings.filter((listing) => listing.status === "paused").length,
    }),
    [listings],
  );

  const filteredListings =
    filter === "all" ? listings : listings.filter((listing) => listing.status === filter);

  return (
    <AppShell>
      <PageHeader
        eyebrow={workspace.heroEyebrow}
        title={workspace.shortLabel}
        subtitle={`Every real ${workspace.singularLabel.toLowerCase()} record for this ${workspace.label.toLowerCase()} account, kept inside the correct host workspace.`}
        actions={
          <Link to="/listings/new">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-1.5 h-4 w-4" />
              New {workspace.singularLabel.toLowerCase()}
            </Button>
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {(
          [
            { id: "all", label: "All" },
            { id: "live", label: "Live" },
            { id: "draft", label: "Drafts" },
            { id: "paused", label: "Paused" },
            { id: "archived", label: "Archived" },
          ] as const
        ).map((item) => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ring-1 ${
                active
                  ? "ring-primary bg-primary text-primary-foreground"
                  : "ring-[var(--hairline)] text-muted-foreground hover:text-foreground hover:ring-[var(--hairline-strong)]"
              }`}
            >
              {item.label}
              <span className="ml-1.5 opacity-65">{counts[item.id]}</span>
            </button>
          );
        })}
      </div>

      {filteredListings.length === 0 && (
        <div className="rounded-[2rem] border border-dashed border-border/60 p-12 text-center">
          <p className="font-display text-2xl font-semibold">
            No {filter === "all" ? workspace.shortLabel.toLowerCase() : filter} here yet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a real {workspace.singularLabel.toLowerCase()} and it will appear here instead of
            seeded placeholder content.
          </p>
          <Link to="/listings/new">
            <Button className="mt-5 bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95">
              Create {workspace.singularLabel.toLowerCase()}
            </Button>
          </Link>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {filteredListings.map((listing, index) => (
          <motion.div
            key={listing.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.04 }}
          >
            <Link
              to="/listings/$listingId"
              params={{ listingId: listing.id }}
              className="group block overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-card transition-all hover:border-primary/35 hover:shadow-lift"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                {listing.cover_url ? (
                  <img
                    src={listing.cover_url}
                    alt={listing.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-full w-full bg-[linear-gradient(135deg,rgba(255,0,115,0.2),rgba(121,57,255,0.18),rgba(255,255,255,0.02))]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-2)] via-[var(--surface-2)]/35 to-transparent" />
                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/12 bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75 backdrop-blur">
                    {workspace.singularLabel}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${statusTone(listing.status)}`}
                  >
                    {listing.status}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-xl font-semibold">{listing.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {listing.city || "City not set"} · Updated{" "}
                      {new Date(listing.updated_at).toLocaleDateString("en-ZA")}
                    </p>
                  </div>
                  <span className="font-display text-lg font-bold text-gradient">
                    {listing.base_price_kobo > 0 ? formatZar(listing.base_price_kobo) : "TBC"}
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {listing.description ||
                    `This ${workspace.singularLabel.toLowerCase()} has been created on the real host account and is ready for richer detail.`}
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <MiniStat label="Booked" value={listing.capacity_booked.toString()} />
                  <MiniStat label="Capacity" value={listing.capacity?.toString() ?? "Open"} />
                  <MiniStat label="Check-ins" value={listing.checked_in_count.toString()} />
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </AppShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-bold">{value}</p>
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

function statusTone(status: string) {
  if (status === "live") return "bg-success/12 text-success";
  if (status === "draft") return "bg-white/12 text-white/75";
  if (status === "paused") return "bg-warning/12 text-warning";
  return "bg-muted/35 text-muted-foreground";
}
