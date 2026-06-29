import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email()
});

async function ownedTenant(id: string, adminId: string) {
  return prisma.user.findFirst({ where: { id, adminId, role: "TENANT" }, select: { id: true } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { id } = await params;
  if (!(await ownedTenant(id, user.id))) return NextResponse.json({ error: "Tenant not found in your account." }, { status: 404 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid name and email." }, { status: 400 });
  const tenant = await prisma.user.update({
    where: { id },
    data: { name: parsed.data.name, email: parsed.data.email.toLowerCase() },
    select: { id: true, name: true, email: true }
  });
  return NextResponse.json({ tenant });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const { id } = await params;
  if (!(await ownedTenant(id, user.id))) return NextResponse.json({ error: "Tenant not found in your account." }, { status: 404 });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
