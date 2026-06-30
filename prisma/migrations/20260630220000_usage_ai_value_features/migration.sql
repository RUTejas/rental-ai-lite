ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "ageGroup" TEXT;
ALTER TABLE "RentalDocument" ADD COLUMN "agreementStart" TIMESTAMP(3);
ALTER TABLE "RentalDocument" ADD COLUMN "agreementEnd" TIMESTAMP(3);

CREATE TABLE "MasterAdminSetup" (
  "id" TEXT NOT NULL,
  "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
  "setupKeyHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MasterAdminSetup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSession" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "role" "Role" NOT NULL,
  "deviceType" TEXT NOT NULL, "browser" TEXT NOT NULL, "os" TEXT NOT NULL,
  "currentPage" TEXT NOT NULL DEFAULT '/', "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "logoutAt" TIMESTAMP(3),
  "sessionDuration" INTEGER NOT NULL DEFAULT 0, "isOnline" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserAnalyticsEvent" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "role" "Role" NOT NULL,
  "eventType" TEXT NOT NULL, "page" TEXT NOT NULL, "deviceType" TEXT NOT NULL,
  "browser" TEXT NOT NULL, "os" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "title" TEXT NOT NULL,
  "message" TEXT NOT NULL, "type" TEXT NOT NULL, "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Complaint" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
  "title" TEXT NOT NULL, "category" TEXT NOT NULL, "description" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'MEDIUM', "status" TEXT NOT NULL DEFAULT 'NEW',
  "imageUrl" TEXT, "ownerNote" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RentReceipt" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "ownerId" TEXT NOT NULL,
  "rentRecordId" TEXT NOT NULL, "receiptNumber" TEXT NOT NULL, "amount" DECIMAL(12,2) NOT NULL,
  "month" INTEGER NOT NULL, "year" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'VERIFIED_PAID',
  "verifiedById" TEXT NOT NULL, "verifiedAt" TIMESTAMP(3) NOT NULL, "pdfUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "RentReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notice" (
  "id" TEXT NOT NULL, "createdById" TEXT NOT NULL, "targetRole" "Role", "ownerId" TEXT,
  "title" TEXT NOT NULL, "message" TEXT NOT NULL, "noticeType" TEXT NOT NULL,
  "isImportant" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RentReceipt_rentRecordId_key" ON "RentReceipt"("rentRecordId");
CREATE UNIQUE INDEX "RentReceipt_receiptNumber_key" ON "RentReceipt"("receiptNumber");
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX "UserSession_isOnline_lastActiveAt_idx" ON "UserSession"("isOnline", "lastActiveAt");
CREATE INDEX "UserSession_role_idx" ON "UserSession"("role");
CREATE INDEX "UserAnalyticsEvent_userId_idx" ON "UserAnalyticsEvent"("userId");
CREATE INDEX "UserAnalyticsEvent_eventType_createdAt_idx" ON "UserAnalyticsEvent"("eventType", "createdAt");
CREATE INDEX "UserAnalyticsEvent_page_createdAt_idx" ON "UserAnalyticsEvent"("page", "createdAt");
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX "Complaint_tenantId_idx" ON "Complaint"("tenantId");
CREATE INDEX "Complaint_ownerId_status_idx" ON "Complaint"("ownerId", "status");
CREATE INDEX "RentReceipt_tenantId_idx" ON "RentReceipt"("tenantId");
CREATE INDEX "RentReceipt_ownerId_idx" ON "RentReceipt"("ownerId");
CREATE INDEX "Notice_createdById_idx" ON "Notice"("createdById");
CREATE INDEX "Notice_ownerId_idx" ON "Notice"("ownerId");
CREATE INDEX "Notice_targetRole_createdAt_idx" ON "Notice"("targetRole", "createdAt");

ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAnalyticsEvent" ADD CONSTRAINT "UserAnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentReceipt" ADD CONSTRAINT "RentReceipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentReceipt" ADD CONSTRAINT "RentReceipt_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RentReceipt" ADD CONSTRAINT "RentReceipt_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RentReceipt" ADD CONSTRAINT "RentReceipt_rentRecordId_fkey" FOREIGN KEY ("rentRecordId") REFERENCES "RentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "RentReceipt" ("id", "tenantId", "ownerId", "rentRecordId", "receiptNumber", "amount", "month", "year", "status", "verifiedById", "verifiedAt", "createdAt")
SELECT 'receipt_' || "id", "tenantId", "adminId", "id",
       'RW-' || "billingYear"::text || LPAD("billingMonth"::text, 2, '0') || '-' || UPPER(RIGHT("id", 6)),
       "amount", "billingMonth", "billingYear", 'VERIFIED_PAID', "adminId",
       COALESCE("adminVerifiedAt", CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
FROM "RentRecord"
WHERE "adminVerificationStatus" = 'VERIFIED_PAID'
ON CONFLICT ("rentRecordId") DO NOTHING;
