import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ message: z.string().trim().min(1).max(500) });
const limits = new Map<string, { count: number; resetAt: number }>();
const monthName = (month: number) => new Intl.DateTimeFormat("en", { month: "long" }).format(new Date(2024, month - 1, 1));
const human = (value: string) => value.replaceAll("_", " ").toLowerCase();
const statusLine = (value: string) => human(value).replace(/^./, (letter) => letter.toUpperCase());

function allowed(userId: string) { const now = Date.now(); const current = limits.get(userId); if (!current || current.resetAt < now) { limits.set(userId, { count: 1, resetAt: now + 60_000 }); return true; } current.count += 1; return current.count <= 25; }
function has(message: string, ...words: string[]) { return words.some((word) => message.includes(word)); }

export async function POST(request: Request) {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!allowed(user.id)) return NextResponse.json({ error: "Please wait a moment before asking more questions." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Ask a short question about your rental workspace." }, { status: 400 });
  const message = parsed.data.message.toLowerCase();

  if (user.role === "TENANT") {
    const [profile, rents, bills, documents, complaints, notifications, receipts] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.id }, select: { admin: { select: { name: true, email: true } } } }),
      prisma.rentRecord.findMany({ where: { tenantId: user.id, isDeleted: false }, include: { property: { select: { name: true } } }, orderBy: [{ billingYear: "desc" }, { billingMonth: "desc" }], take: 6 }),
      prisma.utilityBill.findMany({ where: { tenantId: user.id, isDeleted: false }, orderBy: [{ billingYear: "desc" }, { billingMonth: "desc" }], take: 12 }),
      prisma.rentalDocument.findMany({ where: { tenantId: user.id, isDeleted: false }, select: { kind: true, status: true, agreementEnd: true } }),
      prisma.complaint.findMany({ where: { tenantId: user.id, isDeleted: false }, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.notification.findMany({ where: { userId: user.id, isRead: false }, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.rentReceipt.findMany({ where: { tenantId: user.id, isDeleted: false }, orderBy: { verifiedAt: "desc" }, take: 5 })
    ]);
    const latestRent = rents[0]; const latestElectricity = bills.find((item) => item.billType === "ELECTRICITY"); const latestWater = bills.find((item) => item.billType === "WATER"); const id = documents.find((item) => item.kind === "ID_PROOF"); const agreement = documents.find((item) => item.kind === "AGREEMENT");
    let reply: string;
    if (has(message, "owner", "admin", "landlord")) reply = profile?.admin ? `Your linked owner is ${profile.admin.name} (${profile.admin.email}).` : "Your tenant account is not linked to an owner yet.";
    else if (has(message, "electricity", "power bill")) reply = latestElectricity ? `Your latest electricity bill for ${monthName(latestElectricity.billingMonth)} ${latestElectricity.billingYear} is ₹${Number(latestElectricity.amount).toLocaleString("en-IN")}. Your status is ${human(latestElectricity.tenantPaymentStatus)} and owner verification is ${human(latestElectricity.adminVerificationStatus)}.` : "You do not have an electricity bill record yet.";
    else if (has(message, "water")) reply = latestWater ? `Your latest water bill for ${monthName(latestWater.billingMonth)} ${latestWater.billingYear} is ₹${Number(latestWater.amount).toLocaleString("en-IN")}. Your status is ${human(latestWater.tenantPaymentStatus)} and owner verification is ${human(latestWater.adminVerificationStatus)}.` : "You do not have a water bill record yet.";
    else if (has(message, "rent", "paid")) reply = latestRent ? `Your ${monthName(latestRent.billingMonth)} ${latestRent.billingYear} rent for ${latestRent.property?.name || "your property"} is ₹${Number(latestRent.amount).toLocaleString("en-IN")}. You have ${human(latestRent.tenantPaymentStatus)}, and the owner status is ${human(latestRent.adminVerificationStatus)}.` : "No rent record is available yet.";
    else if (has(message, "agreement", "lease")) reply = agreement ? `Your e-agreement is ${human(agreement.status)}${agreement.agreementEnd ? ` and ends on ${agreement.agreementEnd.toLocaleDateString("en-IN")}` : ""}.` : "No e-agreement has been uploaded yet. Open My documents to upload one.";
    else if (has(message, "id", "document", "proof")) reply = id ? `Your ID proof is ${human(id.status)}.` : "No ID proof has been uploaded yet. Open My documents to upload one.";
    else if (has(message, "complaint", "maintenance", "repair")) { const open = complaints.filter((item) => !["RESOLVED", "REJECTED"].includes(item.status)); reply = complaints.length ? `You have ${open.length} open complaint${open.length === 1 ? "" : "s"}. ${complaints[0].title} is currently ${human(complaints[0].status)}.` : "You have not raised any complaints."; }
    else if (has(message, "notification", "notice", "alert")) reply = notifications.length ? `You have ${notifications.length} unread notification${notifications.length === 1 ? "" : "s"}. Latest: ${notifications[0].title} — ${notifications[0].message}` : "You are all caught up with no unread notifications.";
    else if (has(message, "receipt")) reply = receipts.length ? `Your latest verified rent receipt is ${receipts[0].receiptNumber} for ₹${Number(receipts[0].amount).toLocaleString("en-IN")}. Open Receipts to download it.` : "A receipt will appear after your owner verifies a rent payment.";
    else if (has(message, "due", "next date", "deadline")) { const due = [...rents.map((item) => ({ type: "rent", date: item.dueDate })), ...bills.map((item) => ({ type: item.billType.toLowerCase(), date: item.dueDate }))].filter((item) => item.date >= new Date()).sort((a,b) => a.date.getTime() - b.date.getTime())[0]; reply = due ? `Your next due item is ${due.type} on ${due.date.toLocaleDateString("en-IN")}.` : "You have no upcoming due dates in the current records."; }
    else { const pendingDocs = documents.filter((item) => item.status === "PENDING").length; const openComplaints = complaints.filter((item) => !["RESOLVED", "REJECTED"].includes(item.status)).length; reply = `${latestRent ? `Latest rent is ${human(latestRent.adminVerificationStatus)}. ` : ""}${pendingDocs} document${pendingDocs === 1 ? " is" : "s are"} pending, ${openComplaints} complaint${openComplaints === 1 ? " is" : "s are"} open, and you have ${notifications.length} unread notification${notifications.length === 1 ? "" : "s"}.`; }
    return NextResponse.json({ reply, suggestedActions: ["Check rent status", "Check bill status", "Document status", "Open complaints", "View receipt"] });
  }

  if (user.role === "ADMIN") {
    const [tenants, rents, bills, documents, complaints] = await Promise.all([
      prisma.user.findMany({ where: { role: "TENANT", adminId: user.id, status: "ACTIVE", isDeleted: false }, select: { name: true } }),
      prisma.rentRecord.findMany({ where: { adminId: user.id, isDeleted: false }, include: { tenant: { select: { name: true } } } }),
      prisma.utilityBill.findMany({ where: { adminId: user.id, isDeleted: false }, include: { tenant: { select: { name: true } } } }),
      prisma.rentalDocument.findMany({ where: { adminId: user.id, isDeleted: false }, include: { tenant: { select: { name: true } } } }),
      prisma.complaint.findMany({ where: { ownerId: user.id, isDeleted: false }, include: { tenant: { select: { name: true } } } })
    ]);
    const pendingRents = rents.filter((item) => item.adminVerificationStatus === "PENDING"); const overdue = rents.filter((item) => item.adminVerificationStatus === "OVERDUE"); const marked = rents.filter((item) => item.tenantPaymentStatus === "TENANT_MARKED_PAID" && item.adminVerificationStatus === "PENDING"); const pendingIds = documents.filter((item) => item.kind === "ID_PROOF" && item.status === "PENDING"); const pendingAgreements = documents.filter((item) => item.kind === "AGREEMENT" && item.status === "PENDING"); const openComplaints = complaints.filter((item) => !["RESOLVED", "REJECTED"].includes(item.status)); const verified = rents.filter((item) => item.adminVerificationStatus === "VERIFIED_PAID").length; const collection = rents.length ? Math.round((verified / rents.length) * 100) : 0;
    let reply: string;
    if (has(message, "how many tenant", "tenant summary")) reply = `You have ${tenants.length} active tenant${tenants.length === 1 ? "" : "s"}: ${tenants.map((item) => item.name).join(", ") || "none yet"}.`;
    else if (has(message, "overdue")) reply = overdue.length ? `${overdue.length} tenant${overdue.length === 1 ? " has" : "s have"} overdue rent: ${overdue.map((item) => item.tenant.name).join(", ")}.` : "No tenant has overdue rent.";
    else if (has(message, "id")) reply = pendingIds.length ? `${pendingIds.length} ID proof${pendingIds.length === 1 ? " is" : "s are"} waiting: ${pendingIds.map((item) => item.tenant.name).join(", ")}.` : "No ID proofs are pending.";
    else if (has(message, "agreement")) reply = pendingAgreements.length ? `${pendingAgreements.length} agreement${pendingAgreements.length === 1 ? " is" : "s are"} waiting for verification.` : "No agreements are pending.";
    else if (has(message, "complaint", "maintenance")) reply = openComplaints.length ? `${openComplaints.length} complaint${openComplaints.length === 1 ? " needs" : "s need"} attention. Highest priority: ${openComplaints.sort((a,b) => (a.priority === "URGENT" ? -1 : b.priority === "URGENT" ? 1 : 0))[0].title}.` : "There are no unresolved complaints.";
    else if (has(message, "collection", "percentage", "performance")) reply = `Your verified rent collection rate is ${collection}% (${verified} of ${rents.length} records).`;
    else if (has(message, "marked", "pending payment", "verification")) reply = marked.length ? `${marked.length} rent payment${marked.length === 1 ? " was" : "s were"} marked paid and need verification: ${marked.map((item) => item.tenant.name).join(", ")}.` : "No tenant-marked rent payments are waiting for verification.";
    else reply = `Today needs ${pendingRents.length + pendingIds.length + pendingAgreements.length + openComplaints.length} action${pendingRents.length + pendingIds.length + pendingAgreements.length + openComplaints.length === 1 ? "" : "s"}: ${pendingRents.length} rent verifications, ${pendingIds.length} ID proofs, ${pendingAgreements.length} agreements, and ${openComplaints.length} complaints.`;
    return NextResponse.json({ reply, suggestedActions: ["What needs attention?", "Pending payments", "Pending ID verification", "Pending agreements", "Open complaints", "Tenant summary"] });
  }

  const onlineCutoff = new Date(Date.now() - 2 * 60 * 1000);
  const [owners, tenantCount, online, sessionsToday, pendingRents, pendingBills, pendingDocs, complaints, reports] = await Promise.all([
    prisma.user.findMany({ where: { role: "ADMIN", isDeleted: false }, select: { name: true, _count: { select: { tenants: { where: { isDeleted: false } } } }, administeredRent: { where: { isDeleted: false }, select: { adminVerificationStatus: true } }, administeredBills: { where: { isDeleted: false }, select: { adminVerificationStatus: true } } } }),
    prisma.user.count({ where: { role: "TENANT", isDeleted: false } }), prisma.userSession.findMany({ where: { isOnline: true, lastActiveAt: { gte: onlineCutoff }, user: { isDeleted: false } }, select: { role: true, deviceType: true } }),
    prisma.userSession.findMany({ where: { loginAt: { gte: new Date(new Date().setHours(0,0,0,0)) } }, select: { userId: true, deviceType: true } }),
    prisma.rentRecord.count({ where: { adminVerificationStatus: "PENDING", isDeleted: false } }), prisma.utilityBill.count({ where: { adminVerificationStatus: "PENDING", isDeleted: false } }), prisma.rentalDocument.count({ where: { status: "PENDING", isDeleted: false } }),
    prisma.complaint.findMany({ where: { status: { in: ["NEW", "IN_PROGRESS"] }, isDeleted: false }, include: { owner: { select: { name: true } } } }), prisma.supportRequest.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] }, isDeleted: false } })
  ]);
  const ownerRows = owners.map((item) => ({ name: item.name, tenants: item._count.tenants, pending: item.administeredRent.filter((row) => row.adminVerificationStatus === "PENDING").length + item.administeredBills.filter((row) => row.adminVerificationStatus === "PENDING").length })); const topPending = ownerRows.sort((a,b) => b.pending - a.pending)[0]; const device = Object.entries(sessionsToday.reduce<Record<string,number>>((acc,item)=>{acc[item.deviceType]=(acc[item.deviceType]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1])[0];
  let reply: string;
  if (has(message, "live", "online")) { const roles = online.reduce<Record<string,number>>((acc,item)=>{acc[item.role]=(acc[item.role]||0)+1;return acc;},{}); reply = `${online.length} user${online.length === 1 ? " is" : "s are"} online now: ${roles.MASTER_ADMIN || 0} Master Admin, ${roles.ADMIN || 0} owners, and ${roles.TENANT || 0} tenants.`; }
  else if (has(message, "how many", "total owner", "total tenant", "users")) reply = `RentWise has ${owners.length} owner accounts and ${tenantCount} tenant accounts.`;
  else if (has(message, "device", "mobile", "browser", "usage")) reply = sessionsToday.length ? `${new Set(sessionsToday.map((item) => item.userId)).size} users were active today. ${device?.[0] || "No device"} is the most-used device type with ${device?.[1] || 0} sessions.` : "No tracked website sessions are available today yet.";
  else if (has(message, "owner", "performance", "pending payment")) reply = topPending ? `${topPending.name} currently has the most pending payment verifications (${topPending.pending}) and manages ${topPending.tenants} tenants.` : "No owner performance data is available yet.";
  else if (has(message, "complaint")) reply = complaints.length ? `${complaints.length} unresolved complaint${complaints.length === 1 ? " is" : "s are"} open. ${complaints[0].owner.name} owns the most recent case.` : "No unresolved complaints need attention.";
  else if (has(message, "report", "support")) reply = `${reports} support or login report${reports === 1 ? " is" : "s are"} open or in progress.`;
  else if (has(message, "verification", "document", "attention")) reply = `${pendingRents + pendingBills + pendingDocs + complaints.length + reports} items need attention: ${pendingRents} rent, ${pendingBills} bills, ${pendingDocs} documents, ${complaints.length} complaints, and ${reports} support reports.`;
  else reply = `${online.length} users are online. There are ${owners.length} owners and ${tenantCount} tenants, with ${pendingRents + pendingBills} payment verifications and ${pendingDocs} documents pending.`;
  return NextResponse.json({ reply, suggestedActions: ["Live users", "Website analytics", "Owner performance", "Pending verifications", "Pending reports", "Complaint analytics"] });
}
