import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const tenants = await prisma.user.findMany({
    where: { role: "TENANT", adminId: user.id, status: "APPROVED" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" }
  });
  return NextResponse.json({ tenants });
}
