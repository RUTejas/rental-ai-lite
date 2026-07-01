import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser({ name, email, password, role, adminId = null }) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: { name, role, adminId, status: "ACTIVE" },
    create: { name, email, passwordHash, role, adminId, status: "ACTIVE" }
  });
}

async function main() {
  const masterEmail = process.env.MASTER_ADMIN_EMAIL || process.env.MASTER_ADMIN_ALLOWED_EMAIL;
  const masterPassword =
    process.env.MASTER_ADMIN_INITIAL_PASSWORD || process.env.MASTER_ADMIN_PASSWORD;
  const masterAdmins = await prisma.user.findMany({
    where: { role: "MASTER_ADMIN" },
    select: { id: true, email: true }
  });

  if (masterAdmins.length > 1) {
    throw new Error("More than one MASTER_ADMIN exists. Resolve the duplicate records before deploying.");
  }
  if ((masterEmail && !masterPassword) || (!masterEmail && masterPassword)) {
    throw new Error("Set both MASTER_ADMIN_EMAIL and MASTER_ADMIN_INITIAL_PASSWORD.");
  }
  if (masterEmail && masterPassword) {
    if (masterPassword.length < 12 || !/[a-z]/.test(masterPassword) || !/[A-Z]/.test(masterPassword) || !/\d/.test(masterPassword) || !/[^A-Za-z0-9]/.test(masterPassword)) {
      throw new Error("MASTER_ADMIN_INITIAL_PASSWORD must contain 12+ characters, upper/lowercase letters, a number, and a symbol.");
    }
    const existingMaster = masterAdmins[0];
    const normalizedMasterEmail = masterEmail.toLowerCase();
    const emailOwner = await prisma.user.findUnique({
      where: { email: normalizedMasterEmail },
      select: { id: true, role: true }
    });
    if (emailOwner && emailOwner.id !== existingMaster?.id) {
      throw new Error(`MASTER_ADMIN_EMAIL is already used by a ${emailOwner.role} account.`);
    }
    const passwordHash = await bcrypt.hash(masterPassword, 12);
    if (existingMaster) {
      await prisma.user.update({ where: { id: existingMaster.id }, data: { name: "Master Admin", email: normalizedMasterEmail, passwordHash, status: "ACTIVE", isDeleted: false, deletedAt: null, deletedBy: null, deletedByRole: null, deleteReason: null } });
    } else {
      await prisma.user.create({ data: { name: "Master Admin", email: normalizedMasterEmail, passwordHash, role: "MASTER_ADMIN", status: "ACTIVE" } });
    }
  }

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
  const anaya = await upsertUser({
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

  if ((await prisma.property.count()) === 0) {
    const properties = await Promise.all([
      prisma.property.create({ data: { adminId: aarav.id, tenantId: priya.id, name: "Skyline Residency", address: "12 MG Road, Bengaluru", unit: "A-204", monthlyRent: 25000 } }),
      prisma.property.create({ data: { adminId: aarav.id, tenantId: kabir.id, name: "Lakeview Nest", address: "44 Indiranagar, Bengaluru", unit: "B-101", monthlyRent: 22000 } }),
      prisma.property.create({ data: { adminId: meera.id, tenantId: anaya.id, name: "Green Courtyard", address: "8 Jubilee Hills, Hyderabad", unit: "C-303", monthlyRent: 28000 } })
    ]);
    await prisma.rentRecord.createMany({ data: [
      { adminId: aarav.id, tenantId: priya.id, propertyId: properties[0].id, billingMonth: 6, billingYear: 2026, amount: 25000, dueDate: new Date("2026-06-05T00:00:00.000Z"), tenantPaymentStatus: "TENANT_MARKED_PAID", tenantMarkedAt: new Date(), adminVerificationStatus: "VERIFIED_PAID", adminVerifiedAt: new Date() },
      { adminId: aarav.id, tenantId: kabir.id, propertyId: properties[1].id, billingMonth: 6, billingYear: 2026, amount: 22000, dueDate: new Date("2026-06-05T00:00:00.000Z"), adminVerificationStatus: "OVERDUE" },
      { adminId: meera.id, tenantId: anaya.id, propertyId: properties[2].id, billingMonth: 6, billingYear: 2026, amount: 28000, dueDate: new Date("2026-06-05T00:00:00.000Z"), adminVerificationStatus: "PENDING" }
    ] });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
