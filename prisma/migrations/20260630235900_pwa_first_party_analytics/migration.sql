-- First-party, privacy-conscious visitor/session analytics.
CREATE TABLE "AnalyticsSession" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "userRole" "Role",
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "currentPath" TEXT,
    "referrer" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "isPwa" BOOLEAN NOT NULL DEFAULT false,
    "screenWidth" INTEGER,
    "screenHeight" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnalyticsSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "userRole" "Role",
    "path" TEXT,
    "referrer" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "isPwa" BOOLEAN NOT NULL DEFAULT false,
    "screenWidth" INTEGER,
    "screenHeight" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnalyticsSession_sessionId_key" ON "AnalyticsSession"("sessionId");
CREATE INDEX "AnalyticsSession_visitorId_idx" ON "AnalyticsSession"("visitorId");
CREATE INDEX "AnalyticsSession_userId_idx" ON "AnalyticsSession"("userId");
CREATE INDEX "AnalyticsSession_lastSeenAt_idx" ON "AnalyticsSession"("lastSeenAt");
CREATE INDEX "AnalyticsSession_userRole_idx" ON "AnalyticsSession"("userRole");
CREATE INDEX "AnalyticsEvent_eventType_createdAt_idx" ON "AnalyticsEvent"("eventType", "createdAt");
CREATE INDEX "AnalyticsEvent_visitorId_createdAt_idx" ON "AnalyticsEvent"("visitorId", "createdAt");
CREATE INDEX "AnalyticsEvent_sessionId_createdAt_idx" ON "AnalyticsEvent"("sessionId", "createdAt");
CREATE INDEX "AnalyticsEvent_userId_createdAt_idx" ON "AnalyticsEvent"("userId", "createdAt");
CREATE INDEX "AnalyticsEvent_path_createdAt_idx" ON "AnalyticsEvent"("path", "createdAt");

ALTER TABLE "AnalyticsSession" ADD CONSTRAINT "AnalyticsSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AnalyticsSession"("sessionId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PostgreSQL partial uniqueness enforces one Master Admin at the database layer.
CREATE UNIQUE INDEX "User_single_master_admin" ON "User" ("role") WHERE "role" = 'MASTER_ADMIN'::"Role";
