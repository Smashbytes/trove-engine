## Goal

Turn Trove Engine from an event-only tool into a **multi-vertical Spot platform**, so a Spa, Lodge, Skydive operator, Gallery, or Paintball venue feels the app was built for them — not a nightclub tool they're forced into.

## The 5 Listing Types

| Type | Real-world fit | Inventory model | "Ticket" = | Scanner mode |
|---|---|---|---|---|
| **Event** | Nightlife, festivals, comedy, concerts, expos, conventions, mega-church services | Fixed date + tiered capacity | Ticket tier | QR per attendee |
| **Timeslot** | Spa treatments, skydive, bungee, paintball sessions, go-karting heats, sip & paint, workshops, hiking guides | Recurring slots (e.g. Tue–Sat, 9am/11am/2pm) × per-slot capacity | Slot booking | QR per booking, slot-aware |
| **Stay** | Resorts, lodges, hotels, getaways, glamping | Room types × nights × check-in/check-out | Reservation | Front-desk check-in (no QR) |
| **Open Pass** | Galleries, art museums, ongoing exhibitions, food festivals (multi-day) | Date range + daily cap (or unlimited) | Day pass | QR valid within date window |
| **Package** | Paintball groups, team builds, hiking guided trips, wine tours, multi-activity bundles | Min/max group size + add-ons + scheduled date OR on-request | Group booking | QR + headcount confirm |

Each type maps directly to your verticals:
- **Getaways / Resorts / Lodges / Hotels** → Stay
- **Spa treatments / Skydive / Bungee / Go-carting / Hiking / Paintball sessions** → Timeslot
- **Paintball group bookings / Guided trips / Wine tours** → Package
- **Galleries / Museums / Ongoing exhibits** → Open Pass
- **Food fests / Wine fests / Comic Con / rAge / Conventions / Mega churches / Festivals / Nightlife / Comedy** → Event
- **Sip & Paint / Creative workshops / Fashion shows** → Event *or* Timeslot (depending on if it's a one-night vs recurring class)

## New Onboarding Flow

First-time visit (or via Profile → "Change Spot Type") sees a one-screen Spot Type picker:

```text
What kind of Spot are you?
┌──────────────┬──────────────┬──────────────┐
│ 🎟  Venue     │ 🏝  Resort    │ 🪂 Activity  │
│ Events &     │ Stays &      │ Bookable     │
│ ticketed     │ getaways     │ time slots   │
│ nights       │              │              │
├──────────────┼──────────────┼──────────────┤
│ 🎨 Gallery   │ 🎯 Operator  │              │
│ Open passes  │ Group        │              │
│ & exhibits   │ packages     │              │
└──────────────┴──────────────┴──────────────┘
```

Selection is stored on profile (`spotType`) and **adapts the whole Engine**:
- Sidebar relabels: "Events" → "Listings" / "Stays" / "Slots" / "Exhibits" / "Packages"
- Dashboard KPIs swap (e.g. Resort sees "Occupancy %", Activity sees "Slots filled today")
- Create CTA defaults to the matching listing type (still allows mixing types)
- Seekers preview reflects the right card style

## Pages To Build/Update

**New (3):**
1. `src/routes/onboarding.tsx` — Spot Type picker, gates first visit
2. `src/routes/listings.new.tsx` — replaces `events.new.tsx`; type picker → branches into 5 wizards
3. `src/routes/listings.$listingId.tsx` — replaces `events.$eventId.tsx`; renders type-specific tabs

**Updated (6):**
4. `src/lib/trove-store.ts` — extended schema (see Technical), new seed data per type
5. `src/routes/dashboard.tsx` — adaptive KPIs based on `spotType` + listing mix
6. `src/routes/events.index.tsx` → renamed conceptually to `listings.index.tsx` — filters by type chips (All / Events / Stays / Slots / Passes / Packages), per-type card layouts
7. `src/routes/scanner.tsx` — type-aware: QR scan for Event/Pass/Package, slot-aware for Timeslot, name lookup for Stay
8. `src/routes/profile.tsx` — adds Spot Type display + "change type" link
9. `src/components/trove/AppShell.tsx` — sidebar labels react to `spotType`

## Per-Type Wizard Details (each is 3 steps)

**Event wizard** — keeps current flow (title, date, tiers).

**Timeslot wizard** —
- Step 1: Service name, category (Spa/Skydive/Paintball…), duration (30/60/90 min)
- Step 2: Days of week + time slots + capacity per slot + price (single or by service variant)
- Step 3: Booking window (how far in advance), preview

**Stay wizard** —
- Step 1: Property name, location, amenities checklist (Pool/Spa/Restaurant/Wifi)
- Step 2: Room types (Standard/Deluxe/Suite) with count + price/night + max guests
- Step 3: Min nights, check-in/out times, preview

**Open Pass wizard** —
- Step 1: Exhibit/Pass title, description
- Step 2: Valid from–to date range, daily cap (or unlimited toggle), price (Adult/Child/Concession)
- Step 3: Operating hours, preview

**Package wizard** —
- Step 1: Package name, description, what's included (chips: "200 paintballs", "Lunch", "Guide")
- Step 2: Min/max group size, price-per-person OR flat group price, add-ons
- Step 3: Scheduling mode (Fixed date / On-request / Recurring), preview

## Per-Type Detail View (tabs)

| Tab | Event | Timeslot | Stay | Open Pass | Package |
|---|---|---|---|---|---|
| Overview | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tiers/Inventory | Tiers | Slots calendar | Rooms | Pass types | Add-ons |
| Bookings | Attendees | Slot bookings | Reservations | Pass holders | Group bookings |
| Check-in QR | ✓ | ✓ (slot-bound) | Front desk view | ✓ (date-window) | ✓ (+headcount) |
| Promote | ✓ | ✓ | ✓ | ✓ | ✓ |

## Adaptive Dashboard KPIs

```text
spotType=venue   → Revenue · Tickets sold · Sell-through · Check-ins
spotType=resort  → Revenue · Room-nights · Occupancy % · Avg stay
spotType=activity→ Revenue · Slots filled today · Upcoming bookings · No-show %
spotType=gallery → Revenue · Passes issued · Visits today · Avg per day
spotType=operator→ Revenue · Groups booked · Avg group size · Pending requests
```

Charts stay (revenue + bookings over time), labels swap.

## Branding & UX

Carries over the existing Trove dark + magenta/violet system. Each Spot Type gets a tiny accent icon + one-line color treatment (e.g. Resort = teal accent badge, Activity = lime, Gallery = amber) so the Engine feels alive without breaking the brand.

## Technical Section

**Schema changes in `trove-store.ts`:**

```ts
type SpotType = "venue" | "resort" | "activity" | "gallery" | "operator";
type ListingType = "event" | "timeslot" | "stay" | "open_pass" | "package";

type BaseListing = {
  id; type: ListingType; title; description; category;
  venue; city; cover; status; createdAt;
};

// Replaces TroveEvent — TroveEvent becomes Listing (discriminated union)
type EventListing      = BaseListing & { type: "event"; date; doorsOpen?; tiers; attendees };
type TimeslotListing   = BaseListing & { type: "timeslot"; durationMin; daysOfWeek; slots: {time;capacity;price}[]; bookings: SlotBooking[] };
type StayListing       = BaseListing & { type: "stay"; amenities; rooms: {name;count;price;maxGuests}[]; reservations: Reservation[]; minNights };
type OpenPassListing   = BaseListing & { type: "open_pass"; validFrom; validTo; dailyCap?; passTypes: {name;price}[]; passes: Pass[] };
type PackageListing    = BaseListing & { type: "package"; minGroup; maxGroup; includes: string[]; addons; pricingMode: "per_person"|"flat"; price; groupBookings };

type Listing = EventListing | TimeslotListing | StayListing | OpenPassListing | PackageListing;
```

- `SpotProfile` gains `spotType: SpotType | null` (null → onboarding shows)
- Storage key `trove_engine_events_v1` → bumped to `trove_engine_listings_v2` (auto-migrates old events on first load)
- Seed data: 2 events, 2 timeslots (spa + skydive), 1 stay (lodge), 1 open pass (gallery), 1 package (paintball)
- New helpers: `occupancyPct(stay)`, `slotsFilledToday(timeslot)`, `groupCount(package)`, `passesIssued(pass)`, `kpisForSpotType(profile, listings)`

**Routing:** flat dot-convention preserved (`listings.new.tsx`, `listings.$listingId.tsx`, `onboarding.tsx`). Keep old `/events` paths as redirects to `/listings` for the demo flow's muscle memory. Each route gets `head()` meta + error/notFound boundaries.

**Components:** new `<TypeBadge type=…/>`, `<ListingCard listing=…/>` (polymorphic by type), `<SlotCalendar/>` (Timeslot), `<RoomGrid/>` (Stay), reused `<TierEditor/>` (Event/Pass).

**No backend changes** — all localStorage, per the original approval. Ready to swap to Lovable Cloud later: schema is already discriminated-union shaped for a single `listings` table with a `type` column.

Approve this and I'll build it in one pass.