# TROVE × Paystack — Go-Live Runbook

Settlement model: **ESCROW + Paystack Transfers** (decided 2026-06-20).
Funds are collected 100% to the platform Paystack account, the host's share
accrues as `host_credit` in `ledger`, and is paid out via a Paystack **Transfer**
only **after the event ends** (+ buffer) and **only for verified hosts with a
recipient**. We do **not** use subaccount split-at-source (it would break escrow).

---

## What shipped in this change

| Area | File | Status |
|---|---|---|
| Guest checkout — real Paystack redirect (mock card form removed for paid live listings) | `trove-your-next-adventure/src/routes/checkout.$id.tsx` | ✅ done |
| DB: payout-rail + KYC schema + `generate_payout_batches` v2 (event-completion gating) | `supabase/migrations/0019_payout_rail_kyc.sql` | ✅ **APPLIED + verified** (2026-06-26) |
| Edge fn: verify bank + create transfer recipient | `trove-engine/supabase/functions/paystack-create-recipient` | ✅ **deployed** (v1) |
| Edge fn: execute payout as Paystack Transfer | `trove-engine/supabase/functions/process-payout` | ✅ **deployed** (v1, no-verify-jwt) |
| Webhook: `transfer.success/failed/reversed` settlement | `trove-engine/supabase/functions/paystack-webhook` (extended) | ✅ **redeployed** (v8) |
| Onboarding: real KYC doc upload → private `kyc-docs` bucket | `trove-engine/src/routes/onboarding.tsx` + `queries.ts` | ✅ done |
| Engine Settings: "Verify & enable payouts" → create-recipient | `trove-engine/src/routes/settings.tsx` + `sa-banks.ts` | ✅ done (typechecks) |
| HQ payout drawer: "Pay via Paystack" → process-payout | `trove-hq/src/features/payments/*` | ✅ done (typechecks) |
| Smoke test | `trove-engine/scripts/payment-smoketest.mjs` | ✅ **8/8 passing** |

> Steps 1 & 2 below are DONE (migration applied via Management API, types regenerated,
> all 3 functions deployed, smoke test green). Remaining: real test-card run + Step 5 (keys).

---

## Step 1 — Apply the migration (DDL)

> Could not be applied from the build environment: the `Keys.txt` DB password is
> rejected by the pooler (stale — rotate it, see Step 5). Apply via the
> **Supabase Dashboard → SQL Editor** (always works) or `supabase db push`.

Dashboard: paste the contents of `supabase/migrations/0019_payout_rail_kyc.sql`
and run. It is additive and idempotent (`IF NOT EXISTS` throughout).

Then regenerate types so the new columns/tables are typed:

```bash
supabase gen types typescript --project-id fkuervgtbqyjhqoullmd > trove-engine/src/lib/database.types.generated.ts
# repeat for trove-hq if it surfaces payouts
```

## Step 2 — Deploy edge functions

```bash
export SUPABASE_ACCESS_TOKEN=<sbp_…>
CLI=/c/Users/User/node_modules/supabase/bin/supabase.exe
REF=fkuervgtbqyjhqoullmd
cd "trove-engine"
"$CLI" functions deploy paystack-create-recipient --project-ref $REF
"$CLI" functions deploy process-payout --no-verify-jwt --project-ref $REF
"$CLI" functions deploy paystack-webhook --no-verify-jwt --project-ref $REF   # redeploy (transfer.* handling)
```

`process-payout` and `paystack-webhook` must stay **--no-verify-jwt**
(`process-payout` is auth-gated internally on the service-role key;
`paystack-webhook` is called by Paystack and verifies the HMAC signature).

## Step 3 — Wire the UI (remaining work, post-migration)

1. **Engine → Settings → Banking**: add a "Verify account & enable payouts"
   button that calls `paystack-create-recipient` with `{ bank_code, account_number }`.
   Bank codes come from `GET https://api.paystack.co/bank?country=south africa`
   — store the **code**, not the free-text bank name (current onboarding stores
   the name only).
2. **HQ → Payments**: on a `pending` payout, add "Pay via Paystack" → invoke
   `process-payout` with `{ payout_id }` and the service-role key. (`markPayoutPaid`
   stays as the manual-EFT fallback.)

## Step 4 — Paystack dashboard

- Webhook URL: `https://fkuervgtbqyjhqoullmd.supabase.co/functions/v1/paystack-webhook`
  (handles `charge.success`, `refund.*`, `transfer.*`).
- Enable **3D Secure**, fraud checks (on by default for hosted checkout).
- Transfers: ensure the integration is allowed to send transfers; for automated
  payouts disable the OTP-per-transfer requirement (Settings → Transfers) or
  handle the `otp` status in `process-payout`.
- Top up / maintain platform balance so transfers can settle.

## Step 5 — Security before real money (BLOCKERS)

- **Rotate every secret in `Keys.txt`** — it holds the service-role key, DB
  password, Paystack keys, Resend, and a Claude API key in plaintext. The DB
  password is already rejected by the pooler (likely rotated/stale). Rotate DB
  password + Supabase keys + Paystack keys in one pass, update function secrets:
  ```bash
  "$CLI" secrets set PAYSTACK_SECRET_KEY=sk_live_… --project-ref $REF
  ```
- Switch guest/engine env to **live** Paystack public key.
- Confirm `GUEST_APP_URL` function secret points at the production guest domain.

## Step 6 — Verify

```bash
cd trove-engine
SUPABASE_URL=https://fkuervgtbqyjhqoullmd.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role> \
PAYSTACK_SECRET_KEY=<sk_test_ or sk_live_> \
node scripts/payment-smoketest.mjs
```

Then a real test-card run end-to-end: guest checkout → Paystack test card
`4084 0840 8408 4081` → booking flips to `confirmed`, ticket emailed,
`host_credit` ledger row appears. After the event end + buffer, run
`generate_payout_batches()` then `process-payout` and confirm `transfer.success`
flips the payout to `paid`.

---

## Compliance posture (POPIA / CPA / VAT)

- **POPIA**: KYC docs now go to a **private** bucket with owner-scoped RLS
  (encrypted at rest). Banking still lives in `host_profiles.payout_bank_json`
  — acceptable, but consider moving account numbers behind a restricted view.
- **CPA**: refund flow exists (HQ `requestRefund`/`approveRefund` → `process-refund`
  → `refund.*` webhook). Publish the cancellation/refund policy in-app.
- **VAT**: service fee is tracked per booking (`bookings.fee_cents`). Add SARS VAT
  handling + tax invoices once the platform crosses the registration threshold.

## Not built (deliberately deferred)

- Tiered early payout (e.g. Partner 30% pre-event / 70% post). Foundation is in
  place via `payouts_paused` + the verified gate; add a per-host release policy
  to `generate_payout_batches` when needed.
- Guest-side tiered ticket selection (checkout never sends `ticket_type_id`).
