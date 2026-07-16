// paystack-create-recipient — verify a host's SA bank account and create a
// Paystack Transfer Recipient (escrow payout rail).
//
// Flow (authenticated host calls this from the engine):
//   1. POST /bank/resolve  → confirm the account number belongs to a real
//      holder (Paystack returns the registered account_name).
//   2. POST /transferrecipient (type "basa", ZAR) → recipient_code (RCP_...).
//   3. Store recipient_code + verified flag on the caller's host_profiles row.
//
// No payout can be released until this succeeds (generate_payout_batches gates
// on paystack_recipient_code + kyc_status='verified').
//
// Deploy:
//   supabase functions deploy paystack-create-recipient --project-ref fkuervgtbqyjhqoullmd

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";

interface Body {
  bank_code: string;
  account_number: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY")!;

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

  const bankCode = (body.bank_code ?? "").trim();
  const accountNumber = (body.account_number ?? "").replace(/\s/g, "");
  if (!bankCode || !accountNumber) {
    return json({ error: "bank_code and account_number are required" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // The caller must own a host profile.
  const { data: host } = await admin
    .from("host_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!host) return json({ error: "No host profile for this account" }, 403);

  // ── 1. Resolve / verify the bank account ─────────────────────────────────────
  const resolveRes = await fetch(
    `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
    { headers: { Authorization: `Bearer ${paystackKey}` } },
  );
  const resolveJson = await resolveRes.json();
  if (!resolveRes.ok || !resolveJson.status) {
    return json(
      { error: resolveJson.message ?? "Could not verify this bank account", code: "resolve_failed" },
      422,
    );
  }
  const accountName: string = resolveJson.data?.account_name ?? "";

  // ── 2. Create the transfer recipient (South Africa = "basa") ─────────────────
  const recRes = await fetch("https://api.paystack.co/transferrecipient", {
    method: "POST",
    headers: { Authorization: `Bearer ${paystackKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "basa",
      name: accountName || user.email,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: "ZAR",
    }),
  });
  const recJson = await recRes.json();
  if (!recRes.ok || !recJson.status) {
    return json({ error: recJson.message ?? "Could not create payout recipient" }, 502);
  }
  const recipientCode: string = recJson.data?.recipient_code;

  // ── 3. Persist on the host profile (merge into payout_bank_json) ─────────────
  const { data: current } = await admin
    .from("host_profiles")
    .select("payout_bank_json")
    .eq("user_id", user.id)
    .maybeSingle();
  const existing =
    current?.payout_bank_json && typeof current.payout_bank_json === "object" &&
      !Array.isArray(current.payout_bank_json)
      ? current.payout_bank_json
      : {};

  const { error: updErr } = await admin
    .from("host_profiles")
    .update({
      paystack_recipient_code: recipientCode,
      bank_account_verified: true,
      bank_resolved_name: accountName,
      payout_bank_json: {
        ...existing,
        status: "provided",
        bank_code: bankCode,
        account_number: accountNumber,
        account_name: accountName,
        recipient_code: recipientCode,
      },
    })
    .eq("user_id", user.id);
  if (updErr) return json({ error: updErr.message }, 500);

  return json({ recipient_code: recipientCode, account_name: accountName, verified: true }, 200);
});
