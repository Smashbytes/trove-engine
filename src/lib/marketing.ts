// Marketing intake client — talks to the WEBSITE/CMS Supabase project, NOT the
// apps database. The two projects are intentionally separate: this one only
// holds marketing dropboxes (newsletter_subscribers, partner_leads) with
// insert-only RLS, so the publishable key below can write a row and nothing
// else. Keep the engine's transactional client (./supabase.ts) out of here.
//
// The key is an sb_publishable_ key: safe to ship in the client bundle by
// design. Env vars override it so the CMS project can be swapped without a
// code change.

import { createClient } from "@supabase/supabase-js";

const MARKETING_URL =
  (import.meta.env.VITE_MARKETING_SUPABASE_URL as string | undefined) ??
  "https://shtqespdhehbtucvhenq.supabase.co";
const MARKETING_KEY =
  (import.meta.env.VITE_MARKETING_SUPABASE_KEY as string | undefined) ??
  "sb_publishable_jttXNbEe5Lc2rYd6mFkmbw_MkP3wXZ1";

// No session storage or token refresh: this client is anonymous-only and must
// never interact with the engine's own auth cookies.
const marketing = createClient(MARKETING_URL, MARKETING_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

export type PartnerHostType = "organiser" | "experience" | "accommodation" | "venue";

export interface PartnerLeadInput {
  name: string;
  email: string;
  phone?: string;
  spotName?: string;
  hostType?: PartnerHostType;
  message: string;
}

export type IntakeResult =
  | { ok: true; already?: boolean }
  | { ok: false; error: string };

export async function subscribeToNewsletter(email: string): Promise<IntakeResult> {
  const { error } = await marketing
    .from("newsletter_subscribers")
    .insert({ email: email.trim().toLowerCase(), source: "engine_landing" });

  if (!error) return { ok: true };
  // Unique index on lower(email): a duplicate signup is a happy path.
  if (error.code === "23505") return { ok: true, already: true };
  return { ok: false, error: "Could not subscribe right now. Please try again." };
}

export async function submitPartnerLead(input: PartnerLeadInput): Promise<IntakeResult> {
  const { error } = await marketing.from("partner_leads").insert({
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    spot_name: input.spotName?.trim() || null,
    host_type: input.hostType ?? null,
    message: input.message.trim(),
    source: "engine_landing",
  });

  if (!error) return { ok: true };
  return { ok: false, error: "Could not send your enquiry right now. Please try again." };
}
