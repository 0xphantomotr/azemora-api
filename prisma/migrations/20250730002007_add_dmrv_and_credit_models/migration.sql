/*
  Warnings:

  - The primary key for the `BondingCurve` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `address` on the `BondingCurve` table. All the data in the column will be lost.
  - You are about to drop the column `collateralRaised` on the `BondingCurve` table. All the data in the column will be lost.
  - You are about to drop the column `strategyId` on the `BondingCurve` table. All the data in the column will be lost.
  - You are about to drop the column `tokensMinted` on the `BondingCurve` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[projectId]` on the table `BondingCurve` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `creator` to the `BondingCurve` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id` to the `BondingCurve` table without a default value. This is not possible if the table is not empty.
  - Added the required column `initialPrice` to the `BondingCurve` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceMultiplier` to the `BondingCurve` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "BondingCurve_address_key";

-- AlterTable
ALTER TABLE "BondingCurve" DROP CONSTRAINT "BondingCurve_pkey",
DROP COLUMN "address",
DROP COLUMN "collateralRaised",
DROP COLUMN "strategyId",
DROP COLUMN "tokensMinted",
ADD COLUMN     "creator" TEXT NOT NULL,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "initialPrice" TEXT NOT NULL,
ADD COLUMN     "priceMultiplier" TEXT NOT NULL,
ADD CONSTRAINT "BondingCurve_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'Pending';

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "verifier" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "outcomeData" BYTEA,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactCredit" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "mintedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "txHash" TEXT NOT NULL,

    CONSTRAINT "ImpactCredit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BondingCurve_projectId_key" ON "BondingCurve"("projectId");

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactCredit" ADD CONSTRAINT "ImpactCredit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpactCredit" ADD CONSTRAINT "ImpactCredit_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "Verification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
