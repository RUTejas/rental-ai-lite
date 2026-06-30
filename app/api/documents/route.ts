import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentInclude, serializeDocument } from "@/lib/rental";
import { logActivity } from "@/lib/audit";

const uploadSchema = z.object({ kind: z.enum(["ID_PROOF", "AGREEMENT"]), fileName: z.string().min(1).max(180), mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]), fileData: z.string().min(10), fileSize: z.number().int().positive().max(2 * 1024 * 1024), agreementStart: z.string().datetime().optional().nullable(), agreementEnd: z.string().datetime().optional().nullable() });

export async function GET() {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const where = user.role === "TENANT" ? { tenantId: user.id } : user.role === "ADMIN" ? { adminId: user.id } : {};
  const documents = await prisma.rentalDocument.findMany({ where: { ...where, isDeleted: false }, include: documentInclude, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ documents: documents.map(serializeDocument) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser(); if (!user || user.role !== "TENANT") return NextResponse.json({ error: "Tenant access required." }, { status: 403 });
  const parsed = uploadSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Use a PDF, JPG, or PNG up to 2 MB." }, { status: 400 });
  const tenant = await prisma.user.findUnique({ where: { id: user.id }, select: { adminId: true } }); if (!tenant?.adminId) return NextResponse.json({ error: "Your account is not linked to an owner." }, { status: 400 });
  const { agreementStart, agreementEnd, ...file } = parsed.data;
  if (file.kind === "AGREEMENT" && (!agreementStart || !agreementEnd)) return NextResponse.json({ error: "Agreement start and end dates are required." }, { status: 400 });
  const document = await prisma.rentalDocument.create({ data: { ...file, agreementStart: agreementStart ? new Date(agreementStart) : null, agreementEnd: agreementEnd ? new Date(agreementEnd) : null, adminId: tenant.adminId, tenantId: user.id, status: "PENDING" }, include: documentInclude });
  await prisma.notification.create({ data: { userId: tenant.adminId, title: `${file.kind === "ID_PROOF" ? "ID proof" : "Agreement"} awaiting verification`, message: `${user.name} uploaded ${file.fileName}.`, type: "DOCUMENT_PENDING" } });
  await logActivity({ actorId: user.id, actorRole: user.role, action: parsed.data.kind === "ID_PROOF" ? "ID_UPLOADED" : "AGREEMENT_UPLOADED", targetId: document.id, targetType: "DOCUMENT", description: `${user.name} uploaded ${parsed.data.kind === "ID_PROOF" ? "an ID proof" : "an e-agreement"}.` });
  return NextResponse.json({ document: serializeDocument(document) }, { status: 201 });
}
