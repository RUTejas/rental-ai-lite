import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const now = new Date(); const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); const today = new Date(now); today.setHours(0,0,0,0);
  let expiryMessage: string | null = null;
  if (user.role === "TENANT") { const agreement = await prisma.rentalDocument.findFirst({ where: { tenantId: user.id, kind: "AGREEMENT", agreementEnd: { gte: now, lte: soon } }, select: { agreementEnd: true } }); if (agreement?.agreementEnd) expiryMessage = `Your agreement expires on ${agreement.agreementEnd.toLocaleDateString("en-IN")}.`; }
  if (user.role === "ADMIN") { const count = await prisma.rentalDocument.count({ where: { adminId: user.id, kind: "AGREEMENT", agreementEnd: { gte: now, lte: soon } } }); if (count) expiryMessage = `${count} tenant agreement${count === 1 ? " expires" : "s expire"} within 30 days.`; }
  if (expiryMessage && !(await prisma.notification.findFirst({ where: { userId: user.id, type: "AGREEMENT_EXPIRY", createdAt: { gte: today } } }))) await prisma.notification.create({ data: { userId: user.id, title: "Agreement renewal reminder", message: expiryMessage, type: "AGREEMENT_EXPIRY" } });
  const notifications = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }); return NextResponse.json({ notifications });
}
