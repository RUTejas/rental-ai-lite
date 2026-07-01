import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { analyticsEventTypes, recordAnalyticsEvent } from "@/lib/first-party-analytics";

const idSchema = z.string().min(8).max(80).regex(/^[A-Za-z0-9_-]+$/);
const schema = z.object({
  eventType: z.enum(analyticsEventTypes),
  visitorId: idSchema,
  sessionId: idSchema,
  path: z.string().max(300).optional(),
  referrer: z.string().max(500).optional(),
  deviceType: z.enum(["mobile", "tablet", "desktop", "unknown"]).optional(),
  browser: z.enum(["Chrome", "Edge", "Safari", "Firefox", "Samsung Internet", "Other"]).optional(),
  os: z.enum(["Android", "iOS", "Windows", "macOS", "Linux", "Other"]).optional(),
  isPwa: z.boolean().optional(),
  screenWidth: z.number().int().min(0).max(10000).optional(),
  screenHeight: z.number().int().min(0).max(10000).optional(),
  metadata: z.record(z.union([z.string().max(200), z.number(), z.boolean(), z.null()])).optional()
});

const windows = new Map<string, { count: number; resetAt: number }>();
function rateLimited(sessionId: string) {
  const now = Date.now();
  const current = windows.get(sessionId);
  if (!current || current.resetAt <= now) { windows.set(sessionId, { count: 1, resetAt: now + 60_000 }); return false; }
  current.count += 1;
  return current.count > 90;
}

export async function POST(request: Request) {
  const raw = await request.json().catch(() => null);
  if (JSON.stringify(raw || {}).length > 4000) return NextResponse.json({ error: "Analytics event is too large." }, { status: 413 });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Invalid analytics event." }, { status: 400 });
  if (rateLimited(parsed.data.sessionId)) return NextResponse.json({ error: "Too many analytics events." }, { status: 429 });
  try {
    await recordAnalyticsEvent(parsed.data, await getCurrentUser());
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 202 });
  }
}
