import { createFileRoute, Link, notFound, useParams, useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Calendar, MapPin, Share2, ScanLine, Trash2, Copy, Megaphone, Wallet, ArrowLeft, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { Button } from "@/components/ui/button";
import {
  useTroveData, ZAR, deleteListing, listingTypeLabel,
  listingRevenue, listingBookingsCount, listingCheckedIn, listingCapacity,
  checkInReservation,
  type Listing,
} from "@/lib/trove-store";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/listings/$listingId")({
  head: () => ({
    meta: [
      { title: "Listing · Trove Engine" },
      { name: "description", content: "Manage a single Trove listing — bookings, check-ins, QR codes and promotion." },
    ],
  }),
  component: ListingDetail,
  notFoundComponent: () => (
    <AppShell>
      <div className="text-center py-20">
        <h2 className="font-display text-2xl">Listing not found</h2>
        <Link to="/listings"><Button className="mt-4">Back to listings</Button></Link>
      </div>
    </AppShell>
  ),
});

function typeColor(t: Listing["type"]) {
  return ({
    event:     "from-pink-500 to-fuchsia-500",
    timeslot:  "from-emerald-500 to-teal-500",
    stay:      "from-cyan-500 to-blue-500",
    open_pass: "from-amber-500 to-orange-500",
    package:   "from-violet-500 to-purple-500",
  } as const)[t];
}

function ListingDetail() {
  const { listingId } = useParams({ from: "/listings/$listingId" });
  const { listings } = useTroveData();
  const navigate = useNavigate();
  const l = listings.find((x) => x.id === listingId);
  const [tab, setTab] = useState<"overview" | "inventory" | "bookings" | "qr" | "promote">("overview");

  if (!l) throw notFound();

  const revenue = listingRevenue(l);
  const sold = listingBookingsCount(l);
  const cap = listingCapacity(l);
  const checkedIn = listingCheckedIn(l);
  const shareUrl = `https://welovetrove.co.za/${l.type}/${l.id}`;

  const onDelete = () => {
    if (!confirm("Delete this listing?")) return;
    deleteListing(l.id); navigate({ to: "/listings" });
  };

  // Tab labels per type
  const TABS: Array<{ id: typeof tab; label: string }> = [
    { id: "overview", label: "Overview" },
    {
      id: "inventory",
      label:
        l.type === "event" ? "Tiers" :
        l.type === "timeslot" ? "Slots" :
        l.type === "stay" ? "Rooms" :
        l.type === "open_pass" ? "Pass types" : "Add-ons",
    },
    {
      id: "bookings",
      label:
        l.type === "event" ? "Attendees" :
        l.type === "timeslot" ? "Bookings" :
        l.type === "stay" ? "Reservations" :
        l.type === "open_pass" ? "Passes" : "Groups",
    },
    ...(l.type !== "stay" ? [{ id: "qr" as const, label: "QR codes" }] : []),
    { id: "promote", label: "Promote" },
  ];

  return (
    <AppShell>
      <Link to="/listings" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All listings
      </Link>

      {/* Hero */}
      <div className="mb-6 overflow-hidden rounded-3xl border border-border/60 shadow-card">
        <div className="relative aspect-[21/8]">
          <img src={l.cover} alt={l.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-card/10" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full bg-gradient-to-r ${typeColor(l.type)} px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white`}>
                {listingTypeLabel(l.type)}
              </span>
              <span className="rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">{l.category}</span>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold md:text-5xl">{l.title}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {l.type === "event" && (
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(l.date).toLocaleString("en-ZA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              )}
              {l.type === "timeslot" && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{l.slots.length} slots · {l.durationMin}min</span>}
              {l.type === "stay" && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />Min {l.minNights}n · check-in {l.checkInTime}</span>}
              {l.type === "open_pass" && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{l.validFrom} → {l.validTo}</span>}
              {l.type === "package" && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{l.minGroup}–{l.maxGroup} pax · {l.scheduling.replace("_", " ")}</span>}
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{l.venue} · {l.city}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          { l: l.type === "stay" ? "Reservations" : l.type === "package" ? "Groups" : "Bookings", v: cap > 0 ? `${sold}/${cap}` : `${sold}` },
          { l: "Revenue", v: ZAR(revenue) },
          { l: l.type === "stay" ? "Checked in" : l.type === "open_pass" ? "Visited" : "Confirmed", v: `${checkedIn}` },
          { l: "Fill rate", v: cap > 0 ? `${Math.min(100, Math.round((sold / cap) * 100))}%` : "—" },
        ].map((k) => (
          <div key={k.l} className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.l}</p>
            <p className="mt-1 font-display text-xl font-bold text-gradient">{k.v}</p>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        {l.type !== "stay" && <Link to="/scanner"><Button variant="outline"><ScanLine className="mr-1.5 h-4 w-4" />Check-in</Button></Link>}
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
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border/60">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium capitalize transition ${
              tab === t.id ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
            }`}>{t.label}</button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab l={l} />}
      {tab === "inventory" && <InventoryTab l={l} />}
      {tab === "bookings" && <BookingsTab l={l} />}
      {tab === "qr" && <QRTab l={l} />}
      {tab === "promote" && <PromoteTab l={l} shareUrl={shareUrl} />}
    </AppShell>
  );
}

// ---------- Tabs ----------
function OverviewTab({ l }: { l: Listing }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card lg:col-span-2">
        <h3 className="mb-3 font-display text-lg font-semibold">About</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{l.description || "No description yet."}</p>
        {l.type === "stay" && (
          <>
            <h4 className="mt-5 mb-2 text-sm font-semibold">Amenities</h4>
            <div className="flex flex-wrap gap-2">
              {l.amenities.map((a) => <span key={a} className="rounded-full border border-border/60 bg-background/40 px-3 py-1 text-xs">{a}</span>)}
            </div>
          </>
        )}
        {l.type === "package" && (
          <>
            <h4 className="mt-5 mb-2 text-sm font-semibold">What's included</h4>
            <ul className="space-y-1.5 text-sm">
              {l.includes.map((i) => <li key={i} className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary" />{i}</li>)}
            </ul>
          </>
        )}
        {l.type === "open_pass" && (
          <p className="mt-5 text-sm"><span className="text-muted-foreground">Hours:</span> {l.hours}</p>
        )}
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-card">
        <h3 className="mb-3 font-display text-lg font-semibold">Quick stats</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-semibold">{listingTypeLabel(l.type)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="font-semibold capitalize">{l.status.replace("_", " ")}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span className="font-semibold">{new Date(l.createdAt).toLocaleDateString()}</span></div>
        </div>
      </div>
    </div>
  );
}

function InventoryTab({ l }: { l: Listing }) {
  if (l.type === "event") {
    return (
      <Table head={["Tier", "Price", "Sold", "Inventory", "Revenue"]}>
        {l.tiers.map((t) => (
          <tr key={t.id} className="border-t border-border/40">
            <td className="px-5 py-3 font-medium">{t.name}</td>
            <td className="px-5 py-3 text-right">{ZAR(t.price)}</td>
            <td className="px-5 py-3 text-right">{t.sold}</td>
            <td className="px-5 py-3 text-right">{t.inventory}</td>
            <td className="px-5 py-3 text-right font-semibold text-gradient">{ZAR(t.sold * t.price)}</td>
          </tr>
        ))}
      </Table>
    );
  }
  if (l.type === "timeslot") {
    return (
      <Table head={["Time", "Capacity / day", "Price", "Booked"]}>
        {l.slots.map((s) => {
          const booked = l.bookings.filter((b) => b.slotTime === s.time).reduce((sum, b) => sum + b.guests, 0);
          return (
            <tr key={s.time} className="border-t border-border/40">
              <td className="px-5 py-3 font-medium">{s.time}</td>
              <td className="px-5 py-3 text-right">{s.capacity}</td>
              <td className="px-5 py-3 text-right">{ZAR(s.price)}</td>
              <td className="px-5 py-3 text-right font-semibold text-gradient">{booked}</td>
            </tr>
          );
        })}
      </Table>
    );
  }
  if (l.type === "stay") {
    return (
      <Table head={["Room type", "Count", "Price/night", "Max guests", "Booked"]}>
        {l.rooms.map((r) => {
          const booked = l.reservations.filter((res) => res.roomId === r.id).length;
          return (
            <tr key={r.id} className="border-t border-border/40">
              <td className="px-5 py-3 font-medium">{r.name}</td>
              <td className="px-5 py-3 text-right">{r.count}</td>
              <td className="px-5 py-3 text-right">{ZAR(r.price)}</td>
              <td className="px-5 py-3 text-right">{r.maxGuests}</td>
              <td className="px-5 py-3 text-right font-semibold text-gradient">{booked}</td>
            </tr>
          );
        })}
      </Table>
    );
  }
  if (l.type === "open_pass") {
    return (
      <Table head={["Pass type", "Price", "Issued"]}>
        {l.passTypes.map((pt) => (
          <tr key={pt.id} className="border-t border-border/40">
            <td className="px-5 py-3 font-medium">{pt.name}</td>
            <td className="px-5 py-3 text-right">{ZAR(pt.price)}</td>
            <td className="px-5 py-3 text-right font-semibold text-gradient">{l.passes.filter((p) => p.passTypeId === pt.id).length}</td>
          </tr>
        ))}
      </Table>
    );
  }
  // package
  return (
    <Table head={["Add-on", "Price", "Selected by"]}>
      {l.addons.map((a) => (
        <tr key={a.id} className="border-t border-border/40">
          <td className="px-5 py-3 font-medium">{a.name}</td>
          <td className="px-5 py-3 text-right">{ZAR(a.price)}</td>
          <td className="px-5 py-3 text-right font-semibold text-gradient">{l.groupBookings.filter((g) => g.addons.includes(a.id)).length}</td>
        </tr>
      ))}
    </Table>
  );
}

function BookingsTab({ l }: { l: Listing }) {
  if (l.type === "event") {
    return (
      <Table head={["Attendee", "Tier", "QR", "Status"]}>
        {l.attendees.length === 0 && <Empty cols={4} text="No tickets sold yet." />}
        {l.attendees.map((a) => (
          <tr key={a.id} className="border-t border-border/40">
            <td className="px-5 py-3"><div className="font-medium">{a.name}</div><div className="text-xs text-muted-foreground">{a.email}</div></td>
            <td className="px-5 py-3">{a.tierName}</td>
            <td className="px-5 py-3 font-mono text-xs">{a.qr}</td>
            <td className="px-5 py-3 text-right">{a.checkedIn ? <Pill kind="ok">Checked in</Pill> : <Pill kind="muted">Awaiting</Pill>}</td>
          </tr>
        ))}
      </Table>
    );
  }
  if (l.type === "timeslot") {
    return (
      <Table head={["Guest", "Date · Slot", "Pax", "QR", "Status"]}>
        {l.bookings.length === 0 && <Empty cols={5} text="No bookings yet." />}
        {l.bookings.map((b) => (
          <tr key={b.id} className="border-t border-border/40">
            <td className="px-5 py-3"><div className="font-medium">{b.name}</div><div className="text-xs text-muted-foreground">{b.email}</div></td>
            <td className="px-5 py-3">{b.date} · {b.slotTime}</td>
            <td className="px-5 py-3 text-center">{b.guests}</td>
            <td className="px-5 py-3 font-mono text-xs">{b.qr}</td>
            <td className="px-5 py-3 text-right">{b.checkedIn ? <Pill kind="ok">Arrived</Pill> : <Pill kind="muted">Pending</Pill>}</td>
          </tr>
        ))}
      </Table>
    );
  }
  if (l.type === "stay") {
    return (
      <Table head={["Guest", "Room", "Check-in → Check-out", "Total", "Front desk"]}>
        {l.reservations.length === 0 && <Empty cols={5} text="No reservations yet." />}
        {l.reservations.map((r) => (
          <tr key={r.id} className="border-t border-border/40">
            <td className="px-5 py-3"><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.email}</div></td>
            <td className="px-5 py-3">{r.roomName} · {r.guests}p</td>
            <td className="px-5 py-3 text-xs">{r.checkIn} → {r.checkOut}</td>
            <td className="px-5 py-3 text-right font-semibold text-gradient">{ZAR(r.total)}</td>
            <td className="px-5 py-3 text-right">
              {r.checkedIn ? <Pill kind="ok">Checked in</Pill> : (
                <Button size="sm" variant="outline" onClick={() => { checkInReservation(l.id, r.id); toast.success(`${r.name} checked in`); }}>
                  Check in
                </Button>
              )}
            </td>
          </tr>
        ))}
      </Table>
    );
  }
  if (l.type === "open_pass") {
    return (
      <Table head={["Pass holder", "Pass type", "QR", "Status"]}>
        {l.passes.length === 0 && <Empty cols={4} text="No passes issued yet." />}
        {l.passes.map((p) => (
          <tr key={p.id} className="border-t border-border/40">
            <td className="px-5 py-3"><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.email}</div></td>
            <td className="px-5 py-3">{p.passTypeName}</td>
            <td className="px-5 py-3 font-mono text-xs">{p.qr}</td>
            <td className="px-5 py-3 text-right">{p.visited ? <Pill kind="ok">Visited</Pill> : <Pill kind="muted">Unused</Pill>}</td>
          </tr>
        ))}
      </Table>
    );
  }
  // package
  return (
    <Table head={["Group lead", "Size", "Date", "Total", "Status"]}>
      {l.groupBookings.length === 0 && <Empty cols={5} text="No groups booked yet." />}
      {l.groupBookings.map((g) => (
        <tr key={g.id} className="border-t border-border/40">
          <td className="px-5 py-3"><div className="font-medium">{g.name}</div><div className="text-xs text-muted-foreground">{g.email}</div></td>
          <td className="px-5 py-3 text-center">{g.groupSize}p</td>
          <td className="px-5 py-3 text-xs">{g.date ?? "On request"}</td>
          <td className="px-5 py-3 text-right font-semibold text-gradient">{ZAR(g.total)}</td>
          <td className="px-5 py-3 text-right">{g.confirmedHeadcount ? <Pill kind="ok">Confirmed</Pill> : <Pill kind="muted">Pending</Pill>}</td>
        </tr>
      ))}
    </Table>
  );
}

function QRTab({ l }: { l: Listing }) {
  if (l.type === "stay") return null;
  let codes: Array<{ id: string; qr: string; name: string; sub: string }> = [];
  if (l.type === "event") codes = l.attendees.map((a) => ({ id: a.id, qr: a.qr, name: a.name, sub: a.tierName }));
  if (l.type === "timeslot") codes = l.bookings.map((b) => ({ id: b.id, qr: b.qr, name: b.name, sub: `${b.date} · ${b.slotTime}` }));
  if (l.type === "open_pass") codes = l.passes.map((p) => ({ id: p.id, qr: p.qr, name: p.name, sub: p.passTypeName }));
  if (l.type === "package") codes = l.groupBookings.map((g) => ({ id: g.id, qr: g.qr, name: g.name, sub: `Group of ${g.groupSize}` }));

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">Every booking gets a unique, tamper-proof QR. These would be emailed automatically.</p>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {codes.slice(0, 12).map((c) => (
          <div key={c.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-card text-center">
            <div className="rounded-xl bg-white p-3"><QRCodeSVG value={c.qr} size={140} className="mx-auto" /></div>
            <p className="mt-3 truncate text-sm font-medium">{c.name}</p>
            <p className="text-xs text-muted-foreground">{c.sub}</p>
            <button onClick={() => { navigator.clipboard.writeText(c.qr); toast.success("QR copied"); }}
              className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono text-primary hover:underline">
              <Copy className="h-3 w-3" />{c.qr}
            </button>
          </div>
        ))}
        {codes.length === 0 && <p className="col-span-full text-center text-sm text-muted-foreground py-8">No bookings yet.</p>}
      </div>
    </div>
  );
}

function PromoteTab({ l, shareUrl }: { l: Listing; shareUrl: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
      <h3 className="font-display text-lg font-semibold">Share {l.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">Drop this link anywhere. Goes straight into the Trove Seekers app.</p>
      <div className="mt-4 flex gap-2">
        <input readOnly value={shareUrl} className="flex-1 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm font-mono" />
        <Button onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Copied"); }}><Copy className="mr-1.5 h-4 w-4" /> Copy</Button>
      </div>
      <Link to="/promote" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
        Open full promo kit →
      </Link>
    </div>
  );
}

// ---------- helpers ----------
function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>{head.map((h, i) => <th key={h} className={`px-5 py-3 ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function Empty({ cols, text }: { cols: number; text: string }) {
  return <tr><td colSpan={cols} className="px-5 py-8 text-center text-muted-foreground">{text}</td></tr>;
}
function Pill({ kind, children }: { kind: "ok" | "muted"; children: React.ReactNode }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
      kind === "ok" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
    }`}>{children}</span>
  );
}
