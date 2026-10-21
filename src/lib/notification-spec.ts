import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  ClipboardEdit,
  RotateCcw,
  UserPlus,
} from "lucide-react";

import type { Notification } from "@/lib/database.types";

/**
 * How each notification type reads in the Inbox. Types and payloads come from the
 * database (notify_new_guest, notify_new_follower, request_refund, HQ moderation);
 * anything else falls back to the payload's own title/message.
 */
export interface NotificationView {
  title: string;
  message: string;
  icon: LucideIcon;
  tone: "primary" | "success" | "warning" | "danger";
  link?: { to: string; params?: Record<string, string>; label: string };
}

type Payload = Record<string, unknown>;

const str = (p: Payload, key: string) =>
  typeof p[key] === "string" ? (p[key] as string) : undefined;
const num = (p: Payload, key: string) =>
  typeof p[key] === "number" ? (p[key] as number) : undefined;

function listingLink(p: Payload, label: string, bookings = false): NotificationView["link"] {
  const listingId = str(p, "listing_id");
  if (!listingId) return undefined;
  return bookings
    ? { to: "/listings/$listingId/bookings", params: { listingId }, label }
    : { to: "/listings/$listingId", params: { listingId }, label };
}

const SPECS: Record<string, (p: Payload) => NotificationView> = {
  new_guest: (p) => {
    const size = num(p, "party_size") ?? 1;
    const title = str(p, "listing_title");
    return {
      title: "New booking",
      message: `${size} ${size === 1 ? "guest" : "guests"} booked${title ? ` “${title}”` : " your listing"}.`,
      icon: CalendarCheck,
      tone: "success",
      link: listingLink(p, "View bookings", true),
    };
  },
  new_follower: () => ({
    title: "New follower",
    message: "Someone started following your Spot. They'll hear about your next listing.",
    icon: UserPlus,
    tone: "primary",
    link: { to: "/audience", label: "View audience" },
  }),
  refund_requested: (p) => ({
    title: str(p, "title") ?? "A guest cancelled",
    message: str(p, "message") ?? "A guest asked to cancel their booking.",
    icon: RotateCcw,
    tone: "warning",
  }),
  listing_rejected: (p) => ({
    title: str(p, "title") ?? "Listing not approved",
    message: str(p, "message") ?? "TROVE didn't approve this listing.",
    icon: AlertTriangle,
    tone: "danger",
    link: listingLink(p, "Edit listing"),
  }),
  listing_changes_requested: (p) => ({
    title: str(p, "title") ?? "Changes needed on your listing",
    message: str(p, "message") ?? "TROVE asked for changes to this listing.",
    icon: ClipboardEdit,
    tone: "warning",
    link: listingLink(p, "Edit listing"),
  }),
};

function humanize(type: string) {
  const words = type.replace(/_/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : "Update";
}

export function notificationView(n: Pick<Notification, "type" | "payload">): NotificationView {
  const payload = (
    n.payload && typeof n.payload === "object" && !Array.isArray(n.payload) ? n.payload : {}
  ) as Payload;
  const spec = SPECS[n.type];
  if (spec) return spec(payload);
  return {
    title: str(payload, "title") ?? humanize(n.type),
    message: str(payload, "message") ?? "",
    icon: Bell,
    tone: "primary",
  };
}
