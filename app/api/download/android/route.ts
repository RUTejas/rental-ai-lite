import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recordAnalyticsEvent } from "@/lib/first-party-analytics";

const id = /^[A-Za-z0-9_-]{8,80}$/;

export async function GET(request: Request) {
  const configured = process.env.ANDROID_APK_URL;
  if (!configured) return NextResponse.redirect(new URL("/download?unavailable=1", request.url));
  let destination: URL;
  try { destination = new URL(configured); } catch { return NextResponse.redirect(new URL("/download?unavailable=1", request.url)); }
  if (destination.protocol !== "https:") return NextResponse.redirect(new URL("/download?unavailable=1", request.url));
  const source = new URL(request.url);
  const visitorId = source.searchParams.get("v") || "";
  const sessionId = source.searchParams.get("s") || "";
  if (id.test(visitorId) && id.test(sessionId)) {
    await recordAnalyticsEvent({ eventType: "apk_download_redirect", visitorId, sessionId, path: "/download" }, await getCurrentUser()).catch(() => undefined);
  }
  return NextResponse.redirect(destination);
}
