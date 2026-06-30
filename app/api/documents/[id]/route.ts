import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentInclude, serializeDocument } from "@/lib/rental";
import { logActivity } from "@/lib/audit";

const schema = z.object({ status: z.enum(["VERIFIED", "REJECTED"]), adminNote: z.string().max(1000).optional().nullable() });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(); if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  const { id } = await params; const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Choose verify or reject." }, { status: 400 });
  const existing = await prisma.rentalDocument.findFirst({ where: { id, adminId: user.id }, select: { id: true } }); if (!existing) return NextResponse.json({ error: "Document not found in your account." }, { status: 404 });
  const document = await prisma.rentalDocument.update({ where: { id }, data: { status: parsed.data.status, adminNote: parsed.data.adminNote?.trim() || null, verifiedAt: new Date(), verifiedById: user.id }, include: documentInclude });
  await logActivity({ actorId: user.id, actorRole: user.role, action: `${document.kind}_${parsed.data.status}`, targetId: document.id, targetType: "DOCUMENT", description: `${user.name} ${parsed.data.status.toLowerCase()} ${document.tenant.name}'s ${document.kind === "ID_PROOF" ? "ID proof" : "agreement"}.` });
  return NextResponse.json({ document: serializeDocument(document) });
}
