import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ page: z.string().min(1).max(120) });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!user.sessionId) return NextResponse.json({ ok: true, tracked: false });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid page activity." }, { status: 400 });
  const session = await prisma.userSession.findFirst({ where: { id: user.sessionId, userId: user.id } });
  if (!session) return NextResponse.json({ ok: true, tracked: false });
  const now = new Date();
  const duration = Math.max(0, Math.round((now.getTime() - session.loginAt.getTime()) / 1000));
  const pageChanged = session.currentPage !== parsed.data.page;
  await prisma.userSession.update({ where: { id: session.id }, data: { currentPage: parsed.data.page, lastActiveAt: now, sessionDuration: duration, isOnline: true } });
  if (pageChanged) await prisma.userAnalyticsEvent.create({ data: { userId: user.id, role: user.role, eventType: "PAGE_VIEW", page: parsed.data.page, deviceType: session.deviceType, browser: session.browser, os: session.os } });
  return NextResponse.json({ ok: true, tracked: true });
}
