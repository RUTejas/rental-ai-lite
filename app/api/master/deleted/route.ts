import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "MASTER_ADMIN") return NextResponse.json({ error: "Master Admin access required." }, { status: 403 });

  const [users, properties, rents, bills, documents, complaints, receipts, notices, reports] = await Promise.all([
    prisma.user.findMany({ where: { isDeleted: true }, select: { id: true, name: true, role: true, deletedAt: true, deletedByRole: true, deleteReason: true } }),
    prisma.property.findMany({ where: { isDeleted: true }, select: { id: true, name: true, deletedAt: true, deletedByRole: true, deleteReason: true } }),
    prisma.rentRecord.findMany({ where: { isDeleted: true }, include: { tenant: { select: { name: true } } } }),
    prisma.utilityBill.findMany({ where: { isDeleted: true }, include: { tenant: { select: { name: true } } } }),
    prisma.rentalDocument.findMany({ where: { isDeleted: true }, include: { tenant: { select: { name: true } } } }),
    prisma.complaint.findMany({ where: { isDeleted: true } }),
    prisma.rentReceipt.findMany({ where: { isDeleted: true }, include: { tenant: { select: { name: true } } } }),
    prisma.notice.findMany({ where: { isDeleted: true } }),
    prisma.supportRequest.findMany({ where: { isDeleted: true } })
  ]);

  const record = (type: string, row: { id: string; deletedAt: Date | null; deletedByRole: string | null; deleteReason: string | null }, name: string) => ({
    type, id: row.id, name, deletedAt: row.deletedAt?.toISOString() || null, deletedByRole: row.deletedByRole, deleteReason: row.deleteReason
  });
  const deleted = [
    ...users.filter((item) => item.role !== "MASTER_ADMIN").map((item) => record(item.role === "ADMIN" ? "OWNER" : "TENANT", item, item.name)),
    ...properties.map((item) => record("PROPERTY", item, item.name)),
    ...rents.map((item) => record("RENT_RECORD", item, `${item.tenant.name}'s ${item.billingMonth}/${item.billingYear} rent`)),
    ...bills.map((item) => record("UTILITY_BILL", item, `${item.tenant.name}'s ${item.billType.toLowerCase()} bill`)),
    ...documents.map((item) => record("DOCUMENT", item, `${item.tenant.name}'s ${item.kind === "ID_PROOF" ? "ID proof" : "agreement"}`)),
    ...complaints.map((item) => record("COMPLAINT", item, item.title)),
    ...receipts.map((item) => record("RENT_RECEIPT", item, `${item.receiptNumber} for ${item.tenant.name}`)),
    ...notices.map((item) => record("NOTICE", item, item.title)),
    ...reports.map((item) => record("SUPPORT_REPORT", item, `${item.issueType} report from ${item.email}`))
  ].sort((a, b) => (b.deletedAt || "").localeCompare(a.deletedAt || ""));
  return NextResponse.json({ deleted });
}
