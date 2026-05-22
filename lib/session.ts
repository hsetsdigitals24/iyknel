import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

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
  if (s.user.role !== "ADMIN") redirect("/dashboard");
  return s;
}
