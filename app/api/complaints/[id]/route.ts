import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

const schema = z.object({ status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "REJECTED"]), ownerNote: z.string().max(2000).optional().nullable() });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(); if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Choose a valid complaint status." }, { status: 400 });
  const { id } = await params; const existing = await prisma.complaint.findFirst({ where: { id, ownerId: user.id } }); if (!existing) return NextResponse.json({ error: "Complaint not found in your account." }, { status: 404 });
  const complaint = await prisma.complaint.update({ where: { id }, data: { status: parsed.data.status, ownerNote: parsed.data.ownerNote?.trim() || null }, include: { tenant: { select: { id: true, name: true, email: true } }, owner: { select: { id: true, name: true, email: true } } } });
  await prisma.notification.create({ data: { userId: complaint.tenantId, title: "Complaint status updated", message: `${complaint.title} is now ${complaint.status.toLowerCase().replaceAll("_", " ")}.`, type: "COMPLAINT" } });
  await logActivity({ actorId: user.id, actorRole: user.role, action: "COMPLAINT_UPDATED", targetId: complaint.id, targetType: "COMPLAINT", description: `${user.name} set ${complaint.tenant.name}'s complaint to ${complaint.status.toLowerCase()}.` });
  return NextResponse.json({ complaint });
}
