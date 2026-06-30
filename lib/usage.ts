import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function parseClient(request: Request) {
  const ua = request.headers.get("user-agent") || "";
  const mobile = /Android|iPhone|Mobile/i.test(ua);
  const tablet = /iPad|Tablet/i.test(ua);
  const deviceType = tablet ? "Tablet" : mobile ? "Mobile" : "Desktop";
  const browser = /Edg\//i.test(ua) ? "Edge" : /Firefox\//i.test(ua) ? "Firefox" : /Chrome\//i.test(ua) ? "Chrome" : /Safari\//i.test(ua) ? "Safari" : "Other";
  const os = /Windows/i.test(ua) ? "Windows" : /Android/i.test(ua) ? "Android" : /iPhone|iPad|iOS/i.test(ua) ? "iOS" : /Mac OS|Macintosh/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Other";
  return { deviceType, browser, os };
}

export async function startUserSession(user: { id: string; role: Role }, request: Request, page: string) {
  const client = parseClient(request);
  const session = await prisma.userSession.create({ data: { userId: user.id, role: user.role, currentPage: page, ...client } });
  await prisma.userAnalyticsEvent.create({ data: { userId: user.id, role: user.role, eventType: "LOGIN", page, ...client } });
  return session.id;
}

export async function endUserSession(user: { id: string; role: Role; sessionId?: string | null }) {
  if (!user.sessionId) return;
  const session = await prisma.userSession.findFirst({ where: { id: user.sessionId, userId: user.id } });
  if (!session) return;
  const seconds = Math.max(0, Math.round((Date.now() - session.loginAt.getTime()) / 1000));
  await prisma.$transaction([
    prisma.userSession.update({ where: { id: session.id }, data: { isOnline: false, logoutAt: new Date(), lastActiveAt: new Date(), sessionDuration: seconds } }),
    prisma.userAnalyticsEvent.create({ data: { userId: user.id, role: user.role, eventType: "LOGOUT", page: session.currentPage, deviceType: session.deviceType, browser: session.browser, os: session.os } })
  ]);
}
