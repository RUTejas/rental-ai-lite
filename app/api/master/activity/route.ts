import { NextResponse } from "next/server";
import type { Prisma, Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (user.role !== "MASTER_ADMIN") return NextResponse.json({ error: "Master Admin access required." }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");
  const action = searchParams.get("action");
  const actorId = searchParams.get("actorId");
  const from = searchParams.get("from");
  const where: Prisma.ActivityLogWhereInput = {
    ...(role && role !== "ALL" ? { actorRole: role as Role } : {}),
    ...(action && action !== "ALL" ? { action } : {}),
    ...(actorId && actorId !== "ALL" ? { actorId } : {}),
    ...(from ? { createdAt: { gte: new Date(`${from}T00:00:00.000Z`) } } : {})
  };
  const logs = await prisma.activityLog.findMany({ where, include: { actor: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: "desc" }, take: 250 });
  const actions = await prisma.activityLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } });
  return NextResponse.json({ logs, actions: actions.map((item) => item.action) });
}
