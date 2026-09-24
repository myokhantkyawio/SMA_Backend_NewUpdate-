-- ============================================
-- Customer Number Sequence
-- ============================================

CREATE SEQUENCE IF NOT EXISTS customer_no_seq;


-- ============================================
-- Add new Customer columns
-- ============================================

ALTER TABLE "Customer"
ADD COLUMN IF NOT EXISTS "customerNo" INTEGER;

ALTER TABLE "Customer"
ADD COLUMN IF NOT EXISTS "contactPersonName" TEXT;

ALTER TABLE "Customer"
ADD COLUMN IF NOT EXISTS "region" TEXT;

ALTER TABLE "Customer"
ADD COLUMN IF NOT EXISTS "regionCode" TEXT;

ALTER TABLE "Customer"
ADD COLUMN IF NOT EXISTS "township" TEXT;

ALTER TABLE "Customer"
ADD COLUMN IF NOT EXISTS "townshipCode" TEXT;


-- ============================================
-- Generate customer numbers for existing data
-- ============================================

WITH numbered_customers AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS row_number
  FROM "Customer"
  WHERE "customerNo" IS NULL
)

UPDATE "Customer" c
SET "customerNo" = numbered_customers.row_number
FROM numbered_customers
WHERE c.id = numbered_customers.id;


-- ============================================
-- Sync sequence with existing customer numbers
-- ============================================

SELECT setval(
  'customer_no_seq',
  GREATEST(COALESCE(MAX("customerNo"), 1), 1),
  true
)
FROM "Customer";


-- ============================================
-- Make customerNo required
-- ============================================

ALTER TABLE "Customer"
ALTER COLUMN "customerNo" SET NOT NULL;


-- ============================================
-- Make customerNo unique
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_customerNo_key"
ON "Customer" ("customerNo");


-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS "Customer_customerNo_idx"
ON "Customer" ("customerNo");

CREATE INDEX IF NOT EXISTS "Customer_regionCode_idx"
ON "Customer" ("regionCode");

CREATE INDEX IF NOT EXISTS "Customer_townshipCode_idx"
ON "Customer" ("townshipCode");

CREATE INDEX IF NOT EXISTS "Customer_isActive_idx"
ON "Customer" ("isActive");

CREATE INDEX IF NOT EXISTS "Customer_createdAt_idx"
ON "Customer" ("createdAt");


-- ============================================
-- Sequence ownership
-- ============================================

ALTER SEQUENCE customer_no_seq
OWNED BY "Customer"."customerNo";


-- ============================================
-- Default customer number
-- ============================================

ALTER TABLE "Customer"
ALTER COLUMN "customerNo"
SET DEFAULT nextval('customer_no_seq');