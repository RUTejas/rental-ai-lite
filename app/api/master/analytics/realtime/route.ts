import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (user.role !== "MASTER_ADMIN") return NextResponse.json({ error: "Master Admin access required." }, { status: 403 });
  const cutoff = new Date(Date.now() - 5 * 60_000);
  const sessions = await prisma.analyticsSession.findMany({
    where: { lastSeenAt: { gte: cutoff } },
    select: { sessionId: true, userId: true, userRole: true, currentPath: true, deviceType: true, browser: true, os: true, isPwa: true, firstSeenAt: true, lastSeenAt: true, user: { select: { name: true } } },
    orderBy: { lastSeenAt: "desc" },
    take: 200
  });
  return NextResponse.json({ sessions: sessions.map((item) => ({ ...item, visitor: item.user?.name || "Guest visitor", role: item.userRole || "GUEST" })) });
}
