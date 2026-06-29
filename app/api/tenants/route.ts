import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const tenants = await prisma.user.findMany({
    where: { role: "TENANT", adminId: user.id, status: "APPROVED" },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" }
  });
  return NextResponse.json({ tenants });
}

const createTenantSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100)
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const parsed = createTenantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid name, email, and 8+ character password." }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
  }
  const tenant = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      role: "TENANT",
      status: "APPROVED",
      adminId: user.id
    },
    select: { id: true, name: true, email: true }
  });
  return NextResponse.json({ tenant }, { status: 201 });
}
