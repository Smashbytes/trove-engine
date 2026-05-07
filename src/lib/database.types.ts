// Hand-maintained mirror of the Supabase schema after 0002_align_to_prd.sql.
// Regenerate canonical types with:
//   supabase gen types typescript --linked > src/lib/database.types.ts
// (run after applying any new migration; this file will be overwritten)

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type ListingStatus = 'draft' | 'live' | 'paused' | 'archived';
export type ListingType   = 'venue' | 'event' | 'experience' | 'accommodation';
export type BookingMode   = 'event' | 'reservation' | 'slot' | 'pass' | 'rsvp';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';
export type TicketStatus  = 'valid' | 'used' | 'voided';
export type KycStatus     = 'pending' | 'submitted' | 'verified' | 'rejected';
export type HostType      = 'venue' | 'organiser' | 'experience' | 'accommodation';
export type PayoutStatus  = 'pending' | 'processing' | 'paid' | 'failed';
export type LedgerKind    = 'charge' | 'fee' | 'payout' | 'refund' | 'adjustment';

// ---------------------------------------------------------------------------
// Listing metadata payloads (PRD §5.3.2) — JSONB-shaped per listing_type
// ---------------------------------------------------------------------------

export interface VenueMetadata {
  opening_hours?: Record<string, { open: string; close: string }>;
  price_range?: 'R' | 'RR' | 'RRR' | 'RRRR';
  dress_code?: string;
  age_restriction?: number;
  amenities?: string[];
  menu?: MenuItem[];
}

export interface EventMetadata {
  date?: string;          // ISO
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
  check_in?: string;       // HH:mm
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
// Tables
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_host: boolean;
  is_admin: boolean;
  paystack_customer_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface HostProfile {
  user_id: string;
  slug: string;
  host_type: HostType;
  bio: string | null;
  hero_url: string | null;
  city: string | null;
  paystack_subaccount_code: string | null;
  kyc_status: KycStatus;
  verified: boolean;          // generated column
  payout_bank_json: Json | null;
  response_rate: number;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  template: Json;
  created_at: string;
}

export interface Listing {
  id: string;
  host_id: string;
  category_id: string | null;
  title: string;
  slug: string | null;
  description: string | null;
  status: ListingStatus;
  listing_type: ListingType;
  booking_mode: BookingMode;
  base_price_kobo: number;
  currency: string;
  capacity: number | null;
  duration_min: number | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  city: string | null;
  amenities: string[];
  cover_url: string | null;
  metadata: ListingMetadata;     // renamed from attributes
  compliance: Json;
  blocks: Json;
  health_score: number;
  created_at: string;
  updated_at: string;
}

export interface ListingWithCapacity extends Listing {
  capacity_booked: number;
  checked_in_count: number;
}

export interface ListingMedia {
  id: string;
  listing_id: string;
  kind: 'image' | 'video';
  url: string;
  sort_order: number;
  created_at: string;
}

export interface Availability {
  id: string;
  listing_id: string;
  starts_at: string;
  ends_at: string;
  capacity_override: number | null;
  price_override_kobo: number | null;
  status: 'open' | 'closed' | 'sold_out';
  created_at: string;
}

export interface TicketType {
  id: string;
  listing_id: string;
  name: string;
  description: string | null;
  price_kobo: number;
  capacity_total: number | null;
  capacity_sold: number;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  perks: string[];
  age_min: number | null;
  sort_order: number;
  transferable: boolean;
  status: 'active' | 'paused' | 'sold_out';
  created_at: string;
}

export interface Booking {
  id: string;
  guest_id: string;
  listing_id: string;
  slot_id: string | null;
  ticket_type_id: string | null;
  party_size: number;
  subtotal_kobo: number;
  fee_kobo: number;
  total_kobo: number;
  payout_kobo: number;
  status: BookingStatus;
  paystack_reference: string | null;
  paystack_split_code: string | null;
  attested_age: boolean;
  attested_age_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
  checked_in_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingGuest {
  id: string;
  booking_id: string;
  user_id: string | null;
  invited_email: string | null;
  invited_phone: string | null;
  status: 'invited' | 'going' | 'maybe' | 'declined';
  created_at: string;
}

export interface Ticket {
  id: string;
  booking_id: string;
  code: string;              // TRV-XXXXXXXX (PRD BKG-02)
  jwt_jti: string;           // signing payload for offline verification
  ticket_type_id: string | null;
  status: TicketStatus;
  scanned_at: string | null;
  scanned_by: string | null;
  scanned_device_id: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  by_user: string;
  of_listing: string | null;
  of_host: string | null;
  rating: number;
  body: string | null;
  photos: string[];
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  owner_user_id: string;
  kind: LedgerKind;
  amount_kobo: number;
  currency: string;
  ref_type: string | null;
  ref_id: string | null;
  created_at: string;
}

export interface Payout {
  id: string;
  host_id: string;
  amount_kobo: number;
  status: PayoutStatus;
  paystack_transfer_code: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

export interface DeviceSession {
  id: string;
  user_id: string;
  device_id: string;
  app: 'guest' | 'engine';
  last_seen: string;
  push_token: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  payload: Json;
  read_at: string | null;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  diff: Json;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Database type for supabase-js client
// ---------------------------------------------------------------------------

type Row<T> = { Row: T; Insert: Partial<T>; Update: Partial<T> };

export interface Database {
  public: {
    Tables: {
      profiles:        Row<Profile>;
      host_profiles:   Row<HostProfile>;
      categories:      Row<Category>;
      listings:        Row<Listing>;
      listing_media:   Row<ListingMedia>;
      availability:    Row<Availability>;
      ticket_types:    Row<TicketType>;
      bookings:        Row<Booking>;
      booking_guests:  Row<BookingGuest>;
      tickets:         Row<Ticket>;
      reviews:         Row<Review>;
      ledger:          Row<LedgerEntry>;
      payouts:         Row<Payout>;
      device_sessions: Row<DeviceSession>;
      notifications:   Row<Notification>;
      audit_log:       Row<AuditLogEntry>;
      saves:           Row<{ user_id: string; listing_id: string; created_at: string }>;
      follows:         Row<{ user_id: string; host_id: string; created_at: string }>;
    };
    Views: {
      listings_with_capacity: { Row: ListingWithCapacity };
    };
    Functions: Record<string, never>;
    Enums: {
      listing_status: ListingStatus;
      listing_type:   ListingType;
      booking_mode:   BookingMode;
      booking_status: BookingStatus;
      ticket_status:  TicketStatus;
      kyc_status:     KycStatus;
      host_type:      HostType;
      payout_status:  PayoutStatus;
      ledger_kind:    LedgerKind;
    };
  };
}
