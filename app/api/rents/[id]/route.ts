import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rentInclude, serializeRent } from "@/lib/rental";
import { logActivity } from "@/lib/audit";

const tenantSchema = z.object({ tenantPaymentStatus: z.enum(["TENANT_MARKED_PAID", "TENANT_MARKED_NOT_PAID"]), tenantNote: z.string().max(1000).optional().nullable() });
const adminSchema = z.object({ adminVerificationStatus: z.enum(["VERIFIED_PAID", "UNPAID", "OVERDUE", "WAIVED", "REJECTED_CLAIM"]), adminNote: z.string().max(1000).optional().nullable() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role === "MASTER_ADMIN") return NextResponse.json({ error: "This action is not allowed." }, { status: 403 });
  const { id } = await params; const body = await request.json().catch(() => null);
  const record = await prisma.rentRecord.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "Rent record not found." }, { status: 404 });
  if (user.role === "TENANT") {
    if (record.tenantId !== user.id) return NextResponse.json({ error: "You can update only your rent." }, { status: 403 });
    const parsed = tenantSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: "Choose a valid rent status." }, { status: 400 });
    const updated = await prisma.rentRecord.update({ where: { id }, data: { tenantPaymentStatus: parsed.data.tenantPaymentStatus, tenantMarkedAt: new Date(), tenantNote: parsed.data.tenantNote?.trim() || null, adminVerificationStatus: "PENDING" }, include: rentInclude });
    await logActivity({ actorId: user.id, actorRole: user.role, action: "RENT_MARKED", targetId: record.id, targetType: "RENT_RECORD", description: `${user.name} updated their rent payment claim.` });
    return NextResponse.json({ rent: serializeRent(updated) });
  }
  if (record.adminId !== user.id) return NextResponse.json({ error: "You can verify only your tenant records." }, { status: 403 });
  const parsed = adminSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: "Choose a valid verification status." }, { status: 400 });
  const updated = await prisma.rentRecord.update({ where: { id }, data: { adminVerificationStatus: parsed.data.adminVerificationStatus, adminVerifiedAt: new Date(), adminNote: parsed.data.adminNote?.trim() || null }, include: rentInclude });
  await logActivity({ actorId: user.id, actorRole: user.role, action: parsed.data.adminVerificationStatus === "REJECTED_CLAIM" ? "RENT_REJECTED" : "RENT_VERIFIED", targetId: record.id, targetType: "RENT_RECORD", description: `${user.name} set rent verification to ${parsed.data.adminVerificationStatus.toLowerCase()}.` });
  return NextResponse.json({ rent: serializeRent(updated) });
}
