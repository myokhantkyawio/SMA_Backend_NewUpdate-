-- AlterEnum
ALTER TYPE "SaleStatus" ADD VALUE 'PARTIALLY_REFUNDED';

-- DropIndex
DROP INDEX "Purchase_branchId_idx";

-- DropIndex
DROP INDEX "Purchase_createdAt_idx";

-- DropIndex
DROP INDEX "Purchase_purchasedAt_idx";

-- DropIndex
DROP INDEX "Purchase_status_idx";

-- DropIndex
DROP INDEX "Purchase_supplierId_idx";

-- DropIndex
DROP INDEX "Purchase_userId_idx";

-- DropIndex
DROP INDEX "PurchasePayment_paymentMethod_idx";

-- DropIndex
DROP INDEX "PurchasePayment_userId_idx";

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "returnedQty" DECIMAL(12,2) NOT NULL DEFAULT 0;
