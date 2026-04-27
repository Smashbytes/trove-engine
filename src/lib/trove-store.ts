// Mock data + localStorage persistence for Trove Engine prototype.
// All "backend" lives here — events, tickets, sales, attendees, payouts.

import { useEffect, useState } from "react";

export type TicketTier = {
  id: string;
  name: string;
  price: number; // ZAR
  inventory: number;
  sold: number;
  salesStart?: string; // ISO
  salesEnd?: string;   // ISO
};

export type Attendee = {
  id: string;
  name: string;
  email: string;
  tierId: string;
  tierName: string;
  qr: string;
  checkedIn: boolean;
  purchasedAt: string; // ISO
};

export type EventStatus = "live" | "draft" | "sold_out" | "ended";

export type TroveEvent = {
  id: string;
  title: string;
  description: string;
  category: string;        // Nightlife, Comedy, Adventure, Sip & Paint…
  venue: string;
  city: string;
  cover: string;           // image URL
  date: string;            // ISO
  doorsOpen?: string;
  status: EventStatus;
  tiers: TicketTier[];
  attendees: Attendee[];
  createdAt: string;
};

export type Payout = {
  id: string;
  amount: number;
  status: "pending" | "paid";
  date: string;
  reference: string;
};

export type SpotProfile = {
  name: string;
  tagline: string;
  bio: string;
  city: string;
  email: string;
  phone: string;
  website: string;
  instagram: string;
  logo?: string;
  cover?: string;
  loggedIn: boolean;
};

const KEY_EVENTS = "trove_engine_events_v1";
const KEY_PROFILE = "trove_engine_profile_v1";
const KEY_PAYOUTS = "trove_engine_payouts_v1";

// ---------- seed ----------
const COVERS = [
  "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=1200&h=720&fit=crop&q=80",
  "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200&h=720&fit=crop&q=80",
  "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=1200&h=720&fit=crop&q=80",
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&h=720&fit=crop&q=80",
  "https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=1200&h=720&fit=crop&q=80",
];

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function randomQR() {
  return `TRV-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

function makeAttendees(count: number, tiers: TicketTier[]): Attendee[] {
  const names = [
    "Siya Mokoena", "Nomvula Dube", "Thabo Khumalo", "Lerato Naidoo",
    "Kabelo Smith", "Aisha Patel", "Tendai Mbeki", "Zanele Botha",
    "Mpho Sithole", "Refilwe Adams", "Bongani Pillay", "Nadia van Wyk",
    "Tumi Mahlangu", "Karabo Joseph", "Sade Williams", "Itumeleng Cele",
  ];
  const out: Attendee[] = [];
  for (let i = 0; i < count; i++) {
    const tier = tiers[i % tiers.length];
    const n = names[i % names.length];
    out.push({
      id: uid("att"),
      name: n,
      email: `${n.toLowerCase().replace(/ /g, ".")}@example.com`,
      tierId: tier.id,
      tierName: tier.name,
      qr: randomQR(),
      checkedIn: Math.random() < 0.35,
      purchasedAt: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString(),
    });
  }
  return out;
}

function seedEvents(): TroveEvent[] {
  const now = Date.now();
  const mk = (
    title: string, cat: string, venue: string, city: string, daysOut: number,
    cover: string, tierDefs: Array<Omit<TicketTier, "id" | "sold"> & { sold: number }>
  ): TroveEvent => {
    const tiers: TicketTier[] = tierDefs.map((t) => ({ ...t, id: uid("tier") }));
    const attendees = makeAttendees(
      tiers.reduce((s, t) => s + t.sold, 0),
      tiers
    );
    const totalSold = tiers.reduce((s, t) => s + t.sold, 0);
    const totalCap = tiers.reduce((s, t) => s + t.inventory, 0);
    return {
      id: uid("evt"),
      title, description: `${title} — an unforgettable ${cat.toLowerCase()} night at ${venue}.`,
      category: cat, venue, city, cover,
      date: new Date(now + daysOut * 86400000).toISOString(),
      doorsOpen: "20:00",
      status: totalSold >= totalCap ? "sold_out" : daysOut < 0 ? "ended" : "live",
      tiers, attendees,
      createdAt: new Date(now - 10 * 86400000).toISOString(),
    };
  };
  return [
    mk("Techno Tuesdays", "Nightlife", "Neon Underground", "Braamfontein", 3, COVERS[0], [
      { name: "Early Bird", price: 100, inventory: 50, sold: 50 },
      { name: "General Admission", price: 150, inventory: 120, sold: 98 },
      { name: "VIP Booth", price: 450, inventory: 30, sold: 22 },
    ]),
    mk("Sunset Sessions: Sandton Rooftop", "Nightlife", "The Rooftop at Sandton", "Sandton", 7, COVERS[1], [
      { name: "General", price: 200, inventory: 100, sold: 87 },
      { name: "VIP Cabana", price: 750, inventory: 20, sold: 15 },
    ]),
    mk("Stand-Up Saturdays", "Comedy", "Parker's Comedy Club", "Cape Town", 12, COVERS[2], [
      { name: "Standard", price: 180, inventory: 200, sold: 64 },
      { name: "Front Row", price: 320, inventory: 30, sold: 11 },
    ]),
    mk("Magaliesberg Cave Adventure", "Adventure", "Wonder Cave", "Magaliesberg", 21, COVERS[3], [
      { name: "Full Day Pass", price: 650, inventory: 40, sold: 18 },
    ]),
    mk("Sip & Paint: Pink Edition", "Workshop", "The Studio JHB", "Rosebank", -5, COVERS[4], [
      { name: "Includes Wine", price: 380, inventory: 25, sold: 25 },
    ]),
  ];
}

function seedPayouts(): Payout[] {
  return [
    { id: uid("po"), amount: 8450, status: "paid", date: new Date(Date.now() - 7 * 86400000).toISOString(), reference: "PAYFAST-9X42" },
    { id: uid("po"), amount: 12200, status: "paid", date: new Date(Date.now() - 21 * 86400000).toISOString(), reference: "PAYFAST-7K11" },
    { id: uid("po"), amount: 5680, status: "pending", date: new Date(Date.now() + 3 * 86400000).toISOString(), reference: "PAYFAST-PEND" },
  ];
}

const defaultProfile: SpotProfile = {
  name: "Neon Underground",
  tagline: "Joburg's loudest underground.",
  bio: "Three rooms. One unforgettable night. Resident DJs and international guests every weekend in the heart of Braamfontein.",
  city: "Braamfontein, JHB",
  email: "spots@neonunderground.co.za",
  phone: "+27 11 555 0142",
  website: "neonunderground.co.za",
  instagram: "@neonunderground",
  loggedIn: false,
};

// ---------- storage helpers ----------
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("trove-storage"));
}

// ---------- public API ----------
export function getEvents(): TroveEvent[] {
  const cached = read<TroveEvent[] | null>(KEY_EVENTS, null);
  if (cached) return cached;
  const seeded = seedEvents();
  write(KEY_EVENTS, seeded);
  return seeded;
}

export function getEvent(id: string): TroveEvent | undefined {
  return getEvents().find((e) => e.id === id);
}

export function saveEvent(evt: TroveEvent) {
  const all = getEvents();
  const idx = all.findIndex((e) => e.id === evt.id);
  if (idx >= 0) all[idx] = evt;
  else all.unshift(evt);
  write(KEY_EVENTS, all);
}

export function deleteEvent(id: string) {
  write(KEY_EVENTS, getEvents().filter((e) => e.id !== id));
}

export function createEvent(input: {
  title: string; description: string; category: string;
  venue: string; city: string; cover: string;
  date: string; tiers: Array<Omit<TicketTier, "id" | "sold">>;
}): TroveEvent {
  const tiers: TicketTier[] = input.tiers.map((t) => ({ ...t, id: uid("tier"), sold: 0 }));
  const evt: TroveEvent = {
    id: uid("evt"),
    title: input.title, description: input.description, category: input.category,
    venue: input.venue, city: input.city, cover: input.cover,
    date: input.date, status: "live",
    tiers, attendees: [],
    createdAt: new Date().toISOString(),
  };
  saveEvent(evt);
  return evt;
}

export function checkInAttendee(eventId: string, qr: string): "ok" | "duplicate" | "not_found" {
  const evt = getEvent(eventId);
  if (!evt) return "not_found";
  const att = evt.attendees.find((a) => a.qr === qr);
  if (!att) return "not_found";
  if (att.checkedIn) return "duplicate";
  att.checkedIn = true;
  saveEvent(evt);
  return "ok";
}

export function getProfile(): SpotProfile {
  return read<SpotProfile>(KEY_PROFILE, defaultProfile);
}

export function saveProfile(p: SpotProfile) {
  write(KEY_PROFILE, p);
}

export function login() {
  const p = getProfile();
  saveProfile({ ...p, loggedIn: true });
}

export function logout() {
  const p = getProfile();
  saveProfile({ ...p, loggedIn: false });
}

export function getPayouts(): Payout[] {
  const cached = read<Payout[] | null>(KEY_PAYOUTS, null);
  if (cached) return cached;
  const seeded = seedPayouts();
  write(KEY_PAYOUTS, seeded);
  return seeded;
}

// ---------- derived ----------
export function totals(events: TroveEvent[]) {
  let revenue = 0, sold = 0, capacity = 0, checkedIn = 0;
  for (const e of events) {
    for (const t of e.tiers) {
      revenue += t.price * t.sold;
      sold += t.sold;
      capacity += t.inventory;
    }
    checkedIn += e.attendees.filter((a) => a.checkedIn).length;
  }
  return { revenue, sold, capacity, checkedIn };
}

export function salesByDay(events: TroveEvent[], days = 14) {
  const out: { date: string; revenue: number; tickets: number }[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const label = d.toLocaleDateString("en-ZA", { month: "short", day: "numeric" });
    let revenue = 0, tickets = 0;
    for (const e of events) {
      for (const a of e.attendees) {
        const ad = new Date(a.purchasedAt);
        if (ad.toDateString() === d.toDateString()) {
          tickets++;
          const tier = e.tiers.find((t) => t.id === a.tierId);
          if (tier) revenue += tier.price;
        }
      }
    }
    out.push({ date: label, revenue, tickets });
  }
  return out;
}

// React hook — re-renders on storage updates
export function useTroveData() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    window.addEventListener("trove-storage", fn);
    window.addEventListener("storage", fn);
    return () => {
      window.removeEventListener("trove-storage", fn);
      window.removeEventListener("storage", fn);
    };
  }, []);
  return {
    tick,
    events: getEvents(),
    profile: getProfile(),
    payouts: getPayouts(),
  };
}

export const ZAR = (n: number) =>
  "R " + n.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const CATEGORIES = [
  "Nightlife", "Comedy", "Adventure", "Workshop", "Live Music", "Rooftop", "Festival",
];

export const STOCK_COVERS = COVERS;
