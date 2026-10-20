// Listing refund policy (listings.refund_policy, migration 0037). The database
// enforces it in request_refund(); these labels are what hosts and guests read.

export type RefundPolicy = "none" | "1d" | "7d" | "30d";

export const REFUND_POLICIES: Array<{ value: RefundPolicy; label: string }> = [
  { value: "7d", label: "Up to 7 days before the event" },
  { value: "1d", label: "Up to 1 day before the event" },
  { value: "30d", label: "Up to 30 days before the event" },
  { value: "none", label: "No refunds" },
];

export function refundPolicyLabel(value: string | null | undefined): string {
  return REFUND_POLICIES.find((p) => p.value === value)?.label ?? REFUND_POLICIES[0].label;
}
