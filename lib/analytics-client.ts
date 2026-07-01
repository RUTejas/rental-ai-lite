export type ClientAnalyticsEvent =
  | "page_view" | "app_open" | "session_start" | "heartbeat" | "install_page_view"
  | "pwa_install_button_click" | "beforeinstallprompt_available" | "pwa_prompt_shown"
  | "pwa_install_accepted" | "pwa_install_dismissed" | "appinstalled_event" | "standalone_launch"
  | "manual_install_instructions" | "download_page_view" | "apk_download_click" | "account_delete_request";

const visitorKey = "rentwise_analytics_visitor_id";
const sessionKey = "rentwise_analytics_session_id";

function id(prefix: string) {
  const value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${value}`.slice(0, 80);
}

export function analyticsIds() {
  let visitorId = localStorage.getItem(visitorKey);
  let sessionId = sessionStorage.getItem(sessionKey);
  if (!visitorId) { visitorId = id("v"); localStorage.setItem(visitorKey, visitorId); }
  if (!sessionId) { sessionId = id("s"); sessionStorage.setItem(sessionKey, sessionId); }
  return { visitorId, sessionId };
}

function clientContext() {
  const ua = navigator.userAgent;
  const width = window.innerWidth;
  const deviceType = /iPad|Tablet/i.test(ua) ? "tablet" : /Android|iPhone|Mobile/i.test(ua) || width < 768 ? "mobile" : "desktop";
  const browser = /SamsungBrowser/i.test(ua) ? "Samsung Internet" : /Edg\//i.test(ua) ? "Edge" : /Firefox\//i.test(ua) ? "Firefox" : /Chrome\//i.test(ua) ? "Chrome" : /Safari\//i.test(ua) ? "Safari" : "Other";
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iOS/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac OS|Macintosh/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Other";
  const isPwa = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return { deviceType, browser, os, isPwa, screenWidth: window.screen.width, screenHeight: window.screen.height };
}

export function analyticsPayload(eventType: ClientAnalyticsEvent, metadata?: Record<string, string | number | boolean | null>) {
  return { eventType, ...analyticsIds(), path: window.location.pathname, referrer: document.referrer, ...clientContext(), ...(metadata ? { metadata } : {}) };
}

export async function trackAnalytics(eventType: ClientAnalyticsEvent, metadata?: Record<string, string | number | boolean | null>, beacon = false) {
  try {
    const body = JSON.stringify(analyticsPayload(eventType, metadata));
    if (beacon && navigator.sendBeacon) return navigator.sendBeacon("/api/analytics/track", new Blob([body], { type: "application/json" }));
    await fetch("/api/analytics/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
    return true;
  } catch {
    return false;
  }
}
