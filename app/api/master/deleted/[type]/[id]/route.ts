import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logRestore, restoreFields } from "@/lib/deletion";

const schema = z.object({ confirmation: z.literal("RESTORE") });

export async function PATCH(request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "MASTER_ADMIN") return NextResponse.json({ error: "Master Admin access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Type RESTORE to confirm." }, { status: 400 });
  const { type, id } = await params;
  let name = "record";
  let restored = false;
  if (type === "OWNER" || type === "TENANT") {
    const role = type === "OWNER" ? "ADMIN" : "TENANT";
    const row = await prisma.user.findFirst({ where: { id, role, isDeleted: true }, select: { name: true } });
    if (row) { name = row.name; await prisma.user.update({ where: { id }, data: { ...restoreFields, status: "ACTIVE" } }); restored = true; }
  } else if (type === "PROPERTY") {
    const row = await prisma.property.findFirst({ where: { id, isDeleted: true }, select: { name: true } });
    if (row) { name = row.name; await prisma.property.update({ where: { id }, data: restoreFields }); restored = true; }
  } else if (type === "RENT_RECORD") {
    const row = await prisma.rentRecord.findFirst({ where: { id, isDeleted: true }, include: { tenant: { select: { name: true } } } });
    if (row) { name = `${row.tenant.name}'s rent`; await prisma.rentRecord.update({ where: { id }, data: restoreFields }); restored = true; }
  } else if (type === "UTILITY_BILL") {
    const row = await prisma.utilityBill.findFirst({ where: { id, isDeleted: true }, include: { tenant: { select: { name: true } } } });
    if (row) { name = `${row.tenant.name}'s utility bill`; await prisma.utilityBill.update({ where: { id }, data: restoreFields }); restored = true; }
  } else if (type === "DOCUMENT") {
    const row = await prisma.rentalDocument.findFirst({ where: { id, isDeleted: true }, include: { tenant: { select: { name: true } } } });
    if (row) { name = `${row.tenant.name}'s document`; await prisma.rentalDocument.update({ where: { id }, data: restoreFields }); restored = true; }
  } else if (type === "COMPLAINT") {
    const row = await prisma.complaint.findFirst({ where: { id, isDeleted: true }, select: { title: true } });
    if (row) { name = row.title; await prisma.complaint.update({ where: { id }, data: restoreFields }); restored = true; }
  } else if (type === "RENT_RECEIPT") {
    const row = await prisma.rentReceipt.findFirst({ where: { id, isDeleted: true }, select: { receiptNumber: true } });
    if (row) { name = row.receiptNumber; await prisma.rentReceipt.update({ where: { id }, data: restoreFields }); restored = true; }
  } else if (type === "NOTICE") {
    const row = await prisma.notice.findFirst({ where: { id, isDeleted: true }, select: { title: true } });
    if (row) { name = row.title; await prisma.notice.update({ where: { id }, data: restoreFields }); restored = true; }
  } else if (type === "SUPPORT_REPORT") {
    const row = await prisma.supportRequest.findFirst({ where: { id, isDeleted: true }, select: { issueType: true } });
    if (row) { name = row.issueType; await prisma.supportRequest.update({ where: { id }, data: restoreFields }); restored = true; }
  }
  if (!restored) return NextResponse.json({ error: "Deleted record not found." }, { status: 404 });
  await logRestore(user, { id, type, name });
  return NextResponse.json({ ok: true });
}
