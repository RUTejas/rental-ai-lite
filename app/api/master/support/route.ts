import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (user.role !== "MASTER_ADMIN") return NextResponse.json({ error: "Master Admin access required." }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const reports = await prisma.supportRequest.findMany({
    where: { isDeleted: false, ...(status && status !== "ALL" ? { status: status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "REJECTED" } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  const grouped = await prisma.supportRequest.groupBy({ by: ["status"], where: { isDeleted: false }, _count: true });
  return NextResponse.json({ reports, counts: Object.fromEntries(grouped.map((item) => [item.status, item._count])) });
}
