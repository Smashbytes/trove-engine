// Mock data + localStorage persistence for Trove Engine prototype.
// Multi-vertical: events, timeslots, stays, open passes, packages.

import { useEffect, useState } from "react";

// ---------- Spot Type ----------
export type SpotType = "venue" | "resort" | "activity" | "gallery" | "operator";

export const SPOT_TYPES: Array<{
  id: SpotType;
  label: string;
  blurb: string;
  examples: string;
  icon: string; // emoji for prototype
  defaultListingType: ListingType;
  accent: string; // tailwind color class root
}> = [
  { id: "venue",    label: "Venue",    blurb: "Events & ticketed nights",  examples: "Clubs, comedy rooms, festivals, expos, mega churches", icon: "🎟️",  defaultListingType: "event",     accent: "primary" },
  { id: "resort",   label: "Resort",   blurb: "Stays & getaways",          examples: "Lodges, hotels, glamping, weekend retreats",          icon: "🏝️",  defaultListingType: "stay",      accent: "teal" },
  { id: "activity", label: "Activity", blurb: "Bookable time slots",        examples: "Spa, skydive, paintball sessions, go-carting, sip & paint", icon: "🪂", defaultListingType: "timeslot",  accent: "lime" },
  { id: "gallery",  label: "Gallery",  blurb: "Open passes & exhibits",     examples: "Museums, art galleries, ongoing exhibits, food fests", icon: "🎨", defaultListingType: "open_pass", accent: "amber" },
  { id: "operator", label: "Operator", blurb: "Group packages",             examples: "Paintball groups, hiking trips, wine tours, team builds", icon: "🎯", defaultListingType: "package",  accent: "violet" },
];

// ---------- Listing types ----------
export type ListingType = "event" | "timeslot" | "stay" | "open_pass" | "package";

export type ListingStatus = "live" | "draft" | "sold_out" | "ended";

export type TicketTier = {
  id: string;
  name: string;
  price: number; // ZAR
  inventory: number;
  sold: number;
};

export type Attendee = {
  id: string;
  name: string;
  email: string;
  tierId: string;
  tierName: string;
  qr: string;
  checkedIn: boolean;
  purchasedAt: string;
};

// Timeslot
export type Slot = { time: string; capacity: number; price: number }; // time = "HH:mm"
export type SlotBooking = {
  id: string; name: string; email: string;
  date: string;           // ISO date "YYYY-MM-DD"
  slotTime: string;       // "HH:mm"
  guests: number;
  qr: string;
  checkedIn: boolean;
  purchasedAt: string;
};

// Stay
export type Room = { id: string; name: string; count: number; price: number; maxGuests: number };
export type Reservation = {
  id: string; name: string; email: string; phone?: string;
  roomId: string; roomName: string;
  checkIn: string; checkOut: string; // ISO date
  guests: number;
  total: number;
  checkedIn: boolean;
  purchasedAt: string;
};

// Open Pass
export type PassType = { id: string; name: string; price: number };
export type Pass = {
  id: string; name: string; email: string;
  passTypeId: string; passTypeName: string;
  validFrom: string; validTo: string;
  qr: string;
  visited: boolean;
  purchasedAt: string;
};

// Package
export type Addon = { id: string; name: string; price: number };
export type GroupBooking = {
  id: string; name: string; email: string; phone?: string;
  groupSize: number;
  date?: string; // optional if on-request
  addons: string[]; // ids
  total: number;
  qr: string;
  confirmedHeadcount: boolean;
  purchasedAt: string;
};

// ---------- Discriminated union ----------
type BaseListing = {
  id: string;
  type: ListingType;
  title: string;
  description: string;
  category: string;
  venue: string;
  city: string;
  cover: string;
  status: ListingStatus;
  createdAt: string;
};

export type EventListing = BaseListing & {
  type: "event";
  date: string;
  doorsOpen?: string;
  tiers: TicketTier[];
  attendees: Attendee[];
};

export type TimeslotListing = BaseListing & {
  type: "timeslot";
  durationMin: number;
  daysOfWeek: number[]; // 0=Sun..6=Sat
  slots: Slot[];
  bookings: SlotBooking[];
  bookingWindowDays: number;
};

export type StayListing = BaseListing & {
  type: "stay";
  amenities: string[];
  rooms: Room[];
  reservations: Reservation[];
  minNights: number;
  checkInTime: string;
  checkOutTime: string;
};

export type OpenPassListing = BaseListing & {
  type: "open_pass";
  validFrom: string;
  validTo: string;
  dailyCap: number | null; // null = unlimited
  passTypes: PassType[];
  passes: Pass[];
  hours: string;
};

export type PackageListing = BaseListing & {
  type: "package";
  minGroup: number;
  maxGroup: number;
  includes: string[];
  addons: Addon[];
  pricingMode: "per_person" | "flat";
  price: number;
  scheduling: "fixed" | "on_request" | "recurring";
  date?: string;
  groupBookings: GroupBooking[];
};

export type Listing =
  | EventListing | TimeslotListing | StayListing | OpenPassListing | PackageListing;

// Backwards-compat alias
export type TroveEvent = EventListing;

export type Payout = {
  id: string;
  amount: number;
  status: "pending" | "paid";
  date: string;
  reference: string;
};

export type SpotProfile = {
  spotType: SpotType | null; // null → onboarding
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

const KEY_LISTINGS = "trove_engine_listings_v2";
const KEY_LEGACY_EVENTS = "trove_engine_events_v1";
const KEY_PROFILE = "trove_engine_profile_v2";
const KEY_PAYOUTS = "trove_engine_payouts_v1";

// ---------- seed ----------
const COVERS = [
  "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=1200&h=720&fit=crop&q=80", // club
  "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200&h=720&fit=crop&q=80", // rooftop
  "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=1200&h=720&fit=crop&q=80", // comedy
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&h=720&fit=crop&q=80", // adventure
  "https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=1200&h=720&fit=crop&q=80", // workshop
  "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&h=720&fit=crop&q=80", // lodge / pool
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&h=720&fit=crop&q=80", // hotel room
  "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200&h=720&fit=crop&q=80", // spa
  "https://images.unsplash.com/photo-1521336575822-6da63fb45455?w=1200&h=720&fit=crop&q=80", // skydive
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&h=720&fit=crop&q=80", // paintball
  "https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=1200&h=720&fit=crop&q=80", // gallery
  "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1200&h=720&fit=crop&q=80", // food fest
];

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
function randomQR() {
  return `TRV-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

const NAMES = [
  "Siya Mokoena", "Nomvula Dube", "Thabo Khumalo", "Lerato Naidoo",
  "Kabelo Smith", "Aisha Patel", "Tendai Mbeki", "Zanele Botha",
  "Mpho Sithole", "Refilwe Adams", "Bongani Pillay", "Nadia van Wyk",
  "Tumi Mahlangu", "Karabo Joseph", "Sade Williams", "Itumeleng Cele",
];
const nameAt = (i: number) => NAMES[i % NAMES.length];
const emailFor = (n: string) => `${n.toLowerCase().replace(/ /g, ".")}@example.com`;

function makeEventAttendees(count: number, tiers: TicketTier[]): Attendee[] {
  const out: Attendee[] = [];
  for (let i = 0; i < count; i++) {
    const tier = tiers[i % tiers.length];
    const n = nameAt(i);
    out.push({
      id: uid("att"), name: n, email: emailFor(n),
      tierId: tier.id, tierName: tier.name, qr: randomQR(),
      checkedIn: Math.random() < 0.35,
      purchasedAt: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString(),
    });
  }
  return out;
}

function seedEvent(
  title: string, cat: string, venue: string, city: string, daysOut: number,
  cover: string, tierDefs: Array<Omit<TicketTier, "id" | "sold"> & { sold: number }>
): EventListing {
  const tiers: TicketTier[] = tierDefs.map((t) => ({ ...t, id: uid("tier") }));
  const attendees = makeEventAttendees(tiers.reduce((s, t) => s + t.sold, 0), tiers);
  const totalSold = tiers.reduce((s, t) => s + t.sold, 0);
  const totalCap = tiers.reduce((s, t) => s + t.inventory, 0);
  return {
    id: uid("evt"), type: "event",
    title, description: `${title} — an unforgettable ${cat.toLowerCase()} night at ${venue}.`,
    category: cat, venue, city, cover,
    date: new Date(Date.now() + daysOut * 86400000).toISOString(),
    doorsOpen: "20:00",
    status: totalSold >= totalCap ? "sold_out" : daysOut < 0 ? "ended" : "live",
    tiers, attendees,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  };
}

function seedTimeslot(
  title: string, cat: string, venue: string, city: string, cover: string,
  durationMin: number, slots: Slot[], bookingsCount: number
): TimeslotListing {
  const bookings: SlotBooking[] = [];
  for (let i = 0; i < bookingsCount; i++) {
    const slot = slots[i % slots.length];
    const n = nameAt(i);
    const dayOffset = (i % 5) + 1;
    bookings.push({
      id: uid("bk"), name: n, email: emailFor(n),
      date: new Date(Date.now() + dayOffset * 86400000).toISOString().slice(0, 10),
      slotTime: slot.time,
      guests: 1 + (i % 2),
      qr: randomQR(),
      checkedIn: Math.random() < 0.25,
      purchasedAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
    });
  }
  return {
    id: uid("ts"), type: "timeslot",
    title, description: `${title} — book your slot at ${venue}.`,
    category: cat, venue, city, cover,
    durationMin, daysOfWeek: [2, 3, 4, 5, 6], slots, bookings,
    bookingWindowDays: 30,
    status: "live",
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  };
}

function seedStay(
  title: string, venue: string, city: string, cover: string,
  amenities: string[], rooms: Array<Omit<Room, "id">>, resCount: number
): StayListing {
  const r: Room[] = rooms.map((rm) => ({ ...rm, id: uid("rm") }));
  const reservations: Reservation[] = [];
  for (let i = 0; i < resCount; i++) {
    const room = r[i % r.length];
    const n = nameAt(i);
    const inDays = (i % 6) + 2;
    const nights = 1 + (i % 4);
    reservations.push({
      id: uid("res"), name: n, email: emailFor(n), phone: "+27 82 555 0" + (100 + i),
      roomId: room.id, roomName: room.name,
      checkIn: new Date(Date.now() + inDays * 86400000).toISOString().slice(0, 10),
      checkOut: new Date(Date.now() + (inDays + nights) * 86400000).toISOString().slice(0, 10),
      guests: 1 + (i % room.maxGuests),
      total: room.price * nights,
      checkedIn: Math.random() < 0.2,
      purchasedAt: new Date(Date.now() - Math.random() * 21 * 86400000).toISOString(),
    });
  }
  return {
    id: uid("stay"), type: "stay",
    title, description: `${title} — escape the city at ${venue}.`,
    category: "Stay", venue, city, cover,
    amenities, rooms: r, reservations,
    minNights: 1, checkInTime: "14:00", checkOutTime: "10:00",
    status: "live",
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  };
}

function seedOpenPass(
  title: string, venue: string, city: string, cover: string,
  passTypes: Array<Omit<PassType, "id">>, dailyCap: number | null, passCount: number
): OpenPassListing {
  const pt: PassType[] = passTypes.map((p) => ({ ...p, id: uid("pt") }));
  const passes: Pass[] = [];
  for (let i = 0; i < passCount; i++) {
    const t = pt[i % pt.length];
    const n = nameAt(i);
    passes.push({
      id: uid("pass"), name: n, email: emailFor(n),
      passTypeId: t.id, passTypeName: t.name,
      validFrom: new Date().toISOString().slice(0, 10),
      validTo: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      qr: randomQR(),
      visited: Math.random() < 0.4,
      purchasedAt: new Date(Date.now() - Math.random() * 10 * 86400000).toISOString(),
    });
  }
  return {
    id: uid("pass"), type: "open_pass",
    title, description: `${title} — visit any day during the run.`,
    category: "Exhibit", venue, city, cover,
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    dailyCap, passTypes: pt, passes, hours: "10:00–18:00",
    status: "live",
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  };
}

function seedPackage(
  title: string, venue: string, city: string, cover: string,
  includes: string[], addonsDef: Array<Omit<Addon, "id">>,
  pricingMode: "per_person" | "flat", price: number,
  bookingsCount: number,
): PackageListing {
  const addons: Addon[] = addonsDef.map((a) => ({ ...a, id: uid("ad") }));
  const groupBookings: GroupBooking[] = [];
  for (let i = 0; i < bookingsCount; i++) {
    const n = nameAt(i);
    const groupSize = 6 + (i % 8);
    const total = pricingMode === "per_person" ? price * groupSize : price;
    groupBookings.push({
      id: uid("gb"), name: n, email: emailFor(n), phone: "+27 83 555 0" + (200 + i),
      groupSize, addons: i % 2 === 0 && addons[0] ? [addons[0].id] : [],
      date: new Date(Date.now() + ((i % 10) + 3) * 86400000).toISOString().slice(0, 10),
      total: total + (i % 2 === 0 && addons[0] ? addons[0].price * groupSize : 0),
      qr: randomQR(),
      confirmedHeadcount: Math.random() < 0.3,
      purchasedAt: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString(),
    });
  }
  return {
    id: uid("pkg"), type: "package",
    title, description: `${title} — group experience at ${venue}.`,
    category: "Package", venue, city, cover,
    minGroup: 6, maxGroup: 20, includes, addons,
    pricingMode, price, scheduling: "on_request",
    groupBookings,
    status: "live",
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
  };
}

function seedListings(): Listing[] {
  return [
    seedEvent("Techno Tuesdays", "Nightlife", "Neon Underground", "Braamfontein", 3, COVERS[0], [
      { name: "Early Bird", price: 100, inventory: 50, sold: 50 },
      { name: "General Admission", price: 150, inventory: 120, sold: 98 },
      { name: "VIP Booth", price: 450, inventory: 30, sold: 22 },
    ]),
    seedEvent("Sunset Sessions: Sandton Rooftop", "Nightlife", "The Rooftop", "Sandton", 7, COVERS[1], [
      { name: "General", price: 200, inventory: 100, sold: 87 },
      { name: "VIP Cabana", price: 750, inventory: 20, sold: 15 },
    ]),
    seedTimeslot("Signature Massage · 60min", "Spa", "Glow Spa", "Rosebank", COVERS[7], 60, [
      { time: "09:00", capacity: 3, price: 750 },
      { time: "11:00", capacity: 3, price: 750 },
      { time: "14:00", capacity: 3, price: 850 },
      { time: "16:00", capacity: 3, price: 850 },
    ], 18),
    seedTimeslot("Tandem Skydive", "Skydive", "Skydive JHB", "Carletonville", COVERS[8], 90, [
      { time: "08:00", capacity: 4, price: 2950 },
      { time: "10:00", capacity: 4, price: 2950 },
      { time: "13:00", capacity: 4, price: 3250 },
    ], 14),
    seedStay("Magalies River Lodge", "Magalies River Lodge", "Magaliesberg", COVERS[5],
      ["Pool", "Spa", "Restaurant", "Wifi", "Fire pit", "River access"],
      [
        { name: "Standard Suite",   count: 8, price: 1850, maxGuests: 2 },
        { name: "Deluxe Riverside", count: 4, price: 2950, maxGuests: 3 },
        { name: "Family Cabin",     count: 3, price: 3850, maxGuests: 5 },
      ], 12),
    seedOpenPass("Modern Africa · Spring Exhibit", "Goodman Gallery", "Rosebank", COVERS[10],
      [
        { name: "Adult", price: 120 },
        { name: "Concession", price: 80 },
        { name: "Child (under 12)", price: 0 },
      ], 200, 24),
    seedPackage("Paintball Group Battle", "Battlezone Paintball", "Lanseria", COVERS[9],
      ["200 paintballs each", "Full kit & overalls", "Marshall", "2 hours field time"],
      [
        { name: "Extra 100 paintballs", price: 95 },
        { name: "Lunch combo", price: 145 },
      ], "per_person", 450, 6),
  ];
}

function seedPayouts(): Payout[] {
  return [
    { id: uid("po"), amount: 8450,  status: "paid",    date: new Date(Date.now() - 7 * 86400000).toISOString(),  reference: "PAYFAST-9X42" },
    { id: uid("po"), amount: 12200, status: "paid",    date: new Date(Date.now() - 21 * 86400000).toISOString(), reference: "PAYFAST-7K11" },
    { id: uid("po"), amount: 5680,  status: "pending", date: new Date(Date.now() + 3 * 86400000).toISOString(),  reference: "PAYFAST-PEND" },
  ];
}

const defaultProfile: SpotProfile = {
  spotType: null,
  name: "Neon Underground",
  tagline: "Joburg's loudest underground.",
  bio: "Three rooms. One unforgettable night. Resident DJs and international guests every weekend.",
  city: "Braamfontein, JHB",
  email: "spots@neonunderground.co.za",
  phone: "+27 11 555 0142",
  website: "neonunderground.co.za",
  instagram: "@neonunderground",
  loggedIn: false,
};

// ---------- storage ----------
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
export function getListings(): Listing[] {
  const cached = read<Listing[] | null>(KEY_LISTINGS, null);
  if (cached) return cached;
  // Migrate legacy events if present
  const legacy = read<EventListing[] | null>(KEY_LEGACY_EVENTS, null);
  if (legacy && legacy.length) {
    const upgraded: Listing[] = legacy.map((e) => ({ ...e, type: "event" as const }));
    write(KEY_LISTINGS, upgraded);
    return upgraded;
  }
  const seeded = seedListings();
  write(KEY_LISTINGS, seeded);
  return seeded;
}

export function getListing(id: string): Listing | undefined {
  return getListings().find((l) => l.id === id);
}

export function saveListing(l: Listing) {
  const all = getListings();
  const idx = all.findIndex((x) => x.id === l.id);
  if (idx >= 0) all[idx] = l;
  else all.unshift(l);
  write(KEY_LISTINGS, all);
}

export function deleteListing(id: string) {
  write(KEY_LISTINGS, getListings().filter((l) => l.id !== id));
}

// Backward-compatible helpers used by older routes (events index/detail)
export function getEvents(): EventListing[] {
  return getListings().filter((l): l is EventListing => l.type === "event");
}
export function getEvent(id: string): EventListing | undefined {
  const l = getListing(id);
  return l && l.type === "event" ? l : undefined;
}
export function saveEvent(evt: EventListing) { saveListing(evt); }
export function deleteEvent(id: string) { deleteListing(id); }

export function createEvent(input: {
  title: string; description: string; category: string;
  venue: string; city: string; cover: string;
  date: string; tiers: Array<Omit<TicketTier, "id" | "sold">>;
}): EventListing {
  const tiers: TicketTier[] = input.tiers.map((t) => ({ ...t, id: uid("tier"), sold: 0 }));
  const evt: EventListing = {
    id: uid("evt"), type: "event",
    title: input.title, description: input.description, category: input.category,
    venue: input.venue, city: input.city, cover: input.cover,
    date: input.date, status: "live",
    tiers, attendees: [], createdAt: new Date().toISOString(),
  };
  saveListing(evt);
  return evt;
}

// Generic listing creator (used by new wizard)
export function createListing(l: Omit<Listing, "id" | "createdAt"> & { id?: string }): Listing {
  const full = { ...l, id: l.id ?? uid(l.type), createdAt: new Date().toISOString() } as Listing;
  saveListing(full);
  return full;
}

// Event check-in (legacy)
export function checkInAttendee(eventId: string, qr: string): "ok" | "duplicate" | "not_found" {
  const evt = getEvent(eventId);
  if (!evt) return "not_found";
  const att = evt.attendees.find((a) => a.qr === qr);
  if (!att) return "not_found";
  if (att.checkedIn) return "duplicate";
  att.checkedIn = true;
  saveListing(evt);
  return "ok";
}

// Generic check-in across all listing types by QR
export type ScanResult =
  | { kind: "ok"; listingType: ListingType; name: string; detail: string }
  | { kind: "duplicate"; listingType: ListingType; name: string; detail: string }
  | { kind: "not_found" };

export function scanQR(listingId: string, qr: string): ScanResult {
  const l = getListing(listingId);
  if (!l) return { kind: "not_found" };
  const code = qr.trim();

  if (l.type === "event") {
    const a = l.attendees.find((x) => x.qr === code);
    if (!a) return { kind: "not_found" };
    if (a.checkedIn) return { kind: "duplicate", listingType: "event", name: a.name, detail: a.tierName };
    a.checkedIn = true; saveListing(l);
    return { kind: "ok", listingType: "event", name: a.name, detail: a.tierName };
  }
  if (l.type === "timeslot") {
    const b = l.bookings.find((x) => x.qr === code);
    if (!b) return { kind: "not_found" };
    if (b.checkedIn) return { kind: "duplicate", listingType: "timeslot", name: b.name, detail: `${b.date} · ${b.slotTime}` };
    b.checkedIn = true; saveListing(l);
    return { kind: "ok", listingType: "timeslot", name: b.name, detail: `${b.date} · ${b.slotTime} · ${b.guests}p` };
  }
  if (l.type === "open_pass") {
    const p = l.passes.find((x) => x.qr === code);
    if (!p) return { kind: "not_found" };
    if (p.visited) return { kind: "duplicate", listingType: "open_pass", name: p.name, detail: p.passTypeName };
    p.visited = true; saveListing(l);
    return { kind: "ok", listingType: "open_pass", name: p.name, detail: p.passTypeName };
  }
  if (l.type === "package") {
    const g = l.groupBookings.find((x) => x.qr === code);
    if (!g) return { kind: "not_found" };
    if (g.confirmedHeadcount) return { kind: "duplicate", listingType: "package", name: g.name, detail: `Group of ${g.groupSize}` };
    g.confirmedHeadcount = true; saveListing(l);
    return { kind: "ok", listingType: "package", name: g.name, detail: `Group of ${g.groupSize}` };
  }
  // stay → no QR; front-desk only
  return { kind: "not_found" };
}

// Stay front-desk check-in by reservation id
export function checkInReservation(stayId: string, reservationId: string): boolean {
  const l = getListing(stayId);
  if (!l || l.type !== "stay") return false;
  const r = l.reservations.find((x) => x.id === reservationId);
  if (!r) return false;
  r.checkedIn = true;
  saveListing(l);
  return true;
}

// ---------- profile ----------
export function getProfile(): SpotProfile {
  return read<SpotProfile>(KEY_PROFILE, defaultProfile);
}
export function saveProfile(p: SpotProfile) { write(KEY_PROFILE, p); }
export function setSpotType(t: SpotType) {
  const p = getProfile(); saveProfile({ ...p, spotType: t });
}
export function login() { saveProfile({ ...getProfile(), loggedIn: true }); }
export function logout() { saveProfile({ ...getProfile(), loggedIn: false }); }

// ---------- payouts ----------
export function getPayouts(): Payout[] {
  const cached = read<Payout[] | null>(KEY_PAYOUTS, null);
  if (cached) return cached;
  const seeded = seedPayouts(); write(KEY_PAYOUTS, seeded); return seeded;
}

// ---------- derived totals (per-listing) ----------
export function listingRevenue(l: Listing): number {
  switch (l.type) {
    case "event":     return l.tiers.reduce((s, t) => s + t.price * t.sold, 0);
    case "timeslot":  return l.bookings.reduce((s, b) => {
      const slot = l.slots.find((x) => x.time === b.slotTime);
      return s + (slot ? slot.price * b.guests : 0);
    }, 0);
    case "stay":      return l.reservations.reduce((s, r) => s + r.total, 0);
    case "open_pass": return l.passes.reduce((s, p) => {
      const t = l.passTypes.find((x) => x.id === p.passTypeId);
      return s + (t ? t.price : 0);
    }, 0);
    case "package":   return l.groupBookings.reduce((s, g) => s + g.total, 0);
  }
}

export function listingBookingsCount(l: Listing): number {
  switch (l.type) {
    case "event":     return l.attendees.length;
    case "timeslot":  return l.bookings.length;
    case "stay":      return l.reservations.length;
    case "open_pass": return l.passes.length;
    case "package":   return l.groupBookings.length;
  }
}

export function listingCapacity(l: Listing): number {
  switch (l.type) {
    case "event":     return l.tiers.reduce((s, t) => s + t.inventory, 0);
    case "timeslot":  return l.slots.reduce((s, t) => s + t.capacity, 0) * (l.daysOfWeek.length || 7);
    case "stay":      return l.rooms.reduce((s, r) => s + r.count, 0);
    case "open_pass": return l.dailyCap ?? 0;
    case "package":   return l.maxGroup;
  }
}

export function listingCheckedIn(l: Listing): number {
  switch (l.type) {
    case "event":     return l.attendees.filter((a) => a.checkedIn).length;
    case "timeslot":  return l.bookings.filter((b) => b.checkedIn).length;
    case "stay":      return l.reservations.filter((r) => r.checkedIn).length;
    case "open_pass": return l.passes.filter((p) => p.visited).length;
    case "package":   return l.groupBookings.filter((g) => g.confirmedHeadcount).length;
  }
}

export function listingDateLabel(l: Listing): string {
  switch (l.type) {
    case "event":     return new Date(l.date).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });
    case "timeslot":  return `${l.slots.length} slots · ${l.durationMin}min`;
    case "stay":      return `${l.rooms.length} room types · ${l.minNights}+ nights`;
    case "open_pass": return `${l.validFrom} → ${l.validTo}`;
    case "package":   return l.scheduling === "fixed" && l.date ? l.date : `${l.minGroup}–${l.maxGroup} pax · on request`;
  }
}

export function listingTypeLabel(t: ListingType): string {
  return ({ event: "Event", timeslot: "Timeslot", stay: "Stay", open_pass: "Open Pass", package: "Package" })[t];
}

export function totals(listings: Listing[]) {
  let revenue = 0, sold = 0, capacity = 0, checkedIn = 0;
  for (const l of listings) {
    revenue += listingRevenue(l);
    sold += listingBookingsCount(l);
    capacity += listingCapacity(l);
    checkedIn += listingCheckedIn(l);
  }
  return { revenue, sold, capacity, checkedIn };
}

// 14-day sales by purchase date (works across types)
export function salesByDay(listings: Listing[], days = 14) {
  const out: { date: string; revenue: number; tickets: number }[] = [];
  const now = Date.now();
  // pre-flatten purchases
  type P = { ts: number; revenue: number };
  const purchases: P[] = [];
  for (const l of listings) {
    if (l.type === "event") for (const a of l.attendees) {
      const tier = l.tiers.find((t) => t.id === a.tierId);
      purchases.push({ ts: new Date(a.purchasedAt).getTime(), revenue: tier?.price ?? 0 });
    }
    if (l.type === "timeslot") for (const b of l.bookings) {
      const slot = l.slots.find((s) => s.time === b.slotTime);
      purchases.push({ ts: new Date(b.purchasedAt).getTime(), revenue: (slot?.price ?? 0) * b.guests });
    }
    if (l.type === "stay") for (const r of l.reservations) purchases.push({ ts: new Date(r.purchasedAt).getTime(), revenue: r.total });
    if (l.type === "open_pass") for (const p of l.passes) {
      const t = l.passTypes.find((x) => x.id === p.passTypeId);
      purchases.push({ ts: new Date(p.purchasedAt).getTime(), revenue: t?.price ?? 0 });
    }
    if (l.type === "package") for (const g of l.groupBookings) purchases.push({ ts: new Date(g.purchasedAt).getTime(), revenue: g.total });
  }

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const label = d.toLocaleDateString("en-ZA", { month: "short", day: "numeric" });
    let revenue = 0, tickets = 0;
    for (const p of purchases) {
      const pd = new Date(p.ts);
      if (pd.toDateString() === d.toDateString()) { tickets++; revenue += p.revenue; }
    }
    out.push({ date: label, revenue, tickets });
  }
  return out;
}

// ---------- KPIs by spotType ----------
export function kpisForSpotType(spotType: SpotType | null, listings: Listing[]) {
  const t = totals(listings);
  const todayStr = new Date().toISOString().slice(0, 10);

  if (spotType === "resort") {
    const stays = listings.filter((l): l is StayListing => l.type === "stay");
    const roomNights = stays.reduce((s, st) =>
      s + st.reservations.reduce((acc, r) => {
        const nights = Math.max(1, (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 86400000);
        return acc + nights;
      }, 0), 0);
    const totalRoomCapacity = stays.reduce((s, st) => s + st.rooms.reduce((a, r) => a + r.count, 0), 0) * 30;
    const occupancy = totalRoomCapacity > 0 ? Math.round((roomNights / totalRoomCapacity) * 100) : 0;
    const avgStay = stays.reduce((s, st) => s + st.reservations.length, 0) > 0
      ? Math.round((roomNights / stays.reduce((s, st) => s + st.reservations.length, 0)) * 10) / 10 : 0;
    return [
      { label: "Revenue", value: ZAR(t.revenue), delta: "+18%" },
      { label: "Room-nights", value: Math.round(roomNights).toLocaleString(), delta: `${stays.reduce((s,st)=>s+st.reservations.length,0)} stays` },
      { label: "Occupancy", value: `${occupancy}%`, delta: "30-day" },
      { label: "Avg stay", value: `${avgStay}n`, delta: "nights" },
    ];
  }
  if (spotType === "activity") {
    const ts = listings.filter((l): l is TimeslotListing => l.type === "timeslot");
    const todayBookings = ts.reduce((s, x) => s + x.bookings.filter((b) => b.date === todayStr).length, 0);
    const upcoming = ts.reduce((s, x) => s + x.bookings.filter((b) => b.date >= todayStr).length, 0);
    const noShow = t.sold > 0 ? Math.round(((t.sold - t.checkedIn) / t.sold) * 100) : 0;
    return [
      { label: "Revenue", value: ZAR(t.revenue), delta: "+24%" },
      { label: "Slots filled today", value: String(todayBookings), delta: "live" },
      { label: "Upcoming bookings", value: String(upcoming), delta: "next 30d" },
      { label: "No-show rate", value: `${noShow}%`, delta: "lower is better" },
    ];
  }
  if (spotType === "gallery") {
    const ops = listings.filter((l): l is OpenPassListing => l.type === "open_pass");
    const issued = ops.reduce((s, o) => s + o.passes.length, 0);
    const visitsToday = ops.reduce((s, o) => s + o.passes.filter((p) => p.visited).length, 0);
    const avgPerDay = ops.length > 0 ? Math.round(issued / 30) : 0;
    return [
      { label: "Revenue", value: ZAR(t.revenue), delta: "+12%" },
      { label: "Passes issued", value: String(issued), delta: "all-time" },
      { label: "Visits", value: String(visitsToday), delta: "redeemed" },
      { label: "Avg/day", value: String(avgPerDay), delta: "issued" },
    ];
  }
  if (spotType === "operator") {
    const pkgs = listings.filter((l): l is PackageListing => l.type === "package");
    const groups = pkgs.reduce((s, p) => s + p.groupBookings.length, 0);
    const avgSize = groups > 0 ? Math.round(pkgs.reduce((s, p) => s + p.groupBookings.reduce((a, g) => a + g.groupSize, 0), 0) / groups) : 0;
    const pending = pkgs.reduce((s, p) => s + p.groupBookings.filter((g) => !g.confirmedHeadcount).length, 0);
    return [
      { label: "Revenue", value: ZAR(t.revenue), delta: "+22%" },
      { label: "Groups booked", value: String(groups), delta: "all-time" },
      { label: "Avg group size", value: `${avgSize}p`, delta: "people" },
      { label: "Pending requests", value: String(pending), delta: "to confirm" },
    ];
  }
  // venue (default)
  return [
    { label: "Revenue", value: ZAR(t.revenue), delta: "+18%" },
    { label: "Tickets sold", value: t.sold.toLocaleString(), delta: "+12%" },
    { label: "Capacity used", value: `${t.capacity > 0 ? Math.round((t.sold / t.capacity) * 100) : 0}%`, delta: `${t.sold}/${t.capacity}` },
    { label: "Checked in", value: t.checkedIn.toLocaleString(), delta: "live" },
  ];
}

// ---------- React hook ----------
export function useTroveData() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    window.addEventListener("trove-storage", fn);
    window.addEventListener("storage", fn);
    return () => {
      window.removeEventListener("trove-storage", fn);
      window.removeEventListener("storage", fn);
    };
  }, []);
  const listings = getListings();
  return {
    listings,
    events: listings.filter((l): l is EventListing => l.type === "event"),
    profile: getProfile(),
    payouts: getPayouts(),
  };
}

export const ZAR = (n: number) =>
  "R " + n.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const CATEGORIES = [
  "Nightlife", "Comedy", "Live Music", "Festival", "Food Fest", "Wine Fest",
  "Convention", "Expo", "Mega Church", "Workshop", "Sip & Paint", "Fashion",
  "Spa", "Skydive", "Bungee", "Paintball", "Go-Karting", "Hiking", "Adventure",
  "Lodge", "Hotel", "Resort", "Glamping", "Gallery", "Museum", "Exhibit",
];

export const STOCK_COVERS = COVERS;
