// Browser-side Supabase client.
// Uses @supabase/ssr's createBrowserClient so sessions persist in cookies
// (not localStorage). Required for Cloudflare Workers + TanStack Start SSR
// per PRD §7.2.
//
// For server-side use (route loaders, edge functions), import
// createServerSupabase from ./supabase.server.ts instead.

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
}

export const supabase = createBrowserClient<Database>(url, key);
