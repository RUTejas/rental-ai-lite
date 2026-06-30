import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentInclude, serializeDocument } from "@/lib/rental";
import { logActivity } from "@/lib/audit";
import { deletionFields, logDeletion, readDeletionRequest } from "@/lib/deletion";

const schema = z.object({ status: z.enum(["VERIFIED", "REJECTED"]), adminNote: z.string().max(1000).optional().nullable() });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(); if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  const { id } = await params; const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Choose verify or reject." }, { status: 400 });
  const existing = await prisma.rentalDocument.findFirst({ where: { id, adminId: user.id, isDeleted: false }, select: { id: true } }); if (!existing) return NextResponse.json({ error: "Document not found in your account." }, { status: 404 });
  const document = await prisma.rentalDocument.update({ where: { id }, data: { status: parsed.data.status, adminNote: parsed.data.adminNote?.trim() || null, verifiedAt: new Date(), verifiedById: user.id }, include: documentInclude });
  await prisma.notification.create({ data: { userId: document.tenantId, title: `${document.kind === "ID_PROOF" ? "ID proof" : "Agreement"} updated`, message: `Your document was ${parsed.data.status.toLowerCase()} by ${user.name}.`, type: "DOCUMENT_VERIFICATION" } });
  await logActivity({ actorId: user.id, actorRole: user.role, action: `${document.kind}_${parsed.data.status}`, targetId: document.id, targetType: "DOCUMENT", description: `${user.name} ${parsed.data.status.toLowerCase()} ${document.tenant.name}'s ${document.kind === "ID_PROOF" ? "ID proof" : "agreement"}.` });
  return NextResponse.json({ document: serializeDocument(document) });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  const document = await prisma.rentalDocument.findFirst({ where: { id, isDeleted: false }, include: { tenant: { select: { name: true } } } });
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const allowed = user.role === "MASTER_ADMIN" ||
    (user.role === "TENANT" && document.tenantId === user.id && ["PENDING", "REJECTED"].includes(document.status)) ||
    (user.role === "ADMIN" && document.adminId === user.id && document.status === "REJECTED");
  if (!allowed) return NextResponse.json({ error: "This document cannot be deleted in its current state." }, { status: 403 });
  const parsed = await readDeletionRequest(request);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  await prisma.rentalDocument.update({ where: { id }, data: deletionFields(user, parsed.data.reason) });
  await logDeletion(user, { id, type: "DOCUMENT", name: `${document.tenant.name}'s ${document.kind === "ID_PROOF" ? "ID proof" : "agreement"}` }, parsed.data.reason);
  return NextResponse.json({ ok: true });
}
