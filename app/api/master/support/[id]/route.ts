import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

const schema = z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"]), adminNote: z.string().max(2000).optional().nullable() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (user.role !== "MASTER_ADMIN") return NextResponse.json({ error: "Master Admin access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid report status." }, { status: 400 });
  const { id } = await params;
  const report = await prisma.supportRequest.update({ where: { id }, data: { status: parsed.data.status, adminNote: parsed.data.adminNote?.trim() || null } }).catch(() => null);
  if (!report) return NextResponse.json({ error: "Support report not found." }, { status: 404 });
  await logActivity({ actorId: user.id, actorRole: user.role, action: "REPORT_UPDATED", targetId: report.id, targetType: "SUPPORT_REPORT", description: `${user.name} marked report ${report.id.slice(-6)} ${report.status.toLowerCase()}.` });
  return NextResponse.json({ report });
}
