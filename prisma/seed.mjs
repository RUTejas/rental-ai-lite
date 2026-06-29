import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser({ name, email, password, role, adminId = null }) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: { name, role, adminId, status: "APPROVED" },
    create: { name, email, passwordHash, role, adminId, status: "APPROVED" }
  });
}

async function main() {
  await upsertUser({
    name: "Master Admin",
    email: "master@rentwise.ai",
    password: "Master@12345",
    role: "MASTER_ADMIN"
  });

  const aarav = await upsertUser({
    name: "Aarav Owner",
    email: "aarav.owner@rentwise.ai",
    password: "Owner@12345",
    role: "ADMIN"
  });
  const meera = await upsertUser({
    name: "Meera Owner",
    email: "meera.owner@rentwise.ai",
    password: "Owner@22345",
    role: "ADMIN"
  });
  const priya = await upsertUser({
    name: "Priya Tenant",
    email: "priya.tenant@rentwise.ai",
    password: "Tenant@12345",
    role: "TENANT",
    adminId: aarav.id
  });
  const kabir = await upsertUser({
    name: "Kabir Tenant",
    email: "kabir.tenant@rentwise.ai",
    password: "Tenant@22345",
    role: "TENANT",
    adminId: aarav.id
  });
  await upsertUser({
    name: "Anaya Tenant",
    email: "anaya.tenant@rentwise.ai",
    password: "Tenant@32345",
    role: "TENANT",
    adminId: meera.id
  });

  if ((await prisma.utilityBill.count()) === 0) {
    await prisma.utilityBill.createMany({
      data: [
        {
          adminId: aarav.id,
          tenantId: priya.id,
          billType: "ELECTRICITY",
          billingMonth: 6,
          billingYear: 2026,
          amount: 1840,
          dueDate: new Date("2026-07-10T00:00:00.000Z"),
          remarks: "June meter reading"
        },
        {
          adminId: aarav.id,
          tenantId: kabir.id,
          billType: "WATER",
          billingMonth: 6,
          billingYear: 2026,
          amount: 620,
          dueDate: new Date("2026-07-08T00:00:00.000Z"),
          tenantPaymentStatus: "TENANT_MARKED_PAID",
          tenantMarkedAt: new Date(),
          tenantNote: "Paid directly to the utility office."
        }
      ]
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
