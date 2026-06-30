import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { isStrongPassword, strongPasswordSchemaMessage } from "@/lib/security";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const tenants = await prisma.user.findMany({
    where: { role: "TENANT", adminId: user.id, status: "ACTIVE", isDeleted: false },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" }
  });
  return NextResponse.json({ tenants });
}

const createTenantSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(12).max(100).refine(isStrongPassword, strongPasswordSchemaMessage)
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const parsed = createTenantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: `Enter a valid name and email. ${strongPasswordSchemaMessage}` }, { status: 400 });
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
      status: "ACTIVE",
      adminId: user.id
    },
    select: { id: true, name: true, email: true }
  });
  await logActivity({ actorId: user.id, actorRole: user.role, action: "TENANT_LINKED", targetId: tenant.id, targetType: "TENANT", description: `${user.name} created and linked tenant ${tenant.name}.` });
  return NextResponse.json({ tenant }, { status: 201 });
}
