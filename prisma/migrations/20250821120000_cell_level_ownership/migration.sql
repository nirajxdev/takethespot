-- Cell-level ownership migration
-- Apply with: npx prisma migrate deploy (after adding this migration)

-- CreateEnum
CREATE TYPE "CellStatus" AS ENUM ('AVAILABLE', 'OWNED', 'RESERVED');

-- AlterEnum
ALTER TYPE "PurchaseType" ADD VALUE 'MIXED_PURCHASE';
ALTER TYPE "ActivityType" ADD VALUE 'CELLS_PURCHASED';
ALTER TYPE "ActivityType" ADD VALUE 'CELLS_TAKEN_OVER';

-- CreateTable
CREATE TABLE "Cell" (
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "productId" TEXT,
    "ownerId" TEXT,
    "currentValueInCents" INTEGER NOT NULL DEFAULT 10,
    "status" "CellStatus" NOT NULL DEFAULT 'AVAILABLE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cell_pkey" PRIMARY KEY ("x","y")
);

CREATE TABLE "PurchaseCell" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "cellX" INTEGER NOT NULL,
    "cellY" INTEGER NOT NULL,
    "previousOwnerId" TEXT,
    "previousProductId" TEXT,
    "previousValueInCents" INTEGER,
    "purchasePriceInCents" INTEGER NOT NULL,
    "newValueInCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseCell_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CellReservation" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cellX" INTEGER NOT NULL,
    "cellY" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CellReservation_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Purchase" ALTER COLUMN "territoryId" DROP NOT NULL;
ALTER TABLE "Purchase" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';

-- CreateIndex
CREATE INDEX "Cell_productId_idx" ON "Cell"("productId");
CREATE INDEX "Cell_ownerId_idx" ON "Cell"("ownerId");
CREATE INDEX "Cell_status_idx" ON "Cell"("status");
CREATE INDEX "PurchaseCell_purchaseId_idx" ON "PurchaseCell"("purchaseId");
CREATE INDEX "PurchaseCell_cellX_cellY_idx" ON "PurchaseCell"("cellX", "cellY");
CREATE INDEX "CellReservation_reservationId_idx" ON "CellReservation"("reservationId");
CREATE INDEX "CellReservation_userId_idx" ON "CellReservation"("userId");
CREATE INDEX "CellReservation_expiresAt_idx" ON "CellReservation"("expiresAt");
CREATE INDEX "CellReservation_cellX_cellY_idx" ON "CellReservation"("cellX", "cellY");

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseCell" ADD CONSTRAINT "PurchaseCell_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CellReservation" ADD CONSTRAINT "CellReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
