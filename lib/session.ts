import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  canAccess,
  isAdminRole,
  isSuperAdmin,
  type AdminSection,
} from "@/lib/permissions";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireCustomer() {
  const s = await getSession();
  if (!s?.user) redirect("/login");
  return s;
}

export async function requireAdmin() {
  const s = await getSession();
  if (!s?.user) redirect("/login");
  if (!isAdminRole(s.user.role)) redirect("/dashboard");
  return s;
}

export async function requireSuperAdmin() {
  const s = await requireAdmin();
  if (!isSuperAdmin(s.user.role)) redirect("/admin");
  return s;
}

export async function requireSection(section: AdminSection) {
  const s = await requireAdmin();
  if (!canAccess(s.user.role, section)) redirect("/admin");
  return s;
}
