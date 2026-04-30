import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Plus, Trash2, CheckCircle2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/trove/AppShell";
import { PageHeader } from "@/components/trove/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORIES, STOCK_COVERS, ZAR, createListing, useTroveData,
  SPOT_TYPES, LISTING_TYPE_IMAGE, type ListingType,
} from "@/lib/trove-store";
import { toast } from "sonner";

export const Route = createFileRoute("/listings/new")({
  head: () => ({
    meta: [
      { title: "Create listing · Trove Engine" },
      { name: "description", content: "Pick a listing type and publish it to the Trove Seekers feed." },
    ],
  }),
  component: NewListing,
});

const TYPE_CARDS: Array<{ id: ListingType; label: string; blurb: string }> = [
  { id: "event",     label: "Event",     blurb: "Fixed-date drop with ticket tiers — clubs, festivals, comedy, expos, mega church." },
  { id: "timeslot",  label: "Timeslot",  blurb: "Recurring bookable slots — spa, skydive, paintball, go-karting, sip & paint." },
  { id: "stay",      label: "Stay",      blurb: "Overnight rooms with check-in/check-out — lodge, hotel, glamping." },
  { id: "open_pass", label: "Open Pass", blurb: "Multi-day pass valid in a date window — gallery, museum, food fest." },
  { id: "package",   label: "Package",   blurb: "Group package with min/max size + add-ons — paintball, hiking trips." },
];

function NewListing() {
  const navigate = useNavigate();
  const { profile } = useTroveData();
  const [type, setType] = useState<ListingType | null>(profile.spotType
    ? SPOT_TYPES.find((s) => s.id === profile.spotType)?.defaultListingType ?? null
    : null);

  if (!type) return <PickType onPick={setType} />;

  return (
    <AppShell>
      <PageHeader
        eyebrow={`New ${type.replace("_", " ")}`}
        title={`Create ${type === "open_pass" ? "an Open Pass" : "a " + type[0].toUpperCase() + type.slice(1)}`}
        subtitle="Publish straight into the Trove Seekers feed."
        actions={
          <Button variant="ghost" onClick={() => setType(null)}><ArrowLeft className="mr-1 h-4 w-4" /> Change type</Button>
        }
      />
      {type === "event" && <EventWizard onDone={(id) => navigate({ to: "/listings/$listingId", params: { listingId: id } })} />}
      {type === "timeslot" && <TimeslotWizard onDone={(id) => navigate({ to: "/listings/$listingId", params: { listingId: id } })} />}
      {type === "stay" && <StayWizard onDone={(id) => navigate({ to: "/listings/$listingId", params: { listingId: id } })} />}
      {type === "open_pass" && <OpenPassWizard onDone={(id) => navigate({ to: "/listings/$listingId", params: { listingId: id } })} />}
      {type === "package" && <PackageWizard onDone={(id) => navigate({ to: "/listings/$listingId", params: { listingId: id } })} />}
    </AppShell>
  );
}

function PickType({ onPick }: { onPick: (t: ListingType) => void }) {
  return (
    <AppShell>
      <PageHeader
        eyebrow="New listing"
        title="What are you publishing?"
        subtitle="Pick the format that matches what your Spot is selling — each one has its own create flow."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TYPE_CARDS.map((t) => (
          <motion.button key={t.id} onClick={() => onPick(t.id)} whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-2xl ring-hairline text-left lift-on-hover">
            <div className="relative aspect-[5/3] overflow-hidden">
              <img src={LISTING_TYPE_IMAGE[t.id]} alt={t.label}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <h3 className="font-display text-2xl font-bold text-white">{t.label}</h3>
                <p className="mt-2 text-xs leading-relaxed text-white/75">{t.blurb}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white">
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </AppShell>
  );
}

// ---------- Shared step shell ----------
function Stepper({ step, max = 3 }: { step: number; max?: number }) {
  return (
    <div className="mb-8 flex items-center gap-2">
      {Array.from({ length: max }).map((_, i) => {
        const n = i + 1;
        return (
          <div key={n} className="flex flex-1 items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
              step >= n ? "bg-gradient-brand text-primary-foreground shadow-glow-sm" : "bg-muted text-muted-foreground"
            }`}>{step > n ? <CheckCircle2 className="h-4 w-4" /> : n}</div>
            <div className={`h-0.5 flex-1 transition ${step > n ? "bg-gradient-brand" : "bg-muted"}`} />
          </div>
        );
      })}
    </div>
  );
}

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
      className="rounded-2xl border border-border/60 bg-card p-6 shadow-card space-y-5">
      {children}
    </motion.div>
  );
}

function NavButtons({ step, max, onBack, onNext, onPublish }: {
  step: number; max: number; onBack: () => void; onNext: () => void; onPublish: () => void;
}) {
  return (
    <div className="mt-5 flex justify-between">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-1.5 h-4 w-4" /> {step > 1 ? "Back" : "Cancel"}
      </Button>
      {step < max ? (
        <Button onClick={onNext} className="bg-gradient-brand text-primary-foreground shadow-glow-sm hover:opacity-95">
          Continue <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      ) : (
        <Button onClick={onPublish} className="bg-gradient-brand text-primary-foreground shadow-glow hover:opacity-95">
          <Sparkles className="mr-1.5 h-4 w-4" /> Publish
        </Button>
      )}
    </div>
  );
}

// ---------- EVENT ----------
function EventWizard({ onDone }: { onDone: (id: string) => void }) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Nightlife");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("Johannesburg");
  const [date, setDate] = useState("");
  const [cover, setCover] = useState(STOCK_COVERS[0]);
  const [tiers, setTiers] = useState([{ name: "General Admission", price: 150, inventory: 100 }]);

  const update = (i: number, p: Partial<typeof tiers[0]>) => setTiers(tiers.map((t, idx) => idx === i ? { ...t, ...p } : t));

  const next = () => {
    if (step === 1 && (!title || !venue || !date)) return toast.error("Fill in title, venue and date");
    setStep(step + 1);
  };
  const publish = () => {
    const created = createListing({
      type: "event", title, description, category, venue, city, cover,
      date: new Date(date).toISOString(), status: "live", doorsOpen: "20:00",
      tiers: tiers.map((t) => ({ ...t, id: "tier_" + Math.random().toString(36).slice(2, 8), sold: 0 })),
      attendees: [],
    });
    toast.success(`${title} pushed to Trove Seekers`); onDone(created.id);
  };

  return (
    <>
      <Stepper step={step} />
      <AnimatePresence mode="wait">
        {step === 1 && (
          <StepCard key="1">
            <h3 className="font-display text-xl font-semibold">Event details</h3>
            <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Techno Tuesdays" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category"><Select value={category} onChange={setCategory} options={CATEGORIES} /></Field>
              <Field label="Date & time"><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Venue"><Input value={venue} onChange={(e) => setVenue(e.target.value)} /></Field>
              <Field label="City"><Input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
            </div>
            <Field label="Description"><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            <CoverPicker cover={cover} setCover={setCover} />
          </StepCard>
        )}
        {step === 2 && (
          <StepCard key="2">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold">Ticket tiers</h3>
              <Button size="sm" variant="outline" onClick={() => setTiers([...tiers, { name: "VIP", price: 350, inventory: 30 }])}>
                <Plus className="mr-1 h-4 w-4" /> Add tier
              </Button>
            </div>
            {tiers.map((t, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-5"><Label className="text-xs">Name</Label><Input value={t.name} onChange={(e) => update(i, { name: e.target.value })} /></div>
                  <div className="sm:col-span-3"><Label className="text-xs">Price (ZAR)</Label><Input type="number" value={t.price} onChange={(e) => update(i, { price: Number(e.target.value) })} /></div>
                  <div className="sm:col-span-3"><Label className="text-xs">Inventory</Label><Input type="number" value={t.inventory} onChange={(e) => update(i, { inventory: Number(e.target.value) })} /></div>
                  <div className="flex items-end sm:col-span-1"><Button size="icon" variant="ghost" onClick={() => setTiers(tiers.filter((_, idx) => idx !== i))} disabled={tiers.length === 1}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                </div>
              </div>
            ))}
            <SummaryRow label="Capacity · Potential revenue" value={`${tiers.reduce((s,t) => s+t.inventory, 0)} · ${ZAR(tiers.reduce((s,t) => s+t.price*t.inventory, 0))}`} />
          </StepCard>
        )}
        {step === 3 && (
          <StepCard key="3">
            <h3 className="font-display text-xl font-semibold">Review & publish</h3>
            <PreviewHero cover={cover} category={category} title={title} venue={venue} city={city} />
            <div className="grid gap-2">
              {tiers.map((t, i) => <RowSimple key={i} title={t.name} sub={`${t.inventory} available`} right={ZAR(t.price)} />)}
            </div>
            <PublishNotice text="Publishing pushes this event to the Trove Seekers feed instantly." />
          </StepCard>
        )}
      </AnimatePresence>
      <NavButtons step={step} max={3} onBack={() => setStep(Math.max(1, step - 1))} onNext={next} onPublish={publish} />
    </>
  );
}

// ---------- TIMESLOT ----------
function TimeslotWizard({ onDone }: { onDone: (id: string) => void }) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Spa");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("Johannesburg");
  const [cover, setCover] = useState(STOCK_COVERS[7]);
  const [durationMin, setDuration] = useState(60);
  const [days, setDays] = useState<number[]>([2, 3, 4, 5, 6]);
  const [slots, setSlots] = useState([
    { time: "09:00", capacity: 3, price: 750 },
    { time: "11:00", capacity: 3, price: 750 },
  ]);
  const [windowDays, setWindowDays] = useState(30);

  const toggleDay = (d: number) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort());
  const updateSlot = (i: number, p: Partial<typeof slots[0]>) => setSlots(slots.map((s, idx) => idx === i ? { ...s, ...p } : s));

  const next = () => {
    if (step === 1 && (!title || !venue)) return toast.error("Fill in title and venue");
    if (step === 2 && (slots.length === 0 || days.length === 0)) return toast.error("Add slots and pick days");
    setStep(step + 1);
  };
  const publish = () => {
    const c = createListing({
      type: "timeslot", title, description, category, venue, city, cover, status: "live",
      durationMin, daysOfWeek: days, slots, bookings: [], bookingWindowDays: windowDays,
    });
    toast.success(`${title} now bookable`); onDone(c.id);
  };

  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <>
      <Stepper step={step} />
      <AnimatePresence mode="wait">
        {step === 1 && (
          <StepCard key="1">
            <h3 className="font-display text-xl font-semibold">Service details</h3>
            <Field label="Service name"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Signature Massage · 60min" /></Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Category"><Select value={category} onChange={setCategory} options={CATEGORIES} /></Field>
              <Field label="Duration (min)"><Input type="number" value={durationMin} onChange={(e) => setDuration(Number(e.target.value))} /></Field>
              <Field label="City"><Input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
            </div>
            <Field label="Venue / location"><Input value={venue} onChange={(e) => setVenue(e.target.value)} /></Field>
            <Field label="Description"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            <CoverPicker cover={cover} setCover={setCover} />
          </StepCard>
        )}
        {step === 2 && (
          <StepCard key="2">
            <h3 className="font-display text-xl font-semibold">Schedule & slots</h3>
            <div>
              <Label className="mb-2 block text-xs">Days available</Label>
              <div className="flex flex-wrap gap-2">
                {DAY_NAMES.map((n, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      days.includes(i)
                        ? "border-primary bg-gradient-brand text-primary-foreground shadow-glow-sm"
                        : "border-border/60 text-muted-foreground hover:border-primary/40"
                    }`}>{n}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Time slots</Label>
              <Button size="sm" variant="outline" onClick={() => setSlots([...slots, { time: "14:00", capacity: 3, price: 750 }])}>
                <Plus className="mr-1 h-4 w-4" /> Add slot
              </Button>
            </div>
            {slots.map((s, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-3"><Label className="text-xs">Time</Label><Input type="time" value={s.time} onChange={(e) => updateSlot(i, { time: e.target.value })} /></div>
                  <div className="sm:col-span-4"><Label className="text-xs">Capacity / slot</Label><Input type="number" value={s.capacity} onChange={(e) => updateSlot(i, { capacity: Number(e.target.value) })} /></div>
                  <div className="sm:col-span-4"><Label className="text-xs">Price (ZAR)</Label><Input type="number" value={s.price} onChange={(e) => updateSlot(i, { price: Number(e.target.value) })} /></div>
                  <div className="flex items-end sm:col-span-1"><Button size="icon" variant="ghost" onClick={() => setSlots(slots.filter((_, idx) => idx !== i))} disabled={slots.length === 1}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                </div>
              </div>
            ))}
            <Field label="Booking window (days in advance)"><Input type="number" value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))} /></Field>
          </StepCard>
        )}
        {step === 3 && (
          <StepCard key="3">
            <h3 className="font-display text-xl font-semibold">Review & publish</h3>
            <PreviewHero cover={cover} category={category} title={title} venue={venue} city={city} />
            <SummaryRow label="Operating days" value={days.map((d) => DAY_NAMES[d]).join(" · ")} />
            <SummaryRow label="Slots per day" value={`${slots.length} × ${durationMin}min`} />
            <SummaryRow label="Daily capacity" value={`${slots.reduce((s, x) => s + x.capacity, 0)} bookings`} />
            <PublishNotice text="Customers can book any of these slots from the Trove Seekers app." />
          </StepCard>
        )}
      </AnimatePresence>
      <NavButtons step={step} max={3} onBack={() => setStep(Math.max(1, step - 1))} onNext={next} onPublish={publish} />
    </>
  );
}

// ---------- STAY ----------
function StayWizard({ onDone }: { onDone: (id: string) => void }) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("Magaliesberg");
  const [cover, setCover] = useState(STOCK_COVERS[5]);
  const [amenities, setAmenities] = useState<string[]>(["Wifi", "Pool"]);
  const [rooms, setRooms] = useState([{ name: "Standard Suite", count: 6, price: 1850, maxGuests: 2 }]);
  const [minNights, setMin] = useState(1);
  const [checkInTime, setIn] = useState("14:00");
  const [checkOutTime, setOut] = useState("10:00");

  const AMENITY_OPTS = ["Pool", "Spa", "Restaurant", "Wifi", "Fire pit", "River access", "Gym", "Bar", "Parking", "Pet-friendly"];
  const toggleAm = (a: string) => setAmenities(amenities.includes(a) ? amenities.filter((x) => x !== a) : [...amenities, a]);
  const updateRoom = (i: number, p: Partial<typeof rooms[0]>) => setRooms(rooms.map((r, idx) => idx === i ? { ...r, ...p } : r));

  const next = () => {
    if (step === 1 && (!title || !venue)) return toast.error("Fill in property name and venue");
    if (step === 2 && rooms.length === 0) return toast.error("Add at least one room type");
    setStep(step + 1);
  };
  const publish = () => {
    const c = createListing({
      type: "stay", title, description, category: "Stay", venue, city, cover, status: "live",
      amenities,
      rooms: rooms.map((r) => ({ ...r, id: "rm_" + Math.random().toString(36).slice(2, 8) })),
      reservations: [], minNights, checkInTime, checkOutTime,
    });
    toast.success(`${title} now accepting bookings`); onDone(c.id);
  };

  return (
    <>
      <Stepper step={step} />
      <AnimatePresence mode="wait">
        {step === 1 && (
          <StepCard key="1">
            <h3 className="font-display text-xl font-semibold">Property details</h3>
            <Field label="Property name"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Magalies River Lodge" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Venue / brand name"><Input value={venue} onChange={(e) => setVenue(e.target.value)} /></Field>
              <Field label="Location"><Input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
            </div>
            <Field label="Description"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            <div>
              <Label className="mb-2 block text-xs">Amenities</Label>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTS.map((a) => (
                  <button key={a} type="button" onClick={() => toggleAm(a)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      amenities.includes(a)
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/40"
                    }`}>{a}</button>
                ))}
              </div>
            </div>
            <CoverPicker cover={cover} setCover={setCover} />
          </StepCard>
        )}
        {step === 2 && (
          <StepCard key="2">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold">Room types</h3>
              <Button size="sm" variant="outline" onClick={() => setRooms([...rooms, { name: "Deluxe", count: 4, price: 2950, maxGuests: 3 }])}>
                <Plus className="mr-1 h-4 w-4" /> Add room type
              </Button>
            </div>
            {rooms.map((r, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-4"><Label className="text-xs">Room name</Label><Input value={r.name} onChange={(e) => updateRoom(i, { name: e.target.value })} /></div>
                  <div className="sm:col-span-2"><Label className="text-xs">Count</Label><Input type="number" value={r.count} onChange={(e) => updateRoom(i, { count: Number(e.target.value) })} /></div>
                  <div className="sm:col-span-3"><Label className="text-xs">Price/night</Label><Input type="number" value={r.price} onChange={(e) => updateRoom(i, { price: Number(e.target.value) })} /></div>
                  <div className="sm:col-span-2"><Label className="text-xs">Max guests</Label><Input type="number" value={r.maxGuests} onChange={(e) => updateRoom(i, { maxGuests: Number(e.target.value) })} /></div>
                  <div className="flex items-end sm:col-span-1"><Button size="icon" variant="ghost" onClick={() => setRooms(rooms.filter((_, idx) => idx !== i))} disabled={rooms.length === 1}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                </div>
              </div>
            ))}
            <SummaryRow label="Total rooms · From" value={`${rooms.reduce((s, r) => s + r.count, 0)} · ${ZAR(Math.min(...rooms.map((r) => r.price)))} / night`} />
          </StepCard>
        )}
        {step === 3 && (
          <StepCard key="3">
            <h3 className="font-display text-xl font-semibold">Booking rules</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Min nights"><Input type="number" value={minNights} onChange={(e) => setMin(Number(e.target.value))} /></Field>
              <Field label="Check-in time"><Input type="time" value={checkInTime} onChange={(e) => setIn(e.target.value)} /></Field>
              <Field label="Check-out time"><Input type="time" value={checkOutTime} onChange={(e) => setOut(e.target.value)} /></Field>
            </div>
            <PreviewHero cover={cover} category="Stay" title={title} venue={venue} city={city} />
            <PublishNotice text="Guests can book this stay from the Trove Seekers app." />
          </StepCard>
        )}
      </AnimatePresence>
      <NavButtons step={step} max={3} onBack={() => setStep(Math.max(1, step - 1))} onNext={next} onPublish={publish} />
    </>
  );
}

// ---------- OPEN PASS ----------
function OpenPassWizard({ onDone }: { onDone: (id: string) => void }) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("Johannesburg");
  const [cover, setCover] = useState(STOCK_COVERS[10]);
  const [validFrom, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [validTo, setTo] = useState(new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [unlimited, setUnlimited] = useState(false);
  const [dailyCap, setCap] = useState(200);
  const [hours, setHours] = useState("10:00–18:00");
  const [passTypes, setPT] = useState([
    { name: "Adult", price: 120 },
    { name: "Concession", price: 80 },
  ]);
  const updatePT = (i: number, p: Partial<typeof passTypes[0]>) => setPT(passTypes.map((x, idx) => idx === i ? { ...x, ...p } : x));

  const next = () => {
    if (step === 1 && (!title || !venue)) return toast.error("Fill in title and venue");
    if (step === 2 && passTypes.length === 0) return toast.error("Add at least one pass type");
    setStep(step + 1);
  };
  const publish = () => {
    const c = createListing({
      type: "open_pass", title, description, category: "Exhibit", venue, city, cover, status: "live",
      validFrom, validTo, dailyCap: unlimited ? null : dailyCap, hours,
      passTypes: passTypes.map((p) => ({ ...p, id: "pt_" + Math.random().toString(36).slice(2, 8) })),
      passes: [],
    });
    toast.success(`${title} now selling passes`); onDone(c.id);
  };

  return (
    <>
      <Stepper step={step} />
      <AnimatePresence mode="wait">
        {step === 1 && (
          <StepCard key="1">
            <h3 className="font-display text-xl font-semibold">Exhibit details</h3>
            <Field label="Exhibit / pass title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Modern Africa · Spring Exhibit" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Venue"><Input value={venue} onChange={(e) => setVenue(e.target.value)} /></Field>
              <Field label="City"><Input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
            </div>
            <Field label="Description"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            <CoverPicker cover={cover} setCover={setCover} />
          </StepCard>
        )}
        {step === 2 && (
          <StepCard key="2">
            <h3 className="font-display text-xl font-semibold">Validity & pass types</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valid from"><Input type="date" value={validFrom} onChange={(e) => setFrom(e.target.value)} /></Field>
              <Field label="Valid to"><Input type="date" value={validTo} onChange={(e) => setTo(e.target.value)} /></Field>
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="unlim" checked={unlimited} onChange={(e) => setUnlimited(e.target.checked)} className="h-4 w-4 accent-pink-500" />
              <Label htmlFor="unlim" className="cursor-pointer">Unlimited daily capacity</Label>
            </div>
            {!unlimited && <Field label="Daily cap"><Input type="number" value={dailyCap} onChange={(e) => setCap(Number(e.target.value))} /></Field>}
            <div className="flex items-center justify-between">
              <Label>Pass types</Label>
              <Button size="sm" variant="outline" onClick={() => setPT([...passTypes, { name: "Child", price: 0 }])}>
                <Plus className="mr-1 h-4 w-4" /> Add type
              </Button>
            </div>
            {passTypes.map((p, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-7"><Label className="text-xs">Name</Label><Input value={p.name} onChange={(e) => updatePT(i, { name: e.target.value })} /></div>
                  <div className="sm:col-span-4"><Label className="text-xs">Price (ZAR)</Label><Input type="number" value={p.price} onChange={(e) => updatePT(i, { price: Number(e.target.value) })} /></div>
                  <div className="flex items-end sm:col-span-1"><Button size="icon" variant="ghost" onClick={() => setPT(passTypes.filter((_, idx) => idx !== i))} disabled={passTypes.length === 1}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                </div>
              </div>
            ))}
          </StepCard>
        )}
        {step === 3 && (
          <StepCard key="3">
            <h3 className="font-display text-xl font-semibold">Operating hours & review</h3>
            <Field label="Operating hours"><Input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="10:00–18:00" /></Field>
            <PreviewHero cover={cover} category="Exhibit" title={title} venue={venue} city={city} />
            <SummaryRow label="Run length" value={`${validFrom} → ${validTo}`} />
            <PublishNotice text="Passes are valid any day in this date window." />
          </StepCard>
        )}
      </AnimatePresence>
      <NavButtons step={step} max={3} onBack={() => setStep(Math.max(1, step - 1))} onNext={next} onPublish={publish} />
    </>
  );
}

// ---------- PACKAGE ----------
function PackageWizard({ onDone }: { onDone: (id: string) => void }) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("Johannesburg");
  const [cover, setCover] = useState(STOCK_COVERS[9]);
  const [includesText, setIncludesText] = useState("200 paintballs each, Full kit, Marshall, 2 hours field time");
  const [minGroup, setMinG] = useState(6);
  const [maxGroup, setMaxG] = useState(20);
  const [pricingMode, setPricing] = useState<"per_person" | "flat">("per_person");
  const [price, setPrice] = useState(450);
  const [addons, setAddons] = useState([{ name: "Lunch combo", price: 145 }]);
  const [scheduling, setScheduling] = useState<"fixed" | "on_request" | "recurring">("on_request");
  const [date, setDate] = useState("");
  const updateAd = (i: number, p: Partial<typeof addons[0]>) => setAddons(addons.map((x, idx) => idx === i ? { ...x, ...p } : x));

  const next = () => {
    if (step === 1 && (!title || !venue)) return toast.error("Fill in title and venue");
    setStep(step + 1);
  };
  const publish = () => {
    const c = createListing({
      type: "package", title, description, category: "Package", venue, city, cover, status: "live",
      includes: includesText.split(",").map((s) => s.trim()).filter(Boolean),
      minGroup, maxGroup, pricingMode, price, scheduling,
      date: scheduling === "fixed" && date ? date : undefined,
      addons: addons.map((a) => ({ ...a, id: "ad_" + Math.random().toString(36).slice(2, 8) })),
      groupBookings: [],
    });
    toast.success(`${title} now taking group bookings`); onDone(c.id);
  };

  return (
    <>
      <Stepper step={step} />
      <AnimatePresence mode="wait">
        {step === 1 && (
          <StepCard key="1">
            <h3 className="font-display text-xl font-semibold">Package details</h3>
            <Field label="Package name"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Paintball Group Battle" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Venue"><Input value={venue} onChange={(e) => setVenue(e.target.value)} /></Field>
              <Field label="City"><Input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
            </div>
            <Field label="Description"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            <Field label="What's included (comma-separated)"><Textarea rows={2} value={includesText} onChange={(e) => setIncludesText(e.target.value)} /></Field>
            <CoverPicker cover={cover} setCover={setCover} />
          </StepCard>
        )}
        {step === 2 && (
          <StepCard key="2">
            <h3 className="font-display text-xl font-semibold">Group size & pricing</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Min group size"><Input type="number" value={minGroup} onChange={(e) => setMinG(Number(e.target.value))} /></Field>
              <Field label="Max group size"><Input type="number" value={maxGroup} onChange={(e) => setMaxG(Number(e.target.value))} /></Field>
            </div>
            <div>
              <Label className="mb-2 block text-xs">Pricing mode</Label>
              <div className="flex gap-2">
                {(["per_person", "flat"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setPricing(m)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      pricingMode === m ? "border-primary bg-gradient-brand text-primary-foreground" : "border-border/60 text-muted-foreground"
                    }`}>{m === "per_person" ? "Per person" : "Flat group price"}</button>
                ))}
              </div>
            </div>
            <Field label={pricingMode === "per_person" ? "Price per person (ZAR)" : "Group price (ZAR)"}>
              <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
            </Field>
            <div className="flex items-center justify-between">
              <Label>Add-ons</Label>
              <Button size="sm" variant="outline" onClick={() => setAddons([...addons, { name: "Extra", price: 0 }])}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
            {addons.map((a, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="grid gap-3 sm:grid-cols-12">
                  <div className="sm:col-span-7"><Label className="text-xs">Name</Label><Input value={a.name} onChange={(e) => updateAd(i, { name: e.target.value })} /></div>
                  <div className="sm:col-span-4"><Label className="text-xs">Price (ZAR)</Label><Input type="number" value={a.price} onChange={(e) => updateAd(i, { price: Number(e.target.value) })} /></div>
                  <div className="flex items-end sm:col-span-1"><Button size="icon" variant="ghost" onClick={() => setAddons(addons.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                </div>
              </div>
            ))}
          </StepCard>
        )}
        {step === 3 && (
          <StepCard key="3">
            <h3 className="font-display text-xl font-semibold">Scheduling & review</h3>
            <div>
              <Label className="mb-2 block text-xs">Scheduling mode</Label>
              <div className="flex flex-wrap gap-2">
                {(["fixed", "on_request", "recurring"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setScheduling(m)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      scheduling === m ? "border-primary bg-gradient-brand text-primary-foreground" : "border-border/60 text-muted-foreground"
                    }`}>{m === "fixed" ? "Fixed date" : m === "on_request" ? "On request" : "Recurring"}</button>
                ))}
              </div>
            </div>
            {scheduling === "fixed" && (
              <Field label="Date"><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            )}
            <PreviewHero cover={cover} category="Package" title={title} venue={venue} city={city} />
            <SummaryRow label="Group size · Pricing" value={`${minGroup}–${maxGroup} pax · ${ZAR(price)} ${pricingMode === "per_person" ? "p/p" : "flat"}`} />
            <PublishNotice text="Groups can request this package from the Trove Seekers app." />
          </StepCard>
        )}
      </AnimatePresence>
      <NavButtons step={step} max={3} onBack={() => setStep(Math.max(1, step - 1))} onNext={next} onPublish={publish} />
    </>
  );
}

// ---------- shared bits ----------
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-input px-3 text-sm">
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
function CoverPicker({ cover, setCover }: { cover: string; setCover: (s: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>Cover image</Label>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STOCK_COVERS.map((c) => (
          <button key={c} type="button" onClick={() => setCover(c)}
            className={`aspect-video overflow-hidden rounded-lg border-2 transition ${cover === c ? "border-primary shadow-glow-sm" : "border-transparent opacity-60 hover:opacity-100"}`}>
            <img src={c} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
function PreviewHero({ cover, category, title, venue, city }: { cover: string; category: string; title: string; venue: string; city: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <div className="relative aspect-[16/9]">
        <img src={cover} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur">{category}</span>
          <h4 className="mt-2 font-display text-2xl font-bold">{title || "Untitled"}</h4>
          <p className="text-sm text-muted-foreground">{venue} · {city}</p>
        </div>
      </div>
    </div>
  );
}
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-display font-bold text-gradient">{value}</span>
    </div>
  );
}
function RowSimple({ title, sub, right }: { title: string; sub: string; right: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-3 text-sm">
      <div><p className="font-medium">{title}</p><p className="text-xs text-muted-foreground">{sub}</p></div>
      <p className="font-display font-bold">{right}</p>
    </div>
  );
}
function PublishNotice({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm">
      <Sparkles className="h-4 w-4 text-primary" /><span>{text}</span>
    </div>
  );
}
