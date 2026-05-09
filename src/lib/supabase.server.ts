// Server-side Supabase client factory for TanStack Start route loaders,
// server functions, and Cloudflare Workers.
//
// Pass the request's cookie reader and a setter that appends to the response
// headers. The factory wires @supabase/ssr to use those instead of
// document.cookie or localStorage — required by PRD §7.2.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "./database.types";

export interface CookieAdapter {
  get(name: string): string | undefined;
  set(name: string, value: string, options: CookieOptions): void;
  remove(name: string, options: CookieOptions): void;
}

interface NodeProcessLike {
  env?: Record<string, string | undefined>;
}

export function createServerSupabase(cookies: CookieAdapter) {
  const proc = (globalThis as { process?: NodeProcessLike }).process;
  const url = proc?.env?.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
  const key = proc?.env?.SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY for server client");
  }

  return createServerClient<Database>(url, key, {
    cookies: {
      get: (name) => cookies.get(name),
      set: (name, value, options) => cookies.set(name, value, options),
      remove: (name, options) => cookies.remove(name, options),
    },
  });
}
