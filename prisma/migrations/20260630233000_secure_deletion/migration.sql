ALTER TABLE "User"
  ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedBy" TEXT,
  ADD COLUMN "deletedByRole" "Role",
  ADD COLUMN "deleteReason" TEXT;

ALTER TABLE "Property"
  ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedBy" TEXT,
  ADD COLUMN "deletedByRole" "Role",
  ADD COLUMN "deleteReason" TEXT;

ALTER TABLE "RentRecord"
  ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedBy" TEXT,
  ADD COLUMN "deletedByRole" "Role",
  ADD COLUMN "deleteReason" TEXT;

ALTER TABLE "RentalDocument"
  ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedBy" TEXT,
  ADD COLUMN "deletedByRole" "Role",
  ADD COLUMN "deleteReason" TEXT;

ALTER TABLE "SupportRequest"
  ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedBy" TEXT,
  ADD COLUMN "deletedByRole" "Role",
  ADD COLUMN "deleteReason" TEXT;

ALTER TABLE "Complaint"
  ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedBy" TEXT,
  ADD COLUMN "deletedByRole" "Role",
  ADD COLUMN "deleteReason" TEXT;

ALTER TABLE "RentReceipt"
  ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedBy" TEXT,
  ADD COLUMN "deletedByRole" "Role",
  ADD COLUMN "deleteReason" TEXT;

ALTER TABLE "Notice"
  ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedBy" TEXT,
  ADD COLUMN "deletedByRole" "Role",
  ADD COLUMN "deleteReason" TEXT;

ALTER TABLE "UtilityBill"
  ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedBy" TEXT,
  ADD COLUMN "deletedByRole" "Role",
  ADD COLUMN "deleteReason" TEXT;

ALTER TABLE "ActivityLog"
  ADD COLUMN "actorName" TEXT,
  ADD COLUMN "targetName" TEXT,
  ADD COLUMN "deleteReason" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "metadata" JSONB;

CREATE TABLE "MasterLoginAttempt" (
  "id" TEXT NOT NULL,
  "emailHash" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL DEFAULT false,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MasterLoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "User_isDeleted_idx" ON "User"("isDeleted");
CREATE INDEX "Property_isDeleted_idx" ON "Property"("isDeleted");
CREATE INDEX "RentRecord_isDeleted_idx" ON "RentRecord"("isDeleted");
CREATE INDEX "RentalDocument_isDeleted_idx" ON "RentalDocument"("isDeleted");
CREATE INDEX "SupportRequest_isDeleted_idx" ON "SupportRequest"("isDeleted");
CREATE INDEX "Complaint_isDeleted_idx" ON "Complaint"("isDeleted");
CREATE INDEX "RentReceipt_isDeleted_idx" ON "RentReceipt"("isDeleted");
CREATE INDEX "Notice_isDeleted_idx" ON "Notice"("isDeleted");
CREATE INDEX "UtilityBill_isDeleted_idx" ON "UtilityBill"("isDeleted");
CREATE INDEX "MasterLoginAttempt_emailHash_createdAt_idx" ON "MasterLoginAttempt"("emailHash", "createdAt");
CREATE INDEX "MasterLoginAttempt_success_createdAt_idx" ON "MasterLoginAttempt"("success", "createdAt");

CREATE UNIQUE INDEX "User_single_active_master_admin_idx"
ON "User"("role")
WHERE "role" = 'MASTER_ADMIN' AND "isDeleted" = false;
