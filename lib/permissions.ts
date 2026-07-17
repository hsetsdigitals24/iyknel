// Central RBAC definitions for the admin back office.
//
// This module MUST stay pure (no DB, no "server-only") so it can be imported
// from the edge middleware as well as server components and actions.

import type { Role } from "@prisma/client";

export const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "MANAGER",
  "STAFF",
  "CATALOG",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminSection =
  | "overview"
  | "orders"
  | "quotes"
  | "customers"
  | "inventory"
  | "products"
  | "categories"
  | "logistics"
  | "audit"
  | "settings";

// Which sections each admin role may reach. `overview` and `settings` are
// granted to every admin (settings hosts the personal password form; the
// sensitive sub-blocks are gated separately as super-admin only).
const ROLE_SECTIONS: Record<AdminRole, AdminSection[]> = {
  SUPER_ADMIN: [
    "overview",
    "orders",
    "quotes",
    "customers",
    "inventory",
    "products",
    "categories",
    "logistics",
    "audit",
    "settings",
  ],
  MANAGER: [
    "overview",
    "orders",
    "quotes",
    "customers",
    "inventory",
    "products",
    "categories",
    "logistics",
    "audit",
    "settings",
  ],
  STAFF: ["overview", "orders", "quotes", "customers", "inventory", "settings"],
  CATALOG: ["overview", "products", "categories", "inventory", "settings"],
};

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGER: "Manager",
  STAFF: "Staff",
  CATALOG: "Catalog",
};

export function isAdminRole(role?: Role | string | null): role is AdminRole {
  // Legacy ADMIN rows (if any survive the backfill) are treated as admins.
  return role === "ADMIN" || ADMIN_ROLES.includes(role as AdminRole);
}

export function isSuperAdmin(role?: Role | string | null): boolean {
  // Legacy ADMIN retains full power for safety.
  return role === "SUPER_ADMIN" || role === "ADMIN";
}

export function canAccess(
  role: Role | string | null | undefined,
  section: AdminSection,
): boolean {
  if (isSuperAdmin(role) || role === "ADMIN") return true;
  const sections = ROLE_SECTIONS[role as AdminRole];
  return sections ? sections.includes(section) : false;
}

// Map an admin path to its section. "/admin" -> "overview";
// "/admin/orders/123" -> "orders".
export function sectionForPath(pathname: string): AdminSection {
  const rest = pathname.replace(/^\/admin\/?/, "");
  if (!rest) return "overview";
  const first = rest.split("/")[0] as AdminSection;
  const known: AdminSection[] = [
    "orders",
    "quotes",
    "customers",
    "inventory",
    "products",
    "categories",
    "logistics",
    "audit",
    "settings",
  ];
  return known.includes(first) ? first : "overview";
}
