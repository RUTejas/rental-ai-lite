import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { billInclude, serializeBill } from "@/lib/bills";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

const tenantUpdateSchema = z.object({
  tenantPaymentStatus: z.enum(["TENANT_MARKED_PAID", "TENANT_MARKED_NOT_PAID"]),
  tenantNote: z.string().max(1000).optional().nullable()
});

const adminUpdateSchema = z.object({
  adminVerificationStatus: z.enum([
    "VERIFIED_PAID",
    "UNPAID",
    "OVERDUE",
    "WAIVED",
    "REJECTED_CLAIM"
  ]),
  adminNote: z.string().max(1000).optional().nullable()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (user.role === "MASTER_ADMIN") {
    return NextResponse.json(
      { error: "Master Admin has view-only access to owner verification records." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const { id } = await params;
  const bill = await prisma.utilityBill.findUnique({ where: { id } });
  if (!bill) return NextResponse.json({ error: "Bill not found." }, { status: 404 });

  if (user.role === "TENANT") {
    if (bill.tenantId !== user.id) {
      return NextResponse.json({ error: "You can update only your own bills." }, { status: 403 });
    }
    const parsed = tenantUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Choose a valid payment status." }, { status: 400 });
    }
    const updated = await prisma.utilityBill.update({
      where: { id: bill.id },
      data: {
        tenantPaymentStatus: parsed.data.tenantPaymentStatus,
        tenantMarkedAt: new Date(),
        tenantNote: parsed.data.tenantNote?.trim() || null
      },
      include: billInclude
    });
    await logActivity({ actorId: user.id, actorRole: user.role, action: "PAYMENT_MARKED", targetId: bill.id, targetType: "UTILITY_BILL", description: `${user.name} marked a ${bill.billType.toLowerCase()} bill ${parsed.data.tenantPaymentStatus === "TENANT_MARKED_PAID" ? "paid" : "not paid"}.` });
    return NextResponse.json({ bill: serializeBill(updated) });
  }

  if (bill.adminId !== user.id) {
    return NextResponse.json(
      { error: "You can verify only bills belonging to your tenants." },
      { status: 403 }
    );
  }
  const parsed = adminUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid verification status." }, { status: 400 });
  }
  const updated = await prisma.utilityBill.update({
    where: { id: bill.id },
    data: {
      adminVerificationStatus: parsed.data.adminVerificationStatus,
      adminVerifiedAt: new Date(),
      adminNote: parsed.data.adminNote?.trim() || null
    },
    include: billInclude
  });
  await prisma.notification.create({ data: { userId: bill.tenantId, title: "Bill verification updated", message: `Your ${bill.billType.toLowerCase()} bill is now ${parsed.data.adminVerificationStatus.toLowerCase().replaceAll("_", " ")}.`, type: "PAYMENT_VERIFICATION" } });
  await logActivity({ actorId: user.id, actorRole: user.role, action: parsed.data.adminVerificationStatus === "REJECTED_CLAIM" ? "PAYMENT_REJECTED" : "PAYMENT_VERIFIED", targetId: bill.id, targetType: "UTILITY_BILL", description: `${user.name} set a utility bill to ${parsed.data.adminVerificationStatus.toLowerCase()}.` });
  return NextResponse.json({ bill: serializeBill(updated) });
}
