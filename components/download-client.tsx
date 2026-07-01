"use client";

import { Download, ShieldCheck } from "lucide-react";
import { analyticsIds, trackAnalytics } from "@/lib/analytics-client";

export function DownloadClient({ available, version }: { available: boolean; version?: string }) {
  async function download() { await trackAnalytics("apk_download_click"); const { visitorId, sessionId } = analyticsIds(); window.location.assign(`/api/download/android?v=${encodeURIComponent(visitorId)}&s=${encodeURIComponent(sessionId)}`); }
  return <section className="download-status"><span><ShieldCheck /></span><div><small>Optional Android package{version ? ` · Version ${version}` : ""}</small><h2>{available ? "Official APK link configured" : "APK download is not available yet"}</h2><p>{available ? "Continue only if you understand Android sideloading." : "No APK file or fake link is exposed. Use the recommended browser installation instead."}</p></div><button className="primary-action" disabled={!available} onClick={() => void download()}><Download />{available ? "Download Android APK" : "APK unavailable"}</button></section>;
}
