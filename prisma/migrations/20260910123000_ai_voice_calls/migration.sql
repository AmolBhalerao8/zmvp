-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('RINGING', 'IN_PROGRESS', 'PROCESSING', 'COMPLETED', 'ESCALATED', 'MISSED');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('APPOINTMENT_BOOKED', 'STATUS_PROVIDED', 'QUESTION_ANSWERED', 'ESCALATED', 'NO_ACTION');

-- CreateTable
CREATE TABLE "CallRecord" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerId" TEXT,
    "vehicleId" TEXT,
    "appointmentId" TEXT,
    "conversationId" TEXT,
    "callerName" TEXT,
    "callerPhone" TEXT NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'RINGING',
    "outcome" "CallOutcome",
    "direction" TEXT NOT NULL DEFAULT 'INBOUND',
    "durationSec" INTEGER,
    "sentiment" TEXT,
    "summary" TEXT,
    "extractedDetails" JSONB,
    "recordingUrl" TEXT,
    "escalationRequired" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CallRecord_appointmentId_key" ON "CallRecord"("appointmentId");
CREATE UNIQUE INDEX "CallRecord_conversationId_key" ON "CallRecord"("conversationId");
CREATE INDEX "CallRecord_shopId_startedAt_idx" ON "CallRecord"("shopId", "startedAt");
CREATE INDEX "CallRecord_shopId_status_idx" ON "CallRecord"("shopId", "status");
CREATE INDEX "CallRecord_customerId_idx" ON "CallRecord"("customerId");

-- AddForeignKey
ALTER TABLE "CallRecord" ADD CONSTRAINT "CallRecord_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CallRecord" ADD CONSTRAINT "CallRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CallRecord" ADD CONSTRAINT "CallRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CallRecord" ADD CONSTRAINT "CallRecord_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CallRecord" ADD CONSTRAINT "CallRecord_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
