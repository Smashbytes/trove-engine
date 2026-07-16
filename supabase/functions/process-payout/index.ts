// process-payout — execute a pending payout batch as a Paystack Transfer.
//
// Called by HQ (service-role) after generate_payout_batches() has created a
// 'pending' payouts row. Sends the host their escrowed share from the platform
// balance. The transfer settles asynchronously; the final 'paid'/'failed'
// state arrives via paystack-webhook (transfer.success / transfer.failed).
//
// Auth: requires the service-role key as a Bearer token (same pattern as
// process-refund — invoked from a trusted HQ server action, never the browser).
//
// Deploy WITHOUT JWT verification:
//   supabase functions deploy process-payout --no-verify-jwt --project-ref fkuervgtbqyjhqoullmd

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

interface Body {
  payout_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;

  // Only a trusted caller holding the service-role key may move money.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token || token !== serviceKey) return json({ error: "Forbidden" }, 403);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!body.payout_id) return json({ error: "payout_id required" }, 400);

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: payout, error: pErr } = await admin
    .from("payouts")
    .select("id, host_id, amount_kobo, status, paystack_recipient_code, paystack_transfer_reference")
    .eq("id", body.payout_id)
    .maybeSingle();
  if (pErr) return json({ error: pErr.message }, 500);
  if (!payout) return json({ error: "Payout not found" }, 404);

  // Idempotency / retry: only act on pending or previously-failed batches.
  if (!["pending", "failed"].includes(payout.status)) {
    return json({ error: `Payout is '${payout.status}', not payable`, code: "not_payable" }, 409);
  }
  if ((payout.amount_kobo ?? 0) <= 0) {
    return json({ error: "Payout amount must be positive" }, 422);
  }

  // Resolve the recipient (snapshot on the payout, else current host profile).
  let recipient = payout.paystack_recipient_code;
  if (!recipient) {
    const { data: host } = await admin
      .from("host_profiles")
      .select("paystack_recipient_code, kyc_status, payouts_paused")
      .eq("user_id", payout.host_id)
      .maybeSingle();
    if (!host?.paystack_recipient_code) {
      return json({ error: "Host has no payout recipient", code: "no_recipient" }, 422);
    }
    if (host.kyc_status !== "verified") {
      return json({ error: "Host is not verified", code: "not_verified" }, 422);
    }
    if (host.payouts_paused) {
      return json({ error: "Payouts are paused for this host", code: "paused" }, 422);
    }
    recipient = host.paystack_recipient_code;
  }

  // Stable reference per payout → Paystack rejects duplicates, so retries are safe.
  const reference = payout.paystack_transfer_reference ?? `payout_${payout.id}`;

  // Mark processing before the call so a crash mid-flight is visible.
  await admin
    .from("payouts")
    .update({ status: "processing", paystack_recipient_code: recipient, paystack_transfer_reference: reference, updated_at: new Date().toISOString() })
    .eq("id", payout.id);

  const transferRes = await fetch("https://api.paystack.co/transfer", {
    method: "POST",
    headers: { Authorization: `Bearer ${paystackKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "balance",
      amount: payout.amount_kobo,
      recipient,
      currency: "ZAR",
      reason: `TROVE payout ${payout.id}`,
      reference,
    }),
  });
  const transferJson = await transferRes.json();

  if (!transferRes.ok || !transferJson.status) {
    await admin
      .from("payouts")
      .update({
        status: "failed",
        failure_reason: transferJson.message ?? "Transfer init failed",
        paystack_status: transferJson.data?.status ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payout.id);
    return json({ error: transferJson.message ?? "Transfer failed", code: "transfer_failed" }, 502);
  }

  // Transfer accepted (status usually 'pending'/'success'/'otp'). Final state
  // confirmed by the transfer.* webhook.
  await admin
    .from("payouts")
    .update({
      paystack_transfer_code: transferJson.data?.transfer_code ?? null,
      paystack_status: transferJson.data?.status ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payout.id);

  return json(
    {
      payout_id: payout.id,
      transfer_code: transferJson.data?.transfer_code,
      status: transferJson.data?.status,
      reference,
    },
    200,
  );
});
