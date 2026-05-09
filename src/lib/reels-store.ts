// Trove Story Studio — reel metadata in localStorage, video blobs in IndexedDB.
import { useEffect, useState } from "react";
import { delBlob } from "./idb";

export const REEL_TTL_MS = 48 * 60 * 60 * 1000;
export const MAX_ACTIVE_REELS = 10;

export type ReelLayer =
  | { kind: "title"; text: string; color: string }
  | { kind: "subtitle"; text: string; color: string }
  | { kind: "cta"; text: string }
  | { kind: "price"; text: string }
  | { kind: "location"; text: string };

export type Reel = {
  id: string;
  spotName: string;
  listingId?: string;
  baseImage: string; // dataURL or asset path
  thumbnail: string; // dataURL
  videoBlobKey?: string; // IndexedDB key once exported
  durationMs: number;
  layers: ReelLayer[];
  status: "draft" | "published";
  createdAt: number;
  publishedAt?: number;
  expiresAt?: number;
};

const KEY = "trove_reels_v1";

function read(): Reel[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
function write(r: Reel[]) {
  localStorage.setItem(KEY, JSON.stringify(r));
  window.dispatchEvent(new CustomEvent("trove-reels"));
}

export function getReels(): Reel[] {
  return read();
}

export function saveReel(r: Reel) {
  const all = read();
  const i = all.findIndex((x) => x.id === r.id);
  if (i >= 0) all[i] = r;
  else all.unshift(r);
  write(all);
}

export async function deleteReel(id: string) {
  const all = read();
  const r = all.find((x) => x.id === id);
  if (r?.videoBlobKey) {
    try {
      await delBlob(r.videoBlobKey);
    } catch {
      // blob may already be gone; deletion is best-effort
    }
  }
  write(all.filter((x) => x.id !== id));
}

export function activeReels(reels: Reel[]): Reel[] {
  const now = Date.now();
  return reels.filter((r) => r.status === "published" && (r.expiresAt ?? 0) > now);
}

export function publishReel(id: string): { ok: boolean; reason?: string } {
  const all = read();
  const r = all.find((x) => x.id === id);
  if (!r) return { ok: false, reason: "Reel not found" };
  if (activeReels(all).length >= MAX_ACTIVE_REELS && r.status !== "published") {
    return {
      ok: false,
      reason: `You're at the ${MAX_ACTIVE_REELS}-reel limit. Wait for one to expire or delete one.`,
    };
  }
  r.status = "published";
  r.publishedAt = Date.now();
  r.expiresAt = r.publishedAt + REEL_TTL_MS;
  write(all);
  return { ok: true };
}

export function unpublishReel(id: string) {
  const all = read();
  const r = all.find((x) => x.id === id);
  if (!r) return;
  r.status = "draft";
  r.publishedAt = undefined;
  r.expiresAt = undefined;
  write(all);
}

export function useReels() {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((n) => n + 1);
    window.addEventListener("trove-reels", fn);
    // re-render every 60s for countdowns
    const t = setInterval(fn, 60_000);
    return () => {
      window.removeEventListener("trove-reels", fn);
      clearInterval(t);
    };
  }, []);
  return read();
}

export function timeLeft(r: Reel): string {
  if (!r.expiresAt) return "—";
  const ms = r.expiresAt - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 1) return `${h}h ${m}m left`;
  return `${m}m left`;
}
