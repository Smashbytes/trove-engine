// paystack-webhook — confirms a booking once Paystack reports a successful
// (TEST-MODE) charge. Idempotent via payment_webhook_events unique constraint.
// Verifies the HMAC-SHA512 signature, issues the ticket, records a ledger
// entry, and emails the ticket.
//
// Deploy WITHOUT JWT verification (Paystack calls it directly):
//   supabase functions deploy paystack-webhook --no-verify-jwt --project-ref fkuervgtbqyjhqoullmd
// Then set the webhook URL in the Paystack dashboard to:
//   https://fkuervgtbqyjhqoullmd.supabase.co/functions/v1/paystack-webhook

import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendTicketEmail } from "../_shared/email.ts";
import { notifyHostNewBooking } from "../_shared/whatsapp.ts";

function ticketCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (const b of crypto.getRandomValues(new Uint8Array(8))) s += alphabet[b % alphabet.length];
  return `TRV-${s}`;
}

async function hmacSha512Hex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const expected = await hmacSha512Hex(paystackKey, raw);
  if (signature !== expected) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: { event: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad payload", { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // ── Idempotency: insert into payment_webhook_events ──────────────────────────
  // Use the Paystack event id (or reference as fallback) as the unique key.
  const data = event.data as {
    id?: number;
    reference?: string;
    customer?: { email?: string };
    amount?: number;
  };
  const eventId = String(data.id ?? data.reference ?? `${event.event}-${Date.now()}`);

  const { error: insertErr } = await admin.from("payment_webhook_events").insert({
    provider: "paystack",
    event_id: eventId,
    event_type: event.event,
    payload: event as unknown as Record<string, unknown>,
  });

  if (insertErr) {
    // Unique constraint violation = already processed → return 200 immediately.
    if (insertErr.code === "23505") return new Response("ok", { status: 200 });
    // Other error: log and return 200 so Paystack doesn't retry indefinitely.
    console.error("webhook_insert_error", insertErr.message);
    return new Response("ok", { status: 200 });
  }

  // ── Refund settlement events ──────────────────────────────────────────────
  if (event.event === "refund.processed" || event.event === "refund.failed") {
    await handleRefundEvent(admin, event.event, event.data, eventId);
    return new Response("ok", { status: 200 });
  }

  // ── Transfer (host payout) settlement events ──────────────────────────────
  if (event.event.startsWith("transfer.")) {
    await handleTransferEvent(admin, event.event, event.data, eventId);
    return new Response("ok", { status: 200 });
  }

  // Acknowledge anything else we don't act on.
  if (event.event !== "charge.success") {
    await admin
      .from("payment_webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("event_id", eventId)
      .eq("provider", "paystack");
    return new Response("ok", { status: 200 });
  }

  const reference = data.reference;
  if (!reference) return new Response("ok", { status: 200 });

  // ── Load booking by Paystack reference ───────────────────────────────────────
  const { data: booking } = await admin
    .from("bookings")
    .select("id, guest_id, listing_id, party_size, status, total_kobo, payout_kobo")
    .eq("paystack_reference", reference)
    .maybeSingle();

  if (!booking) {
    await markProcessed(admin, eventId, "booking_not_found");
    return new Response("ok", { status: 200 });
  }

  // Already confirmed — idempotent.
  if (["confirmed", "completed"].includes(booking.status)) {
    await markProcessed(admin, eventId);
    return new Response("ok", { status: 200 });
  }

  // ── Confirm the booking ───────────────────────────────────────────────────────
  await admin
    .from("bookings")
    .update({ status: "confirmed" })
    .eq("id", booking.id);

  // ── Update payments row ───────────────────────────────────────────────────────
  await admin
    .from("payments")
    .update({ status: "succeeded" })
    .eq("provider_reference", reference);

  // ── Issue ticket if not already present ──────────────────────────────────────
  const { data: existingTickets } = await admin
    .from("tickets")
    .select("id, code")
    .eq("booking_id", booking.id);

  let code = existingTickets?.[0]?.code ?? "";
  if (!existingTickets || existingTickets.length === 0) {
    code = ticketCode();
    await admin.from("tickets").insert({
      booking_id: booking.id,
      code,
      jwt_jti: crypto.randomUUID(),
      status: "valid",
    });
  }

  // ── Ledger: record charge ─────────────────────────────────────────────────────
  await admin.from("ledger").insert({
    owner_user_id: booking.guest_id,
    kind: "charge",
    amount_kobo: booking.total_kobo,
    currency: "ZAR",
    ref_type: "booking",
    ref_id: booking.id,
  });

  const { data: listing } = await admin
    .from("listings")
    .select("title, host_id")
    .eq("id", booking.listing_id)
    .maybeSingle();

  // ── Ledger: credit the host their payout share (total minus platform fee) ────
  // generate_payout_batches() folds these rows into payouts once the hold
  // period passes.
  if (listing?.host_id && (booking.payout_kobo ?? 0) > 0) {
    await admin.from("ledger").insert({
      owner_user_id: listing.host_id,
      kind: "host_credit",
      amount_kobo: booking.payout_kobo,
      currency: "ZAR",
      ref_type: "booking",
      ref_id: booking.id,
    });
  }

  // ── Email ticket ──────────────────────────────────────────────────────────────

  await sendTicketEmail({
    to: data.customer?.email,
    spotTitle: listing?.title ?? "your booking",
    code,
    qty: booking.party_size,
  });

  // ── WhatsApp the Spot (best-effort, honours notification_prefs) ──────────────
  await notifyHostNewBooking(admin, {
    listingId: booking.listing_id,
    listingTitle: listing?.title ?? "your listing",
    partySize: booking.party_size,
  });

  await markProcessed(admin, eventId);
  return new Response("ok", { status: 200 });
});

// ── Refund settlement ──────────────────────────────────────────────────────────
// process-refund moved the refund to 'provider_pending' and the booking to
// 'refund_processing'; Paystack reports the outcome here.
//   refund.processed → refund 'succeeded', booking 'refunded' (or partial),
//                      payments row updated, tickets voided, host ledger reversed.
//   refund.failed    → refund 'failed', booking back to 'confirmed' so HQ can retry.
async function handleRefundEvent(
  // deno-lint-ignore no-explicit-any
  admin: any,
  eventType: "refund.processed" | "refund.failed",
  data: Record<string, unknown>,
  eventId: string,
) {
  // Paystack refund payloads carry the original charge reference here.
  const txRef = String(
    (data as { transaction_reference?: string; transaction?: { reference?: string } })
      .transaction_reference ??
      (data as { transaction?: { reference?: string } }).transaction?.reference ??
      "",
  );
  if (!txRef) {
    await markProcessed(admin, eventId, "refund_missing_transaction_reference");
    return;
  }

  const { data: booking } = await admin
    .from("bookings")
    .select("id, total_kobo, payout_kobo, listing_id, status")
    .eq("paystack_reference", txRef)
    .maybeSingle();

  if (!booking) {
    await markProcessed(admin, eventId, "refund_booking_not_found");
    return;
  }

  const { data: refund } = await admin
    .from("refunds")
    .select("id, amount_kobo, status")
    .eq("booking_id", booking.id)
    .in("status", ["provider_pending", "approved"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!refund) {
    await markProcessed(admin, eventId, "refund_row_not_found");
    return;
  }

  const now = new Date().toISOString();

  if (eventType === "refund.failed") {
    await admin
      .from("refunds")
      .update({ status: "failed", updated_at: now })
      .eq("id", refund.id);
    // Roll the booking back so HQ can see it and retry the refund.
    if (booking.status === "refund_processing") {
      await admin.from("bookings").update({ status: "confirmed" }).eq("id", booking.id);
    }
    await markProcessed(admin, eventId);
    return;
  }

  // refund.processed
  const refundAmount = Number(refund.amount_kobo ?? 0);
  const isFull = refundAmount >= Number(booking.total_kobo ?? 0);

  await admin
    .from("refunds")
    .update({ status: "succeeded", updated_at: now })
    .eq("id", refund.id);

  await admin
    .from("bookings")
    .update({
      status: isFull ? "refunded" : "partially_refunded",
      refunded_at: now,
    })
    .eq("id", booking.id);

  await admin
    .from("payments")
    .update({ status: isFull ? "refunded" : "partially_refunded", updated_at: now })
    .eq("booking_id", booking.id);

  if (isFull) {
    await admin
      .from("tickets")
      .update({ status: "refunded" })
      .eq("booking_id", booking.id)
      .in("status", ["valid"]);
  }

  // Reverse the host's share of the refunded amount so the next payout batch
  // nets it off. (The guest-side 'refund' ledger row was written by
  // process-refund when the refund was approved.)
  const total = Number(booking.total_kobo ?? 0);
  const payout = Number(booking.payout_kobo ?? 0);
  const hostReversal = total > 0 ? Math.round((refundAmount * payout) / total) : 0;

  if (hostReversal > 0) {
    const { data: listing } = await admin
      .from("listings")
      .select("host_id")
      .eq("id", booking.listing_id)
      .maybeSingle();

    if (listing?.host_id) {
      await admin.from("ledger").insert({
        owner_user_id: listing.host_id,
        kind: "refund_reversal",
        amount_kobo: -hostReversal,
        currency: "ZAR",
        ref_type: "refund",
        ref_id: refund.id,
      });
    }
  }

  await markProcessed(admin, eventId);
}

// ── Transfer settlement ─────────────────────────────────────────────────────
// process-payout created a payouts row in 'processing' with a stable reference.
//   transfer.success            → payout 'paid'
//   transfer.failed / .reversed → payout 'failed' (HQ can retry; the unbatched
//                                 ledger rows were already consumed, so a retry
//                                 re-runs process-payout for the same payout id).
async function handleTransferEvent(
  // deno-lint-ignore no-explicit-any
  admin: any,
  eventType: string,
  data: Record<string, unknown>,
  eventId: string,
) {
  const d = data as { reference?: string; transfer_code?: string; reason?: string };
  const ref = String(d.reference ?? "");
  const transferCode = String(d.transfer_code ?? "");

  let payout: { id: string; status: string } | null = null;
  if (ref) {
    const { data: p } = await admin
      .from("payouts").select("id, status").eq("paystack_transfer_reference", ref).maybeSingle();
    payout = p;
  }
  if (!payout && transferCode) {
    const { data: p } = await admin
      .from("payouts").select("id, status").eq("paystack_transfer_code", transferCode).maybeSingle();
    payout = p;
  }
  if (!payout) {
    await markProcessed(admin, eventId, "payout_not_found");
    return;
  }

  const now = new Date().toISOString();
  if (eventType === "transfer.success") {
    await admin
      .from("payouts")
      .update({ status: "paid", paystack_status: "success", processed_at: now, updated_at: now })
      .eq("id", payout.id);
  } else if (eventType === "transfer.failed" || eventType === "transfer.reversed") {
    await admin
      .from("payouts")
      .update({
        status: "failed",
        paystack_status: eventType.split(".")[1],
        failure_reason: String(d.reason ?? eventType),
        updated_at: now,
      })
      .eq("id", payout.id);
  }
  await markProcessed(admin, eventId);
}

async function markProcessed(
  // deno-lint-ignore no-explicit-any
  admin: any,
  eventId: string,
  errorNote?: string,
) {
  await admin
    .from("payment_webhook_events")
    .update({
      processed_at: new Date().toISOString(),
      ...(errorNote ? { error: errorNote } : {}),
    })
    .eq("event_id", eventId)
    .eq("provider", "paystack");
}
