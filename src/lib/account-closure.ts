// Closing an account (SHR-L03-04, migration 20261021190000_account_closing):
// request → 14 days to change your mind → anonymised by the daily sweep.
// Bookings, payouts, KYC records and payments are kept. The database refuses
// while a Spot still has upcoming guests, escrow or payouts in flight, and says why.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { untypedRpc } from "@/lib/queries";

export type ClosureBlocker = { code: string; count: number; message: string };

type RawClosure = { requested_at: string | null; wipe_after: string | null; blockers: ClosureBlocker[] | null };
type RawRequest = { ok: boolean; wipe_after?: string | null; blockers?: ClosureBlocker[] };

const KEY = ["account-closure"] as const;

export function useAccountClosure(enabled = true) {
  return useQuery({
    queryKey: KEY,
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const raw = (await untypedRpc<RawClosure | null>("my_account_closure", {})) ?? null;
      return {
        requestedAt: raw?.requested_at ?? null,
        wipeAfter: raw?.wipe_after ?? null,
        blockers: raw?.blockers ?? [],
      };
    },
  });
}

export function useRequestAccountClosure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reason: string) => {
      const raw = await untypedRpc<RawRequest>("request_account_closure", { p_reason: reason || null });
      return { ok: !!raw.ok, wipeAfter: raw.wipe_after ?? null, blockers: raw.blockers ?? [] };
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCancelAccountClosure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => !!(await untypedRpc<boolean>("cancel_account_closure", {})),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** "21 October 2026" in SAST. */
export function closingDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  });
}
