import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/trove/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import type { AccommodationMetadata, VenueMetadata } from "@/lib/database.types";
import { getHostWorkspace } from "@/lib/host-workspace";
import {
  useDeleteListing,
  useListing,
  useListingAvailability,
  useListingBookings,
  useListingTicketTypes,
  useListingTickets,
  useRealtimeBookings,
} from "@/lib/queries";

export const Route = createFileRoute("/listings/$listingId")({
  head: () => ({
    meta: [
      { title: "Listing Detail - Trove Engine" },
      {
        name: "description",
        content:
          "Manage a real Trove host listing with live Supabase-backed detail, inventory, bookings, and issued codes.",
      },
    ],
  }),
  component: ListingDetailPage,
  notFoundComponent: () => (
    <AppShell>
      <div className="py-24 text-center">
        <h2 className="font-display text-3xl font-semibold">Listing not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This listing either does not exist or is not available to the signed-in host.
        </p>
        <Link to="/listings">
          <Button className="mt-5">Back to listings</Button>
        </Link>
      </div>
    </AppShell>
  ),
});

function ListingDetailPage() {
  const navigate = useNavigate();
  const { hostProfile } = useAuth();
  const workspace = getHostWorkspace(hostProfile?.host_type);
  const { listingId } = Route.useParams();

  const listingQuery = useListing(listingId);
  const bookingsQuery = useListingBookings(listingId);
  const ticketTypesQuery = useListingTicketTypes(listingId);
  const availabilityQuery = useListingAvailability(listingId);
  const ticketsQuery = useListingTickets(listingId);
  const deleteListing = useDeleteListing();

  useRealtimeBookings(listingId);

  if (!listingQuery.isLoading && !listingQuery.data) {
    throw notFound();
  }

  const listing = listingQuery.data;
  if (!listing) {
    return (
      <AppShell>
        <div className="py-24 text-center text-muted-foreground">Loading listing…</div>
      </AppShell>
    );
  }

  const shareUrl = `https://www.welovetrove.co.za/host/${hostProfile?.slug ?? "trove"}/${listing.slug ?? listing.id}`;
  const bookings = bookingsQuery.data ?? [];
  const ticketTypes = ticketTypesQuery.data ?? [];
  const availability = availabilityQuery.data ?? [];
  const tickets = ticketsQuery.data ?? [];

  const handleDelete = async () => {
    const confirmed = window.confirm("Delete this listing?");
    if (!confirmed) return;

    try {
      await deleteListing.mutateAsync(listing.id);
      toast.success("Listing removed.");
      navigate({ to: "/listings" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete listing.");
    }
  };

  return (
    <AppShell>
      <Link
        to="/listings"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {workspace.shortLabel.toLowerCase()}
      </Link>

      <div className="overflow-hidden rounded-[2rem] border border-border/60 shadow-card">
        <div className="relative aspect-[21/8] overflow-hidden">
          {listing.cover_url ? (
            <img
              src={listing.cover_url}
              alt={listing.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,rgba(255,0,115,0.22),rgba(121,57,255,0.18),rgba(255,255,255,0.02))]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-card/10" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/12 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75 backdrop-blur">
                {workspace.singularLabel}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${statusTone(listing.status)}`}
              >
                {listing.status}
              </span>
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold tracking-[-0.03em] md:text-5xl">
              {listing.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {listing.city || "City not set"} · Updated{" "}
              {new Date(listing.updated_at).toLocaleDateString("en-ZA")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(shareUrl);
            toast.success("Share link copied.");
          }}
        >
          <Copy className="mr-1.5 h-4 w-4" />
          Copy share link
        </Button>
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Delete listing
        </Button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <MetricTile label="Booked" value={listing.capacity_booked.toString()} />
        <MetricTile label="Capacity" value={listing.capacity?.toString() ?? "Open"} />
        <MetricTile label="Check-ins" value={listing.checked_in_count.toString()} />
        <MetricTile
          label="Base price"
          value={listing.base_price_kobo > 0 ? formatZar(listing.base_price_kobo) : "TBC"}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
          <h2 className="font-display text-2xl font-semibold">Overview</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {listing.description ||
              `This ${workspace.singularLabel.toLowerCase()} is now a real record in the host workspace and can be iterated without relying on mock seed data.`}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <InfoCard label="Address" value={listing.address || "Not set"} />
            <InfoCard label="City" value={listing.city || "Not set"} />
            <InfoCard
              label="Amenities"
              value={listing.amenities.length ? listing.amenities.join(", ") : "Not set"}
            />
            <InfoCard label="Health score" value={listing.health_score.toString()} />
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
          <h2 className="font-display text-2xl font-semibold">Operations snapshot</h2>
          <div className="mt-5 space-y-3">
            <SummaryRow label="Bookings" value={bookings.length.toString()} />
            <SummaryRow label="Issued codes" value={tickets.length.toString()} />
            <SummaryRow
              label={workspace.inventoryLabel}
              value={(workspace.hostType === "experience"
                ? availability.length
                : ticketTypes.length
              ).toString()}
            />
            <SummaryRow label="Publish state" value={listing.status} />
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
          <h2 className="font-display text-2xl font-semibold">Inventory</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The inventory block shifts with the host type and reads from the real backing tables or
            metadata.
          </p>

          {workspace.hostType === "organiser" && (
            <InventoryTable
              head={["Tier", "Price", "Sold", "Capacity"]}
              rows={ticketTypes.map((tier) => [
                tier.name,
                formatZar(tier.price_kobo),
                tier.capacity_sold.toString(),
                tier.capacity_total?.toString() ?? "Open",
              ])}
              empty="No ticket tiers yet."
            />
          )}

          {workspace.hostType === "experience" && (
            <InventoryTable
              head={["Starts", "Ends", "Capacity", "Price"]}
              rows={availability.map((slot) => [
                new Date(slot.starts_at).toLocaleString("en-ZA"),
                new Date(slot.ends_at).toLocaleString("en-ZA"),
                slot.capacity_override?.toString() ?? "Open",
                slot.price_override_kobo ? formatZar(slot.price_override_kobo) : "TBC",
              ])}
              empty="No availability slots yet."
            />
          )}

          {workspace.hostType === "accommodation" &&
            (() => {
              const metadata = (listing.metadata ?? {}) as AccommodationMetadata;
              const rooms = metadata.rooms ?? [];
              return (
                <InventoryTable
                  head={["Room", "Capacity", "Price", "Notes"]}
                  rows={rooms.map((room) => [
                    room.name ?? "Room",
                    room.capacity?.toString() ?? "—",
                    room.price_kobo ? formatZar(room.price_kobo) : "TBC",
                    room.description ?? "—",
                  ])}
                  empty="No room metadata yet."
                />
              );
            })()}

          {workspace.hostType === "venue" &&
            (() => {
              const metadata = (listing.metadata ?? {}) as VenueMetadata;
              return (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <InfoCard label="Capacity" value={listing.capacity?.toString() ?? "Open"} />
                  <InfoCard label="Dress code" value={metadata.dress_code || "Not set"} />
                  <InfoCard
                    label="Age restriction"
                    value={
                      metadata.age_restriction != null
                        ? String(metadata.age_restriction)
                        : "Not set"
                    }
                  />
                  <InfoCard label="Amenity count" value={listing.amenities.length.toString()} />
                </div>
              );
            })()}
        </section>

        <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
          <h2 className="font-display text-2xl font-semibold">Bookings</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Every row here comes from `bookings`, scoped by the signed-in host account.
          </p>
          <InventoryTable
            head={["Booking", "Status", "Party", "Total"]}
            rows={bookings.map((booking) => [
              `#${booking.id.slice(0, 8)}`,
              booking.status,
              booking.party_size.toString(),
              formatZar(booking.total_kobo),
            ])}
            empty="No bookings yet."
          />
        </section>
      </div>

      {workspace.hostType !== "accommodation" && (
        <section className="mt-6 rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
          <h2 className="font-display text-2xl font-semibold">Issued codes</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Scanner flows now inspect real issued codes instead of generated fake QR records.
          </p>
          <InventoryTable
            head={["Code", "Status", "Party", "Issued"]}
            rows={tickets.map((ticket) => [
              ticket.code,
              ticket.status,
              ticket.booking_party_size.toString(),
              new Date(ticket.booking_created_at).toLocaleDateString("en-ZA"),
            ])}
            empty="No ticket codes issued yet."
          />
        </section>
      )}
    </AppShell>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-border/60 bg-card p-4 shadow-card">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-display text-lg font-bold">{value}</span>
    </div>
  );
}

function InventoryTable({
  head,
  rows,
  empty,
}: {
  head: string[];
  rows: string[][];
  empty: string;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
      <table className="w-full text-sm">
        <thead className="bg-muted/35 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <tr>
            {head.map((column, index) => (
              <th key={column} className={`px-4 py-3 ${index === 0 ? "text-left" : "text-right"}`}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={head.length} className="px-4 py-8 text-center text-muted-foreground">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`} className="border-t border-border/60">
              {row.map((cell, cellIndex) => (
                <td
                  key={`${cell}-${cellIndex}`}
                  className={`px-4 py-3 ${cellIndex === 0 ? "text-left font-medium" : "text-right"}`}
                >
                  {cell}
                </td>
              ))}
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

function statusTone(status: string) {
  if (status === "live") return "bg-success/12 text-success";
  if (status === "draft") return "bg-white/12 text-white/75";
  if (status === "paused") return "bg-warning/12 text-warning";
  return "bg-muted/35 text-muted-foreground";
}
