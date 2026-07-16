// paystack-initialize — start a TEST-MODE Paystack transaction for a paid listing.
//
// Uses reserve_booking() for atomic capacity hold before redirecting to Paystack.
// Also inserts a payments row so the webhook can track the charge attempt.
//
// Deploy:
//   supabase functions deploy paystack-initialize --project-ref fkuervgtbqyjhqoullmd

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

interface Body {
  listing_id: string;
  ticket_type_id?: string;
  slot_id?: string;
  party_size?: number;
  attested_age?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;
  const appUrl = Deno.env.get("GUEST_APP_URL") ?? "https://trove-your-next-adventure.pages.dev";

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return json({ error: "Not authenticated" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Not authenticated" }, 401);
  const user = userData.user;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!body.listing_id) return json({ error: "listing_id required" }, 400);
  const partySize = Math.max(1, Math.min(20, Math.floor(body.party_size ?? 1)));

  const admin = createClient(supabaseUrl, serviceKey);

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

  // Determine price per unit.
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

  const amount = pricePerUnit * partySize;
  if (amount <= 0) {
    return json({ error: "This spot is free — use create-booking.", code: "free_listing" }, 400);
  }

  // Atomically reserve capacity + create booking in pending_payment state.
  const { data: bookingId, error: rpcErr } = await admin.rpc("reserve_booking", {
    p_listing_id: body.listing_id,
    p_guest_id: user.id,
    p_ticket_type_id: body.ticket_type_id ?? null,
    p_slot_id: body.slot_id ?? null,
    p_party_size: partySize,
    p_total_kobo: amount,
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

  // Initialize Paystack transaction.
  const reference = bookingId; // booking UUID is the Paystack reference
  const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${paystackKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      amount,
      currency: "ZAR",
      reference,
      callback_url: `${appUrl}/booking/${bookingId}`,
      metadata: {
        booking_id: bookingId,
        listing_id: listing.id,
        listing_title: listing.title,
        party_size: partySize,
      },
    }),
  });
  const initJson = await initRes.json();

  if (!initRes.ok || !initJson.status) {
    // Roll back the pending booking so capacity is released immediately.
    await admin.from("bookings").update({ status: "payment_failed" }).eq("id", bookingId);
    return json({ error: initJson.message ?? "Payment init failed" }, 502);
  }

  // Record the Paystack reference on the booking and create a payments row.
  await admin
    .from("bookings")
    .update({ paystack_reference: reference })
    .eq("id", bookingId);

  await admin.from("payments").insert({
    booking_id: bookingId,
    provider: "paystack",
    provider_reference: reference,
    amount_kobo: amount,
    currency: "ZAR",
    status: "initialized",
  });

  return json(
    {
      booking_id: bookingId,
      reference,
      authorization_url: initJson.data.authorization_url,
      access_code: initJson.data.access_code,
    },
    200,
  );
});
