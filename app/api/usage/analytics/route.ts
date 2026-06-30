import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const countBy = <T>(items: T[], key: (item: T) => string) => Object.entries(items.reduce<Record<string, number>>((acc, item) => { const value = key(item) || "Other"; acc[value] = (acc[value] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
const uniqueUsers = (sessions: Array<{ userId: string }>) => new Set(sessions.map((item) => item.userId)).size;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (user.role !== "MASTER_ADMIN") return NextResponse.json({ error: "Master Admin access required." }, { status: 403 });
  const now = new Date(); const onlineCutoff = new Date(now.getTime() - 2 * 60 * 1000);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const week = new Date(today); week.setDate(week.getDate() - 6);
  const month = new Date(today); month.setDate(1);
  await prisma.userSession.updateMany({ where: { isOnline: true, lastActiveAt: { lt: onlineCutoff } }, data: { isOnline: false } });
  const [registered, allSessions, recentEvents, newToday, users] = await Promise.all([
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.userSession.findMany({ where: { user: { isDeleted: false } }, include: { user: { select: { id: true, name: true, email: true, role: true, ageGroup: true } } }, orderBy: { lastActiveAt: "desc" }, take: 2000 }),
    prisma.userAnalyticsEvent.findMany({ where: { createdAt: { gte: month }, user: { isDeleted: false } }, orderBy: { createdAt: "asc" }, take: 10000 }),
    prisma.user.count({ where: { createdAt: { gte: today }, isDeleted: false } }),
    prisma.user.findMany({ where: { isDeleted: false }, select: { id: true, ageGroup: true } })
  ]);
  const online = allSessions.filter((item) => item.isOnline && item.lastActiveAt >= onlineCutoff);
  const activeToday = allSessions.filter((item) => item.lastActiveAt >= today);
  const activeWeek = allSessions.filter((item) => item.lastActiveAt >= week);
  const activeMonth = allSessions.filter((item) => item.lastActiveAt >= month);
  const sessionCounts = allSessions.reduce<Record<string, number>>((acc, item) => { acc[item.userId] = (acc[item.userId] || 0) + 1; return acc; }, {});
  const returning = Object.values(sessionCounts).filter((count) => count > 1).length;
  const durations = allSessions.map((item) => item.sessionDuration || Math.max(0, Math.round((Math.min(now.getTime(), item.lastActiveAt.getTime()) - item.loginAt.getTime()) / 1000))).filter((value) => value >= 0);
  const averageSessionDuration = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0;
  const dailyActive = Array.from({ length: 7 }, (_, index) => { const day = new Date(week); day.setDate(day.getDate() + index); const next = new Date(day); next.setDate(next.getDate() + 1); return { date: day.toISOString().slice(5, 10), users: new Set(allSessions.filter((item) => item.lastActiveAt >= day && item.lastActiveAt < next).map((item) => item.userId)).size }; });
  const peakHours = Array.from({ length: 24 }, (_, hour) => ({ hour: `${String(hour).padStart(2, "0")}:00`, sessions: allSessions.filter((item) => item.loginAt.getHours() === hour).length }));
  const pageEvents = recentEvents.filter((item) => item.eventType === "PAGE_VIEW" || item.eventType === "LOGIN");
  const ageLookup = new Map(users.map((item) => [item.id, item.ageGroup || "Not provided"]));
  return NextResponse.json({
    stats: { registeredUsers: registered, usersUsed: Object.keys(sessionCounts).length, onlineUsers: online.length, activeToday: uniqueUsers(activeToday), activeWeek: uniqueUsers(activeWeek), activeMonth: uniqueUsers(activeMonth), newUsersToday: newToday, returningUsers: returning, averageSessionDuration },
    liveUsers: online.map((item) => ({ id: item.id, name: item.user.name, email: item.user.email, role: item.role, ageGroup: item.user.ageGroup || "Not provided", deviceType: item.deviceType, browser: item.browser, os: item.os, currentPage: item.currentPage, loginAt: item.loginAt, lastActiveAt: item.lastActiveAt, sessionDuration: Math.max(item.sessionDuration, Math.round((now.getTime() - item.loginAt.getTime()) / 1000)), isOnline: true })),
    dailyActive,
    deviceUsage: countBy(activeMonth, (item) => item.deviceType), browserUsage: countBy(activeMonth, (item) => item.browser), osUsage: countBy(activeMonth, (item) => item.os), roleUsage: countBy(activeMonth, (item) => item.role),
    ageGroups: countBy(Object.keys(sessionCounts), (id) => ageLookup.get(id) || "Not provided"),
    pages: countBy(pageEvents, (item) => item.page).slice(0, 10), peakHours,
    newVsReturning: [{ name: "New", value: Math.max(0, Object.keys(sessionCounts).length - returning) }, { name: "Returning", value: returning }],
    durationBuckets: [{ name: "Under 5m", value: durations.filter((v) => v < 300).length }, { name: "5–15m", value: durations.filter((v) => v >= 300 && v < 900).length }, { name: "15–30m", value: durations.filter((v) => v >= 900 && v < 1800).length }, { name: "30m+", value: durations.filter((v) => v >= 1800).length }]
  });
}
