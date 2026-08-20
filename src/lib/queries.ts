import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./auth";
import type {
  Availability,
  Booking,
  Category,
  Database,
  HostType,
  Json,
  Listing,
  ListingMedia,
  ListingWithCapacity,
  Notification,
  Payout,
  Review,
  TeamInvite,
  TeamMember,
  TeamRole,
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
  const { activeHostId } = useAuth();
  return useQuery<ListingWithCapacity[]>({
    queryKey: [...listingQueryKeys.all, activeHostId],
    enabled: !!activeHostId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings_with_capacity")
        .select("*")
        .eq("host_id", activeHostId!)
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
  const { activeHostId } = useAuth();
  return useQuery<(Booking & { listing_title: string })[]>({
    queryKey: ["bookings", "recent", activeHostId, limit],
    enabled: !!activeHostId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, listings!inner(title, host_id)")
        .eq("listings.host_id", activeHostId!)
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
  const { activeHostId } = useAuth();
  return useQuery<DashboardKpis>({
    queryKey: ["dashboard-kpis", activeHostId],
    enabled: !!activeHostId,
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

      const [{ data: bookings }, { data: listings }, { data: tickets }] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, total_kobo, fee_kobo, status, created_at, listings!inner(host_id)")
          .eq("listings.host_id", activeHostId!)
          .gte("created_at", sevenDaysAgo),
        supabase
          .from("listings_with_capacity")
          .select("id, status, capacity, capacity_booked")
          .eq("host_id", activeHostId!)
          .eq("status", "live"),
        supabase
          .from("tickets")
          .select("id, status, scanned_at, bookings!inner(listings!inner(host_id))")
          .eq("bookings.listings.host_id", activeHostId!)
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
  const { activeHostId } = useAuth();
  return useQuery<DailySalesPoint[]>({
    queryKey: ["sales-by-day", activeHostId, days],
    enabled: !!activeHostId,
    queryFn: async () => {
      const start = new Date(Date.now() - days * 86_400_000);
      const { data, error } = await supabase
        .from("bookings")
        .select("total_kobo, fee_kobo, status, created_at, listings!inner(host_id)")
        .eq("listings.host_id", activeHostId!)
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
  const { activeHostId } = useAuth();
  return useQuery<Review[]>({
    queryKey: ["host-reviews", activeHostId, limit],
    enabled: !!activeHostId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("of_host", activeHostId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });
}

export function useHostPayouts(limit = 20) {
  const { activeHostId } = useAuth();
  return useQuery<Payout[]>({
    queryKey: ["host-payouts", activeHostId, limit],
    enabled: !!activeHostId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payouts")
        .select("*")
        .eq("host_id", activeHostId!)
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
  address?: string;
  addressNumber?: string;
  lat?: number | null;
  lng?: number | null;
  locationPlaceId?: string;
  locationJson?: Json;
  bio?: string;
  displayName?: string;
  phone?: string;
  legalName?: string;
  registration?: string;
  contactPerson?: string;
  idNumber?: string;
  idType?: "ID" | "PASSPORT";
  organizationType?: string;
  kycDocumentUploaded?: boolean;
  bankAccount?: {
    bank: string;
    bank_code: string;
    account_number: string;
    account_type: "CHEQUE" | "SAVINGS" | "CURRENT";
  };
}

export function useCreateHostProfile() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateHostProfileInput) => {
      if (!user) throw new Error("Not authenticated");

      if (!input.bankAccount?.bank_code || !input.bankAccount.account_number || !input.idNumber) {
        throw new Error("Legal identity and banking details are required to activate escrow payouts.");
      }
      const { data, error } = await supabase.functions.invoke("complete-host-onboarding", {
        body: {
          slug: input.slug,
          host_type: input.hostType,
          city: input.city,
          address: input.address,
          address_number: input.addressNumber,
          lat: input.lat,
          lng: input.lng,
          location_place_id: input.locationPlaceId,
          location_json: input.locationJson,
          display_name: input.displayName?.trim() || input.legalName?.trim(),
          contact_person: input.contactPerson?.trim() || input.displayName?.trim(),
          phone: input.phone?.trim(),
          legal_name: input.legalName?.trim(),
          registration: input.registration?.trim(),
          id_number: input.idNumber.trim(),
          id_type: input.idType ?? "ID",
          organization_type: input.organizationType ?? "PRIVATE",
          kyc_document_uploaded: input.kycDocumentUploaded ?? false,
          bank: input.bankAccount.bank.trim(),
          bank_code: input.bankAccount.bank_code.trim(),
          account_number: input.bankAccount.account_number.trim(),
          account_type: input.bankAccount.account_type,
        },
      });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        let message = error.message;
        try {
          const body = ctx ? await ctx.json() : null;
          if (body?.error) message = body.error;
        } catch { /* keep the SDK message */ }
        throw new Error(message);
      }
      return data as { escrow_status: string; token_id?: string; retryable?: boolean };
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
  socialLinks?: Record<string, string>;
}

export interface UpdateBankingDetailsInput {
  bank: string;
  accountNumber: string;
  accountType: string;
  accountName?: string;
}

export function useUpdateWorkspaceProfile() {
  const { user, activeHostId, isOwner, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateWorkspaceProfileInput) => {
      if (!user || !activeHostId) throw new Error("Not authenticated");

      // full_name / phone live on the OWNER's profile row (own-only RLS), so
      // only update them when the owner is editing their own spot.
      if (isOwner) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            full_name: input.fullName.trim() || null,
            phone: input.phone.trim() || null,
          })
          .eq("id", user.id);
        if (profileError) throw profileError;
      }

      const socialLinks = Object.fromEntries(
        Object.entries(input.socialLinks ?? {})
          .map(([key, value]) => [key, value.trim()])
          .filter(([, value]) => value.length > 0),
      );

      const { error: hostError } = await supabase
        .from("host_profiles")
        .update({
          slug: input.slug.trim(),
          city: input.city.trim() || null,
          bio: input.bio.trim() || null,
          hero_url: input.heroUrl.trim() || null,
          social_links: socialLinks,
        })
        .eq("user_id", activeHostId);
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

export function useUpdateBankingDetails() {
  const { activeHostId, hostProfile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateBankingDetailsInput) => {
      if (!activeHostId) throw new Error("Not authenticated");

      void input;
      void hostProfile;
      throw new Error("Banking changes must be completed through TradeSafe onboarding so the new account is tokenized securely.");
    },
    onSuccess: async () => {
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
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

// ── KYC documents ─────────────────────────────────────────────────────────────
// Uploads an identity / registration document to the PRIVATE `kyc-docs` bucket
// (POPIA: encrypted at rest, owner-scoped RLS) and records a kyc_documents row.
// Path convention: {user_id}/{doc_type}-{timestamp}.{ext} — the first folder
// segment is matched against auth.uid() by the storage RLS policy.
export type KycDocType =
  | "id"
  | "passport"
  | "cipc"
  | "proof_of_address"
  | "bank_confirmation";

export interface UploadKycDocumentInput {
  file: File;
  docType: KycDocType;
}

const KYC_BUCKET = "kyc-docs";

export function useUploadKycDocument() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ file, docType }: UploadKycDocumentInput) => {
      if (!user) throw new Error("Not authenticated");
      const okTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
      if (!okTypes.includes(file.type)) {
        throw new Error("Upload a PDF, PNG or JPG.");
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("Document must be under 10 MB.");
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const objectName = `${user.id}/${docType}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(KYC_BUCKET)
        .upload(objectName, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;

      // kyc_documents is added in migration 0019; cast until types regenerate.
      const { error: rowError } = await (supabase as unknown as {
        from: (t: string) => {
          insert: (v: Record<string, unknown>) => Promise<{ error: unknown }>;
        };
      })
        .from("kyc_documents")
        .insert({ host_id: user.id, doc_type: docType, storage_path: objectName });
      if (rowError) throw rowError;

      return { path: objectName };
    },
  });
}

// ── Payout recipient (Paystack Transfers) ───────────────────────────────────
// Verifies the host's bank account (Paystack /bank/resolve) and creates a
// transfer recipient. No payout is released until this succeeds.
export interface VerifyPayoutRecipientInput {
  bankCode: string;
  accountNumber: string;
}

export function useVerifyPayoutRecipient() {
  const queryClient = useQueryClient();
  const { refreshProfile } = useAuth();

  return useMutation({
    mutationFn: async ({ bankCode, accountNumber }: VerifyPayoutRecipientInput) => {
      const { data, error } = await supabase.functions.invoke("paystack-create-recipient", {
        body: { bank_code: bankCode, account_number: accountNumber },
      });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        let msg = error.message;
        try {
          if (ctx) {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          }
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      return data as { recipient_code: string; account_name: string; verified: boolean };
    },
    onSuccess: async () => {
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: ["host-profile"] });
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

// ---------------------------------------------------------------------------
// Availability (calendar) management
// ---------------------------------------------------------------------------

export interface AddAvailabilityInput {
  listingId: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  capacityOverride?: number | null;
  priceOverrideKobo?: number | null;
}

export function useAddAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddAvailabilityInput) => {
      const row: AvailabilityInsert = {
        listing_id: input.listingId,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        capacity_override: input.capacityOverride ?? null,
        price_override_kobo: input.priceOverrideKobo ?? null,
        status: "open",
      };
      const { data, error } = await supabase.from("availability").insert(row).select("*").single();
      if (error) throw error;
      return data as Availability;
    },
    onSuccess: async (_data, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.availability(vars.listingId) }),
        queryClient.invalidateQueries({ queryKey: ["host-upcoming-availability"] }),
      ]);
    },
  });
}

export function useDeleteAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; listingId: string }) => {
      const { error } = await supabase.from("availability").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async (_data, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.availability(vars.listingId) }),
        queryClient.invalidateQueries({ queryKey: ["host-upcoming-availability"] }),
      ]);
    },
  });
}

export interface HostAvailabilitySlot extends Availability {
  listing_title: string;
  listing_id: string;
}

export function useHostUpcomingAvailability() {
  const { activeHostId } = useAuth();
  return useQuery<HostAvailabilitySlot[]>({
    queryKey: ["host-upcoming-availability", activeHostId],
    enabled: !!activeHostId,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("availability")
        .select("*, listings!inner(title, host_id)")
        .eq("listings.host_id", activeHostId!)
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      type Row = Availability & { listings?: { title: string | null; host_id: string } | null };
      return ((data ?? []) as Row[]).map((row) => ({
        ...row,
        listing_title: row.listings?.title ?? "Untitled",
      }));
    },
  });
}

// ---------------------------------------------------------------------------
// Settings: verification + notification preferences
// ---------------------------------------------------------------------------

export interface SubmitVerificationInput {
  legalName: string;
  registration: string;
}

export function useSubmitVerification() {
  const { activeHostId, hostProfile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitVerificationInput) => {
      if (!activeHostId) throw new Error("Not authenticated");
      const existing =
        hostProfile?.payout_bank_json &&
        typeof hostProfile.payout_bank_json === "object" &&
        !Array.isArray(hostProfile.payout_bank_json)
          ? hostProfile.payout_bank_json
          : {};

      const { error } = await supabase
        .from("host_profiles")
        .update({
          kyc_status: "submitted",
          payout_bank_json: {
            ...existing,
            legal_name: input.legalName.trim(),
            registration: input.registration.trim(),
          },
        })
        .eq("user_id", activeHostId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useUpdateNotificationPrefs() {
  const { activeHostId, refreshProfile } = useAuth();
  return useMutation({
    mutationFn: async (prefs: Json) => {
      if (!activeHostId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("host_profiles")
        .update({ notification_prefs: prefs })
        .eq("user_id", activeHostId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
    },
  });
}

// ---------------------------------------------------------------------------
// Team management (Eventbrite-style staff + roles)
// ---------------------------------------------------------------------------

export type TeamRosterRow = Database["public"]["Functions"]["host_team_roster"]["Returns"][number];

export const teamKeys = {
  members: (hostId: string | null | undefined) => ["team-members", hostId] as const,
  invites: (hostId: string | null | undefined) => ["team-invites", hostId] as const,
};

export function useTeamMembers() {
  const { activeHostId, can } = useAuth();
  const enabled = !!activeHostId && can("team.manage");
  return useQuery<TeamRosterRow[]>({
    queryKey: teamKeys.members(activeHostId),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("host_team_roster", { p_host_id: activeHostId! });
      if (error) throw error;
      return (data ?? []) as TeamRosterRow[];
    },
  });
}

export function useTeamInvites() {
  const { activeHostId, can } = useAuth();
  const enabled = !!activeHostId && can("team.manage");
  return useQuery<TeamInvite[]>({
    queryKey: teamKeys.invites(activeHostId),
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("host_team_invites")
        .select("*")
        .eq("host_id", activeHostId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TeamInvite[];
    },
  });
}

export interface InviteTeamMemberInput {
  email: string;
  role: TeamRole;
  permissions: string[];
  department?: string | null;
}

export function useInviteTeamMember() {
  const { activeHostId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: InviteTeamMemberInput) => {
      if (!activeHostId) throw new Error("No active workspace");
      const { data, error } = await supabase.functions.invoke("team-invite", {
        body: {
          hostId: activeHostId,
          email: input.email.trim().toLowerCase(),
          role: input.role,
          permissions: input.permissions,
          department: input.department?.trim() || null,
          origin: typeof window !== "undefined" ? window.location.origin : null,
        },
      });
      if (error) throw error;
      return data as { invite: TeamInvite };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teamKeys.invites(activeHostId) });
    },
  });
}

export interface UpdateTeamMemberInput {
  id: string;
  role?: TeamRole;
  permissions?: string[];
  department?: string | null;
  status?: TeamMember["status"];
}

export function useUpdateTeamMember() {
  const { activeHostId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateTeamMemberInput) => {
      const patch: Database["public"]["Tables"]["host_team_members"]["Update"] = {};
      if (input.role !== undefined) patch.role = input.role;
      if (input.permissions !== undefined) patch.permissions = input.permissions;
      if (input.department !== undefined) patch.department = input.department;
      if (input.status !== undefined) patch.status = input.status;
      const { error } = await supabase.from("host_team_members").update(patch).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teamKeys.members(activeHostId) });
    },
  });
}

export function useRemoveTeamMember() {
  const { activeHostId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberRowId: string) => {
      const { error } = await supabase.from("host_team_members").delete().eq("id", memberRowId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teamKeys.members(activeHostId) });
    },
  });
}

export function useRevokeInvite() {
  const { activeHostId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("host_team_invites")
        .update({ status: "revoked" })
        .eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teamKeys.invites(activeHostId) });
    },
  });
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
