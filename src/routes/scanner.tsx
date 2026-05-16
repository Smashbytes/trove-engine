import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { QrScanner } from "@/components/trove/QrScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import type { Booking } from "@/lib/database.types";
import { getHostWorkspace } from "@/lib/host-workspace";
import { useDevice } from "@/hooks/use-device";
import {
  useCheckInBooking,
  useHostListings,
  useListingBookings,
  useListingTickets,
  type HostTicket,
} from "@/lib/queries";

export const Route = createFileRoute("/scanner")({
  head: () => ({
    meta: [
      { title: "Scanner - Trove Engine" },
      {
        name: "description",
        content:
          "Inspect real issued codes and booking activity from the signed-in Trove host account.",
      },
    ],
  }),
  component: ScannerPage,
});

function ScannerPage() {
  const { hostProfile } = useAuth();
  const device = useDevice();
  const workspace = getHostWorkspace(hostProfile?.host_type);
  const listingsQuery = useHostListings();
  const listings = listingsQuery.data ?? [];

  const [listingId, setListingId] = useState("");
  const [code, setCode] = useState("");
  const [lookupValue, setLookupValue] = useState("");

  const activeListingId = listingId || listings[0]?.id;
  const selectedListing = listings.find((listing) => listing.id === activeListingId);

  const ticketsQuery = useListingTickets(activeListingId);
  const bookingsQuery = useListingBookings(activeListingId);
  const checkIn = useCheckInBooking();

  const matchingTicket = useMemo(() => {
    if (!lookupValue.trim()) return null;
    return (
      (ticketsQuery.data ?? []).find(
        (ticket) => ticket.code.toLowerCase() === lookupValue.trim().toLowerCase(),
      ) ?? null
    );
  }, [lookupValue, ticketsQuery.data]);

  const handleScanned = (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) return;
    setCode(trimmed);
    setLookupValue(trimmed);
    toast.success("Code captured.");
  };

  const handleCheckIn = async (bookingId: string) => {
    if (!activeListingId) return;
    try {
      await checkIn.mutateAsync({ bookingId, listingId: activeListingId });
      toast.success("Guest checked in.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not check guest in.");
    }
  };

  if (device === "smartphone") {
    return (
      <AppShell>
        <SmartphoneScannerView
          workspace={workspace}
          listings={listings}
          activeListingId={activeListingId}
          selectedListing={selectedListing}
          setListingId={setListingId}
          code={code}
          setCode={setCode}
          lookupValue={lookupValue}
          setLookupValue={setLookupValue}
          matchingTicket={matchingTicket}
          bookings={bookingsQuery.data ?? []}
          tickets={ticketsQuery.data ?? []}
          checkIn={checkIn}
          handleScanned={handleScanned}
          handleCheckIn={handleCheckIn}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow={workspace.scannerLabel}
        title={workspace.hostType === "accommodation" ? "Reservation desk" : "Code desk"}
        subtitle="This area now reads real booking and ticket data. It no longer simulates fake scan results or seeded guest lists."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
          <LabelRow label={`Select ${workspace.singularLabel.toLowerCase()}`} />
          <select
            value={activeListingId ?? ""}
            onChange={(event) => setListingId(event.target.value)}
            className="mt-2 flex h-11 w-full rounded-md border border-input bg-input px-3 text-sm"
          >
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.title}
              </option>
            ))}
          </select>

          {workspace.hostType === "accommodation" ? (
            <div className="mt-6 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="font-display text-2xl font-semibold">Reservation desk</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Mark a guest as arrived directly against their booking. The check-in stamp is
                written to the live booking record.
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="font-display text-2xl font-semibold">Look up a Trove code</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Scan a ticket QR with the device camera or paste a TRV- code. Match is checked
                against real issued tickets for this listing.
              </p>
              <div className="mt-4">
                <QrScanner onDetected={handleScanned} />
              </div>
              <div className="mt-4 flex gap-2">
                <Input
                  placeholder="TRV-AB12CD34"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
                <Button onClick={() => setLookupValue(code)}>Inspect</Button>
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <MetricCard label="Bookings" value={String(bookingsQuery.data?.length ?? 0)} />
            <MetricCard label="Issued codes" value={String(ticketsQuery.data?.length ?? 0)} />
            <MetricCard
              label="Used codes"
              value={String(
                (ticketsQuery.data ?? []).filter((ticket) => ticket.status === "used").length,
              )}
            />
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
          <h2 className="font-display text-2xl font-semibold">Lookup result</h2>
          {!lookupValue && workspace.hostType !== "accommodation" && (
            <p className="mt-3 text-sm text-muted-foreground">
              Enter a ticket code to inspect a real issued record.
            </p>
          )}
          {workspace.hostType !== "accommodation" && lookupValue && !matchingTicket && (
            <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
              <p className="font-semibold text-destructive">Code not found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No issued code matched `{lookupValue}` on the selected listing.
              </p>
            </div>
          )}
          {matchingTicket && (
            <div className="mt-4 space-y-3">
              <ResultRow label="Code" value={matchingTicket.code} />
              <ResultRow label="Status" value={matchingTicket.status} />
              <ResultRow label="Party size" value={matchingTicket.booking_party_size.toString()} />
              <ResultRow
                label="Issued"
                value={new Date(matchingTicket.booking_created_at).toLocaleString("en-ZA")}
              />
              <ResultRow
                label="Scanned at"
                value={
                  matchingTicket.scanned_at
                    ? new Date(matchingTicket.scanned_at).toLocaleString("en-ZA")
                    : "Not used yet"
                }
              />
            </div>
          )}

          {workspace.hostType === "accommodation" && (
            <p className="mt-3 text-sm text-muted-foreground">
              Use the reservation table below to mark a guest as checked in. The arrival timestamp
              writes to the live booking record.
            </p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-[1.75rem] border border-border/60 bg-card p-6 shadow-card">
        <h2 className="font-display text-2xl font-semibold">
          {workspace.hostType === "accommodation" ? "Reservation records" : "Issued ticket records"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {selectedListing
            ? `Reading activity for ${selectedListing.title}.`
            : "Choose a listing to inspect activity."}
        </p>

        {workspace.hostType === "accommodation" ? (
          <CheckInTable
            bookings={bookingsQuery.data ?? []}
            isPendingId={
              checkIn.isPending && checkIn.variables ? checkIn.variables.bookingId : null
            }
            onCheckIn={handleCheckIn}
          />
        ) : (
          <RecordsTable
            head={["Code", "Status", "Party", "Created"]}
            rows={(ticketsQuery.data ?? []).map((ticket) => [
              ticket.code,
              ticket.status,
              ticket.booking_party_size.toString(),
              new Date(ticket.booking_created_at).toLocaleDateString("en-ZA"),
            ])}
            empty="No issued ticket records yet."
          />
        )}
      </section>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Smartphone-optimised layout
// ---------------------------------------------------------------------------

interface SmartphoneScannerViewProps {
  workspace: ReturnType<typeof getHostWorkspace>;
  listings: Array<{ id: string; title: string }>;
  activeListingId: string | undefined;
  selectedListing: { id: string; title: string } | undefined;
  setListingId: (id: string) => void;
  code: string;
  setCode: (code: string) => void;
  lookupValue: string;
  setLookupValue: (v: string) => void;
  matchingTicket: HostTicket | null;
  bookings: Booking[];
  tickets: HostTicket[];
  checkIn: ReturnType<typeof useCheckInBooking>;
  handleScanned: (raw: string) => void;
  handleCheckIn: (bookingId: string) => void;
}

function SmartphoneScannerView({
  workspace,
  listings,
  activeListingId,
  selectedListing,
  setListingId,
  code,
  setCode,
  lookupValue,
  setLookupValue,
  matchingTicket,
  bookings,
  tickets,
  checkIn,
  handleScanned,
  handleCheckIn,
}: SmartphoneScannerViewProps) {
  const isAccommodation = workspace.hostType === "accommodation";

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Compact header row */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {workspace.scannerLabel}
        </p>
        <select
          value={activeListingId ?? ""}
          onChange={(e) => setListingId(e.target.value)}
          className="h-8 max-w-[160px] rounded-md border border-input bg-input px-2 text-xs"
        >
          {listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </div>

      {/* Camera scanner — full width, tall */}
      {!isAccommodation && (
        <div className="rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-card">
          <p className="mb-3 font-display text-lg font-semibold">Scan QR code</p>
          <QrScanner
            onDetected={handleScanned}
            autoStart
            videoClassName="h-[52vw] min-h-[220px] max-h-[340px]"
          />
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="TRV-AB12CD34"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-10 text-sm"
            />
            <Button size="sm" onClick={() => setLookupValue(code)}>
              Inspect
            </Button>
          </div>
        </div>
      )}

      {/* Result card */}
      {!isAccommodation && (
        <div className="rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-card">
          <p className="font-display text-lg font-semibold">Result</p>
          {!lookupValue && (
            <p className="mt-2 text-sm text-muted-foreground">Scan or type a code above.</p>
          )}
          {lookupValue && !matchingTicket && (
            <div className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-sm font-semibold text-destructive">Code not found</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                No match for <span className="font-mono">{lookupValue}</span>.
              </p>
            </div>
          )}
          {matchingTicket && (
            <div className="mt-3 space-y-2">
              <ResultRow label="Code" value={matchingTicket.code} />
              <ResultRow label="Status" value={matchingTicket.status} />
              <ResultRow label="Party" value={matchingTicket.booking_party_size.toString()} />
              <ResultRow
                label="Scanned"
                value={
                  matchingTicket.scanned_at
                    ? new Date(matchingTicket.scanned_at).toLocaleString("en-ZA")
                    : "Not used yet"
                }
              />
            </div>
          )}
        </div>
      )}

      {/* Metric strip */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="Bookings" value={String(bookings.length)} />
        <MetricCard label="Issued" value={String(tickets.length)} />
        <MetricCard
          label="Used"
          value={String(tickets.filter((t) => t.status === "used").length)}
        />
      </div>

      {/* Records */}
      <div className="rounded-[1.75rem] border border-border/60 bg-card p-4 shadow-card">
        <p className="font-display text-lg font-semibold">
          {isAccommodation ? "Reservations" : "Ticket records"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {selectedListing ? selectedListing.title : "Select a listing above."}
        </p>
        {isAccommodation ? (
          <CheckInTable
            bookings={bookings}
            isPendingId={checkIn.isPending && checkIn.variables ? checkIn.variables.bookingId : null}
            onCheckIn={handleCheckIn}
          />
        ) : (
          <RecordsTable
            head={["Code", "Status", "Party", "Created"]}
            rows={tickets.map((t) => [
              t.code,
              t.status,
              t.booking_party_size.toString(),
              new Date(t.booking_created_at).toLocaleDateString("en-ZA"),
            ])}
            empty="No issued ticket records yet."
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function LabelRow({ label }: { label: string }) {
  return <p className="text-sm font-medium">{label}</p>;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function CheckInTable({
  bookings,
  isPendingId,
  onCheckIn,
}: {
  bookings: Booking[];
  isPendingId: string | null;
  onCheckIn: (bookingId: string) => void;
}) {
  if (bookings.length === 0) {
    return (
      <div className="mt-5 overflow-hidden rounded-2xl border border-border/60">
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No reservation records yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-border/60">
      <table className="w-full text-sm">
        <thead className="bg-muted/35 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Booking</th>
            <th className="px-4 py-3 text-right">Status</th>
            <th className="px-4 py-3 text-right">Party</th>
            <th className="px-4 py-3 text-right">Checked in</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => {
            const checkedIn = !!booking.checked_in_at;
            const disabled =
              checkedIn ||
              isPendingId === booking.id ||
              booking.status === "cancelled" ||
              booking.status === "refunded";
            return (
              <tr key={booking.id} className="border-t border-border/60">
                <td className="px-4 py-3 text-left font-medium">#{booking.id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-right">{booking.status}</td>
                <td className="px-4 py-3 text-right">{booking.party_size}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {checkedIn ? new Date(booking.checked_in_at!).toLocaleString("en-ZA") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant={checkedIn ? "ghost" : "outline"}
                    disabled={disabled}
                    onClick={() => onCheckIn(booking.id)}
                  >
                    {checkedIn ? "Checked in" : isPendingId === booking.id ? "Saving…" : "Check in"}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RecordsTable({ head, rows, empty }: { head: string[]; rows: string[][]; empty: string }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-border/60">
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
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`} className="border-t border-border/60">
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
