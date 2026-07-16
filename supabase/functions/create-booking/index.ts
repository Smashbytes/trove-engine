// create-booking — server-side booking creation for the guest app.
//
// Uses reserve_booking() PG function for atomic capacity check + INSERT,
// preventing oversell under concurrent checkouts.
//
// Auth: caller's JWT in Authorization header. Service role for privileged writes.
//
// Deploy:
//   supabase functions deploy create-booking --project-ref fkuervgtbqyjhqoullmd

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { sendTicketEmail } from "../_shared/email.ts";
import { notifyHostNewBooking } from "../_shared/whatsapp.ts";

interface CreateBookingBody {
  listing_id: string;
  ticket_type_id?: string;
  slot_id?: string;
  party_size?: number;
  attested_age?: boolean;
  invites?: Array<{ user_id?: string; email?: string; phone?: string }>;
}

function ticketCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return `TRV-${s}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Not authenticated" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Not authenticated" }, 401);
  const userId = userData.user.id;

  let body: CreateBookingBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const partySize = Math.max(1, Math.min(20, Math.floor(body.party_size ?? 1)));
  if (!body.listing_id) return json({ error: "listing_id required" }, 400);

  const admin = createClient(supabaseUrl, serviceKey);

  // Fetch listing for age gate and pricing only — capacity handled by reserve_booking().
  const { data: listing, error: lErr } = await admin
    .from("listings")
    .select("id, title, status, base_price_kobo, metadata")
    .eq("id", body.listing_id)
    .maybeSingle();
  if (lErr) return json({ error: lErr.message }, 500);
  if (!listing || listing.status !== "live") return json({ error: "Listing not available" }, 404);

  const ageMin = (listing.metadata as { age_restriction?: number } | null)?.age_restriction ?? 0;
  if (ageMin >= 18 && !body.attested_age) {
    return json({ error: "Age confirmation required", code: "age_required" }, 422);
  }

  // Determine price (per-tier price takes precedence over base price).
  let pricePerUnit = listing.base_price_kobo ?? 0;
  if (body.ticket_type_id) {
    const { data: tier } = await admin
      .from("ticket_types")
      .select("price_kobo, status")
      .eq("id", body.ticket_type_id)
      .maybeSingle();
    if (!tier || tier.status !== "active") return json({ error: "Ticket tier not available" }, 404);
    pricePerUnit = tier.price_kobo ?? 0;
  }

  const total = pricePerUnit * partySize;
  if (total > 0) {
    return json(
      { error: "Online payment is coming soon for this spot.", code: "payment_required" },
      402,
    );
  }

  // Atomic reserve — throws CAPACITY_EXCEEDED or LISTING_NOT_LIVE on failure.
  const { data: bookingId, error: rpcErr } = await admin.rpc("reserve_booking", {
    p_listing_id: body.listing_id,
    p_guest_id: userId,
    p_ticket_type_id: body.ticket_type_id ?? null,
    p_slot_id: body.slot_id ?? null,
    p_party_size: partySize,
    p_total_kobo: total,
    p_attested_age: !!body.attested_age,
  });

  if (rpcErr) {
    const msg = rpcErr.message ?? "";
    if (msg.includes("CAPACITY_EXCEEDED") || msg.includes("TIER_CAPACITY_EXCEEDED")) {
      return json({ error: "Sold out", code: "sold_out" }, 409);
    }
    if (msg.includes("LISTING_NOT_LIVE")) {
      return json({ error: "Listing not available" }, 404);
    }
    return json({ error: msg }, 500);
  }

  // Issue one ticket.
  const code = ticketCode();
  const { error: tErr } = await admin.from("tickets").insert({
    booking_id: bookingId,
    code,
    jwt_jti: crypto.randomUUID(),
    status: "valid",
  });
  if (tErr) return json({ error: tErr.message }, 500);

  // Optional friend invites (best-effort).
  if (Array.isArray(body.invites) && body.invites.length > 0) {
    const rows = body.invites
      .filter((i) => i.user_id || i.email || i.phone)
      .map((i) => ({
        booking_id: bookingId,
        user_id: i.user_id ?? null,
        invited_email: i.email ?? null,
        invited_phone: i.phone ?? null,
        status: "invited",
      }));
    if (rows.length > 0) await admin.from("booking_guests").insert(rows);
  }

  // Email the ticket (best-effort).
  await sendTicketEmail({
    to: userData.user.email,
    spotTitle: listing.title,
    code,
    qty: partySize,
  });

  // WhatsApp the Spot (best-effort, honours notification_prefs).
  await notifyHostNewBooking(admin, {
    listingId: listing.id,
    listingTitle: listing.title,
    partySize,
  });

  return json({ booking_id: bookingId, code, status: "confirmed" }, 200);
});
