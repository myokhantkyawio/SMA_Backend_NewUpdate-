CREATE TYPE "ReturnStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'CANCELLED'
);

CREATE TABLE "Return" (
  "id" TEXT NOT NULL,
  "saleId" TEXT,
  "productId" TEXT NOT NULL,
  "customerName" TEXT,
  "quantity" INTEGER NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Return_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Return_saleId_idx"
ON "Return"("saleId");

CREATE INDEX "Return_productId_idx"
ON "Return"("productId");

CREATE INDEX "Return_status_idx"
ON "Return"("status");

CREATE INDEX "Return_createdAt_idx"
ON "Return"("createdAt");

ALTER TABLE "Return"
ADD CONSTRAINT "Return_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "Product"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
