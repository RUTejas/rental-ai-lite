import type { Prisma } from "@prisma/client";

export const rentInclude = {
  admin: { select: { id: true, name: true, email: true } },
  tenant: { select: { id: true, name: true, email: true } },
  property: { select: { id: true, name: true, address: true, unit: true } }
} satisfies Prisma.RentRecordInclude;

export const documentInclude = {
  admin: { select: { id: true, name: true, email: true } },
  tenant: { select: { id: true, name: true, email: true } },
  verifiedBy: { select: { id: true, name: true } }
} satisfies Prisma.RentalDocumentInclude;

export function serializeRent(record: Prisma.RentRecordGetPayload<{ include: typeof rentInclude }>) {
  return { ...record, amount: Number(record.amount), dueDate: record.dueDate.toISOString(), tenantMarkedAt: record.tenantMarkedAt?.toISOString() ?? null, adminVerifiedAt: record.adminVerifiedAt?.toISOString() ?? null, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() };
}

export function serializeDocument(record: Prisma.RentalDocumentGetPayload<{ include: typeof documentInclude }>) {
  const { fileData: _fileData, ...safe } = record;
  return { ...safe, verifiedAt: record.verifiedAt?.toISOString() ?? null, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() };
}
