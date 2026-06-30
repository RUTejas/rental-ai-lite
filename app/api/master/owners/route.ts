import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (user.role !== "MASTER_ADMIN") return NextResponse.json({ error: "Master Admin access required." }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");
  const owners = await prisma.user.findMany({
    where: {
      role: "ADMIN",
      ...(status && status !== "ALL" ? { status: status as "ACTIVE" | "PENDING" | "BLOCKED" } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {})
    },
    select: {
      id: true, name: true, email: true, phone: true, status: true, createdAt: true, updatedAt: true,
      tenants: { select: { id: true, name: true, email: true, status: true }, orderBy: { name: "asc" } },
      propertiesOwned: { select: { id: true, name: true, address: true, status: true } },
      _count: { select: { tenants: true, administeredBills: true, administeredRent: true, administeredDocuments: true, propertiesOwned: true } }
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });
  return NextResponse.json({ owners });
}
