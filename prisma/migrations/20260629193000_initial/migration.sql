-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MASTER_ADMIN', 'ADMIN', 'TENANT');

-- CreateEnum
CREATE TYPE "BillType" AS ENUM ('ELECTRICITY', 'WATER');

-- CreateEnum
CREATE TYPE "TenantPaymentStatus" AS ENUM ('NOT_MARKED', 'TENANT_MARKED_PAID', 'TENANT_MARKED_NOT_PAID');

-- CreateEnum
CREATE TYPE "AdminVerificationStatus" AS ENUM ('PENDING', 'VERIFIED_PAID', 'UNPAID', 'OVERDUE', 'WAIVED', 'REJECTED_CLAIM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UtilityBill" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billType" "BillType" NOT NULL,
    "billingMonth" INTEGER NOT NULL,
    "billingYear" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "tenantPaymentStatus" "TenantPaymentStatus" NOT NULL DEFAULT 'NOT_MARKED',
    "tenantMarkedAt" TIMESTAMP(3),
    "tenantNote" TEXT,
    "adminVerificationStatus" "AdminVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "adminVerifiedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UtilityBill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_adminId_idx" ON "User"("adminId");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "UtilityBill_adminId_idx" ON "UtilityBill"("adminId");
CREATE INDEX "UtilityBill_tenantId_idx" ON "UtilityBill"("tenantId");
CREATE INDEX "UtilityBill_adminVerificationStatus_idx" ON "UtilityBill"("adminVerificationStatus");
CREATE INDEX "UtilityBill_tenantPaymentStatus_idx" ON "UtilityBill"("tenantPaymentStatus");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UtilityBill" ADD CONSTRAINT "UtilityBill_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UtilityBill" ADD CONSTRAINT "UtilityBill_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
