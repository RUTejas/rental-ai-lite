import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

const schema = z.object({ title: z.string().trim().min(3).max(120), category: z.enum(["WATER", "ELECTRICITY", "ROOM_REPAIR", "CLEANING", "INTERNET", "MAINTENANCE", "OTHER"]), description: z.string().trim().min(10).max(2000), priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM") });

export async function GET() {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const where = user.role === "MASTER_ADMIN" ? {} : user.role === "ADMIN" ? { ownerId: user.id } : { tenantId: user.id };
  const complaints = await prisma.complaint.findMany({ where: { ...where, isDeleted: false }, include: { tenant: { select: { id: true, name: true, email: true } }, owner: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ complaints });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(); if (!user || user.role !== "TENANT") return NextResponse.json({ error: "Tenant access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Enter a title, category, priority, and clear description." }, { status: 400 });
  const tenant = await prisma.user.findUnique({ where: { id: user.id }, select: { adminId: true } }); if (!tenant?.adminId) return NextResponse.json({ error: "Your account is not linked to an owner." }, { status: 400 });
  const complaint = await prisma.complaint.create({ data: { ...parsed.data, tenantId: user.id, ownerId: tenant.adminId }, include: { tenant: { select: { id: true, name: true, email: true } }, owner: { select: { id: true, name: true, email: true } } } });
  await prisma.notification.create({ data: { userId: tenant.adminId, title: "New tenant complaint", message: `${user.name} raised: ${complaint.title}`, type: "COMPLAINT" } });
  await logActivity({ actorId: user.id, actorRole: user.role, action: "COMPLAINT_CREATED", targetId: complaint.id, targetType: "COMPLAINT", description: `${user.name} raised a ${complaint.category.toLowerCase()} complaint.` });
  return NextResponse.json({ complaint }, { status: 201 });
}
