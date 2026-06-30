import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 }); const where = user.role === "MASTER_ADMIN" ? {} : user.role === "ADMIN" ? { ownerId: user.id } : { tenantId: user.id }; const receipts = await prisma.rentReceipt.findMany({ where: { ...where, isDeleted: false }, include: { tenant: { select: { name: true, email: true } }, owner: { select: { name: true, email: true } }, verifiedBy: { select: { name: true } }, rentRecord: { include: { property: { select: { name: true, address: true, unit: true } } } } }, orderBy: { verifiedAt: "desc" } }); return NextResponse.json({ receipts: receipts.map((item) => ({ ...item, amount: Number(item.amount) })) }); }
