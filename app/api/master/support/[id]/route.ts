import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { deletionFields, logDeletion, readDeletionRequest } from "@/lib/deletion";

const schema = z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED"]), adminNote: z.string().max(2000).optional().nullable() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (user.role !== "MASTER_ADMIN") return NextResponse.json({ error: "Master Admin access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid report status." }, { status: 400 });
  const { id } = await params;
  const existing = await prisma.supportRequest.findFirst({ where: { id, isDeleted: false }, select: { id: true } });
  const report = existing ? await prisma.supportRequest.update({ where: { id }, data: { status: parsed.data.status, adminNote: parsed.data.adminNote?.trim() || null } }).catch(() => null) : null;
  if (!report) return NextResponse.json({ error: "Support report not found." }, { status: 404 });
  await logActivity({ actorId: user.id, actorRole: user.role, action: "REPORT_UPDATED", targetId: report.id, targetType: "SUPPORT_REPORT", description: `${user.name} marked report ${report.id.slice(-6)} ${report.status.toLowerCase()}.` });
  return NextResponse.json({ report });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "MASTER_ADMIN") return NextResponse.json({ error: "Master Admin access required." }, { status: 403 });
  const { id } = await params;
  const report = await prisma.supportRequest.findFirst({ where: { id, isDeleted: false }, select: { id: true, issueType: true, email: true } });
  if (!report) return NextResponse.json({ error: "Support report not found." }, { status: 404 });
  const parsed = await readDeletionRequest(request);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  await prisma.supportRequest.update({ where: { id }, data: deletionFields(user, parsed.data.reason) });
  await logDeletion(user, { id, type: "SUPPORT_REPORT", name: `${report.issueType} report from ${report.email}` }, parsed.data.reason);
  return NextResponse.json({ ok: true });
}
