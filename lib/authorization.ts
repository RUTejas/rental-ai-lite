import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "@/lib/auth";

export type AppRole = SessionUser["role"];

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

export async function getCurrentUserRole() {
  return (await getCurrentUser())?.role || null;
}

export async function requireRole(allowedRoles: AppRole[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) redirect("/unauthorized");
  return user;
}

export function requireOwnershipOrMasterAdmin(user: SessionUser, ownerId: string) {
  if (user.role !== "MASTER_ADMIN" && user.id !== ownerId) {
    throw new Error("FORBIDDEN");
  }
}
