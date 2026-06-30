import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { billInclude, serializeBill } from "@/lib/bills";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

const createBillSchema = z.object({
  tenantId: z.string().min(1),
  billType: z.enum(["ELECTRICITY", "WATER"]),
  billingMonth: z.number().int().min(1).max(12),
  billingYear: z.number().int().min(2020).max(2100),
  amount: z.number().positive().max(10000000),
  dueDate: z.string().datetime(),
  remarks: z.string().max(1000).optional().nullable()
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const where =
    user.role === "TENANT"
      ? { tenantId: user.id }
      : user.role === "ADMIN"
        ? { adminId: user.id }
        : {};

  const bills = await prisma.utilityBill.findMany({
    where,
    include: billInclude,
    orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }]
  });
  return NextResponse.json({ bills: bills.map(serializeBill) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only an admin can add a bill." }, { status: 403 });
  }

  const parsed = createBillSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the bill details and try again." }, { status: 400 });
  }

  const tenant = await prisma.user.findFirst({
    where: {
      id: parsed.data.tenantId,
      role: "TENANT",
      adminId: user.id,
      status: "ACTIVE"
    },
    select: { id: true }
  });
  if (!tenant) {
    return NextResponse.json({ error: "That tenant is not assigned to your account." }, { status: 403 });
  }

  const bill = await prisma.utilityBill.create({
    data: {
      adminId: user.id,
      tenantId: tenant.id,
      billType: parsed.data.billType,
      billingMonth: parsed.data.billingMonth,
      billingYear: parsed.data.billingYear,
      amount: parsed.data.amount,
      dueDate: new Date(parsed.data.dueDate),
      remarks: parsed.data.remarks?.trim() || null
    },
    include: billInclude
  });
  await logActivity({ actorId: user.id, actorRole: user.role, action: "UTILITY_BILL_CREATED", targetId: bill.id, targetType: "UTILITY_BILL", description: `${user.name} created a ${bill.billType.toLowerCase()} bill for ${bill.tenant.name}.` });
  return NextResponse.json({ bill: serializeBill(bill) }, { status: 201 });
}
