// Best-effort WhatsApp sending via the Meta WhatsApp Cloud API. Never throws —
// a WhatsApp failure must never break a booking or webhook.
//
// Required secrets (set once the Meta app exists):
//   WHATSAPP_ACCESS_TOKEN     — Cloud API token (System User token in prod)
//   WHATSAPP_PHONE_NUMBER_ID  — the sender phone-number ID from the Meta app
//   WHATSAPP_BUSINESS_NUMBER  — TROVE's WhatsApp number in digits, e.g. 27821234567
//                               (used to build the wa.me connect deep link)
// Optional:
//   WHATSAPP_TEMPLATE_NEW_BOOKING — approved utility template name (default "trove_new_booking")

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export function whatsAppConfigured(): boolean {
  return !!(Deno.env.get("WHATSAPP_ACCESS_TOKEN") && Deno.env.get("WHATSAPP_PHONE_NUMBER_ID"));
}

export function whatsAppBusinessNumber(): string | null {
  return Deno.env.get("WHATSAPP_BUSINESS_NUMBER") ?? null;
}

async function post(payload: Record<string, unknown>): Promise<boolean> {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) return false;
  try {
    const res = await fetch(`${GRAPH_BASE}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    });
    if (!res.ok) console.error("whatsapp_send_failed", res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (e) {
    console.error("whatsapp_send_error", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Free-form text — only delivered inside a 24h customer-service window
 * (i.e. after the recipient messaged us), e.g. the connect confirmation. */
export function sendWhatsAppText(to: string, body: string): Promise<boolean> {
  return post({ to, type: "text", text: { body, preview_url: false } });
}

/** Pre-approved template message — required for business-initiated sends
 * (notifications outside the 24h window). `params` fill {{1}}, {{2}}, … */
export function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  params: string[],
  lang = "en",
): Promise<boolean> {
  return post({
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: lang },
      components:
        params.length > 0
          ? [{ type: "body", parameters: params.map((p) => ({ type: "text", text: p })) }]
          : [],
    },
  });
}

/** Notify a Spot about a new confirmed booking — fully best-effort.
 * Resolves the host's connected number + notification_prefs and sends the
 * new-booking template. Silently no-ops if anything is missing. */
// deno-lint-ignore no-explicit-any
export async function notifyHostNewBooking(admin: any, opts: {
  listingId: string;
  listingTitle: string;
  partySize: number;
}): Promise<void> {
  try {
    if (!whatsAppConfigured()) return;

    const { data: listing } = await admin
      .from("listings")
      .select("host_id")
      .eq("id", opts.listingId)
      .maybeSingle();
    if (!listing?.host_id) return;

    const { data: host } = await admin
      .from("host_profiles")
      .select("whatsapp_number, notification_prefs")
      .eq("user_id", listing.host_id)
      .maybeSingle();
    if (!host?.whatsapp_number) return;

    // Prefs default ON when unset (matches the engine settings matrix).
    const prefs = (host.notification_prefs ?? {}) as Record<string, Record<string, boolean>>;
    if (prefs.new_booking?.whatsapp === false) return;

    const template = Deno.env.get("WHATSAPP_TEMPLATE_NEW_BOOKING") ?? "trove_new_booking";
    await sendWhatsAppTemplate(host.whatsapp_number.replace(/[^0-9]/g, ""), template, [
      opts.listingTitle,
      String(opts.partySize),
    ]);
  } catch (e) {
    console.error("notify_host_whatsapp_error", e instanceof Error ? e.message : e);
  }
}
