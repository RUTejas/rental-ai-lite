CREATE TYPE "DocumentKind" AS ENUM ('ID_PROOF', 'AGREEMENT');
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

CREATE TABLE "Property" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "tenantId" TEXT,
  "name" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "unit" TEXT,
  "monthlyRent" DECIMAL(12,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OCCUPIED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RentRecord" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "propertyId" TEXT,
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
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RentRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RentalDocument" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "kind" "DocumentKind" NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileData" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
  "verifiedById" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "adminNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RentalDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportRequest" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Property_adminId_idx" ON "Property"("adminId");
CREATE INDEX "Property_tenantId_idx" ON "Property"("tenantId");
CREATE INDEX "RentRecord_adminId_idx" ON "RentRecord"("adminId");
CREATE INDEX "RentRecord_tenantId_idx" ON "RentRecord"("tenantId");
CREATE INDEX "RentRecord_adminVerificationStatus_idx" ON "RentRecord"("adminVerificationStatus");
CREATE INDEX "RentalDocument_adminId_idx" ON "RentalDocument"("adminId");
CREATE INDEX "RentalDocument_tenantId_idx" ON "RentalDocument"("tenantId");
CREATE INDEX "RentalDocument_kind_status_idx" ON "RentalDocument"("kind", "status");
CREATE INDEX "SupportRequest_email_idx" ON "SupportRequest"("email");
CREATE INDEX "SupportRequest_status_idx" ON "SupportRequest"("status");

ALTER TABLE "Property" ADD CONSTRAINT "Property_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Property" ADD CONSTRAINT "Property_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RentRecord" ADD CONSTRAINT "RentRecord_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentRecord" ADD CONSTRAINT "RentRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentRecord" ADD CONSTRAINT "RentRecord_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RentalDocument" ADD CONSTRAINT "RentalDocument_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalDocument" ADD CONSTRAINT "RentalDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentalDocument" ADD CONSTRAINT "RentalDocument_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
