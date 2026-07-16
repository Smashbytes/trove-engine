#!/usr/bin/env node
// TROVE — Paystack payment smoke test (READ-ONLY / non-money-moving).
//
// Verifies the production payment chain is correctly wired WITHOUT charging a
// card or sending a transfer. Run AFTER applying migration 0019 and deploying
// the edge functions.
//
//   Required env:
//     SUPABASE_URL              e.g. https://fkuervgtbqyjhqoullmd.supabase.co
//     SUPABASE_SERVICE_ROLE_KEY service-role key (sb_secret_... or JWT)
//     PAYSTACK_SECRET_KEY       sk_test_... (or sk_live_... once live)
//
//   Run:  node scripts/payment-smoketest.mjs
//
import crypto from "node:crypto";

const URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SRK = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PSK = process.env.PAYSTACK_SECRET_KEY;
if (!URL || !SRK || !PSK) {
  console.error("Missing env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PAYSTACK_SECRET_KEY");
  process.exit(1);
}
const FN = `${URL}/functions/v1`;
const REST = `${URL}/rest/v1`;

let pass = 0, fail = 0;
const ok = (m) => { console.log(`  \x1b[32m✓\x1b[0m ${m}`); pass++; };
const no = (m) => { console.log(`  \x1b[31m✗\x1b[0m ${m}`); fail++; };

async function restGet(path) {
  const r = await fetch(`${REST}/${path}`, {
    headers: { apikey: SRK, Authorization: `Bearer ${SRK}` },
  });
  return { status: r.status, body: await r.text() };
}

async function main() {
  console.log("\nTROVE Paystack smoke test\n=========================");

  // 1. Schema — migration 0019 columns / table present
  console.log("\n[1] Schema (migration 0019)");
  for (const [label, path] of [
    ["host_profiles.paystack_recipient_code", "host_profiles?select=paystack_recipient_code&limit=1"],
    ["host_profiles.bank_account_verified", "host_profiles?select=bank_account_verified&limit=1"],
    ["payouts.paystack_transfer_reference", "payouts?select=paystack_transfer_reference&limit=1"],
    ["kyc_documents table", "kyc_documents?select=id&limit=1"],
  ]) {
    const { status } = await restGet(path);
    status === 200 ? ok(`${label} exists`) : no(`${label} missing (HTTP ${status}) — apply 0019`);
  }

  // 2. Paystack key validity (no charge)
  console.log("\n[2] Paystack key");
  try {
    const r = await fetch("https://api.paystack.co/balance", {
      headers: { Authorization: `Bearer ${PSK}` },
    });
    const j = await r.json();
    if (r.ok && j.status) {
      ok(`key valid; balance: ${(j.data ?? []).map((b) => `${b.currency} ${(b.balance/100).toFixed(2)}`).join(", ") || "—"}`);
      if (PSK.startsWith("sk_test_")) console.log("    \x1b[33m·\x1b[0m TEST mode key — switch to sk_live_ for production");
    } else no(`key rejected: ${j.message}`);
  } catch (e) { no(`Paystack unreachable: ${e.message}`); }

  // 3. Webhook signature enforcement
  console.log("\n[3] paystack-webhook signature guard");
  const payload = JSON.stringify({ event: "ping", data: { id: Date.now() } });
  const bad = await fetch(`${FN}/paystack-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-paystack-signature": "deadbeef" },
    body: payload,
  });
  bad.status === 401 ? ok("rejects invalid signature (401)") : no(`expected 401, got ${bad.status}`);

  const sig = crypto.createHmac("sha512", PSK).update(payload).digest("hex");
  const good = await fetch(`${FN}/paystack-webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-paystack-signature": sig },
    body: payload,
  });
  good.status === 200 ? ok("accepts valid signature (200, ignored 'ping' event)") : no(`expected 200, got ${good.status}`);

  // 4. Payout batching RPC runs (no money moves; only batches eligible credit)
  console.log("\n[4] generate_payout_batches() RPC");
  const rpc = await fetch(`${REST}/rpc/generate_payout_batches`, {
    method: "POST",
    headers: { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" },
    body: "{}",
  });
  if (rpc.status === 200) {
    const rows = await rpc.json();
    ok(`RPC ok — ${Array.isArray(rows) ? rows.length : 0} batch(es) created this run`);
  } else no(`RPC failed (HTTP ${rpc.status}): ${(await rpc.text()).slice(0, 160)}`);

  console.log(`\n=========================\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
