// TanStack Query hooks against the v2 schema.
// Replaces the v1 trove-store mock. All hooks are RLS-scoped to the
// authenticated host via auth.uid().

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import type {
  Booking, HostType, Listing, ListingWithCapacity, Ticket,
} from "./database.types";

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export function useHostListings() {
  const { user } = useAuth();
  return useQuery<ListingWithCapacity[]>({
    queryKey: ["host-listings", user?.id],
    enabled:  !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings_with_capacity")
        .select("*")
        .eq("host_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ListingWithCapacity[];
    },
  });
}

export function useListing(listingId: string | undefined) {
  return useQuery<ListingWithCapacity | null>({
    queryKey: ["listing", listingId],
    enabled:  !!listingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings_with_capacity")
        .select("*")
        .eq("id", listingId!)
        .maybeSingle();
      if (error) throw error;
      return data as ListingWithCapacity | null;
    },
  });
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export function useListingBookings(listingId: string | undefined) {
  return useQuery<Booking[]>({
    queryKey: ["bookings", "listing", listingId],
    enabled:  !!listingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("listing_id", listingId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Booking[];
    },
  });
}

export function useRecentBookings(limit = 6) {
  const { user } = useAuth();
  return useQuery<(Booking & { listing_title: string })[]>({
    queryKey: ["bookings", "recent", user?.id, limit],
    enabled:  !!user,
    queryFn: async () => {
      // RLS already scopes bookings to host's listings via "bookings_host_read"
      const { data, error } = await supabase
        .from("bookings")
        .select("*, listings!inner(title, host_id)")
        .eq("listings.host_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((b: any) => ({ ...b, listing_title: b.listings?.title ?? "" }));
    },
  });
}

// ---------------------------------------------------------------------------
// Dashboard KPIs (client-side aggregation — fine at MVP scale; revisit at 15k)
// ---------------------------------------------------------------------------

export interface DashboardKpis {
  revenueKobo7d:   number;
  bookings7d:      number;
  fillRatePct:     number;
  liveListings:    number;
  scans7d:         number;
}

export function useDashboardKpis() {
  const { user } = useAuth();
  return useQuery<DashboardKpis>({
    queryKey: ["dashboard-kpis", user?.id],
    enabled:  !!user,
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

      const [{ data: bookings }, { data: listings }, { data: tickets }] = await Promise.all([
        supabase.from("bookings")
          .select("id, total_kobo, fee_kobo, status, created_at, listings!inner(host_id)")
          .eq("listings.host_id", user!.id)
          .gte("created_at", sevenDaysAgo),
        supabase.from("listings_with_capacity")
          .select("id, status, capacity, capacity_booked")
          .eq("host_id", user!.id)
          .eq("status", "live"),
        supabase.from("tickets")
          .select("id, status, scanned_at, bookings!inner(listings!inner(host_id))")
          .eq("bookings.listings.host_id", user!.id)
          .eq("status", "used")
          .gte("scanned_at", sevenDaysAgo),
      ]);

      const live = (listings ?? []) as ListingWithCapacity[];
      const bks = (bookings ?? []) as Booking[];

      const revenue = bks
        .filter(b => b.status === "confirmed" || b.status === "completed")
        .reduce((s, b) => s + (b.total_kobo - b.fee_kobo), 0);

      const fillRate = live.length === 0 ? 0
        : Math.round(
            (live.reduce((s, l) => s + (l.capacity ? Math.min(1, l.capacity_booked / l.capacity) : 0), 0) / live.length) * 100
          );

      return {
        revenueKobo7d: revenue,
        bookings7d:    bks.filter(b => b.status === "confirmed" || b.status === "completed").length,
        fillRatePct:   fillRate,
        liveListings:  live.length,
        scans7d:       (tickets ?? []).length,
      };
    },
  });
}

export interface DailySalesPoint { date: string; revenueKobo: number; }

export function useSalesByDay(days = 14) {
  const { user } = useAuth();
  return useQuery<DailySalesPoint[]>({
    queryKey: ["sales-by-day", user?.id, days],
    enabled:  !!user,
    queryFn: async () => {
      const start = new Date(Date.now() - days * 86_400_000);
      const { data, error } = await supabase
        .from("bookings")
        .select("total_kobo, fee_kobo, status, created_at, listings!inner(host_id)")
        .eq("listings.host_id", user!.id)
        .gte("created_at", start.toISOString())
        .in("status", ["confirmed", "completed"]);
      if (error) throw error;

      const buckets = new Map<string, number>();
      for (let i = 0; i < days; i++) {
        const d = new Date(Date.now() - (days - 1 - i) * 86_400_000);
        buckets.set(dayKey(d), 0);
      }
      for (const b of (data ?? []) as Booking[]) {
        const k = dayKey(new Date(b.created_at));
        if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + (b.total_kobo - b.fee_kobo));
      }
      return [...buckets.entries()].map(([date, revenueKobo]) => ({ date, revenueKobo }));
    },
  });
}

function dayKey(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ---------------------------------------------------------------------------
// Onboarding / host profile mutations
// ---------------------------------------------------------------------------

export interface CreateHostProfileInput {
  hostType:   HostType;
  slug:       string;
  city:       string;
  bio?:       string;
  displayName?: string;
  phone?: string;
  legalName?: string;
  registration?: string;
  bankAccount?: { bank: string; account_number: string; account_type: string };
}

export function useCreateHostProfile() {
  const { user, refreshProfile } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateHostProfileInput) => {
      if (!user) throw new Error("Not authenticated");

      // 1. Create host_profiles row (kyc_status starts at 'submitted' if any
      // verification fields are present, else 'pending')
      const submittedVerification = !!(input.legalName && input.registration && input.bankAccount);
      const payoutProfile = submittedVerification
        ? {
            legal_name: input.legalName,
            registration: input.registration,
            ...input.bankAccount,
          }
        : input.bankAccount ?? null;

      const { error: hpErr } = await supabase
        .from("host_profiles")
        .upsert({
          user_id:    user.id,
          slug:       input.slug,
          host_type:  input.hostType,
          city:       input.city,
          bio:        input.bio ?? null,
          kyc_status: submittedVerification ? "submitted" : "pending",
          payout_bank_json: payoutProfile,
        }, { onConflict: "user_id" });
      if (hpErr) throw hpErr;

      // 2. Flip profiles.is_host = true
      const profilePatch: Record<string, string | boolean> = { is_host: true };
      if (input.displayName?.trim()) profilePatch.full_name = input.displayName.trim();
      if (input.phone?.trim()) profilePatch.phone = input.phone.trim();

      const { error: pErr } = await supabase
        .from("profiles")
        .update(profilePatch)
        .eq("id", user.id);
      if (pErr) throw pErr;
    },
    onSuccess: async () => {
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ["host-listings"] });
      qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      qc.invalidateQueries({ queryKey: ["bookings", "recent"] });
      qc.invalidateQueries({ queryKey: ["sales-by-day"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Realtime subscription helper (PRD §5.9)
// ---------------------------------------------------------------------------

export function useRealtimeBookings(listingId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!listingId) return;
    const channel = supabase
      .channel(`bookings:${listingId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `listing_id=eq.${listingId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["bookings", "listing", listingId] });
          qc.invalidateQueries({ queryKey: ["listing", listingId] });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [listingId, qc]);
}

// Re-export types used by query consumers
export type { Booking, Listing, ListingWithCapacity, Ticket };
