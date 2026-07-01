"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackAnalytics } from "@/lib/analytics-client";

export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    }
    if (!sessionStorage.getItem("rentwise_session_started")) {
      sessionStorage.setItem("rentwise_session_started", "1");
      void trackAnalytics("session_start");
      void trackAnalytics("app_open");
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone && !sessionStorage.getItem("rentwise_standalone_launch")) {
      sessionStorage.setItem("rentwise_standalone_launch", "1");
      void trackAnalytics("standalone_launch");
    }
    const installed = () => void trackAnalytics("appinstalled_event");
    window.addEventListener("appinstalled", installed);
    return () => window.removeEventListener("appinstalled", installed);
  }, []);

  useEffect(() => { void trackAnalytics("page_view"); }, [pathname]);

  useEffect(() => {
    const heartbeat = () => document.visibilityState === "visible" && void trackAnalytics("heartbeat");
    const hidden = () => document.visibilityState === "hidden" && void trackAnalytics("heartbeat", undefined, true);
    const timer = window.setInterval(heartbeat, 60_000);
    document.addEventListener("visibilitychange", hidden);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", hidden); };
  }, []);

  return null;
}
