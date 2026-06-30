CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'PENDING', 'BLOCKED');
CREATE TYPE "SupportStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED');

ALTER TABLE "User" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "status" TYPE "AccountStatus"
USING (CASE
  WHEN "status" = 'BLOCKED' THEN 'BLOCKED'::"AccountStatus"
  WHEN "status" = 'PENDING' THEN 'PENDING'::"AccountStatus"
  ELSE 'ACTIVE'::"AccountStatus"
END);
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

ALTER TABLE "SupportRequest" RENAME COLUMN "category" TO "issueType";
ALTER TABLE "SupportRequest" RENAME COLUMN "message" TO "description";
ALTER TABLE "SupportRequest" ADD COLUMN "role" TEXT;
ALTER TABLE "SupportRequest" ADD COLUMN "adminNote" TEXT;
ALTER TABLE "SupportRequest" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SupportRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "SupportRequest" ALTER COLUMN "status" TYPE "SupportStatus" USING "status"::text::"SupportStatus";
ALTER TABLE "SupportRequest" ALTER COLUMN "status" SET DEFAULT 'OPEN';

CREATE TABLE "ActivityLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "actorRole" "Role",
  "action" TEXT NOT NULL,
  "targetId" TEXT,
  "targetType" TEXT,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "SupportRequest_issueType_idx" ON "SupportRequest"("issueType");
CREATE INDEX "ActivityLog_actorId_idx" ON "ActivityLog"("actorId");
CREATE INDEX "ActivityLog_actorRole_idx" ON "ActivityLog"("actorRole");
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
