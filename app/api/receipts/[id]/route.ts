import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deletionFields, logDeletion, readDeletionRequest } from "@/lib/deletion";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "MASTER_ADMIN") return NextResponse.json({ error: "Master Admin access required." }, { status: 403 });
  const { id } = await params;
  const receipt = await prisma.rentReceipt.findFirst({ where: { id, isDeleted: false }, include: { tenant: { select: { name: true } } } });
  if (!receipt) return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  const parsed = await readDeletionRequest(request);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  await prisma.rentReceipt.update({ where: { id }, data: deletionFields(user, parsed.data.reason) });
  await logDeletion(user, { id, type: "RENT_RECEIPT", name: `${receipt.receiptNumber} for ${receipt.tenant.name}` }, parsed.data.reason);
  return NextResponse.json({ ok: true });
}
