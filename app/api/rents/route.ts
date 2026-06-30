import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rentInclude, serializeRent } from "@/lib/rental";
import { logActivity } from "@/lib/audit";

const createSchema = z.object({ tenantId: z.string().min(1), propertyId: z.string().optional().nullable(), billingMonth: z.number().int().min(1).max(12), billingYear: z.number().int().min(2020).max(2100), amount: z.number().positive(), dueDate: z.string().datetime() });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const where = user.role === "TENANT" ? { tenantId: user.id } : user.role === "ADMIN" ? { adminId: user.id } : {};
  const records = await prisma.rentRecord.findMany({ where, include: rentInclude, orderBy: [{ billingYear: "desc" }, { billingMonth: "desc" }] });
  return NextResponse.json({ rents: records.map(serializeRent) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Owner access required." }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the rent record details." }, { status: 400 });
  const tenant = await prisma.user.findFirst({ where: { id: parsed.data.tenantId, adminId: user.id, role: "TENANT" }, select: { id: true } });
  if (!tenant) return NextResponse.json({ error: "That tenant is not assigned to you." }, { status: 403 });
  let propertyId: string | null = null;
  if (parsed.data.propertyId) {
    const property = await prisma.property.findFirst({ where: { id: parsed.data.propertyId, adminId: user.id, tenantId: tenant.id }, select: { id: true } });
    if (!property) return NextResponse.json({ error: "Property does not belong to this tenant." }, { status: 403 });
    propertyId = property.id;
  }
  const record = await prisma.rentRecord.create({ data: { ...parsed.data, propertyId, adminId: user.id, dueDate: new Date(parsed.data.dueDate) }, include: rentInclude });
  await prisma.notification.create({ data: { userId: tenant.id, title: "Rent due reminder", message: `₹${Number(record.amount).toLocaleString("en-IN")} is due on ${record.dueDate.toLocaleDateString("en-IN")}.`, type: "RENT_DUE" } });
  await logActivity({ actorId: user.id, actorRole: user.role, action: "RENT_RECORD_CREATED", targetId: record.id, targetType: "RENT_RECORD", description: `${user.name} created a rent record for ${record.tenant.name}.` });
  return NextResponse.json({ rent: serializeRent(record) }, { status: 201 });
}
