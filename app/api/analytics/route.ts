import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const scope = user.role === "MASTER_ADMIN" ? {} : user.role === "ADMIN" ? { adminId: user.id } : { tenantId: user.id };
  const [rents, bills, documents, properties, adminCount, tenantCount, supportOpen, complaints] = await Promise.all([
    prisma.rentRecord.findMany({ where: scope, select: { billingMonth: true, billingYear: true, amount: true, tenantPaymentStatus: true, adminVerificationStatus: true, adminId: true } }),
    prisma.utilityBill.findMany({ where: scope, select: { billType: true, billingMonth: true, billingYear: true, amount: true, tenantPaymentStatus: true, adminVerificationStatus: true, adminId: true } }),
    prisma.rentalDocument.findMany({ where: scope, select: { kind: true, status: true } }),
    prisma.property.findMany({ where: user.role === "MASTER_ADMIN" ? {} : user.role === "ADMIN" ? { adminId: user.id } : { tenantId: user.id }, select: { id: true, adminId: true, tenantId: true, name: true, address: true, unit: true, monthlyRent: true, status: true } }),
    user.role === "MASTER_ADMIN" ? prisma.user.count({ where: { role: "ADMIN" } }) : Promise.resolve(user.role === "ADMIN" ? 1 : 0),
    prisma.user.count({ where: user.role === "MASTER_ADMIN" ? { role: "TENANT" } : user.role === "ADMIN" ? { role: "TENANT", adminId: user.id, status: "ACTIVE" } : { id: user.id } }),
    user.role === "MASTER_ADMIN" ? prisma.supportRequest.count({ where: { status: "OPEN" } }) : Promise.resolve(0),
    prisma.complaint.findMany({ where: user.role === "MASTER_ADMIN" ? {} : user.role === "ADMIN" ? { ownerId: user.id } : { tenantId: user.id }, select: { status: true, ownerId: true } })
  ]);
  const owners = user.role === "MASTER_ADMIN" ? await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, name: true, email: true, _count: { select: { tenants: true, administeredBills: true, administeredRent: true } } }, orderBy: { name: "asc" } }) : [];
  const monthMap = new Map<string, { month: string; rentPaid: number; rentPending: number; electricity: number; water: number }>();
  const bucket = (year: number, month: number) => { const key = `${year}-${String(month).padStart(2, "0")}`; if (!monthMap.has(key)) monthMap.set(key, { month: key, rentPaid: 0, rentPending: 0, electricity: 0, water: 0 }); return monthMap.get(key)!; };
  rents.forEach((rent) => { const row = bucket(rent.billingYear, rent.billingMonth); if (rent.adminVerificationStatus === "VERIFIED_PAID") row.rentPaid += Number(rent.amount); else row.rentPending += Number(rent.amount); });
  bills.forEach((bill) => { const row = bucket(bill.billingYear, bill.billingMonth); if (bill.billType === "ELECTRICITY") row.electricity += 1; else row.water += 1; });
  const countRent = (status: string) => rents.filter((item) => item.adminVerificationStatus === status).length;
  const countBill = (status: string) => bills.filter((item) => item.adminVerificationStatus === status).length;
  const countDocument = (kind: string, status?: string) => documents.filter((item) => item.kind === kind && (!status || item.status === status)).length;
  return NextResponse.json({
    stats: {
      admins: adminCount, tenants: tenantCount, properties: properties.length, rentRecords: rents.length, utilityBills: bills.length,
      electricityBills: bills.filter((item) => item.billType === "ELECTRICITY").length, waterBills: bills.filter((item) => item.billType === "WATER").length,
      paidRent: countRent("VERIFIED_PAID"), unpaidRent: countRent("UNPAID"), overdueRent: countRent("OVERDUE"),
      tenantMarkedPaid: bills.filter((item) => item.tenantPaymentStatus === "TENANT_MARKED_PAID").length + rents.filter((item) => item.tenantPaymentStatus === "TENANT_MARKED_PAID").length,
      verifiedPaid: countBill("VERIFIED_PAID") + countRent("VERIFIED_PAID"), pendingVerification: countBill("PENDING") + countRent("PENDING"), rejectedClaims: countBill("REJECTED_CLAIM") + countRent("REJECTED_CLAIM"),
      agreements: countDocument("AGREEMENT"), verifiedAgreements: countDocument("AGREEMENT", "VERIFIED"), rejectedAgreements: countDocument("AGREEMENT", "REJECTED"),
      idProofs: countDocument("ID_PROOF"), verifiedIdProofs: countDocument("ID_PROOF", "VERIFIED"), rejectedIdProofs: countDocument("ID_PROOF", "REJECTED"),
      verifiedDocuments: documents.filter((item) => item.status === "VERIFIED").length, pendingDocuments: documents.filter((item) => item.status === "PENDING").length,
      openSupport: supportOpen, totalSupport: user.role === "MASTER_ADMIN" ? await prisma.supportRequest.count() : 0,
      complaints: complaints.length, openComplaints: complaints.filter((item) => item.status === "NEW" || item.status === "IN_PROGRESS").length
    },
    monthly: Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-8),
    verification: ["VERIFIED_PAID", "PENDING", "UNPAID", "OVERDUE", "REJECTED_CLAIM"].map((status) => ({ status, value: countBill(status) + countRent(status) })),
    rentStatus: ["VERIFIED_PAID", "PENDING", "UNPAID", "OVERDUE", "REJECTED_CLAIM"].map((status) => ({ status, value: countRent(status) })),
    utilityStatus: ["VERIFIED_PAID", "PENDING", "UNPAID", "OVERDUE", "REJECTED_CLAIM"].map((status) => ({ status, electricity: bills.filter((item) => item.billType === "ELECTRICITY" && item.adminVerificationStatus === status).length, water: bills.filter((item) => item.billType === "WATER" && item.adminVerificationStatus === status).length })),
    documentStatus: ["PENDING", "VERIFIED", "REJECTED"].map((status) => ({ status, idProofs: documents.filter((item) => item.kind === "ID_PROOF" && item.status === status).length, agreements: documents.filter((item) => item.kind === "AGREEMENT" && item.status === status).length })),
    complaintStatus: ["NEW", "IN_PROGRESS", "RESOLVED", "REJECTED"].map((status) => ({ status, value: complaints.filter((item) => item.status === status).length })),
    ownerPerformance: owners.map((owner) => { const pending = bills.filter((item) => item.adminId === owner.id && item.adminVerificationStatus === "PENDING").length + rents.filter((item) => item.adminId === owner.id && item.adminVerificationStatus === "PENDING").length; const unresolvedComplaints = complaints.filter((item) => item.ownerId === owner.id && (item.status === "NEW" || item.status === "IN_PROGRESS")).length; return { id: owner.id, name: owner.name, tenants: owner._count.tenants, records: owner._count.administeredBills + owner._count.administeredRent, pending, score: Math.max(0, 100 - pending * 8 - unresolvedComplaints * 7) }; }),
    owners: owners.map((owner) => ({ id: owner.id, name: owner.name, email: owner.email, tenants: owner._count.tenants, bills: owner._count.administeredBills, rents: owner._count.administeredRent })),
    properties: properties.map((property) => ({ ...property, monthlyRent: Number(property.monthlyRent) }))
  });
}
