import type { LucideIcon } from "lucide-react";
import {
  BedDouble,
  Bell,
  Building2,
  CalendarDays,
  LayoutDashboard,
  ScanLine,
  Settings,
  Sparkles,
  Star,
  Store,
  Wallet,
} from "lucide-react";
import type { HostType, KycStatus, ListingType } from "./database.types";

export interface HostWorkspaceConfig {
  hostType: HostType;
  label: string;
  singularLabel: string;
  shortLabel: string;
  listingType: ListingType;
  bookingModeLabel: string;
  inventoryLabel: string;
  scannerLabel: string;
  profileLabel: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  emptyStateTitle: string;
  emptyStateBody: string;
  categoryRoots: string[];
  nav: Array<{
    to: string;
    label: string;
    icon: LucideIcon;
  }>;
}

export const HOST_TO_LISTING_TYPE: Record<HostType, ListingType> = {
  venue: "venue",
  organiser: "event",
  experience: "experience",
  accommodation: "accommodation",
};

const SHARED_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/scanner", label: "Scanner", icon: ScanLine },
  { to: "/payouts", label: "Payouts", icon: Wallet },
  { to: "/reviews", label: "Reviews", icon: Star },
  { to: "/notifications", label: "Inbox", icon: Bell },
  { to: "/profile", label: "Profile", icon: Store },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const WORKSPACES: Record<HostType, HostWorkspaceConfig> = {
  organiser: {
    hostType: "organiser",
    label: "Event organiser",
    singularLabel: "Event",
    shortLabel: "Events",
    listingType: "event",
    bookingModeLabel: "Ticketing",
    inventoryLabel: "Ticket tiers",
    scannerLabel: "Entry desk",
    profileLabel: "Organiser profile",
    heroEyebrow: "Tickets-based workspace",
    heroTitle: "Run the show without the clutter",
    heroSubtitle:
      "Everything here is tuned for fixed-date events, ticket drops, audience flow, and launch readiness.",
    emptyStateTitle: "Create your first event",
    emptyStateBody:
      "Build a real event record, add live ticket tiers, and keep the organiser workspace focused on what sells seats.",
    categoryRoots: ["music", "stage", "nightlife", "activities-outdoor"],
    nav: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/listings", label: "Events", icon: CalendarDays },
      { to: "/listings/new", label: "New event", icon: Sparkles },
      ...SHARED_NAV.slice(1),
    ],
  },
  experience: {
    hostType: "experience",
    label: "Experience provider",
    singularLabel: "Experience",
    shortLabel: "Experiences",
    listingType: "experience",
    bookingModeLabel: "Sessions",
    inventoryLabel: "Availability",
    scannerLabel: "Guest desk",
    profileLabel: "Experience profile",
    heroEyebrow: "Slots-based workspace",
    heroTitle: "Sell sessions, not noise",
    heroSubtitle:
      "Your engine is narrowed to schedule design, slot inventory, and guest readiness for repeatable experiences.",
    emptyStateTitle: "Create your first experience",
    emptyStateBody:
      "Define the real experience, add your first live schedule, and keep the workspace centred on sessions and availability.",
    categoryRoots: ["adrenaline", "activities-indoor", "activities-outdoor", "getaways"],
    nav: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/listings", label: "Experiences", icon: Sparkles },
      { to: "/listings/new", label: "New experience", icon: CalendarDays },
      ...SHARED_NAV.slice(1),
    ],
  },
  accommodation: {
    hostType: "accommodation",
    label: "Accommodation host",
    singularLabel: "Stay",
    shortLabel: "Stays",
    listingType: "accommodation",
    bookingModeLabel: "Reservations",
    inventoryLabel: "Rooms",
    scannerLabel: "Front desk",
    profileLabel: "Property profile",
    heroEyebrow: "Date-range workspace",
    heroTitle: "Keep the property operation clear",
    heroSubtitle:
      "This view stays focused on rooms, reservation readiness, property positioning, and operational confidence.",
    emptyStateTitle: "Create your first stay",
    emptyStateBody:
      "List the real property, define room types, and keep the accommodation workspace centred on reservations instead of event tools.",
    categoryRoots: ["getaways"],
    nav: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/listings", label: "Stays", icon: BedDouble },
      { to: "/listings/new", label: "New stay", icon: CalendarDays },
      ...SHARED_NAV.slice(1),
    ],
  },
  venue: {
    hostType: "venue",
    label: "Venue operator",
    singularLabel: "Space",
    shortLabel: "Spaces",
    listingType: "venue",
    bookingModeLabel: "Bookings",
    inventoryLabel: "Availability",
    scannerLabel: "Door desk",
    profileLabel: "Venue profile",
    heroEyebrow: "Venue hub workspace",
    heroTitle: "Present the space with intention",
    heroSubtitle:
      "This workspace stays grounded in the venue itself so partners see the space, capacity, availability, and operating context first.",
    emptyStateTitle: "Create your first venue listing",
    emptyStateBody:
      "Shape the real venue profile, outline what the space can host, and keep the venue workspace free from unrelated host flows.",
    categoryRoots: ["nightlife", "food", "stage", "getaways"],
    nav: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/listings", label: "Spaces", icon: Building2 },
      { to: "/listings/new", label: "New space", icon: CalendarDays },
      ...SHARED_NAV.slice(1),
    ],
  },
};

export function getHostWorkspace(hostType?: HostType | null) {
  return WORKSPACES[hostType ?? "venue"];
}

export function getVerificationCopy(kycStatus: KycStatus | null | undefined) {
  switch (kycStatus) {
    case "verified":
      return {
        label: "Verified",
        tone: "success" as const,
        message: "Live publishing is unlocked across this workspace.",
      };
    case "submitted":
      return {
        label: "Pending review",
        tone: "warning" as const,
        message: "You can keep building drafts while Trove reviews the account.",
      };
    case "rejected":
      return {
        label: "Action needed",
        tone: "destructive" as const,
        message: "Update the business details before anything can go live again.",
      };
    default:
      return {
        label: "Not verified",
        tone: "muted" as const,
        message: "Finish verification to move listings from draft to live.",
      };
  }
}
