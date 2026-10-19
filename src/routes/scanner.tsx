import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { PermissionGate } from "@/components/trove/PermissionGate";
import { QrScanner } from "@/components/trove/QrScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { getHostWorkspace } from "@/lib/host-workspace";
import { useDevice } from "@/hooks/use-device";
import { cn } from "@/lib/utils";
import {
  useCheckInBooking,
  useHostListings,
  useListingBookings,
  useListingTickets,
  useRedeemTicket,
  type HostTicket,
  type ListingBooking,
  type RedeemTicketResult,
} from "@/lib/queries";
import { friendlyError } from "@/lib/errors";

export const Route = createFileRoute("/scanner")({
  head: () => ({
    meta: [
      { title: "Scanner - Trove Engine" },
      {
        name: "description",
        content:
          "Check guests in at the door by scanning or typing their ticket code.",
      },
    ],
  }),
  component: ScannerPage,
});

function ScannerPage() {
  const { hostProfile, can } = useAuth();
  const device = useDevice();
  const workspace = getHostWorkspace(hostProfile?.host_type);
  const listingsQuery = useHostListings();
  const listings = listingsQuery.data ?? [];

  const [listingId, setListingId] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<RedeemTicketResult | null>(null);
  const lastScan = useRef<{ code: string; at: number } | null>(null);

  const activeListingId = listingId || listings[0]?.id;
  const selectedListing = listings.find((listing) => listing.id === activeListingId);

  const ticketsQuery = useListingTickets(activeListingId);
  const bookingsQuery = useListingBookings(activeListingId);
  const checkIn = useCheckInBooking();
  const redeem = useRedeemTicket();

  // The server admits each ticket once; the camera reports the same QR many
  // times a second, so repeats of the last code within 5s are ignored.
  const handleRedeem = async (rawCode: string) => {
    const trimmed = rawCode.trim().toUpperCase();
    if (!trimmed || !activeListingId || redeem.isPending) return;
    const now = Date.now();
    if (lastScan.current && lastScan.current.code === trimmed && now - lastScan.current.at < 5000) return;
    lastScan.current = { code: trimmed, at: now };
    setCode(trimmed);
    try {
      const outcome = await redeem.mutateAsync({ listingId: activeListingId, code: trimmed });
      setResult(outcome);
      if (outcome.result === "admitted") toast.success("Admitted.");
      else toast.error(RESULT_COPY[outcome.result].title);
    } catch (error) {
      setResult(null);
      toast.error(friendlyError(error, "Could not check this ticket."));
    }
  };

  const handleScanned = (rawCode: string) => void handleRedeem(rawCode);
  const handleAdmitTyped = () => {
    lastScan.current = null;
    void handleRedeem(code);
  };

  const handleCheckIn = async (bookingId: string) => {
    if (!activeListingId) return;
    try {
      await checkIn.mutateAsync({ bookingId, listingId: activeListingId });
      toast.success("Guest checked in.");
    } catch (error) {
      toast.error(friendlyError(error, "Could not check guest in."));
    }
  };

  if (!can("scanner.use")) {
    return (
      <AppShell>
        <PermissionGate perm="scanner.use">{null}</PermissionGate>
      </AppShell>
    );
  }

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
          result={result}
          redeemPending={redeem.isPending}
          onAdmitTyped={handleAdmitTyped}
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
        title={workspace.hostType === "accommodation" ? "Reservation desk" : "Entry desk"}
        subtitle={
          workspace.hostType === "accommodation"
            ? "Stamp guest arrivals against live reservation records."
            : "Aim a QR at the frame or upload a photo to verify a ticket."
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section
          className="overflow-hidden rounded-card border bg-card shadow-card"
          style={{ borderColor: "var(--hairline-strong, rgba(255,255,255,0.10))" }}
        >
          {/* Instrument header: monospace eyebrow + the listing picker, side by side */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3"
            style={{ borderColor: "var(--hairline, rgba(255,255,255,0.06))" }}
          >
            <p className="font-mono text-2xs uppercase tracking-[0.32em] text-muted-foreground">
              {workspace.scannerLabel}
            </p>
            <select
              aria-label="Listing to scan for"
              value={activeListingId ?? ""}
              onChange={(event) => setListingId(event.target.value)}
              className="h-9 max-w-[260px] rounded-md border bg-transparent px-2.5 text-xs"
              style={{
                borderColor: "var(--hairline-strong, rgba(255,255,255,0.10))",
                colorScheme: "dark",
              }}
            >
              {listings.length === 0 && <option value="">No listings yet</option>}
              {listings.map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {listing.title}
                </option>
              ))}
            </select>
          </div>

          {workspace.hostType === "accommodation" ? (
            <div className="p-5">
              <p className="font-display text-2xl font-semibold">Mark arrivals as they walk in</p>
              <p className="mt-2 text-sm text-muted-foreground">
                The check-in stamp writes directly to the live booking record below.
              </p>
            </div>
          ) : (
            <div className="p-5">
              <QrScanner onDetected={handleScanned} />
              <div className="mt-4 flex items-stretch gap-2">
                <Input
                  aria-label="Ticket code"
                  autoComplete="off"
                  placeholder="TRV-AB12CD34"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  className="h-11 font-mono uppercase tracking-[0.12em]"
                />
                <Button
                  onClick={handleAdmitTyped}
                  disabled={!code.trim() || redeem.isPending}
                  className="h-11 px-5"
                >
                  {redeem.isPending ? "Checking…" : "Admit"}
                </Button>
              </div>
              <p className="mt-2 font-mono text-2xs uppercase tracking-[0.22em] text-muted-foreground">
                Each ticket gets in once · a second scan is refused
              </p>
            </div>
          )}

          {/* Telemetry row — nixie-style numerals */}
          <div
            className="grid grid-cols-3 border-t"
            style={{ borderColor: "var(--hairline, rgba(255,255,255,0.06))" }}
          >
            <Telemetry label="Bookings" value={bookingsQuery.data?.length ?? 0} />
            <Telemetry
              label="Issued"
              value={ticketsQuery.data?.length ?? 0}
              divider
            />
            <Telemetry
              label="Used"
              value={(ticketsQuery.data ?? []).filter((t) => t.status === "used").length}
              divider
            />
          </div>
        </section>

        <section className="rounded-card border border-border/60 bg-card p-6 shadow-card">
          <h2 className="font-display text-2xl font-semibold">Door result</h2>
          {workspace.hostType !== "accommodation" && (
            <RedeemResultCard result={result} pending={redeem.isPending} />
          )}

          {workspace.hostType === "accommodation" && (
            <p className="mt-3 text-sm text-muted-foreground">
              Use the reservation table below to mark a guest as checked in. The arrival timestamp
              writes to the live booking record.
            </p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-card border border-border/60 bg-card p-6 shadow-card">
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
  result: RedeemTicketResult | null;
  redeemPending: boolean;
  onAdmitTyped: () => void;
  bookings: ListingBooking[];
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
  result,
  redeemPending,
  onAdmitTyped,
  bookings,
  tickets,
  checkIn,
  handleScanned,
  handleCheckIn,
}: SmartphoneScannerViewProps) {
  const isAccommodation = workspace.hostType === "accommodation";

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Visually compact on phones, but every page keeps one h1. */}
      <h1 className="sr-only">{isAccommodation ? "Reservation desk" : "Entry desk"}</h1>
      {/* Compact instrument header */}
      <div
        className="flex items-center justify-between gap-2 rounded-2xl border bg-card px-3 py-2"
        style={{ borderColor: "var(--hairline-strong, rgba(255,255,255,0.10))" }}
      >
        <p className="font-mono text-2xs uppercase tracking-[0.32em] text-muted-foreground">
          {workspace.scannerLabel}
        </p>
        <select
          aria-label="Listing to scan for"
          value={activeListingId ?? ""}
          onChange={(e) => setListingId(e.target.value)}
          className="h-8 max-w-[180px] truncate rounded-md border bg-transparent px-2 text-xs"
          style={{
            borderColor: "var(--hairline-strong, rgba(255,255,255,0.10))",
            colorScheme: "dark",
          }}
        >
          {listings.length === 0 && <option value="">No listings yet</option>}
          {listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </div>

      {/* Camera scanner — full width, square viewfinder */}
      {!isAccommodation && (
        <div
          className="overflow-hidden rounded-card border bg-card shadow-card"
          style={{ borderColor: "var(--hairline-strong, rgba(255,255,255,0.10))" }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-2.5"
            style={{ borderColor: "var(--hairline, rgba(255,255,255,0.06))" }}
          >
            <p className="font-mono text-2xs uppercase tracking-[0.32em] text-muted-foreground">
              Scan
            </p>
            <p className="font-mono text-2xs uppercase tracking-[0.22em] text-muted-foreground">
              Camera or image
            </p>
          </div>
          <div className="p-4">
            <QrScanner onDetected={handleScanned} />
            <div className="mt-3 flex items-stretch gap-2">
              <Input
                aria-label="Ticket code"
                autoComplete="off"
                placeholder="TRV-AB12CD34"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-11 font-mono uppercase tracking-[0.12em] text-sm"
              />
              <Button size="sm" onClick={onAdmitTyped} disabled={!code.trim() || redeemPending} className="h-11 px-4">
                {redeemPending ? "…" : "Admit"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Result card */}
      {!isAccommodation && (
        <div className="rounded-card border border-border/60 bg-card p-4 shadow-card">
          <p className="font-display text-lg font-semibold">Door result</p>
          <RedeemResultCard result={result} pending={redeemPending} compact />
        </div>
      )}

      {/* Telemetry strip — instrument-style, monospace counters */}
      <div
        className="grid grid-cols-3 overflow-hidden rounded-tile border bg-card shadow-card"
        style={{ borderColor: "var(--hairline-strong, rgba(255,255,255,0.10))" }}
      >
        <Telemetry label="Bookings" value={bookings.length} compact />
        <Telemetry label="Issued" value={tickets.length} divider compact />
        <Telemetry
          label="Used"
          value={tickets.filter((t) => t.status === "used").length}
          divider
          compact
        />
      </div>

      {/* Records */}
      <div className="rounded-card border border-border/60 bg-card p-4 shadow-card">
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

function Telemetry({
  label,
  value,
  divider,
  compact,
}: {
  label: string;
  value: number;
  divider?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn("px-4 py-4", compact ? "py-3" : undefined)}
      style={
        divider
          ? { borderLeft: "1px solid var(--hairline, rgba(255,255,255,0.06))" }
          : undefined
      }
    >
      <p className="font-mono text-2xs uppercase tracking-[0.28em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 tabular-nums",
          compact ? "text-2xl" : "text-3xl",
          "font-display font-semibold",
        )}
        style={{ letterSpacing: "-0.02em" }}
      >
        {value.toString().padStart(2, "0")}
      </p>
    </div>
  );
}

const RESULT_COPY: Record<RedeemTicketResult["result"], { title: string; tone: "ok" | "bad" }> = {
  admitted: { title: "Admitted", tone: "ok" },
  already_used: { title: "Already used", tone: "bad" },
  not_valid: { title: "Not valid", tone: "bad" },
  not_found: { title: "Code not found", tone: "bad" },
};

function RedeemResultCard({
  result,
  pending,
  compact,
}: {
  result: RedeemTicketResult | null;
  pending: boolean;
  compact?: boolean;
}) {
  if (pending) {
    return (
      <p className="mt-3 text-sm text-muted-foreground" role="status">
        Checking ticket…
      </p>
    );
  }
  if (!result) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Scan a QR or type a code and press Admit.
      </p>
    );
  }
  const copy = RESULT_COPY[result.result];
  const reason =
    result.result === "already_used" && result.scanned_at
      ? `First scanned ${new Date(result.scanned_at).toLocaleString("en-ZA")}. Don't let this code in again.`
      : result.result === "not_valid"
        ? `Ticket ${result.ticket_status?.replace(/_/g, " ") ?? ""}, booking ${result.booking_status?.replace(/_/g, " ") ?? ""}. Send the guest to support.`
        : result.result === "not_found"
          ? `No ticket ${result.code ?? ""} on this listing. Check the listing picker.`
          : null;
  return (
    <div
      role="alert"
      className={cn(
        "mt-3 space-y-2 rounded-2xl border",
        compact ? "p-3" : "p-4",
        copy.tone === "ok"
          ? "border-emerald-400/40 bg-emerald-500/10"
          : "border-destructive/30 bg-destructive/10",
      )}
    >
      <p className={cn("font-display text-xl font-semibold", copy.tone === "ok" ? "text-emerald-300" : "text-red-300")}>
        {copy.title}
      </p>
      {reason && <p className="text-sm text-muted-foreground">{reason}</p>}
      {result.code && <ResultRow label="Code" value={result.code} />}
      {result.party_size != null && <ResultRow label="Party" value={String(result.party_size)} />}
      {result.ticket_type && <ResultRow label="Ticket" value={result.ticket_type} />}
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
  bookings: ListingBooking[];
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
    <div className="mt-5 overflow-x-auto rounded-2xl border border-border/60" tabIndex={0} role="region" aria-label="Scrollable table">
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
            // Only paid/confirmed bookings can arrive; the server enforces the same.
            const disabled =
              checkedIn ||
              isPendingId === booking.id ||
              (booking.status !== "confirmed" && booking.status !== "partially_refunded");
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
    <div className="mt-5 overflow-x-auto rounded-2xl border border-border/60" tabIndex={0} role="region" aria-label="Scrollable table">
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
