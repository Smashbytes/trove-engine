import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, CheckCircle2, XCircle, AlertCircle, Camera } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTroveData, checkInAttendee } from "@/lib/trove-store";

export const Route = createFileRoute("/scanner")({
  head: () => ({ meta: [{ title: "Scanner · Trove Engine" }] }),
  component: Scanner,
});

type Result = { kind: "ok" | "duplicate" | "not_found"; name?: string; tier?: string; ts: number };

function Scanner() {
  const { events } = useTroveData();
  const live = events.filter((e) => e.status === "live" || e.status === "sold_out");
  const [eventId, setEventId] = useState(live[0]?.id ?? "");
  const [code, setCode] = useState("");
  const [results, setResults] = useState<Result[]>([]);

  const evt = events.find((e) => e.id === eventId);
  const total = evt?.attendees.length ?? 0;
  const checkedIn = evt?.attendees.filter((a) => a.checkedIn).length ?? 0;

  const scan = (qr: string) => {
    if (!eventId || !qr) return;
    const r = checkInAttendee(eventId, qr.trim());
    const att = evt?.attendees.find((a) => a.qr === qr.trim());
    setResults((rs) => [{ kind: r, name: att?.name, tier: att?.tierName, ts: Date.now() }, ...rs].slice(0, 8));
    setCode("");
  };

  const simulate = () => {
    if (!evt) return;
    const next = evt.attendees.find((a) => !a.checkedIn);
    if (next) scan(next.qr);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="At the door"
        title="Live ticket scanner"
        subtitle="Scan QR codes from any phone. Duplicates are blocked instantly."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-6 shadow-card">
          <label className="text-sm font-medium">Scanning for</label>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)}
            className="mt-2 flex h-11 w-full rounded-md border border-input bg-input px-3 text-sm">
            {live.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>

          <div className="mt-6 rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-brand-soft p-8 text-center">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-brand shadow-glow">
              <Camera className="h-10 w-10 text-primary-foreground" />
            </div>
            <p className="font-display text-lg font-semibold">Camera ready</p>
            <p className="text-xs text-muted-foreground">In production this would activate the device camera.</p>
            <Button onClick={simulate} className="mt-4 bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95">
              <ScanLine className="mr-1.5 h-4 w-4" /> Simulate scan (next attendee)
            </Button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); scan(code); }} className="mt-5">
            <label className="text-sm font-medium">Or enter QR code manually</label>
            <div className="mt-2 flex gap-2">
              <Input placeholder="e.g. TRV-AB12-CD34" value={code} onChange={(e) => setCode(e.target.value)} />
              <Button type="submit">Check in</Button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Door progress</p>
          <p className="mt-1 font-display text-4xl font-bold text-gradient">{checkedIn}<span className="text-foreground/40">/{total}</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-gradient-brand transition-all" style={{ width: `${total ? (checkedIn / total) * 100 : 0}%` }} />
          </div>

          <h4 className="mt-6 mb-3 text-sm font-semibold">Recent scans</h4>
          <div className="space-y-2">
            <AnimatePresence>
              {results.length === 0 && <p className="text-xs text-muted-foreground">No scans yet.</p>}
              {results.map((r, i) => (
                <motion.div
                  key={r.ts + "_" + i}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${
                    r.kind === "ok" ? "border-success/40 bg-success/10" :
                    r.kind === "duplicate" ? "border-warning/40 bg-warning/10" :
                    "border-destructive/40 bg-destructive/10"
                  }`}
                >
                  {r.kind === "ok" && <CheckCircle2 className="h-5 w-5 flex-none text-success" />}
                  {r.kind === "duplicate" && <AlertCircle className="h-5 w-5 flex-none text-warning" />}
                  {r.kind === "not_found" && <XCircle className="h-5 w-5 flex-none text-destructive" />}
                  <div className="text-xs">
                    <p className="font-semibold">
                      {r.kind === "ok" && "Welcome in"}
                      {r.kind === "duplicate" && "Already scanned"}
                      {r.kind === "not_found" && "Invalid code"}
                    </p>
                    <p className="text-muted-foreground">{r.name ?? "Unknown"}{r.tier ? ` · ${r.tier}` : ""}</p>
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
