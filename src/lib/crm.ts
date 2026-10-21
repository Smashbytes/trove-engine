// Audience CRM data layer for Spots.
//
// Read surface for the people connected to a host: followers, ticket-buying
// guests, upcoming-event guests, plus private notes and the new-follower /
// new-guest feeds. Mirrors the react-query conventions in queries.ts and
// support.ts (query-key factory, useAuth for the host id, enabled: !!user).
//
// Names/avatars come from host_audience_profiles() — a SECURITY DEFINER RPC
// (migration 0007) that only ever returns people connected to the caller and
// withholds phone from followers who never transacted. profiles RLS itself
// stays own-only.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { untypedRpc } from "./queries";
import { supabase } from "./supabase";
import type {
  AudienceProfile,
  Booking,
  BookingStatus,
  GuestNote,
  Notification,
} from "./database.types";

const GUEST_BOOKING_STATUSES: BookingStatus[] = ["confirmed", "completed"];

/** Bounded audience queries; the newest rows are shown first. */
const CRM_ROWS_CAP = 2000;

export const crmKeys = {
  profiles: (hostId: string | undefined) => ["audience-profiles", hostId] as const,
  followers: (hostId: string | undefined) => ["audience-followers", hostId] as const,
  guests: (hostId: string | undefined) => ["audience-guests", hostId] as const,
  upcoming: (hostId: string | undefined) => ["audience-upcoming", hostId] as const,
  guestDetail: (hostId: string | undefined, guestId: string | undefined) =>
    ["audience-guest", hostId, guestId] as const,
  guestNotes: (hostId: string | undefined, guestId: string | undefined) =>
    ["guest-notes", hostId, guestId] as const,
  feed: (hostId: string | undefined, type: string) => ["audience-feed", hostId, type] as const,
};

// ---------------------------------------------------------------------------
// Scoped profile lookup (names, avatars, transaction-gated phone)
// ---------------------------------------------------------------------------

export function useAudienceProfiles() {
  const { activeHostId } = useAuth();
  return useQuery<Map<string, AudienceProfile>>({
    queryKey: crmKeys.profiles(activeHostId ?? undefined),
    enabled: !!activeHostId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("host_audience_profiles", {
        p_host_id: activeHostId!,
      });
      if (error) throw error;
      const map = new Map<string, AudienceProfile>();
      for (const row of (data ?? []) as AudienceProfile[]) map.set(row.id, row);
      return map;
    },
  });
}

// ---------------------------------------------------------------------------
// Followers
// ---------------------------------------------------------------------------

export interface FollowerRow {
  userId: string;
  followedAt: string | null;
}

export function useFollowers() {
  const { activeHostId } = useAuth();
  return useQuery<FollowerRow[]>({
    queryKey: crmKeys.followers(activeHostId ?? undefined),
    enabled: !!activeHostId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("user_id, created_at")
        .eq("host_id", activeHostId!)
        .order("created_at", { ascending: false })
        .limit(CRM_ROWS_CAP);
      if (error) throw error;
      return ((data ?? []) as Array<{ user_id: string; created_at: string | null }>).map((row) => ({
        userId: row.user_id,
        followedAt: row.created_at,
      }));
    },
  });
}

// ---------------------------------------------------------------------------
// Guests (people who actually bought tickets), deduped + aggregated
// ---------------------------------------------------------------------------

export interface GuestSummary {
  guestId: string;
  bookingsCount: number;
  totalSpendKobo: number;
  lastBookingAt: string;
  listingTitles: string[];
}

type GuestBookingRow = Pick<
  Booking,
  "guest_id" | "total_kobo" | "created_at" | "status" | "listing_id"
> & { listings?: { title: string | null; host_id: string } | null };

export function useGuests() {
  const { activeHostId } = useAuth();
  return useQuery<GuestSummary[]>({
    queryKey: crmKeys.guests(activeHostId ?? undefined),
    enabled: !!activeHostId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "guest_id, total_kobo, created_at, status, listing_id, listings!inner(title, host_id)",
        )
        .eq("listings.host_id", activeHostId!)
        .in("status", GUEST_BOOKING_STATUSES)
        .order("created_at", { ascending: false })
        .limit(CRM_ROWS_CAP);
      if (error) throw error;

      const byGuest = new Map<string, GuestSummary>();
      for (const row of (data ?? []) as GuestBookingRow[]) {
        const existing = byGuest.get(row.guest_id);
        const title = row.listings?.title ?? "";
        if (!existing) {
          byGuest.set(row.guest_id, {
            guestId: row.guest_id,
            bookingsCount: 1,
            totalSpendKobo: row.total_kobo,
            lastBookingAt: row.created_at,
            listingTitles: title ? [title] : [],
          });
        } else {
          existing.bookingsCount += 1;
          existing.totalSpendKobo += row.total_kobo;
          // rows are ordered desc, so the first seen is already the latest.
          if (title && !existing.listingTitles.includes(title)) existing.listingTitles.push(title);
        }
      }
      return [...byGuest.values()];
    },
  });
}

// ---------------------------------------------------------------------------
// Upcoming-event guests (grouped by listing's next scheduled date)
// ---------------------------------------------------------------------------

export interface UpcomingEventGuests {
  listingId: string;
  listingTitle: string;
  coverUrl: string | null;
  /** The booked slot, or null for an event (its date is on the listing). */
  slotId: string | null;
  startsAt: string;
  /** Totals over every confirmed booking for this date; `guests` is capped. */
  bookingCount: number;
  guestCount: number;
  guests: Array<{
    guestId: string;
    bookingId: string;
    partySize: number;
    status: Booking["status"];
    checkedInAt: string | null;
  }>;
}

type UpcomingRow = {
  listing_id: string;
  listing_title: string | null;
  cover_url: string | null;
  slot_id: string | null;
  starts_at: string;
  booking_count: number;
  guest_count: number;
  guests: Array<{
    guest_id: string;
    booking_id: string;
    party_size: number;
    status: Booking["status"];
    checked_in_at: string | null;
  }>;
};

/** Listings shown on the Upcoming tab, and confirmed guests listed per date. */
const UPCOMING_LISTINGS_CAP = 20;
const UPCOMING_GUESTS_CAP = 100;

export function useUpcomingEventGuests() {
  const { activeHostId } = useAuth();
  return useQuery<UpcomingEventGuests[]>({
    queryKey: crmKeys.upcoming(activeHostId ?? undefined),
    enabled: !!activeHostId,
    queryFn: async () => {
      // The next date per listing (its next slot, else the event's own date
      // from listings.starts_at), soonest first, with that date's guests.
      const rows = await untypedRpc<UpcomingRow[]>("host_upcoming_guests", {
        p_host_id: activeHostId!,
        p_limit: UPCOMING_LISTINGS_CAP,
        p_guest_limit: UPCOMING_GUESTS_CAP,
      });
      return (rows ?? []).map((row) => ({
        listingId: row.listing_id,
        listingTitle: row.listing_title ?? "Untitled",
        coverUrl: row.cover_url,
        slotId: row.slot_id,
        startsAt: row.starts_at,
        bookingCount: row.booking_count,
        guestCount: row.guest_count,
        guests: row.guests.map((g) => ({
          guestId: g.guest_id,
          bookingId: g.booking_id,
          partySize: g.party_size,
          status: g.status,
          checkedInAt: g.checked_in_at,
        })),
      }));
    },
  });
}

// ---------------------------------------------------------------------------
// Single guest (manage guest)
// ---------------------------------------------------------------------------

export interface GuestBooking {
  id: string;
  listingId: string;
  listingTitle: string;
  status: Booking["status"];
  partySize: number;
  totalKobo: number;
  createdAt: string;
  checkedInAt: string | null;
}

export function useGuestBookings(guestId: string | undefined) {
  const { activeHostId } = useAuth();
  return useQuery<GuestBooking[]>({
    queryKey: crmKeys.guestDetail(activeHostId ?? undefined, guestId),
    enabled: !!activeHostId && !!guestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, listing_id, status, party_size, total_kobo, created_at, checked_in_at, listings!inner(title, host_id)",
        )
        .eq("listings.host_id", activeHostId!)
        .eq("guest_id", guestId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      type Row = Pick<
        Booking,
        | "id"
        | "listing_id"
        | "status"
        | "party_size"
        | "total_kobo"
        | "created_at"
        | "checked_in_at"
      > & { listings?: { title: string | null; host_id: string } | null };
      return ((data ?? []) as Row[]).map((row) => ({
        id: row.id,
        listingId: row.listing_id,
        listingTitle: row.listings?.title ?? "",
        status: row.status,
        partySize: row.party_size,
        totalKobo: row.total_kobo,
        createdAt: row.created_at,
        checkedInAt: row.checked_in_at,
      }));
    },
  });
}

// ---------------------------------------------------------------------------
// Private guest notes (host-scoped CRM notes)
// ---------------------------------------------------------------------------

export function useGuestNotes(guestId: string | undefined) {
  const { activeHostId } = useAuth();
  return useQuery<GuestNote[]>({
    queryKey: crmKeys.guestNotes(activeHostId ?? undefined, guestId),
    enabled: !!activeHostId && !!guestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_notes")
        .select("*")
        .eq("host_id", activeHostId!)
        .eq("guest_id", guestId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GuestNote[];
    },
  });
}

export function useCreateGuestNote(guestId: string | undefined) {
  const { activeHostId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!activeHostId || !guestId) throw new Error("Not signed in");
      const trimmed = body.trim();
      if (!trimmed) throw new Error("Note cannot be empty");
      const { error } = await supabase
        .from("guest_notes")
        .insert({ host_id: activeHostId, guest_id: guestId, body: trimmed });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: crmKeys.guestNotes(activeHostId ?? undefined, guestId),
      });
    },
  });
}

export function useDeleteGuestNote(guestId: string | undefined) {
  const { activeHostId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("guest_notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: crmKeys.guestNotes(activeHostId ?? undefined, guestId),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Feeds: new followers / new guests (from notifications, own-only RLS)
// ---------------------------------------------------------------------------

function useNotificationFeed(type: "new_follower" | "new_guest", limit: number) {
  const { user } = useAuth();
  return useQuery<Notification[]>({
    queryKey: [...crmKeys.feed(user?.id, type), limit],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("type", type)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });
}

export function useNewFollowerFeed(limit = 8) {
  return useNotificationFeed("new_follower", limit);
}

export function useNewGuestFeed(limit = 8) {
  return useNotificationFeed("new_guest", limit);
}

export type { AudienceProfile, GuestNote } from "./database.types";
