-- CreateEnum
CREATE TYPE "RetestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "retest_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "occupation" "Occupation" NOT NULL,
    "reason" TEXT,
    "status" "RetestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retest_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "retest_requests_userId_idx" ON "retest_requests"("userId");

-- CreateIndex
CREATE INDEX "retest_requests_status_idx" ON "retest_requests"("status");

-- CreateIndex
CREATE INDEX "retest_requests_createdAt_idx" ON "retest_requests"("createdAt");

-- AddForeignKey
ALTER TABLE "retest_requests" ADD CONSTRAINT "retest_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retest_requests" ADD CONSTRAINT "retest_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
