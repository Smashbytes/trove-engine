import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import type {
  Availability,
  Booking,
  Category,
  Database,
  HostType,
  Listing,
  ListingMedia,
  ListingWithCapacity,
  Notification,
  Payout,
  Review,
  Ticket,
  TicketType,
} from "./database.types";
import { supabase } from "./supabase";

type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"];
type TicketTypeInsert = Database["public"]["Tables"]["ticket_types"]["Insert"];
type AvailabilityInsert = Database["public"]["Tables"]["availability"]["Insert"];
type ListingMediaInsert = Database["public"]["Tables"]["listing_media"]["Insert"];

const listingQueryKeys = {
  all: ["host-listings"] as const,
  detail: (listingId: string | undefined) => ["listing", listingId] as const,
  bookings: (listingId: string | undefined) => ["bookings", "listing", listingId] as const,
  ticketTypes: (listingId: string | undefined) => ["ticket-types", listingId] as const,
  availability: (listingId: string | undefined) => ["availability", listingId] as const,
  media: (listingId: string | undefined) => ["listing-media", listingId] as const,
  tickets: (listingId: string | undefined) => ["tickets", "listing", listingId] as const,
};

export function useHostCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}

export function useHostListings() {
  const { user } = useAuth();
  return useQuery<ListingWithCapacity[]>({
    queryKey: [...listingQueryKeys.all, user?.id],
    enabled: !!user,
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
    queryKey: listingQueryKeys.detail(listingId),
    enabled: !!listingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings_with_capacity")
        .select("*")
        .eq("id", listingId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ListingWithCapacity | null;
    },
  });
}

export function useListingTicketTypes(listingId: string | undefined) {
  return useQuery<TicketType[]>({
    queryKey: listingQueryKeys.ticketTypes(listingId),
    enabled: !!listingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_types")
        .select("*")
        .eq("listing_id", listingId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TicketType[];
    },
  });
}

export function useListingAvailability(listingId: string | undefined) {
  return useQuery<Availability[]>({
    queryKey: listingQueryKeys.availability(listingId),
    enabled: !!listingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability")
        .select("*")
        .eq("listing_id", listingId!)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Availability[];
    },
  });
}

export function useListingMedia(listingId: string | undefined) {
  return useQuery<ListingMedia[]>({
    queryKey: listingQueryKeys.media(listingId),
    enabled: !!listingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listing_media")
        .select("*")
        .eq("listing_id", listingId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ListingMedia[];
    },
  });
}

export function useListingBookings(listingId: string | undefined) {
  return useQuery<Booking[]>({
    queryKey: listingQueryKeys.bookings(listingId),
    enabled: !!listingId,
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

export interface HostTicket extends Ticket {
  booking_party_size: number;
  booking_status: Booking["status"];
  booking_created_at: string;
}

export function useListingTickets(listingId: string | undefined) {
  return useQuery<HostTicket[]>({
    queryKey: listingQueryKeys.tickets(listingId),
    enabled: !!listingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(
          "id, booking_id, code, jwt_jti, ticket_type_id, status, scanned_at, scanned_by, scanned_device_id, created_at, bookings!inner(party_size, status, created_at, listing_id)",
        )
        .eq("bookings.listing_id", listingId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      type TicketRow = Ticket & {
        bookings?: Pick<Booking, "party_size" | "status" | "created_at" | "listing_id"> | null;
      };
      return ((data ?? []) as TicketRow[]).map((ticket) => ({
        id: ticket.id,
        booking_id: ticket.booking_id,
        code: ticket.code,
        jwt_jti: ticket.jwt_jti,
        ticket_type_id: ticket.ticket_type_id,
        status: ticket.status,
        scanned_at: ticket.scanned_at,
        scanned_by: ticket.scanned_by,
        scanned_device_id: ticket.scanned_device_id,
        created_at: ticket.created_at,
        booking_party_size: ticket.bookings?.party_size ?? 0,
        booking_status: ticket.bookings?.status ?? "pending",
        booking_created_at: ticket.bookings?.created_at ?? ticket.created_at,
      }));
    },
  });
}

export function useRecentBookings(limit = 6) {
  const { user } = useAuth();
  return useQuery<(Booking & { listing_title: string })[]>({
    queryKey: ["bookings", "recent", user?.id, limit],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, listings!inner(title, host_id)")
        .eq("listings.host_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      type BookingRow = Booking & { listings?: { title: string; host_id: string } | null };
      return ((data ?? []) as BookingRow[]).map((booking) => ({
        ...booking,
        listing_title: booking.listings?.title ?? "",
      }));
    },
  });
}

export interface DashboardKpis {
  revenueKobo7d: number;
  bookings7d: number;
  fillRatePct: number;
  liveListings: number;
  scans7d: number;
}

export function useDashboardKpis() {
  const { user } = useAuth();
  return useQuery<DashboardKpis>({
    queryKey: ["dashboard-kpis", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

      const [{ data: bookings }, { data: listings }, { data: tickets }] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, total_kobo, fee_kobo, status, created_at, listings!inner(host_id)")
          .eq("listings.host_id", user!.id)
          .gte("created_at", sevenDaysAgo),
        supabase
          .from("listings_with_capacity")
          .select("id, status, capacity, capacity_booked")
          .eq("host_id", user!.id)
          .eq("status", "live"),
        supabase
          .from("tickets")
          .select("id, status, scanned_at, bookings!inner(listings!inner(host_id))")
          .eq("bookings.listings.host_id", user!.id)
          .eq("status", "used")
          .gte("scanned_at", sevenDaysAgo),
      ]);

      const liveListings = (listings ?? []) as unknown as ListingWithCapacity[];
      const recentBookings = (bookings ?? []) as Array<
        Pick<Booking, "id" | "total_kobo" | "fee_kobo" | "status" | "created_at">
      >;

      const revenue = recentBookings
        .filter((booking) => booking.status === "confirmed" || booking.status === "completed")
        .reduce((sum, booking) => sum + (booking.total_kobo - booking.fee_kobo), 0);

      const fillRate =
        liveListings.length === 0
          ? 0
          : Math.round(
              (liveListings.reduce((sum, listing) => {
                if (!listing.capacity || listing.capacity <= 0) return sum;
                return sum + Math.min(1, listing.capacity_booked / listing.capacity);
              }, 0) /
                liveListings.length) *
                100,
            );

      return {
        revenueKobo7d: revenue,
        bookings7d: recentBookings.filter(
          (booking) => booking.status === "confirmed" || booking.status === "completed",
        ).length,
        fillRatePct: fillRate,
        liveListings: liveListings.length,
        scans7d: (tickets ?? []).length,
      };
    },
  });
}

export interface DailySalesPoint {
  date: string;
  revenueKobo: number;
}

export function useSalesByDay(days = 14) {
  const { user } = useAuth();
  return useQuery<DailySalesPoint[]>({
    queryKey: ["sales-by-day", user?.id, days],
    enabled: !!user,
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
      for (let i = 0; i < days; i += 1) {
        const day = new Date(Date.now() - (days - 1 - i) * 86_400_000);
        buckets.set(dayKey(day), 0);
      }

      type SalesRow = Pick<Booking, "total_kobo" | "fee_kobo" | "status" | "created_at">;
      for (const booking of (data ?? []) as SalesRow[]) {
        const bucket = dayKey(new Date(booking.created_at));
        if (buckets.has(bucket)) {
          buckets.set(bucket, (buckets.get(bucket) ?? 0) + (booking.total_kobo - booking.fee_kobo));
        }
      }

      return [...buckets.entries()].map(([date, revenueKobo]) => ({ date, revenueKobo }));
    },
  });
}

export function useHostReviews(limit = 20) {
  const { user } = useAuth();
  return useQuery<Review[]>({
    queryKey: ["host-reviews", user?.id, limit],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("of_host", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });
}

export function useHostPayouts(limit = 20) {
  const { user } = useAuth();
  return useQuery<Payout[]>({
    queryKey: ["host-payouts", user?.id, limit],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payouts")
        .select("*")
        .eq("host_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Payout[];
    },
  });
}

export function useHostNotifications(limit = 20) {
  const { user } = useAuth();
  return useQuery<Notification[]>({
    queryKey: ["notifications", user?.id, limit],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });
}

export interface CreateHostProfileInput {
  hostType: HostType;
  slug: string;
  city: string;
  bio?: string;
  displayName?: string;
  phone?: string;
  legalName?: string;
  registration?: string;
  bankAccount?: {
    bank: string;
    account_number: string;
    account_type: string;
  };
}

export function useCreateHostProfile() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateHostProfileInput) => {
      if (!user) throw new Error("Not authenticated");

      const submittedVerification = !!(input.legalName && input.registration && input.bankAccount);
      const payoutProfile = submittedVerification
        ? {
            legal_name: input.legalName,
            registration: input.registration,
            ...input.bankAccount,
          }
        : (input.bankAccount ?? null);

      const { error: hostError } = await supabase.from("host_profiles").upsert(
        {
          user_id: user.id,
          slug: input.slug,
          host_type: input.hostType,
          city: input.city,
          bio: input.bio ?? null,
          kyc_status: submittedVerification ? "submitted" : "pending",
          payout_bank_json: payoutProfile,
        },
        { onConflict: "user_id" },
      );
      if (hostError) throw hostError;

      const profilePatch: Database["public"]["Tables"]["profiles"]["Update"] = { is_host: true };
      if (input.displayName?.trim()) profilePatch.full_name = input.displayName.trim();
      if (input.phone?.trim()) profilePatch.phone = input.phone.trim();

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profilePatch)
        .eq("id", user.id);
      if (profileError) throw profileError;
    },
    onSuccess: async () => {
      await refreshProfile();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] }),
        queryClient.invalidateQueries({ queryKey: ["bookings", "recent"] }),
        queryClient.invalidateQueries({ queryKey: ["sales-by-day"] }),
      ]);
    },
  });
}

export interface UpdateWorkspaceProfileInput {
  fullName: string;
  phone: string;
  slug: string;
  city: string;
  bio: string;
  heroUrl: string;
}

export function useUpdateWorkspaceProfile() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateWorkspaceProfileInput) => {
      if (!user) throw new Error("Not authenticated");

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: input.fullName.trim() || null,
          phone: input.phone.trim() || null,
        })
        .eq("id", user.id);
      if (profileError) throw profileError;

      const { error: hostError } = await supabase
        .from("host_profiles")
        .update({
          slug: input.slug.trim(),
          city: input.city.trim() || null,
          bio: input.bio.trim() || null,
          hero_url: input.heroUrl.trim() || null,
        })
        .eq("user_id", user.id);
      if (hostError) throw hostError;
    },
    onSuccess: async () => {
      await refreshProfile();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.all }),
      ]);
    },
  });
}

export interface CreateListingInput {
  listing: ListingInsert;
  // listing_id is filled in by the mutation after the parent insert.
  ticketTypes?: Array<Omit<TicketTypeInsert, "listing_id">>;
  availability?: Array<Omit<AvailabilityInsert, "listing_id">>;
  media?: Array<Omit<ListingMediaInsert, "listing_id">>;
}

export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateListingInput) => {
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert(input.listing)
        .select("*")
        .single();
      if (listingError) throw listingError;

      const listingId = listing.id;

      if (input.ticketTypes?.length) {
        const { error } = await supabase.from("ticket_types").insert(
          input.ticketTypes.map((ticketType, index) => ({
            ...ticketType,
            listing_id: listingId,
            sort_order: ticketType.sort_order ?? index,
          })),
        );
        if (error) throw error;
      }

      if (input.availability?.length) {
        const { error } = await supabase.from("availability").insert(
          input.availability.map((slot) => ({
            ...slot,
            listing_id: listingId,
          })),
        );
        if (error) throw error;
      }

      if (input.media?.length) {
        const { error } = await supabase.from("listing_media").insert(
          input.media.map((media, index) => ({
            ...media,
            listing_id: listingId,
            sort_order: media.sort_order ?? index,
          })),
        );
        if (error) throw error;
      }

      return listing as Listing;
    },
    onSuccess: async (listing) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] }),
        queryClient.invalidateQueries({ queryKey: ["sales-by-day"] }),
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.detail(listing.id) }),
      ]);
    },
  });
}

const LISTING_MEDIA_BUCKET = "listing-media";

export interface UploadListingImageInput {
  file: File;
  listingId?: string;
}

export function useUploadListingImage() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ file, listingId }: UploadListingImageInput) => {
      if (!user) throw new Error("Not authenticated");
      if (!file.type.startsWith("image/")) {
        throw new Error("Only image files are supported.");
      }
      const maxBytes = 8 * 1024 * 1024;
      if (file.size > maxBytes) {
        throw new Error("Image must be under 8 MB.");
      }

      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const folder = listingId ? `${user.id}/${listingId}` : `${user.id}/_unsorted`;
      const objectName = `${folder}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(LISTING_MEDIA_BUCKET)
        .upload(objectName, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(LISTING_MEDIA_BUCKET).getPublicUrl(objectName);
      return { path: objectName, url: data.publicUrl };
    },
  });
}

export interface CheckInBookingInput {
  bookingId: string;
  listingId: string;
}

export function useCheckInBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId }: CheckInBookingInput) => {
      const { data, error } = await supabase
        .from("bookings")
        .update({ checked_in_at: new Date().toISOString() })
        .eq("id", bookingId)
        .select("*")
        .single();
      if (error) throw error;
      return data as Booking;
    },
    onSuccess: async (booking, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.bookings(variables.listingId) }),
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.detail(variables.listingId) }),
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.all }),
      ]);
      return booking;
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listingId: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", listingId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] }),
        queryClient.invalidateQueries({ queryKey: ["sales-by-day"] }),
      ]);
    },
  });
}

export function useRealtimeBookings(listingId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!listingId) return undefined;

    const channel = supabase
      .channel(`bookings:${listingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `listing_id=eq.${listingId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: listingQueryKeys.bookings(listingId) });
          queryClient.invalidateQueries({ queryKey: listingQueryKeys.detail(listingId) });
          queryClient.invalidateQueries({ queryKey: listingQueryKeys.tickets(listingId) });
          queryClient.invalidateQueries({ queryKey: listingQueryKeys.all });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listingId, queryClient]);
}

function dayKey(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export type {
  Availability,
  Booking,
  Category,
  Listing,
  ListingMedia,
  ListingWithCapacity,
  Notification,
  Payout,
  Review,
  Ticket,
  TicketType,
};
