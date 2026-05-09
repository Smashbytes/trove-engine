import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  DollarSign,
  Layers3,
  ScanLine,
  Ticket,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { getHostWorkspace, getVerificationCopy } from "@/lib/host-workspace";
import { useDashboardKpis, useHostListings, useRecentBookings, useSalesByDay } from "@/lib/queries";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard - Trove Engine" },
      {
        name: "description",
        content:
          "Role-specific host dashboard with real listings, bookings, verification state, and revenue activity.",
      },
    ],
  }),
  component: Dashboard,
});

const formatZar = (kobo: number) =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(kobo / 100);

function Dashboard() {
  const { hostProfile } = useAuth();
  const workspace = getHostWorkspace(hostProfile?.host_type);
  const verification = getVerificationCopy(hostProfile?.kyc_status);

  const listingsQuery = useHostListings();
  const kpisQuery = useDashboardKpis();
  const recentBookingsQuery = useRecentBookings(6);
  const salesQuery = useSalesByDay(14);

  const listings = listingsQuery.data ?? [];
  const liveListings = listings.filter((listing) => listing.status === "live");
  const draftListings = listings.filter((listing) => listing.status === "draft");
  const archivedListings = listings.filter((listing) => listing.status === "archived");
  const kpis = kpisQuery.data;
  const isEmpty = !listingsQuery.isLoading && listings.length === 0;

  const heroActions = (
    <Link to="/listings/new">
      <Button className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95">
        Create {workspace.singularLabel.toLowerCase()}
      </Button>
    </Link>
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow={workspace.heroEyebrow}
        title={workspace.heroTitle}
        subtitle={workspace.heroSubtitle}
        actions={heroActions}
      />

      <section className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-6 shadow-card">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,0,115,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(144,94,255,0.12),transparent_26%)]" />
        <div className="relative grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                {workspace.label}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                  verification.tone === "success"
                    ? "bg-success/12 text-success"
                    : verification.tone === "warning"
                      ? "bg-warning/12 text-warning"
                      : verification.tone === "destructive"
                        ? "bg-destructive/12 text-destructive"
                        : "bg-white/8 text-white/65"
                }`}
              >
                {verification.label}
              </span>
            </div>

            <h2 className="mt-4 max-w-3xl font-display text-3xl font-bold tracking-[-0.03em] md:text-4xl">
              {hostProfile?.verified
                ? `Your ${workspace.shortLabel.toLowerCase()} workspace is live and reading from real host data.`
                : `Your ${workspace.shortLabel.toLowerCase()} workspace is now real, but still staged behind verification.`}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {verification.message} The navigation, creation flow, and dashboard language now stay
              aligned to this host type instead of exposing unrelated platform systems.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <SignalCard
                label={`Live ${workspace.shortLabel.toLowerCase()}`}
                value={liveListings.length.toString()}
                hint={
                  hostProfile?.verified
                    ? "Visible to guests now"
                    : "Will go live after verification"
                }
                icon={Layers3}
              />
              <SignalCard
                label="Drafts in progress"
                value={draftListings.length.toString()}
                hint="Ready for internal preparation"
                icon={Clock3}
              />
              <SignalCard
                label="Verification state"
                value={verification.label}
                hint={hostProfile?.city ?? "City not set yet"}
                icon={CheckCircle2}
              />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/8 bg-black/20 p-5">
            <p className="eyebrow text-white/55">Next moves</p>
            <div className="mt-4 space-y-3">
              <ActionRow
                title={
                  hostProfile?.verified
                    ? `Publish another ${workspace.singularLabel.toLowerCase()}`
                    : `Keep building ${workspace.shortLabel.toLowerCase()} drafts`
                }
                body={
                  hostProfile?.verified
                    ? `Use the real ${workspace.singularLabel.toLowerCase().toLowerCase()} flow to add more inventory.`
                    : "Verification is still the gate for going live, so draft quality matters right now."
                }
                to="/listings/new"
              />
              <ActionRow
                title={`Refine your ${workspace.profileLabel.toLowerCase()}`}
                body="Tighten the public business story and keep the host identity consistent."
                to="/profile"
              />
              <ActionRow
                title={`Monitor ${workspace.bookingModeLabel.toLowerCase()}`}
                body="Recent activity and issued codes update from the actual booking records."
                to="/scanner"
              />
            </div>
          </div>
        </div>
      </section>

      {isEmpty && <EmptyWorkspace />}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          featured
          label="Revenue · 7d"
          value={kpis ? formatZar(kpis.revenueKobo7d) : "—"}
          detail="Confirmed and completed bookings net of fees"
          icon={DollarSign}
        />
        <MetricCard
          label={`${workspace.bookingModeLabel} · 7d`}
          value={kpis?.bookings7d?.toString() ?? "—"}
          detail="Real bookings on this host account"
          icon={Ticket}
        />
        <MetricCard
          label={workspace.hostType === "accommodation" ? "Occupancy signal" : "Fill rate"}
          value={kpis ? `${kpis.fillRatePct}%` : "—"}
          detail="Calculated across live listings"
          icon={Users}
        />
        <MetricCard
          label="Scans · 7d"
          value={kpis?.scans7d?.toString() ?? "—"}
          detail="Used ticket codes recorded"
          icon={ScanLine}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-card">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h3 className="font-display text-xl font-semibold">Revenue pulse</h3>
              <p className="text-xs text-muted-foreground">
                The last 14 days of real booking revenue from this host workspace.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {salesQuery.data?.length ?? 0} data points
            </span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={(salesQuery.data ?? []).map((point) => ({
                  date: point.date,
                  revenue: point.revenueKobo / 100,
                }))}
                margin={{ top: 10, right: 8, left: -12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="host-revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.75 0.3 340)" stopOpacity={0.75} />
                    <stop offset="100%" stopColor="oklch(0.75 0.3 340)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.27 0.04 320 / 0.45)" />
                <XAxis
                  dataKey="date"
                  stroke="oklch(0.68 0.04 320)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="oklch(0.68 0.04 320)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.17 0.025 320)",
                    border: "1px solid oklch(0.30 0.04 320 / 0.6)",
                    borderRadius: 16,
                    fontSize: 12,
                  }}
                  formatter={(value) => [`R ${Number(value).toLocaleString("en-ZA")}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="oklch(0.75 0.3 340)"
                  strokeWidth={2.25}
                  fill="url(#host-revenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-card">
          <h3 className="font-display text-xl font-semibold">Recent activity</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Bookings are now pulled from the signed-in host account instead of seeded demo data.
          </p>
          <div className="mt-5 space-y-3">
            {(recentBookingsQuery.data?.length ?? 0) === 0 && (
              <p className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                No booking activity yet.
              </p>
            )}
            {(recentBookingsQuery.data ?? []).map((booking, index) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
                className="rounded-2xl border border-border/60 bg-background/45 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {booking.listing_title || workspace.singularLabel}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Booking #{booking.id.slice(0, 8)} · Party size {booking.party_size}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {formatZar(booking.total_kobo)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="capitalize">{booking.status}</span>
                  <span>{new Date(booking.created_at).toLocaleDateString("en-ZA")}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-card">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h3 className="font-display text-xl font-semibold">{workspace.shortLabel}</h3>
              <p className="text-xs text-muted-foreground">
                A real snapshot of this host's listings, grouped by what can actually be sold right
                now.
              </p>
            </div>
            <Link to="/listings" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {listings.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                No listings created yet.
              </p>
            )}
            {listings.slice(0, 5).map((listing) => (
              <Link
                key={listing.id}
                to="/listings/$listingId"
                params={{ listingId: listing.id }}
                className="block rounded-2xl border border-border/60 bg-background/45 p-4 transition-colors hover:border-primary/35"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{listing.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {listing.city || "City not set"} · Updated{" "}
                      {new Date(listing.updated_at).toLocaleDateString("en-ZA")}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${statusTone(listing.status)}`}
                  >
                    {listing.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <ListingMiniStat label="Booked" value={listing.capacity_booked.toString()} />
                  <ListingMiniStat
                    label="Capacity"
                    value={listing.capacity?.toString() ?? "Open"}
                  />
                  <ListingMiniStat
                    label="Base price"
                    value={listing.base_price_kobo > 0 ? formatZar(listing.base_price_kobo) : "TBC"}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/60 bg-card p-5 shadow-card">
          <h3 className="font-display text-xl font-semibold">Pipeline health</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            A simple rollout view so you know what is live, what is being prepared, and what is
            shelved.
          </p>
          <div className="mt-5 space-y-4">
            <PipelineRow
              label="Live"
              count={liveListings.length}
              body="Visible to the guest-facing platform right now."
            />
            <PipelineRow
              label="Draft"
              count={draftListings.length}
              body="Still internal. Safe for refinement while you pitch and verify partners."
            />
            <PipelineRow
              label="Archived"
              count={archivedListings.length}
              body="Inactive inventory preserved for reference."
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MetricCard({
  featured,
  label,
  value,
  detail,
  icon: Icon,
}: {
  featured?: boolean;
  label: string;
  value: string;
  detail: string;
  icon: typeof DollarSign;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.5rem] p-5 ${featured ? "bg-gradient-brand text-primary-foreground shadow-glow-sm" : "card-flat"}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`eyebrow ${featured ? "text-primary-foreground/80" : ""}`}>{label}</p>
          <p className="mt-3 font-display text-3xl font-bold">{value}</p>
          <p className={`mt-2 text-xs ${featured ? "text-white/80" : "text-muted-foreground"}`}>
            {detail}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${featured ? "bg-white/15 text-white" : "bg-primary/10 text-primary"}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function SignalCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Layers3;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-white/55">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold">{value}</p>
          <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function ActionRow({ title, body, to }: { title: string; body: string; to: string }) {
  return (
    <Link
      to={to}
      className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition-colors hover:border-primary/35"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
        <ArrowRight className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{body}</p>
      </div>
    </Link>
  );
}

function ListingMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-bold">{value}</p>
    </div>
  );
}

function PipelineRow({ label, count, body }: { label: string; count: number; body: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/45 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="font-display text-lg font-semibold">{label}</p>
        <span className="font-display text-2xl font-bold text-gradient">{count}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function EmptyWorkspace() {
  return (
    <div className="mt-6 rounded-[2rem] border border-primary/30 bg-gradient-brand-soft p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow text-primary">First real record</p>
          <h3 className="mt-1 font-display text-2xl font-semibold">Nothing seeded here anymore.</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with a real host listing and the workspace will begin filling itself with actual
            activity.
          </p>
        </div>
        <Link to="/listings/new">
          <Button className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95">
            Create listing
          </Button>
        </Link>
      </div>
    </div>
  );
}

function statusTone(status: string) {
  if (status === "live") return "bg-success/12 text-success";
  if (status === "draft") return "bg-white/8 text-white/70";
  if (status === "archived") return "bg-muted/30 text-muted-foreground";
  return "bg-warning/12 text-warning";
}
