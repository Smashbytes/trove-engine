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
import { supabase } from "./supabase";
import type {
  AudienceProfile,
  Booking,
  BookingStatus,
  GuestNote,
  Notification,
} from "./database.types";

const GUEST_BOOKING_STATUSES: BookingStatus[] = ["confirmed", "completed"];

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
  const { user } = useAuth();
  return useQuery<Map<string, AudienceProfile>>({
    queryKey: crmKeys.profiles(user?.id),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("host_audience_profiles");
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
  const { user } = useAuth();
  return useQuery<FollowerRow[]>({
    queryKey: crmKeys.followers(user?.id),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select("user_id, created_at")
        .eq("host_id", user!.id)
        .order("created_at", { ascending: false });
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
  const { user } = useAuth();
  return useQuery<GuestSummary[]>({
    queryKey: crmKeys.guests(user?.id),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "guest_id, total_kobo, created_at, status, listing_id, listings!inner(title, host_id)",
        )
        .eq("listings.host_id", user!.id)
        .in("status", GUEST_BOOKING_STATUSES)
        .order("created_at", { ascending: false });
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
  startsAt: string;
  guests: Array<{
    guestId: string;
    bookingId: string;
    partySize: number;
    status: Booking["status"];
    checkedInAt: string | null;
  }>;
}

type AvailabilityRow = {
  listing_id: string;
  starts_at: string;
  listings?: { title: string | null; cover_url: string | null; host_id: string } | null;
};

type UpcomingBookingRow = Pick<
  Booking,
  "id" | "guest_id" | "party_size" | "status" | "checked_in_at" | "listing_id"
>;

export function useUpcomingEventGuests() {
  const { user } = useAuth();
  return useQuery<UpcomingEventGuests[]>({
    queryKey: crmKeys.upcoming(user?.id),
    enabled: !!user,
    queryFn: async () => {
      const nowIso = new Date().toISOString();

      // Earliest upcoming scheduled date per listing (availability is the
      // canonical schedule table for every booking mode).
      const { data: avail, error: availError } = await supabase
        .from("availability")
        .select("listing_id, starts_at, listings!inner(title, cover_url, host_id)")
        .eq("listings.host_id", user!.id)
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true });
      if (availError) throw availError;

      const nextByListing = new Map<string, UpcomingEventGuests>();
      for (const row of (avail ?? []) as AvailabilityRow[]) {
        if (nextByListing.has(row.listing_id)) continue; // first = earliest (asc order)
        nextByListing.set(row.listing_id, {
          listingId: row.listing_id,
          listingTitle: row.listings?.title ?? "Untitled",
          coverUrl: row.listings?.cover_url ?? null,
          startsAt: row.starts_at,
          guests: [],
        });
      }

      const listingIds = [...nextByListing.keys()];
      if (listingIds.length === 0) return [];

      const { data: bookings, error: bookingError } = await supabase
        .from("bookings")
        .select("id, guest_id, party_size, status, checked_in_at, listing_id")
        .in("listing_id", listingIds)
        .in("status", GUEST_BOOKING_STATUSES);
      if (bookingError) throw bookingError;

      for (const b of (bookings ?? []) as UpcomingBookingRow[]) {
        nextByListing.get(b.listing_id)?.guests.push({
          guestId: b.guest_id,
          bookingId: b.id,
          partySize: b.party_size,
          status: b.status,
          checkedInAt: b.checked_in_at,
        });
      }

      return [...nextByListing.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
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
  const { user } = useAuth();
  return useQuery<GuestBooking[]>({
    queryKey: crmKeys.guestDetail(user?.id, guestId),
    enabled: !!user && !!guestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, listing_id, status, party_size, total_kobo, created_at, checked_in_at, listings!inner(title, host_id)",
        )
        .eq("listings.host_id", user!.id)
        .eq("guest_id", guestId!)
        .order("created_at", { ascending: false });
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
  const { user } = useAuth();
  return useQuery<GuestNote[]>({
    queryKey: crmKeys.guestNotes(user?.id, guestId),
    enabled: !!user && !!guestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_notes")
        .select("*")
        .eq("host_id", user!.id)
        .eq("guest_id", guestId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GuestNote[];
    },
  });
}

export function useCreateGuestNote(guestId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      if (!user || !guestId) throw new Error("Not signed in");
      const trimmed = body.trim();
      if (!trimmed) throw new Error("Note cannot be empty");
      const { error } = await supabase
        .from("guest_notes")
        .insert({ host_id: user.id, guest_id: guestId, body: trimmed });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: crmKeys.guestNotes(user?.id, guestId) });
    },
  });
}

export function useDeleteGuestNote(guestId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("guest_notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: crmKeys.guestNotes(user?.id, guestId) });
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
