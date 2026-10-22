// A listing's bookings, one page at a time (ENG-L03-08). The paging, counts and
// search all run in SQL (listing_guest_list, supabase 20261021200000), so a
// 5,000-guest event never loads at once and PostgREST's 1,000-row cap can't cut it.

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listingQueryKeys, untypedRpc } from "@/lib/queries";
import type { Booking } from "@/lib/database.types";

export type GuestListFilter = "all" | "going" | "checked_in" | "cancelled";

export interface GuestListRow {
  booking_id: string;
  guest_id: string;
  guest_name: string;
  phone: string | null;
  status: Booking["status"];
  party_size: number;
  total_kobo: number;
  created_at: string;
  checked_in_at: string | null;
  ticket_type: string | null;
  slot_starts_at: string | null;
  codes: string[];
}

export interface GuestListPage {
  total: number;
  counts: Record<GuestListFilter, number> & { guests: number };
  offset: number;
  limit: number;
  rows: GuestListRow[];
}

export const GUEST_LIST_PAGE_SIZE = 50;
const EXPORT_PAGE_SIZE = 500; // the RPC's maximum

function fetchPage(
  listingId: string,
  filter: GuestListFilter,
  search: string,
  offset: number,
  limit: number,
) {
  return untypedRpc<GuestListPage>("listing_guest_list", {
    p_listing: listingId,
    p_filter: filter,
    p_search: search.trim() || null,
    p_offset: offset,
    p_limit: limit,
  });
}

export function useGuestList(
  listingId: string | undefined,
  filter: GuestListFilter,
  search: string,
  page: number,
) {
  return useQuery({
    // Under listingQueryKeys.bookings, so the realtime bookings channel refreshes it.
    queryKey: [...listingQueryKeys.bookings(listingId), "guest-list", filter, search.trim(), page],
    enabled: !!listingId,
    placeholderData: keepPreviousData,
    queryFn: () =>
      fetchPage(listingId!, filter, search, page * GUEST_LIST_PAGE_SIZE, GUEST_LIST_PAGE_SIZE),
  });
}

export const STATUS_LABEL: Partial<Record<Booking["status"], string>> = {
  confirmed: "Confirmed",
  completed: "Completed",
  partially_refunded: "Part refunded",
  cancelled: "Cancelled",
  refunded: "Refunded",
  refund_requested: "Cancellation requested",
  refund_processing: "Refund processing",
  no_show: "No-show",
};

/** Every row for the current filter and search, page by page. */
export async function fetchAllGuests(listingId: string, filter: GuestListFilter, search: string) {
  const rows: GuestListRow[] = [];
  for (let offset = 0; ; offset += EXPORT_PAGE_SIZE) {
    const page = await fetchPage(listingId, filter, search, offset, EXPORT_PAGE_SIZE);
    rows.push(...page.rows);
    if (page.rows.length < EXPORT_PAGE_SIZE || rows.length >= page.total) return rows;
  }
}

// Spreadsheet apps run cells that start with = + - @ as formulas; a guest
// can choose their own name, so those get a leading apostrophe.
function csvCell(value: string | number | null | undefined) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const sast = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" }) : "";

export function guestListCsv(rows: GuestListRow[]) {
  const head = [
    "Guest",
    "Phone",
    "Status",
    "Party",
    "Ticket type",
    "Ticket codes",
    "Total (R)",
    "Booked",
    "Checked in",
    "Booking ref",
  ];
  const lines = rows.map((r) =>
    [
      r.guest_name,
      r.phone,
      STATUS_LABEL[r.status] ?? r.status,
      r.party_size,
      r.ticket_type,
      r.codes.join(" "),
      (r.total_kobo / 100).toFixed(2),
      sast(r.created_at),
      sast(r.checked_in_at),
      r.booking_id.slice(0, 8).toUpperCase(),
    ]
      .map(csvCell)
      .join(","),
  );
  // BOM so Excel opens the file as UTF-8 (names with accents, emoji).
  return "﻿" + [head.join(","), ...lines].join("\r\n");
}
