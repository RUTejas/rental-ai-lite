import type { Prisma } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const analyticsEventTypes = [
  "page_view", "app_open", "session_start", "heartbeat", "login_success", "signup_success", "logout",
  "install_page_view", "pwa_install_button_click", "beforeinstallprompt_available", "pwa_prompt_shown",
  "pwa_install_accepted", "pwa_install_dismissed", "appinstalled_event", "standalone_launch",
  "manual_install_instructions", "download_page_view", "apk_download_click", "apk_download_redirect",
  "entity_create", "entity_update", "entity_delete", "account_delete_request", "account_deleted",
  "tour_started", "tour_skipped", "tour_completed"
] as const;

export type AnalyticsEventType = (typeof analyticsEventTypes)[number];

export type AnalyticsPayload = {
  eventType: AnalyticsEventType;
  visitorId: string;
  sessionId: string;
  path?: string | null;
  referrer?: string | null;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
  isPwa?: boolean;
  screenWidth?: number | null;
  screenHeight?: number | null;
  metadata?: Prisma.InputJsonValue;
};

export function cleanPath(value?: string | null) {
  if (!value) return "/";
  const path = value.split(/[?#]/, 1)[0].slice(0, 200);
  return path.startsWith("/") ? path : "/";
}

export function cleanReferrer(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, 300);
  } catch {
    return null;
  }
}

export async function recordAnalyticsEvent(payload: AnalyticsPayload, user: SessionUser | null) {
  const now = new Date();
  const path = cleanPath(payload.path);
  const referrer = cleanReferrer(payload.referrer);
  const shared = {
    userId: user?.id || null,
    userRole: user?.role || null,
    deviceType: payload.deviceType || null,
    browser: payload.browser || null,
    os: payload.os || null,
    isPwa: Boolean(payload.isPwa),
    screenWidth: payload.screenWidth || null,
    screenHeight: payload.screenHeight || null
  };
  await prisma.$transaction(async (tx) => {
    await tx.analyticsSession.upsert({
      where: { sessionId: payload.sessionId },
      create: {
        visitorId: payload.visitorId,
        sessionId: payload.sessionId,
        firstSeenAt: now,
        lastSeenAt: now,
        pageCount: payload.eventType === "page_view" ? 1 : 0,
        currentPath: path,
        referrer,
        ...shared
      },
      update: {
        lastSeenAt: now,
        currentPath: path,
        ...(payload.eventType === "page_view" ? { pageCount: { increment: 1 } } : {}),
        ...(referrer ? { referrer } : {}),
        ...shared
      }
    });
    await tx.analyticsEvent.create({
      data: {
        eventType: payload.eventType,
        visitorId: payload.visitorId,
        sessionId: payload.sessionId,
        path,
        referrer,
        metadata: payload.metadata,
        ...shared
      }
    });
  });
}
