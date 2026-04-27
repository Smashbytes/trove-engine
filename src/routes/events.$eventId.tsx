import { createFileRoute, Link, notFound, useParams } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Calendar, MapPin, Share2, ScanLine, Trash2, Copy, Megaphone, Wallet, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { useTroveData, ZAR, deleteEvent } from "@/lib/trove-store";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/events/$eventId")({
  head: () => ({ meta: [{ title: "Event · Trove Engine" }] }),
  component: EventDetail,
  notFoundComponent: () => (
    <AppShell>
      <div className="text-center py-20">
        <h2 className="font-display text-2xl">Event not found</h2>
        <Link to="/events"><Button className="mt-4">Back to events</Button></Link>
      </div>
    </AppShell>
  ),
});

function EventDetail() {
  const { eventId } = useParams({ from: "/events/$eventId" });
  const { events } = useTroveData();
  const navigate = useNavigate();
  const evt = events.find((e) => e.id === eventId);
  const [tab, setTab] = useState<"overview" | "tickets" | "attendees" | "qr">("overview");

  if (!evt) throw notFound();

  const sold = evt.tiers.reduce((s, t) => s + t.sold, 0);
  const cap = evt.tiers.reduce((s, t) => s + t.inventory, 0);
  const revenue = evt.tiers.reduce((s, t) => s + t.sold * t.price, 0);
  const checkedIn = evt.attendees.filter((a) => a.checkedIn).length;
  const shareUrl = `https://welovetrove.co.za/event/${evt.id}`;

  const onDelete = () => {
    if (!confirm("Delete this event?")) return;
    deleteEvent(evt.id);
    navigate({ to: "/events" });
  };

  return (
    <AppShell>
      <Link to="/events" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All events
      </Link>

      {/* Hero */}
      <div className="mb-6 overflow-hidden rounded-3xl border border-border/60 shadow-card">
        <div className="relative aspect-[21/8]">
          <img src={evt.cover} alt={evt.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-card/10" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <span className="rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">{evt.category}</span>
            <h1 className="mt-3 font-display text-3xl font-bold md:text-5xl">{evt.title}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(evt.date).toLocaleString("en-ZA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{evt.venue} · {evt.city}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          { l: "Tickets sold", v: `${sold}/${cap}` },
          { l: "Revenue", v: ZAR(revenue) },
          { l: "Checked in", v: `${checkedIn}` },
          { l: "Sell-through", v: `${Math.round((sold / cap) * 100)}%` },
        ].map((k) => (
          <div key={k.l} className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.l}</p>
            <p className="mt-1 font-display text-xl font-bold text-gradient">{k.v}</p>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link to="/scanner"><Button variant="outline"><ScanLine className="mr-1.5 h-4 w-4" />Scan tickets</Button></Link>
        <Link to="/promote"><Button variant="outline"><Megaphone className="mr-1.5 h-4 w-4" />Promote</Button></Link>
        <Link to="/payments"><Button variant="outline"><Wallet className="mr-1.5 h-4 w-4" />Payments</Button></Link>
        <Button variant="outline" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Share link copied"); }}>
          <Share2 className="mr-1.5 h-4 w-4" />Copy share link
        </Button>
        <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="mr-1.5 h-4 w-4" />Delete
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-border/60">
        {(["overview", "tickets", "attendees", "qr"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition ${
              tab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            }`}>
            {t === "qr" ? "QR codes" : t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card lg:col-span-2">
            <h3 className="mb-3 font-display text-lg font-semibold">About this event</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{evt.description}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
            <h3 className="mb-3 font-display text-lg font-semibold">Tier breakdown</h3>
            {evt.tiers.map((t) => {
              const pct = Math.round((t.sold / t.inventory) * 100);
              return (
                <div key={t.id} className="mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-muted-foreground">{ZAR(t.price)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-brand" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{t.sold}/{t.inventory} sold</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "tickets" && (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left">Tier</th>
                <th className="px-5 py-3 text-right">Price</th>
                <th className="px-5 py-3 text-right">Sold</th>
                <th className="px-5 py-3 text-right">Inventory</th>
                <th className="px-5 py-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {evt.tiers.map((t) => (
                <tr key={t.id} className="border-t border-border/40">
                  <td className="px-5 py-3 font-medium">{t.name}</td>
                  <td className="px-5 py-3 text-right">{ZAR(t.price)}</td>
                  <td className="px-5 py-3 text-right">{t.sold}</td>
                  <td className="px-5 py-3 text-right">{t.inventory}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gradient">{ZAR(t.sold * t.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "attendees" && (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-left">Attendee</th>
                <th className="px-5 py-3 text-left">Tier</th>
                <th className="px-5 py-3 text-left">QR</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {evt.attendees.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">No tickets sold yet.</td></tr>
              )}
              {evt.attendees.map((a) => (
                <tr key={a.id} className="border-t border-border/40">
                  <td className="px-5 py-3">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.email}</div>
                  </td>
                  <td className="px-5 py-3">{a.tierName}</td>
                  <td className="px-5 py-3 font-mono text-xs">{a.qr}</td>
                  <td className="px-5 py-3 text-right">
                    {a.checkedIn ? (
                      <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold text-success">Checked in</span>
                    ) : (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">Awaiting</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "qr" && (
        <div>
          <p className="mb-4 text-sm text-muted-foreground">Every ticket gets a unique, tamper-proof QR. These would be emailed to buyers automatically.</p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {evt.attendees.slice(0, 12).map((a) => (
              <div key={a.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-card text-center">
                <div className="rounded-xl bg-white p-3">
                  <QRCodeSVG value={a.qr} size={140} className="mx-auto" />
                </div>
                <p className="mt-3 truncate text-sm font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.tierName}</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(a.qr); toast.success("QR code copied"); }}
                  className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono text-primary hover:underline"
                >
                  <Copy className="h-3 w-3" />{a.qr}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
