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

/** One link with its performance, from the share_link_stats RPC (migration 0028). */
export interface ShareLinkRow {
  link_id: string;
  code: string;
  listing_id: string;
  listing_title: string;
  created_by: string;
  kind: "host" | "guest";
  channel: ShareChannel | "email";
  clicks: number;
  last_clicked_at: string | null;
  created_at: string;
  /** Paid bookings (confirmed / completed / no-show) credited to this link. */
  bookings: number;
  /** Ticket sales in ZAR cents — null when the viewer can't see payouts. */
  sales_cents: number | null;
}

export const shortUrl = (code: string) => SHORT_LINK_BASE + code;

const keys = {
  all: ["share-links"] as const,
  host: (hostId: string, listingId?: string) => ["share-links", hostId, listingId ?? "all"] as const,
};

// share_link_stats / get_share_link aren't in the generated types yet. Call
// through the client (not a detached `supabase.rpc`) so `this` stays bound.
function rpc<T>(fn: string, args: Record<string, unknown>) {
  return (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: T | null; error: Error | null }>;
  }).rpc(fn, args);
}

/**
 * Every link for a Spot (optionally one listing) with clicks, bookings and
 * sales — the team's channel links and guests' referral links.
 */
export function useShareLinks(hostId: string | null | undefined, listingId?: string) {
  return useQuery<ShareLinkRow[]>({
    queryKey: keys.host(hostId ?? "", listingId),
    enabled: !!hostId,
    queryFn: async () => {
      const { data, error } = await rpc<ShareLinkRow[]>("share_link_stats", {
        p_host_id: hostId,
        p_listing_id: listingId ?? null,
      });
      if (error) throw error;
      return data ?? [];
    },
    // Clicks trickle in while a host is promoting — keep the numbers fresh.
    refetchInterval: 30_000,
  });
}

export interface ShareTotals {
  hostClicks: number;
  hostBookings: number;
  guestClicks: number;
  guestBookings: number;
  guestSharers: number;
  bookings: number;
  /** null when the viewer can't see payouts. */
  salesCents: number | null;
}

export function summarizeShareLinks(links: ShareLinkRow[]): ShareTotals {
  const t: ShareTotals = {
    hostClicks: 0,
    hostBookings: 0,
    guestClicks: 0,
    guestBookings: 0,
    guestSharers: 0,
    bookings: 0,
    salesCents: null,
  };
  const sharers = new Set<string>();
  for (const l of links) {
    if (l.kind === "host") {
      t.hostClicks += l.clicks;
      t.hostBookings += l.bookings;
    } else {
      t.guestClicks += l.clicks;
      t.guestBookings += l.bookings;
      sharers.add(l.created_by);
    }
    t.bookings += l.bookings;
    if (l.sales_cents != null) t.salesCents = (t.salesCents ?? 0) + l.sales_cents;
  }
  t.guestSharers = sharers.size;
  return t;
}

/** Mint (or fetch — the RPC is idempotent) the acting user's link for a channel. */
export function useMintShareLink(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (channel: ShareChannel): Promise<{ id: string; code: string }> => {
      const { data, error } = await rpc<{ id: string; code: string }>("get_share_link", {
        p_listing_id: listingId,
        p_channel: channel,
        p_kind: "host",
      });
      if (error) throw error;
      if (!data) throw new Error("Could not create share link.");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
