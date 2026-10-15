// Share kit data — branded short links (welovetrove.co.za/s/<code>) with
// per-channel click tracking, plus the OG card preview URL.
//
// Backend: migration 0027 (share_links, share_link_clicks, get_share_link RPC)
// and the share-redirect / og-image edge functions.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

export const SHORT_LINK_BASE = "https://www.welovetrove.co.za/s/";
export const GUEST_APP_URL = "https://trove-your-next-adventure.pages.dev";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

/** The 1200×630 card crawlers show. `v` busts caches after edits. */
export function ogImageUrl(listingId: string, version?: string) {
  const v = version ? `&v=${encodeURIComponent(version)}` : "";
  return `${SUPABASE_URL}/functions/v1/og-image?listing=${listingId}${v}`;
}

export type ShareChannel = "whatsapp" | "instagram" | "facebook" | "x" | "tiktok" | "qr" | "link";

export interface ShareLinkRow {
  id: string;
  code: string;
  listing_id: string;
  created_by: string;
  kind: "host" | "guest";
  channel: ShareChannel | "email";
  clicks: number;
  last_clicked_at: string | null;
  created_at: string;
}

export const shortUrl = (code: string) => SHORT_LINK_BASE + code;

const keys = {
  listing: (listingId: string) => ["share-links", listingId] as const,
};

/** Every link pointing at this listing — the team's channel links and guests' referral links. */
export function useShareLinks(listingId: string) {
  return useQuery<ShareLinkRow[]>({
    queryKey: keys.listing(listingId),
    queryFn: async () => {
      // share_links isn't in the generated types yet (migration 0027).
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (k: string, v: string) => Promise<{ data: ShareLinkRow[] | null; error: Error | null }>;
          };
        };
      })
        .from("share_links")
        .select("id, code, listing_id, created_by, kind, channel, clicks, last_clicked_at, created_at")
        .eq("listing_id", listingId);
      if (error) throw error;
      return data ?? [];
    },
    // Clicks trickle in while a host is promoting — keep the numbers fresh.
    refetchInterval: 30_000,
  });
}

/** Mint (or fetch — the RPC is idempotent) the acting user's link for a channel. */
export function useMintShareLink(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (channel: ShareChannel): Promise<ShareLinkRow> => {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: ShareLinkRow | null; error: Error | null }>)("get_share_link", {
        p_listing_id: listingId,
        p_channel: channel,
        p_kind: "host",
      });
      if (error) throw error;
      if (!data) throw new Error("Could not create share link.");
      return data;
    },
    onSuccess: (row) => {
      qc.setQueryData<ShareLinkRow[]>(keys.listing(listingId), (cur = []) =>
        cur.some((r) => r.id === row.id) ? cur : [...cur, row],
      );
    },
  });
}
