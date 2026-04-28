import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, CheckCircle2, XCircle, AlertCircle, Camera, Hotel } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useTroveData, scanQR, checkInReservation, listingTypeLabel,
  type Listing, type ScanResult,
} from "@/lib/trove-store";
import { toast } from "sonner";

export const Route = createFileRoute("/scanner")({
  head: () => ({
    meta: [
      { title: "Check-in · Trove Engine" },
      { name: "description", content: "Scan QR codes or check guests in at the front desk." },
    ],
  }),
  component: Scanner,
});

type LogEntry = ScanResult & { ts: number };

function Scanner() {
  const { listings } = useTroveData();
  const scannable = listings.filter((l) => l.status === "live" || l.status === "sold_out");
  const [listingId, setListingId] = useState(scannable[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [results, setResults] = useState<LogEntry[]>([]);

  const l = listings.find((x) => x.id === listingId);

  const scan = (qr: string) => {
    if (!listingId || !qr) return;
    const r = scanQR(listingId, qr.trim());
    setResults((rs) => [{ ...r, ts: Date.now() }, ...rs].slice(0, 8));
    setCode("");
  };

  const simulate = () => {
    if (!l) return;
    if (l.type === "event") {
      const next = l.attendees.find((a) => !a.checkedIn);
      if (next) scan(next.qr);
    } else if (l.type === "timeslot") {
      const next = l.bookings.find((b) => !b.checkedIn);
      if (next) scan(next.qr);
    } else if (l.type === "open_pass") {
      const next = l.passes.find((p) => !p.visited);
      if (next) scan(next.qr);
    } else if (l.type === "package") {
      const next = l.groupBookings.find((g) => !g.confirmedHeadcount);
      if (next) scan(next.qr);
    }
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="At the door"
        title="Check-in"
        subtitle="QR scanning for events, slots, passes and groups · front desk check-in for stays."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-6 shadow-card">
          <label className="text-sm font-medium">Checking in for</label>
          <select value={listingId} onChange={(e) => setListingId(e.target.value)}
            className="mt-2 flex h-11 w-full rounded-md border border-input bg-input px-3 text-sm">
            {scannable.map((x) => (
              <option key={x.id} value={x.id}>[{listingTypeLabel(x.type)}] {x.title}</option>
            ))}
          </select>

          {l?.type === "stay" ? (
            <StayFrontDesk l={l} />
          ) : (
            <>
              <div className="mt-6 rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-brand-soft p-8 text-center">
                <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-brand shadow-glow">
                  <Camera className="h-10 w-10 text-primary-foreground" />
                </div>
                <p className="font-display text-lg font-semibold">Camera ready</p>
                <p className="text-xs text-muted-foreground">In production this would activate the device camera.</p>
                <Button onClick={simulate} className="mt-4 bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95">
                  <ScanLine className="mr-1.5 h-4 w-4" /> Simulate scan (next booking)
                </Button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); scan(code); }} className="mt-5">
                <label className="text-sm font-medium">Or enter QR code manually</label>
                <div className="mt-2 flex gap-2">
                  <Input placeholder="e.g. TRV-AB12-CD34" value={code} onChange={(e) => setCode(e.target.value)} />
                  <Button type="submit">Check in</Button>
                </div>
              </form>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent activity</p>
          <div className="mt-4 space-y-2">
            <AnimatePresence>
              {results.length === 0 && <p className="text-xs text-muted-foreground">No scans yet.</p>}
              {results.map((r, i) => (
                <motion.div key={r.ts + "_" + i}
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${
                    r.kind === "ok" ? "border-success/40 bg-success/10" :
                    r.kind === "duplicate" ? "border-warning/40 bg-warning/10" :
                    "border-destructive/40 bg-destructive/10"
                  }`}>
                  {r.kind === "ok" && <CheckCircle2 className="h-5 w-5 flex-none text-success" />}
                  {r.kind === "duplicate" && <AlertCircle className="h-5 w-5 flex-none text-warning" />}
                  {r.kind === "not_found" && <XCircle className="h-5 w-5 flex-none text-destructive" />}
                  <div className="text-xs">
                    <p className="font-semibold">
                      {r.kind === "ok" && "Welcome in"}
                      {r.kind === "duplicate" && "Already checked in"}
                      {r.kind === "not_found" && "Invalid code"}
                    </p>
                    {r.kind !== "not_found" && (
                      <p className="text-muted-foreground">{r.name} · {r.detail}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StayFrontDesk({ l }: { l: Extract<Listing, { type: "stay" }> }) {
  const today = new Date().toISOString().slice(0, 10);
  const arrivals = l.reservations.filter((r) => r.checkIn <= today && !r.checkedIn);
  const inHouse = l.reservations.filter((r) => r.checkedIn && r.checkOut > today);

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-2xl border border-primary/30 bg-gradient-brand-soft p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground">
            <Hotel className="h-6 w-6" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold">Front desk mode</p>
            <p className="text-xs text-muted-foreground">Stays don't use QR. Look up the guest and confirm arrival.</p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold">Today's arrivals ({arrivals.length})</h4>
        <div className="space-y-2">
          {arrivals.length === 0 && <p className="text-xs text-muted-foreground">No arrivals today.</p>}
          {arrivals.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-3">
              <div>
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.roomName} · {r.guests}p · {r.checkIn} → {r.checkOut}</p>
              </div>
              <Button size="sm" onClick={() => { checkInReservation(l.id, r.id); toast.success(`${r.name} checked in`); }}
                className="bg-gradient-brand text-primary-foreground">
                Check in
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold">In-house ({inHouse.length})</h4>
        <div className="space-y-2">
          {inHouse.length === 0 && <p className="text-xs text-muted-foreground">No guests in-house.</p>}
          {inHouse.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-success/30 bg-success/5 p-3">
              <div>
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.roomName} · departing {r.checkOut}</p>
              </div>
              <span className="rounded-full bg-success/20 px-2.5 py-0.5 text-[11px] font-semibold text-success">Checked in</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
