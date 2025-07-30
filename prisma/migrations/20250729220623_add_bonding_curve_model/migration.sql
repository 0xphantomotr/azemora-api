-- CreateTable
CREATE TABLE "BondingCurve" (
    "projectId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "collateralToken" TEXT NOT NULL,
    "projectToken" TEXT NOT NULL,
    "tokensMinted" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "collateralRaised" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BondingCurve_pkey" PRIMARY KEY ("projectId")
);

-- CreateIndex
CREATE UNIQUE INDEX "BondingCurve_address_key" ON "BondingCurve"("address");

-- AddForeignKey
ALTER TABLE "BondingCurve" ADD CONSTRAINT "BondingCurve_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
