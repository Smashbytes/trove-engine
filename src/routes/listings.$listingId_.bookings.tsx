import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { PermissionGate } from "@/components/trove/PermissionGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import { formatZar } from "@/lib/format";
import {
  fetchAllGuests,
  GUEST_LIST_PAGE_SIZE,
  guestListCsv,
  STATUS_LABEL,
  useGuestList,
  type GuestListFilter,
  type GuestListRow,
} from "@/lib/guest-list";
import { useListing, useRealtimeBookings } from "@/lib/queries";

export const Route = createFileRoute("/listings/$listingId_/bookings")({
  head: () => ({ meta: [{ title: "Bookings · Listing · Trove Engine" }] }),
  component: ListingBookingsPage,
});

const FILTERS: { value: GuestListFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "going", label: "Going" },
  { value: "checked_in", label: "Checked in" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_TONE: Partial<Record<GuestListRow["status"], string>> = {
  confirmed: "bg-emerald-500/12 text-emerald-400",
  completed: "bg-emerald-500/12 text-emerald-400",
  partially_refunded: "bg-amber-500/12 text-amber-400",
  refund_requested: "bg-amber-500/12 text-amber-400",
  refund_processing: "bg-amber-500/12 text-amber-400",
};

const bookedAt = (iso: string) =>
  new Date(iso).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  });

function ListingBookingsPage() {
  const { listingId } = Route.useParams();
  return (
    <AppShell>
      <Link
        to="/listings/$listingId"
        params={{ listingId }}
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to listing
      </Link>
      <PermissionGate perm="bookings.view">
        <GuestList listingId={listingId} />
      </PermissionGate>
    </AppShell>
  );
}

function GuestList({ listingId }: { listingId: string }) {
  const { can } = useAuth();
  const listingQuery = useListing(listingId);
  const [filter, setFilter] = useState<GuestListFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);

  useRealtimeBookings(listingId);

  // Search after the host stops typing, from the first page.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const listQuery = useGuestList(listingId, filter, search, page);
  const data = listQuery.data;
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const first = total === 0 ? 0 : page * GUEST_LIST_PAGE_SIZE + 1;
  const last = Math.min(total, (page + 1) * GUEST_LIST_PAGE_SIZE);
  const canOpenGuest = can("audience.manage");
  const title = listingQuery.data?.title;

  async function exportCsv() {
    setExporting(true);
    try {
      const all = await fetchAllGuests(listingId, filter, search);
      const blob = new Blob([guestListCsv(all)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${listingQuery.data?.slug ?? "listing"}-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${all.length} ${all.length === 1 ? "booking" : "bookings"}.`);
    } catch (error) {
      toast.error(friendlyError(error, "Couldn't export the bookings. Try again."));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Attendees"
        title="Bookings"
        subtitle={
          title
            ? `Everyone who booked “${title}”. Abandoned checkouts aren't shown.`
            : "Confirmed, cancelled and refunded bookings on this listing."
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void exportCsv()}
            disabled={exporting || total === 0}
          >
            <Download className="mr-1.5 h-4 w-4" />
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        }
      />

      {data && (
        <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
          {data.counts.guests} {data.counts.guests === 1 ? "guest" : "guests"} going across{" "}
          {data.counts.going} {data.counts.going === 1 ? "booking" : "bookings"}
          {data.counts.checked_in > 0 && ` · ${data.counts.checked_in} checked in`}
        </p>
      )}

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="tablist" aria-label="Filter bookings" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              aria-label={data ? `${f.label}, ${data.counts[f.value]}` : f.label}
              onClick={() => {
                setFilter(f.value);
                setPage(0);
              }}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                filter === f.value
                  ? "border-primary/50 bg-primary/12 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
              {data && (
                <span className="ml-1.5 tabular-nums opacity-70">{data.counts[f.value]}</span>
              )}
            </button>
          ))}
        </div>
        <label className="relative block md:w-72">
          <span className="sr-only">Search bookings</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Guest name or ticket code"
            className="pl-9"
          />
        </label>
      </div>

      {listQuery.isError ? (
        <div
          role="alert"
          className="rounded-card border border-red-500/30 bg-red-500/10 p-6 text-center shadow-card"
        >
          <p className="font-semibold">Couldn't load the bookings</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {friendlyError(listQuery.error, "Check your connection and try again.")}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            size="sm"
            onClick={() => void listQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : listQuery.isLoading ? (
        <div className="rounded-2xl border border-border/60 bg-card p-12 text-center text-sm text-muted-foreground shadow-card">
          Loading bookings…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-12 text-center shadow-card">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-display text-lg font-semibold">
            {search
              ? "No bookings match your search"
              : filter === "all"
                ? "No bookings yet"
                : "Nothing here yet"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search
              ? "Try part of the guest's name or the start of a ticket code."
              : filter === "all"
                ? "Share your listing to get your first guest in."
                : "Bookings show up here as their status changes."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/35 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Guest</th>
                  <th className="px-4 py-3 text-left">Tickets</th>
                  <th className="px-4 py-3 text-right">Party</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Booked</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.booking_id} className="border-t border-border/60 align-top">
                    <td className="px-4 py-3">
                      <GuestName row={r} linked={canOpenGuest} />
                      {r.phone && <p className="text-xs text-muted-foreground">{r.phone}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Codes row={r} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.party_size}</td>
                    <td className="px-4 py-3">
                      <StatusBadge row={r} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatZar(r.total_cents)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {bookedAt(r.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone: cards */}
          <ul className="space-y-3 md:hidden">
            {rows.map((r) => (
              <li
                key={r.booking_id}
                className="rounded-card border border-border/60 bg-card p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <GuestName row={r} linked={canOpenGuest} />
                    {r.phone && <p className="text-xs text-muted-foreground">{r.phone}</p>}
                  </div>
                  <StatusBadge row={r} />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {r.party_size} {r.party_size === 1 ? "guest" : "guests"} ·{" "}
                    {formatZar(r.total_cents)}
                  </span>
                  <span className="text-xs text-muted-foreground">{bookedAt(r.created_at)}</span>
                </div>
                <div className="mt-2">
                  <Codes row={r} />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between gap-4 text-sm text-muted-foreground">
            <span aria-live="polite">
              Showing {first}–{last} of {total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={last >= total || listQuery.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function GuestName({ row, linked }: { row: GuestListRow; linked: boolean }) {
  return linked ? (
    <Link
      to="/audience/$guestId"
      params={{ guestId: row.guest_id }}
      className="font-medium hover:text-primary hover:underline"
    >
      {row.guest_name}
    </Link>
  ) : (
    <span className="font-medium">{row.guest_name}</span>
  );
}

function Codes({ row }: { row: GuestListRow }) {
  if (row.codes.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">{row.ticket_type ?? "No code issued"}</span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {row.ticket_type && (
        <span className="mr-1 text-xs text-muted-foreground">{row.ticket_type}</span>
      )}
      {row.codes.map((code) => (
        <code key={code} className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-xs">
          {code}
        </code>
      ))}
    </div>
  );
}

function StatusBadge({ row }: { row: GuestListRow }) {
  const label = row.checked_in_at ? "Checked in" : (STATUS_LABEL[row.status] ?? row.status);
  const tone = row.checked_in_at
    ? "bg-primary/12 text-primary"
    : (STATUS_TONE[row.status] ?? "bg-muted text-muted-foreground");
  return (
    <span
      className={`inline-block shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {label}
    </span>
  );
}
