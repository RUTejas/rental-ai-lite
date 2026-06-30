import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  const where = user.role === "TENANT" ? { id, tenantId: user.id } : user.role === "ADMIN" ? { id, adminId: user.id } : { id };
  const document = await prisma.rentalDocument.findFirst({ where, select: { fileData: true, fileName: true, mimeType: true } });
  if (!document) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  const base64 = document.fileData.includes(",") ? document.fileData.split(",")[1] : document.fileData;
  return new Response(Buffer.from(base64, "base64"), { headers: { "Content-Type": document.mimeType, "Content-Disposition": `inline; filename="${document.fileName.replaceAll('"', '')}"`, "Cache-Control": "private, no-store" } });
}
