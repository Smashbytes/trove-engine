// Listing refund policy (listings.refund_policy, migration 0038). The database
// applies it in request_refund(); these labels are what hosts and guests read.
// "standard" is TROVE's published Refund & Cancellation Policy; a Spot may only
// pick stricter terms. TROVE's booking fee is never refunded when a guest
// cancels, and a cancelled event is always refunded in full.

export type RefundPolicy = "standard" | "7d" | "30d" | "none";

export const REFUND_POLICIES: Array<{ value: RefundPolicy; label: string; detail: string }> = [
  {
    value: "standard",
    label: "TROVE standard",
    detail: "90% back if cancelled 72+ hours before, 50% at 24–72 hours, nothing under 24 hours.",
  },
  {
    value: "7d",
    label: "7 days' notice",
    detail: "90% back if cancelled at least 7 days before, nothing after that.",
  },
  {
    value: "30d",
    label: "30 days' notice",
    detail: "90% back if cancelled at least 30 days before, nothing after that.",
  },
  {
    value: "none",
    label: "No refunds",
    detail: "Guests can't cancel for a refund. If you cancel the event, they're still refunded in full.",
  },
];

export function refundPolicy(value: string | null | undefined) {
  return REFUND_POLICIES.find((p) => p.value === value) ?? REFUND_POLICIES[0];
}

export function refundPolicyLabel(value: string | null | undefined): string {
  return refundPolicy(value).label;
}
