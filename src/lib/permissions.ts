// Team permission catalogue — single source of truth for the granular rights a
// Spot owner can grant team members, the "department" groupings shown in the UI,
// and the preset → default-permission mapping.
//
// The DB stores each member's resolved effective permission set as `text[]`
// (host_team_members.permissions). RLS checks `'key' = ANY(permissions)` via the
// team_can() helper (migration 0018). The owner is implicit and always has ALL.

import type { TeamRole } from "./database.types";

// ---------------------------------------------------------------------------
// Permission keys
// ---------------------------------------------------------------------------

export const PERMISSION_KEYS = [
  "listings.manage",
  "calendar.manage",
  "bookings.view",
  "bookings.manage",
  "scanner.use",
  "audience.manage",
  "reviews.manage",
  "payouts.view",
  "payouts.manage",
  "team.manage",
  "settings.manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export interface PermissionMeta {
  key: PermissionKey;
  label: string;
  description: string;
}

export interface PermissionDepartment {
  id: string;
  label: string;
  blurb: string;
  permissions: PermissionMeta[];
}

// Grouped for the invite / edit dialog. Order here is the display order.
export const PERMISSION_DEPARTMENTS: PermissionDepartment[] = [
  {
    id: "operations",
    label: "Operations",
    blurb: "Listings, schedule and the door.",
    permissions: [
      {
        key: "listings.manage",
        label: "Manage listings",
        description: "Create, edit and publish listings, tickets and inventory.",
      },
      {
        key: "calendar.manage",
        label: "Manage calendar",
        description: "Open, edit and close availability slots.",
      },
      {
        key: "bookings.view",
        label: "View bookings",
        description: "See bookings, guests and ticket lists.",
      },
      {
        key: "bookings.manage",
        label: "Manage bookings",
        description: "Check guests in and update booking status.",
      },
      {
        key: "scanner.use",
        label: "Use door scanner",
        description: "Scan tickets at the entrance.",
      },
    ],
  },
  {
    id: "audience",
    label: "Audience",
    blurb: "Followers, guests and reputation.",
    permissions: [
      {
        key: "audience.manage",
        label: "Manage audience",
        description: "View the CRM, guest profiles and private notes.",
      },
      {
        key: "reviews.manage",
        label: "Manage reviews",
        description: "Read and respond to reviews.",
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    blurb: "Money in and money out.",
    permissions: [
      {
        key: "payouts.view",
        label: "View payouts & reports",
        description: "See payouts, payments, refunds and revenue.",
      },
      {
        key: "payouts.manage",
        label: "Manage banking",
        description: "Edit the payout bank account.",
      },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    blurb: "Team and workspace settings.",
    permissions: [
      {
        key: "team.manage",
        label: "Manage team",
        description: "Invite, edit and remove team members.",
      },
      {
        key: "settings.manage",
        label: "Manage settings",
        description: "Edit the spot profile and workspace settings.",
      },
    ],
  },
];

export const ALL_PERMISSIONS: PermissionKey[] = [...PERMISSION_KEYS];

// ---------------------------------------------------------------------------
// Role presets → default permission sets
// ---------------------------------------------------------------------------

export const ROLE_PRESETS: Record<TeamRole, PermissionKey[]> = {
  admin: [...PERMISSION_KEYS],
  manager: [
    "listings.manage",
    "calendar.manage",
    "bookings.view",
    "bookings.manage",
    "scanner.use",
    "audience.manage",
    "reviews.manage",
    "settings.manage",
  ],
  finance: ["payouts.view", "payouts.manage", "bookings.view"],
  scanner: ["scanner.use", "bookings.view"],
};

export const ROLE_META: Record<TeamRole, { label: string; blurb: string }> = {
  admin: { label: "Admin", blurb: "Full access, including team and settings." },
  manager: {
    label: "Manager",
    blurb: "Runs listings, bookings, audience and the door — no finance.",
  },
  finance: { label: "Finance", blurb: "Payouts, reports and banking only." },
  scanner: { label: "Scanner", blurb: "Door scan and guest lists only." },
};

export const TEAM_ROLES: TeamRole[] = ["admin", "manager", "finance", "scanner"];

/** Default effective permission set for a preset role. */
export function permissionsForRole(role: TeamRole): PermissionKey[] {
  return [...ROLE_PRESETS[role]];
}

const PERMISSION_LABELS: Record<PermissionKey, string> = Object.fromEntries(
  PERMISSION_DEPARTMENTS.flatMap((d) => d.permissions.map((p) => [p.key, p.label])),
) as Record<PermissionKey, string>;

export function permissionLabel(key: string): string {
  return PERMISSION_LABELS[key as PermissionKey] ?? key;
}

/** True when `permissions` (resolved set) grants `key`. */
export function hasPermission(
  permissions: readonly string[] | null | undefined,
  key: PermissionKey,
) {
  return !!permissions && permissions.includes(key);
}
