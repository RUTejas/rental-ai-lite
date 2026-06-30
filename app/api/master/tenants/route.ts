import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (user.role !== "MASTER_ADMIN") return NextResponse.json({ error: "Master Admin access required." }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const ownerId = searchParams.get("ownerId");
  const tenants = await prisma.user.findMany({
    where: {
      role: "TENANT",
      ...(ownerId && ownerId !== "ALL" ? { adminId: ownerId } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {})
    },
    select: {
      id: true, name: true, email: true, ageGroup: true, status: true, createdAt: true,
      admin: { select: { id: true, name: true, email: true, status: true } },
      tenantRent: { select: { id: true, amount: true, billingMonth: true, billingYear: true, tenantPaymentStatus: true, adminVerificationStatus: true }, orderBy: { createdAt: "desc" }, take: 6 },
      tenantBills: { select: { id: true, billType: true, amount: true, tenantPaymentStatus: true, adminVerificationStatus: true }, orderBy: { createdAt: "desc" }, take: 8 },
      tenantDocuments: { select: { id: true, kind: true, fileName: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      complaintsRaised: { select: { id: true, status: true, priority: true } },
      propertiesRented: { select: { id: true, name: true, address: true, unit: true, status: true } }
    },
    orderBy: { name: "asc" }
  });
  return NextResponse.json({ tenants });
}
