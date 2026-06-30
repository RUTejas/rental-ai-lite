import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deletionFields, logDeletion, readDeletionRequest } from "@/lib/deletion";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role === "TENANT") return NextResponse.json({ error: "Owner or Master Admin access required." }, { status: 403 });
  const { id } = await params;
  const notice = await prisma.notice.findFirst({ where: { id, isDeleted: false } });
  if (!notice || (user.role === "ADMIN" && notice.createdById !== user.id)) return NextResponse.json({ error: "Notice not found in your account." }, { status: 404 });
  const parsed = await readDeletionRequest(request);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  await prisma.notice.update({ where: { id }, data: deletionFields(user, parsed.data.reason) });
  await logDeletion(user, { id, type: "NOTICE", name: notice.title }, parsed.data.reason);
  return NextResponse.json({ ok: true });
}
