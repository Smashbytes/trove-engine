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

/** Newest bookings/tickets shown per listing; older rows stay in the database. */
export const LISTING_ROWS_CAP = 500;

export type ListingBooking = Pick<
  Booking,
  "id" | "guest_id" | "status" | "party_size" | "total_kobo" | "created_at" | "checked_in_at" | "ticket_type_id" | "slot_id"
>;

export function useListingBookings(listingId: string | undefined) {
  return useQuery<ListingBooking[]>({
    queryKey: listingQueryKeys.bookings(listingId),
    enabled: !!listingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, guest_id, status, party_size, total_kobo, created_at, checked_in_at, ticket_type_id, slot_id")
        .eq("listing_id", listingId!)
        .order("created_at", { ascending: false })
        .limit(LISTING_ROWS_CAP);
      if (error) throw error;
      return (data ?? []) as ListingBooking[];
    },
  });
}

export interface HostTicket extends Omit<Ticket, "jwt_jti"> {
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
          "id, booking_id, code, ticket_type_id, status, scanned_at, scanned_by, scanned_device_id, created_at, bookings!inner(party_size, status, created_at, listing_id)",
        )
        .eq("bookings.listing_id", listingId!)
        .order("created_at", { ascending: false })
        .limit(LISTING_ROWS_CAP);
      if (error) throw error;
      type TicketRow = Omit<Ticket, "jwt_jti"> & {
        bookings?: Pick<Booking, "party_size" | "status" | "created_at" | "listing_id"> | null;
      };
      return ((data ?? []) as TicketRow[]).map((ticket) => ({
        id: ticket.id,
        booking_id: ticket.booking_id,
        code: ticket.code,
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
    // Counted in the database (migration 0036), not by downloading rows.
    queryFn: async () => {
      const k = await untypedRpc<{
        revenue_kobo_7d: number;
        bookings_7d: number;
        fill_rate_pct: number;
        live_listings: number;
        scans_7d: number;
      }>("host_dashboard_kpis", { p_host_id: activeHostId });
      return {
        revenueKobo7d: Number(k.revenue_kobo_7d),
        bookings7d: Number(k.bookings_7d),
        fillRatePct: Number(k.fill_rate_pct),
        liveListings: Number(k.live_listings),
        scans7d: Number(k.scans_7d),
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
    // One row per South African calendar day, summed in the database (0036).
    queryFn: async () => {
      const rows = await untypedRpc<Array<{ day: string; revenue_kobo: number }>>("host_sales_by_day", {
        p_host_id: activeHostId,
        p_days: days,
      });
      return (rows ?? []).map((row) => {
        const [, month, day] = row.day.split("-").map(Number);
        return { date: `${month}/${day}`, revenueKobo: Number(row.revenue_kobo) };
      });
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

// Maps a notifications.type to the Settings matrix event that governs it.
const NOTIFICATION_PREF_EVENT: Record<string, string> = {
  new_guest: "new_booking",
  new_booking: "new_booking",
  new_follower: "new_follower",
  payout_sent: "payout_sent",
  new_review: "new_review",
};

export function useHostNotifications(limit = 20) {
  const { user, hostProfile } = useAuth();
  const prefs = (hostProfile?.notification_prefs ?? {}) as Record<
    string,
    Record<string, boolean> | undefined
  >;
  return useQuery<Notification[]>({
    queryKey: ["notifications", user?.id, limit],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    // Honour the Settings "In-app" switches (default ON when unset).
    select: (rows) =>
      rows.filter((row) => {
        const event = NOTIFICATION_PREF_EVENT[row.type];
        return !event || prefs[event]?.in_app !== false;
      }),
  });
}

/** Mark the given notifications (or all unread ones) as read. */
export function useMarkNotificationsRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids?: string[]) => {
      if (!user) return;
      let query = supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (ids) query = query.in("id", ids);
      const { error } = await query;
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
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
        throw new Error(
          "Legal identity and banking details are required to activate escrow payouts.",
        );
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
        const body = await edgeErrorBody(error);
        // 422/502 = the profile WAS saved but TradeSafe failed; the body still
        // says where escrow stands, so onboarding can offer the retry step.
        if (typeof body?.escrow_status === "string") {
          return body as { escrow_status: string; token_id?: string; retryable?: boolean };
        }
        throw new Error(typeof body?.error === "string" ? body.error : error.message);
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
  /** The Spot name guests see (host_profiles.display_name). */
  displayName: string;
  phone: string;
  slug: string;
  city: string;
  bio: string;
  heroUrl: string;
  socialLinks?: Record<string, string>;
}

export interface VerifyPayoutAccountInput {
  contactPerson: string;
  phone: string;
  legalName: string;
  registration: string;
  idNumber: string;
  idType: "ID" | "PASSPORT";
  organizationType?: string;
  bank: string;
  bankCode: string;
  accountNumber: string;
  accountType: "CHEQUE" | "SAVINGS" | "CURRENT";
}

export interface PayoutVerificationResult {
  escrow_status: "escrow_ready" | "escrow_needs_review" | "escrow_failed";
  missing: Array<"kyc_document" | "valid_token">;
  error?: string;
  code?: string;
}

export function useUpdateWorkspaceProfile() {
  const { user, activeHostId, isOwner, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateWorkspaceProfileInput) => {
      if (!user || !activeHostId) throw new Error("Not authenticated");

      // phone lives on the OWNER's profile row (own-only RLS), so only update
      // it when the owner is editing their own spot.
      if (isOwner) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ phone: input.phone.trim() || null })
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
          // The name guests see on TROVE. The registered legal name used by
          // TradeSafe is separate and is not edited here.
          display_name: input.displayName.trim(),
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

/**
 * Settings → "Verify account". Mints (or reuses) the owner's TradeSafe seller
 * token so escrow payouts can reach their bank account. The account number is
 * sent once to the edge function and never stored by TROVE.
 */
export function useVerifyPayoutAccount() {
  const { refreshProfile } = useAuth();
  return useMutation({
    mutationFn: async (input: VerifyPayoutAccountInput): Promise<PayoutVerificationResult> => {
      const { data, error } = await supabase.functions.invoke("verify-payout-account", {
        body: {
          contact_person: input.contactPerson.trim(),
          phone: input.phone.trim(),
          legal_name: input.legalName.trim(),
          registration: input.registration.trim(),
          id_number: input.idNumber.trim(),
          id_type: input.idType,
          organization_type: input.organizationType ?? "PRIVATE",
          bank: input.bank.trim(),
          bank_code: input.bankCode.trim(),
          account_number: input.accountNumber.replace(/\s+/g, ""),
          account_type: input.accountType,
        },
      });
      if (error) {
        const body = await edgeErrorBody(error);
        if (typeof body?.escrow_status === "string") return body as unknown as PayoutVerificationResult;
        throw new Error(typeof body?.error === "string" ? body.error : error.message);
      }
      return data as PayoutVerificationResult;
    },
    onSettled: async () => {
      await refreshProfile();
    },
  });
}

/** Whether the signed-in owner already has a KYC document on file. */
export function useHasKycDocument() {
  const { user } = useAuth();
  return useQuery<boolean>({
    queryKey: ["kyc-documents", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // kyc_documents is added in migration 0019; cast until types regenerate.
      const { count, error } = await (
        supabase as unknown as {
          from: (t: string) => {
            select: (
              c: string,
              o: { count: "exact"; head: true },
            ) => {
              eq: (
                col: string,
                v: string,
              ) => Promise<{ count: number | null; error: unknown }>;
            };
          };
        }
      )
        .from("kyc_documents")
        .select("id", { count: "exact", head: true })
        .eq("host_id", user!.id);
      if (error) throw error;
      return (count ?? 0) > 0;
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
    // All-or-nothing: the listing is saved as a draft, its tiers/slots/media are
    // added, and only then does it go live. If any step fails the draft is
    // removed, so guests never see a listing without its tickets and a retry
    // can't create a duplicate.
    mutationFn: async (input: CreateListingInput) => {
      const wanted = input.listing.status ?? "draft";
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert({ ...input.listing, status: "draft" })
        .select("*")
        .single();
      if (listingError) throw listingError;

      const listingId = listing.id;
      try {
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
      } catch (childError) {
        await supabase.from("listings").delete().eq("id", listingId);
        throw childError;
      }

      if (wanted !== "draft") {
        const { data: published, error: publishError } = await supabase
          .from("listings")
          .update({ status: wanted })
          .eq("id", listingId)
          .select("*")
          .single();
        if (publishError) {
          // Saved but not published (e.g. payout setup missing): keep the draft.
          if (publishError.message.includes("ESCROW_NOT_READY")) {
            throw new Error(
              "Saved as a draft. Set up your payout account to publish paid listings.",
            );
          }
          throw publishError;
        }
        return published as Listing;
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
export const LISTING_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface UploadListingImageInput {
  file: File;
  listingId?: string;
}

export function useUploadListingImage() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ file, listingId }: UploadListingImageInput) => {
      if (!user) throw new Error("Not authenticated");
      // Same limits as the listing-media bucket (the bucket refuses anything else).
      if (!LISTING_IMAGE_TYPES.includes(file.type)) {
        throw new Error("Upload a JPG, PNG or WebP image.");
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
export type KycDocType = "id" | "passport" | "cipc" | "proof_of_address" | "bank_confirmation";

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
      const { error: rowError } = await (
        supabase as unknown as {
          from: (t: string) => {
            insert: (v: Record<string, unknown>) => Promise<{ error: unknown }>;
          };
        }
      )
        .from("kyc_documents")
        .insert({ host_id: user.id, doc_type: docType, storage_path: objectName });
      if (rowError) throw rowError;

      return { path: objectName };
    },
  });
}

// NOTE: the Paystack Transfers recipient flow (useVerifyPayoutRecipient /
// paystack-create-recipient) was removed with the TradeSafe migration. Under
// escrow the host's bank account is tokenised during complete-host-onboarding
// and TradeSafe pays them directly on release, so TROVE never creates a
// transfer recipient. The hook had no callers.

/** JSON body of a non-2xx edge-function response (supabase-js keeps it on error.context). */
async function edgeErrorBody(error: unknown): Promise<Record<string, unknown> | null> {
  const ctx = (error as { context?: Response }).context;
  if (!ctx || typeof ctx.json !== "function") return null;
  try {
    const body = await ctx.clone().json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// RPCs added in migrations 0034/0036 aren't in the generated types yet.
export async function untypedRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await (
    supabase as unknown as {
      rpc: (f: string, a: Record<string, unknown>) => Promise<{ data: T; error: { message: string } | null }>;
    }
  ).rpc(fn, args);
  if (error) throw error;
  return data;
}

export interface CheckInBookingInput {
  bookingId: string;
  listingId: string;
}

type CheckInResult =
  | { result: "checked_in" | "already_checked_in"; checked_in_at: string }
  | { result: "not_confirmed"; status: string };

/** Arrival stamp for reservations. The server checks permission and status. */
export function useCheckInBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId }: CheckInBookingInput) => {
      const data = await untypedRpc<CheckInResult>("check_in_booking", { p_booking_id: bookingId });
      if (data.result === "not_confirmed") {
        throw new Error(`This booking can't be checked in: it's ${data.status.replace(/_/g, " ")}.`);
      }
      return data;
    },
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.bookings(variables.listingId) }),
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.detail(variables.listingId) }),
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.all }),
      ]);
    },
  });
}

export interface RedeemTicketResult {
  result: "admitted" | "already_used" | "not_valid" | "not_found";
  code?: string;
  scanned_at?: string;
  party_size?: number;
  ticket_type?: string | null;
  ticket_status?: string;
  booking_status?: string;
}

/**
 * Door scanning. The server decides: it admits a valid, paid ticket exactly
 * once (marks it used) and refuses reuse, voided/refunded and unpaid tickets.
 */
export function useRedeemTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, code }: { listingId: string; code: string }) =>
      untypedRpc<RedeemTicketResult>("redeem_ticket", { p_listing_id: listingId, p_code: code }),
    onSuccess: async (result, variables) => {
      if (result.result !== "admitted") return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.tickets(variables.listingId) }),
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.bookings(variables.listingId) }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] }),
      ]);
    },
  });
}

/**
 * Publish / pause / un-publish a listing. The database enforces the rules:
 * paid listings need a TradeSafe-ready payout account (ESCROW_NOT_READY
 * trigger) and a suspended Spot can't sell (RLS). Errors come back in words.
 */
export function useSetListingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, status }: { listingId: string; status: "live" | "paused" | "draft" }) => {
      const { data, error } = await supabase
        .from("listings")
        .update({ status })
        .eq("id", listingId)
        .select("id, status")
        .maybeSingle();
      if (error) {
        if (error.message.includes("ESCROW_NOT_READY")) {
          throw new Error(
            "Set up your payout account first: paid listings need TradeSafe before they can go live.",
          );
        }
        if (error.code === "42501") {
          throw new Error("This Spot can't publish listings right now. Contact TROVE support.");
        }
        throw error;
      }
      if (!data) throw new Error("You don't have permission to change this listing.");
      return data;
    },
    onSuccess: async (_data, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.detail(vars.listingId) }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] }),
      ]);
    },
  });
}

export function useDeleteListing() {
  const queryClient = useQueryClient();

  return useMutation({
    // A listing with bookings is archived, never deleted: guests keep their
    // tickets and the books stay complete (bookings reference the listing).
    mutationFn: async (listingId: string): Promise<{ archived: boolean }> => {
      const { count, error: countError } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", listingId);
      if (countError) throw countError;
      if ((count ?? 0) > 0) {
        // Archiving keeps guests' tickets but the event wouldn't happen: anyone
        // still booked for an upcoming date must be cancelled (and refunded).
        const upcoming = await untypedRpc<CancelEventPreview>("cancel_event_preview", {
          p_listing_id: listingId,
          p_slot_id: null,
        });
        const { data: listingRow } = await supabase.from("listings").select("metadata, cancelled_at").eq("id", listingId).maybeSingle();
        const row = listingRow as { metadata?: { date?: string } | null; cancelled_at?: string | null } | null;
        const eventDate = row?.metadata?.date ? new Date(row.metadata.date).getTime() : NaN;
        const eventOver = Number.isFinite(eventDate) && eventDate < Date.now();
        if (!row?.cancelled_at && !eventOver && upcoming.bookings > 0) {
          throw new Error(
            `${upcoming.bookings} booking${upcoming.bookings === 1 ? " is" : "s are"} still active. Use "Cancel event" so guests are told and refunded, or pause the listing to stop new bookings.`,
          );
        }
        const { error } = await supabase.from("listings").update({ status: "archived" }).eq("id", listingId);
        if (error) throw error;
        return { archived: true };
      }
      const { error } = await supabase.from("listings").delete().eq("id", listingId);
      if (error) throw error;
      return { archived: false };
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

// ── Cancelling an event (migration 0038 + host-cancel-event) ──────────────────

export interface CancelEventPreview {
  bookings: number;
  guests: number;
  paid: number;
  refund_kobo: number;
}

/** Who a cancellation would affect: the whole listing, or one date (slotId). */
export function useCancelEventPreview(listingId: string | undefined, slotId: string | null, enabled: boolean) {
  return useQuery<CancelEventPreview>({
    queryKey: ["cancel-event-preview", listingId, slotId],
    enabled: enabled && !!listingId,
    queryFn: () => untypedRpc<CancelEventPreview>("cancel_event_preview", { p_listing_id: listingId, p_slot_id: slotId }),
  });
}

export interface CancelEventResult {
  paid_bookings: number;
  refunds_started: number;
  refunds_queued: number;
  refunds_for_hq: number;
  free_cancelled: number;
  holds_released: number;
}

export function useCancelEvent() {
  const queryClient = useQueryClient();
  return useMutation<CancelEventResult, Error, { listingId: string; slotId: string | null; reason: string }>({
    mutationFn: async ({ listingId, slotId, reason }) => {
      const { data, error } = await supabase.functions.invoke("host-cancel-event", {
        body: { listing_id: listingId, slot_id: slotId, reason },
      });
      if (error) {
        const body = await edgeErrorBody(error);
        throw new Error(typeof body?.error === "string" ? body.error : "We couldn't cancel this event. Nothing was changed.");
      }
      return data as CancelEventResult;
    },
    onSuccess: async (_data, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.detail(vars.listingId) }),
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.bookings(vars.listingId) }),
        queryClient.invalidateQueries({ queryKey: listingQueryKeys.availability(vars.listingId) }),
        queryClient.invalidateQueries({ queryKey: ["cancel-event-preview", vars.listingId] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] }),
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
  const { activeHostId, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SubmitVerificationInput) => {
      if (!activeHostId) throw new Error("Not authenticated");

      // kyc_status is no longer writable from the browser (migration 0022).
      // This RPC can only ever move the profile into 'submitted' — promotion to
      // 'verified' stays an HQ decision made with the service role.
      // Cast until the generated types are regenerated against 0022.
      const { error } = await (
        supabase as unknown as {
          rpc: (
            fn: string,
            args: Record<string, unknown>,
          ) => Promise<{ error: { message: string } | null }>;
        }
      ).rpc("submit_host_verification", {
        p_host_id: activeHostId,
        p_legal_name: input.legalName.trim(),
        p_registration: input.registration.trim(),
      });
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
      if (error) {
        const body = await edgeErrorBody(error);
        throw new Error(typeof body?.error === "string" ? body.error : "Could not send the invite. Please try again.");
      }
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
