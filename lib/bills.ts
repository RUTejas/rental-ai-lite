import type { Prisma } from "@prisma/client";

export const billInclude = {
  admin: { select: { id: true, name: true, email: true } },
  tenant: { select: { id: true, name: true, email: true } }
} satisfies Prisma.UtilityBillInclude;

type BillWithPeople = Prisma.UtilityBillGetPayload<{ include: typeof billInclude }>;

export function serializeBill(bill: BillWithPeople) {
  return {
    ...bill,
    amount: Number(bill.amount),
    dueDate: bill.dueDate.toISOString(),
    tenantMarkedAt: bill.tenantMarkedAt?.toISOString() ?? null,
    adminVerifiedAt: bill.adminVerifiedAt?.toISOString() ?? null,
    createdAt: bill.createdAt.toISOString(),
    updatedAt: bill.updatedAt.toISOString()
  };
}
