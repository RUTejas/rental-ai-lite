import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deletionFields, logDeletion, readDeletionRequest } from "@/lib/deletion";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email()
});

async function ownedTenant(id: string, adminId: string) {
  return prisma.user.findFirst({ where: { id, adminId, role: "TENANT", isDeleted: false }, select: { id: true, name: true } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { id } = await params;
  if (!(await ownedTenant(id, user.id))) return NextResponse.json({ error: "Tenant not found in your account." }, { status: 404 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid name and email." }, { status: 400 });
  const tenant = await prisma.user.update({
    where: { id },
    data: { name: parsed.data.name, email: parsed.data.email.toLowerCase() },
    select: { id: true, name: true, email: true }
  });
  return NextResponse.json({ tenant });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MASTER_ADMIN"].includes(user.role)) return NextResponse.json({ error: "Owner or Master Admin access required." }, { status: 403 });
  const { id } = await params;
  const tenant = user.role === "MASTER_ADMIN"
    ? await prisma.user.findFirst({ where: { id, role: "TENANT", isDeleted: false }, select: { id: true, name: true } })
    : await ownedTenant(id, user.id);
  if (!tenant) return NextResponse.json({ error: "Tenant not found in your account." }, { status: 404 });
  const parsed = await readDeletionRequest(request);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  await prisma.user.update({ where: { id }, data: { ...deletionFields(user, parsed.data.reason), status: "BLOCKED" } });
  await prisma.userSession.updateMany({ where: { userId: id, isOnline: true }, data: { isOnline: false, logoutAt: new Date() } });
  await logDeletion(user, { id, type: "TENANT", name: tenant.name }, parsed.data.reason);
  return NextResponse.json({ ok: true });
}
