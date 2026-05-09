// Source of truth for Supabase types is database.types.generated.ts.
// Regenerate with:
//   supabase gen types typescript --linked --schema public \
//     > src/lib/database.types.generated.ts
//
// This file layers two things on top of the generated types:
//   1. Convenient named row aliases (Listing, Booking, …) so call-sites stay
//      readable instead of using Tables<'listings'> everywhere.
//   2. Strongly-typed JSONB shapes for listings.metadata, which the generator
//      flattens to `Json`.

import type { Database, Json, Tables } from "./database.types.generated";

export type { Database, Json } from "./database.types.generated";

// ---------------------------------------------------------------------------
// Enum aliases
// ---------------------------------------------------------------------------

export type ListingStatus = Database["public"]["Enums"]["listing_status"];
export type ListingType = Database["public"]["Enums"]["listing_type"];
export type BookingMode = Database["public"]["Enums"]["booking_mode"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];
export type TicketStatus = Database["public"]["Enums"]["ticket_status"];
export type KycStatus = Database["public"]["Enums"]["kyc_status"];
export type HostType = Database["public"]["Enums"]["host_type"];
export type PayoutStatus = Database["public"]["Enums"]["payout_status"];
export type LedgerKind = Database["public"]["Enums"]["ledger_kind"];

// ---------------------------------------------------------------------------
// Listing metadata payloads (PRD §5.3.2) — JSONB-shaped per listing_type
// ---------------------------------------------------------------------------

export interface VenueMetadata {
  opening_hours?: Record<string, { open: string; close: string }>;
  price_range?: "R" | "RR" | "RRR" | "RRRR";
  dress_code?: string;
  age_restriction?: number;
  amenities?: string[];
  menu?: MenuItem[];
}

export interface EventMetadata {
  date?: string; // ISO
  doors_open?: string;
  doors_close?: string;
  age_restriction?: number;
  lineup?: LineupEntry[];
}

export interface ExperienceMetadata {
  duration_minutes?: number;
  min_group?: number;
  max_group?: number;
  equipment_provided?: string[];
  safety_notes?: string;
  waivers?: WaiverEntry[];
  treatments?: TreatmentEntry[];
}

export interface AccommodationMetadata {
  check_in?: string; // HH:mm
  check_out?: string;
  star_rating?: number;
  amenities?: string[];
  rooms?: RoomEntry[];
}

export type ListingMetadata =
  | VenueMetadata
  | EventMetadata
  | ExperienceMetadata
  | AccommodationMetadata
  | Record<string, Json>;

export interface LineupEntry {
  performer_name: string;
  role?: string | null;
  start_at?: string | null;
  sort_order?: number;
}

export interface MenuItem {
  section?: string;
  name: string;
  description?: string;
  price_kobo: number;
  photo_url?: string;
  is_available?: boolean;
}

export interface TreatmentEntry {
  name: string;
  duration_min?: number;
  price_kobo: number;
  description?: string;
  is_available?: boolean;
}

export interface RoomEntry {
  name: string;
  capacity?: number;
  price_kobo: number;
  description?: string;
  photos?: string[];
  is_available?: boolean;
}

export interface WaiverEntry {
  title: string;
  document_url?: string;
  version?: string;
  is_required?: boolean;
}

// ---------------------------------------------------------------------------
// Convenient named row aliases
// ---------------------------------------------------------------------------

export type Profile = Tables<"profiles">;
export type HostProfile = Tables<"host_profiles">;
export type Category = Tables<"categories">;
export type ListingMedia = Tables<"listing_media">;
export type Availability = Tables<"availability">;
export type TicketType = Tables<"ticket_types">;
export type Booking = Tables<"bookings">;
export type BookingGuest = Tables<"booking_guests">;
export type Ticket = Tables<"tickets">;
export type Review = Tables<"reviews">;
export type LedgerEntry = Tables<"ledger">;
export type Payout = Tables<"payouts">;
export type DeviceSession = Tables<"device_sessions">;
export type Notification = Tables<"notifications">;
export type AuditLogEntry = Tables<"audit_log">;

// `listings.metadata` is widened to Json by the generator. Narrow it back to
// our PRD-shaped union so the rest of the codebase keeps autocomplete.
export type Listing = Omit<Tables<"listings">, "metadata"> & {
  metadata: ListingMetadata;
};

// PostgreSQL views always declare every column nullable in introspection,
// even when the underlying SELECT uses COALESCE. Override here to reflect
// the actual runtime guarantees from migration 0004 (capacity_booked and
// checked_in_count are COALESCE'd to 0; the rest inherit listings' NOT NULLs).
type ListingViewRow = Tables<"listings_with_capacity">;
export type ListingWithCapacity = Omit<
  ListingViewRow,
  | "metadata"
  | "amenities"
  | "base_price_kobo"
  | "blocks"
  | "capacity_booked"
  | "checked_in_count"
  | "compliance"
  | "created_at"
  | "currency"
  | "health_score"
  | "id"
  | "host_id"
  | "listing_type"
  | "booking_mode"
  | "status"
  | "title"
  | "updated_at"
> & {
  id: string;
  host_id: string;
  title: string;
  metadata: ListingMetadata;
  amenities: string[];
  base_price_kobo: number;
  blocks: Json;
  capacity_booked: number;
  checked_in_count: number;
  compliance: Json;
  created_at: string;
  currency: string;
  health_score: number;
  listing_type: ListingType;
  booking_mode: BookingMode;
  status: ListingStatus;
  updated_at: string;
};
