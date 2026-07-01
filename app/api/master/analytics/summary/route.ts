import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const countBy = <T>(items: T[], key: (item: T) => string | null | undefined) =>
  Object.entries(items.reduce<Record<string, number>>((result, item) => {
    const name = key(item) || "Unknown"; result[name] = (result[name] || 0) + 1; return result;
  }, {})).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

const unique = <T>(items: T[], key: (item: T) => string) => new Set(items.map(key)).size;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (user.role !== "MASTER_ADMIN") return NextResponse.json({ error: "Master Admin access required." }, { status: 403 });

  const now = new Date();
  const activeCutoff = new Date(now.getTime() - 5 * 60_000);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const sevenDays = new Date(today); sevenDays.setUTCDate(sevenDays.getUTCDate() - 6);
  const thirtyDays = new Date(today); thirtyDays.setUTCDate(thirtyDays.getUTCDate() - 29);

  const [sessions, monthEvents, eventCounts, totalRegisteredUsers, recentEvents, recentAuditLogs] = await Promise.all([
    prisma.analyticsSession.findMany({ orderBy: { lastSeenAt: "desc" }, take: 20_000 }),
    prisma.analyticsEvent.findMany({ where: { createdAt: { gte: thirtyDays } }, orderBy: { createdAt: "asc" }, take: 50_000 }),
    prisma.analyticsEvent.groupBy({ by: ["eventType"], _count: true }),
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.analyticsEvent.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.activityLog.findMany({ where: { action: { in: ["RECORD_DELETED", "RECORD_RESTORED"] } }, orderBy: { createdAt: "desc" }, take: 30 })
  ]);

  const active = sessions.filter((item) => item.lastSeenAt >= activeCutoff);
  const todayEvents = monthEvents.filter((item) => item.createdAt >= today);
  const sevenDaySessions = sessions.filter((item) => item.lastSeenAt >= sevenDays);
  const thirtyDaySessions = sessions.filter((item) => item.lastSeenAt >= thirtyDays);
  const eventCount = Object.fromEntries(eventCounts.map((item) => [item.eventType, item._count]));
  const pageViews = monthEvents.filter((item) => item.eventType === "page_view");
  const dailyVisitorsSeries = Array.from({ length: 30 }, (_, index) => {
    const day = new Date(thirtyDays); day.setUTCDate(day.getUTCDate() + index);
    const next = new Date(day); next.setUTCDate(next.getUTCDate() + 1);
    const events = monthEvents.filter((item) => item.createdAt >= day && item.createdAt < next);
    return {
      date: day.toISOString().slice(5, 10),
      visitors: unique(events, (item) => item.visitorId),
      pageViews: events.filter((item) => item.eventType === "page_view").length
    };
  });

  return NextResponse.json({
    stats: {
      totalUniqueVisitors: unique(sessions, (item) => item.visitorId),
      totalSessions: sessions.length,
      activeNow: active.length,
      todayUniqueVisitors: unique(todayEvents, (item) => item.visitorId),
      todayPageViews: todayEvents.filter((item) => item.eventType === "page_view").length,
      last7DaysUniqueVisitors: unique(sevenDaySessions, (item) => item.visitorId),
      last30DaysUniqueVisitors: unique(thirtyDaySessions, (item) => item.visitorId),
      loggedInActiveUsers: unique(active.filter((item) => item.userId), (item) => item.userId!),
      guestActiveVisitors: unique(active.filter((item) => !item.userId), (item) => item.visitorId),
      totalRegisteredUsers,
      pwaInstallButtonClicks: eventCount.pwa_install_button_click || 0,
      pwaPromptShown: eventCount.pwa_prompt_shown || 0,
      pwaInstallAccepted: eventCount.pwa_install_accepted || 0,
      pwaInstallDismissed: eventCount.pwa_install_dismissed || 0,
      appinstalledEvents: eventCount.appinstalled_event || 0,
      standaloneLaunches: eventCount.standalone_launch || 0,
      apkDownloadClicks: eventCount.apk_download_click || 0,
      apkDownloadRedirects: eventCount.apk_download_redirect || 0,
      tourStarted: eventCount.tour_started || 0,
      tourSkipped: eventCount.tour_skipped || 0,
      tourCompleted: eventCount.tour_completed || 0
    },
    topPages: countBy(pageViews, (item) => item.path).slice(0, 12),
    deviceBreakdown: countBy(thirtyDaySessions, (item) => item.deviceType),
    browserBreakdown: countBy(thirtyDaySessions, (item) => item.browser),
    osBreakdown: countBy(thirtyDaySessions, (item) => item.os),
    roleBreakdown: countBy(thirtyDaySessions, (item) => item.userRole || "GUEST"),
    dailyVisitorsSeries,
    recentEvents,
    recentAuditLogs
  });
}
