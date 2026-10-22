// Audience CRM data layer for Spots.
//
// Read surface for the people connected to a host: followers, ticket-buying
// guests, upcoming-event guests, plus private notes and the new-follower /
// new-guest feeds. Mirrors the react-query conventions in queries.ts and
// support.ts (query-key factory, useAuth for the host id, enabled: !!user).
//
// Every list is paged in SQL (SECURITY DEFINER RPCs that need audience.manage
// and only return people connected to the Spot), so PostgREST's 1,000-row cap
// never cuts them and totals are counted over everyone. Names and avatars come
// back with each row; phone only for people who booked. profiles RLS itself
// stays own-only.

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { untypedRpc } from "./queries";
import { supabase } from "./supabase";
import type { AudienceProfile, Booking, GuestNote, Notification } from "./database.types";

/** Rows per "Load more" on the Followers and Guests tabs. */
export const AUDIENCE_PAGE_SIZE = 50;

export const crmKeys = {
  profiles: (hostId: string | undefined, ids: string[]) => ["audience-profiles", hostId, ids] as const,
  followers: (hostId: string | undefined) => ["audience-followers", hostId] as const,
  guests: (hostId: string | undefined) => ["audience-guests", hostId] as const,
  upcoming: (hostId: string | undefined) => ["audience-upcoming", hostId] as const,
  guestSummary: (hostId: string | undefined, guestId: string | undefined) =>
    ["audience-guest-summary", hostId, guestId] as const,
  guestDetail: (hostId: string | undefined, guestId: string | undefined) =>
    ["audience-guest", hostId, guestId] as const,
  guestNotes: (hostId: string | undefined, guestId: string | undefined) =>
    ["guest-notes", hostId, guestId] as const,
  feed: (hostId: string | undefined, type: string) => ["audience-feed", hostId, type] as const,
};

interface Page<T> {
  total: number;
  offset: number;
  limit: number;
  rows: T[];
}

function nextOffset<T>(last: Page<T>) {
  const next = last.offset + last.rows.length;
  return last.rows.length > 0 && next < last.total ? next : undefined;
}

// ---------------------------------------------------------------------------
// Profile lookup for a few people (the feeds): names, avatars, phone if booked
// ---------------------------------------------------------------------------

export function useAudienceProfiles(ids: string[]) {
  const { activeHostId } = useAuth();
  const wanted = [...new Set(ids.filter(Boolean))].sort();
  return useQuery<Map<string, AudienceProfile>>({
    queryKey: crmKeys.profiles(activeHostId ?? undefined, wanted),
    enabled: !!activeHostId && wanted.length > 0,
    queryFn: async () => {
      const rows = await untypedRpc<AudienceProfile[]>("host_audience_profiles", {
        p_host_id: activeHostId!,
        p_ids: wanted,
      });
      return new Map((rows ?? []).map((row) => [row.id, row]));
    },
  });
}

// ---------------------------------------------------------------------------
// Followers
// ---------------------------------------------------------------------------

export interface FollowerRow {
  userId: string;
  followedAt: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  /** Has a confirmed or completed booking with this Spot. */
  isGuest: boolean;
}

type FollowerRpcRow = {
  user_id: string;
  followed_at: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_guest: boolean;
};

export function useFollowers() {
  const { activeHostId } = useAuth();
  return useInfiniteQuery({
    queryKey: crmKeys.followers(activeHostId ?? undefined),
    enabled: !!activeHostId,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<Page<FollowerRow>> => {
      const page = await untypedRpc<Page<FollowerRpcRow>>("host_followers_page", {
        p_host_id: activeHostId!,
        p_offset: pageParam,
        p_limit: AUDIENCE_PAGE_SIZE,
      });
      return {
        ...page,
        rows: page.rows.map((row) => ({
          userId: row.user_id,
          followedAt: row.followed_at,
          fullName: row.full_name,
          avatarUrl: row.avatar_url,
          isGuest: row.is_guest,
        })),
      };
    },
    getNextPageParam: nextOffset,
  });
}

// ---------------------------------------------------------------------------
// Guests (people who actually bought tickets), totals counted in SQL
// ---------------------------------------------------------------------------

export interface GuestSummary {
  guestId: string;
  bookingsCount: number;
  totalSpendCents: number;
  lastBookingAt: string;
  /** Their most recent listings with this Spot (up to 3). */
  listingTitles: string[];
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
}

type GuestRpcRow = {
  guest_id: string;
  bookings_count: number;
  total_spend_cents: number;
  last_booking_at: string;
  listing_titles: string[];
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
};

const toGuestSummary = (row: GuestRpcRow): GuestSummary => ({
  guestId: row.guest_id,
  bookingsCount: row.bookings_count,
  totalSpendCents: row.total_spend_cents,
  lastBookingAt: row.last_booking_at,
  listingTitles: row.listing_titles ?? [],
  fullName: row.full_name,
  avatarUrl: row.avatar_url,
  phone: row.phone,
});

export function useGuests() {
  const { activeHostId } = useAuth();
  return useInfiniteQuery({
    queryKey: crmKeys.guests(activeHostId ?? undefined),
    enabled: !!activeHostId,
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<Page<GuestSummary>> => {
      const page = await untypedRpc<Page<GuestRpcRow>>("host_guest_summaries", {
        p_host_id: activeHostId!,
        p_offset: pageParam,
        p_limit: AUDIENCE_PAGE_SIZE,
      });
      return { ...page, rows: page.rows.map(toGuestSummary) };
    },
    getNextPageParam: nextOffset,
  });
}

/** One guest's totals over all their bookings with this Spot, with name and phone. */
export function useGuestSummary(guestId: string | undefined) {
  const { activeHostId } = useAuth();
  return useQuery<GuestSummary | null>({
    queryKey: crmKeys.guestSummary(activeHostId ?? undefined, guestId),
    enabled: !!activeHostId && !!guestId,
    queryFn: async () => {
      const page = await untypedRpc<Page<GuestRpcRow>>("host_guest_summaries", {
        p_host_id: activeHostId!,
        p_offset: 0,
        p_limit: 1,
        p_guest_id: guestId,
      });
      return page.rows[0] ? toGuestSummary(page.rows[0]) : null;
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
    fullName: string | null;
    avatarUrl: string | null;
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
    full_name: string | null;
    avatar_url: string | null;
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
          fullName: g.full_name,
          avatarUrl: g.avatar_url,
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
  totalCents: number;
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
          "id, listing_id, status, party_size, total_cents, created_at, checked_in_at, listings!inner(title, host_id)",
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
        | "total_cents"
        | "created_at"
        | "checked_in_at"
      > & { listings?: { title: string | null; host_id: string } | null };
      return ((data ?? []) as Row[]).map((row) => ({
        id: row.id,
        listingId: row.listing_id,
        listingTitle: row.listings?.title ?? "",
        status: row.status,
        partySize: row.party_size,
        totalCents: row.total_cents,
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
