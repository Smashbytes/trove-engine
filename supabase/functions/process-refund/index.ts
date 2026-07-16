// process-refund — calls Paystack to refund a payment.
//
// Called by HQ server actions (approveRefund) with the service-role key.
// The refund row must be in status='approved' before calling this function.
//
// Flow:
//   1. Load refund + payment rows.
//   2. Validate state: refund must be 'approved', payment must be 'succeeded'.
//   3. Call Paystack POST /refund.
//   4. On success: update refund status → 'provider_pending', booking → 'refund_processing',
//      update payments row, insert ledger 'refund' entry.
//   5. On Paystack failure: update refund status → 'failed'.
//
// Paystack will fire a 'refund.processed' or 'transfer.success' webhook when the
// refund settles — that webhook should flip refund → 'succeeded', booking → 'refunded',
// and void tickets. That second hop is handled in paystack-webhook.
//
// Auth: only callable via service role (not exposed to anon/authenticated).
// Deploy WITHOUT JWT verification (called server-side):
//   supabase functions deploy process-refund --no-verify-jwt --project-ref fkuervgtbqyjhqoullmd

import { createClient } from "jsr:@supabase/supabase-js@2";
import { json } from "../_shared/cors.ts";

interface Body {
  refund_id: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!body.refund_id) return json({ error: "refund_id required" }, 400);

  const admin = createClient(supabaseUrl, serviceKey);

  // ── Load refund ───────────────────────────────────────────────────────────────
  const { data: refund, error: rErr } = await admin
    .from("refunds")
    .select("id, payment_id, booking_id, amount_kobo, status, reason")
    .eq("id", body.refund_id)
    .maybeSingle();

  if (rErr || !refund) return json({ error: "Refund not found" }, 404);
  if (refund.status !== "approved") {
    return json({ error: `Refund must be in 'approved' state (current: ${refund.status})` }, 422);
  }

  // ── Load payment ──────────────────────────────────────────────────────────────
  const { data: payment, error: pErr } = await admin
    .from("payments")
    .select("id, provider_reference, status, amount_kobo")
    .eq("id", refund.payment_id)
    .maybeSingle();

  if (pErr || !payment) return json({ error: "Payment not found" }, 404);
  if (payment.status !== "succeeded") {
    return json({ error: `Payment must be 'succeeded' to refund (current: ${payment.status})` }, 422);
  }

  // ── Call Paystack /refund ─────────────────────────────────────────────────────
  const paystackRes = await fetch("https://api.paystack.co/refund", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction: payment.provider_reference,
      amount: refund.amount_kobo,
    }),
  });
  const paystackJson = await paystackRes.json();

  if (!paystackRes.ok || !paystackJson.status) {
    // Paystack rejected the refund — mark as failed.
    await admin
      .from("refunds")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", refund.id);

    return json(
      { error: paystackJson.message ?? "Paystack refund failed", code: "paystack_error" },
      502,
    );
  }

  const paystackRefundRef = String(
    paystackJson.data?.transaction_reference ?? paystackJson.data?.id ?? "",
  );

  // ── Update refund → provider_pending ─────────────────────────────────────────
  await admin
    .from("refunds")
    .update({
      status: "provider_pending",
      provider_reference: paystackRefundRef,
      updated_at: new Date().toISOString(),
    })
    .eq("id", refund.id);

  // ── Update booking → refund_processing ───────────────────────────────────────
  await admin
    .from("bookings")
    .update({ status: "refund_processing", updated_at: new Date().toISOString() })
    .eq("id", refund.booking_id);

  // ── Update payment row ────────────────────────────────────────────────────────
  const isFullRefund = refund.amount_kobo >= payment.amount_kobo;
  await admin
    .from("payments")
    .update({
      status: isFullRefund ? "refunded" : "partially_refunded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  // ── Insert ledger 'refund' entry ──────────────────────────────────────────────
  const { data: booking } = await admin
    .from("bookings")
    .select("guest_id")
    .eq("id", refund.booking_id)
    .maybeSingle();

  if (booking?.guest_id) {
    await admin.from("ledger").insert({
      owner_user_id: booking.guest_id,
      kind: "refund",
      amount_kobo: -refund.amount_kobo, // negative = money leaving platform
      currency: "ZAR",
      ref_type: "refund",
      ref_id: refund.id,
    });
  }

  return json(
    {
      refund_id: refund.id,
      status: "provider_pending",
      paystack_reference: paystackRefundRef,
    },
    200,
  );
});
