import prisma from "../config/prisma";

/* =========================================================
   TYPES
========================================================= */

export interface SaleItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
  discount?: number;
}

export interface CreateSaleInput {
  branchId: string;
  cashierId: string;
  customerId?: string;
  discount?: number;
  tax?: number;
  paidAmount: number;
  paymentMethod: "CASH" | "CARD" | "KBZPAY" | "WAVE" | "OTHER";
  items: SaleItemInput[];
}

/* =========================================================
   RECEIPT NUMBER GENERATOR
   Uses existing SystemSetting table.

   Result:
   00000001
   00000002
   00000003
   ...
========================================================= */

async function generateReceiptNumber(tx: any): Promise<string> {
  const rows = await tx.$queryRaw<
    Array<{
      id: string;
      value: string | null;
    }>
  >`
    SELECT "id", "value"
    FROM "SystemSetting"
    WHERE "key" = 'SALE_RECEIPT_COUNTER'
    FOR UPDATE
  `;

  if (!rows || rows.length === 0) {
    throw new Error("SALE_RECEIPT_COUNTER setting not found");
  }

  const setting = rows[0];

  const currentValue = Number(setting.value ?? "0");

  if (!Number.isInteger(currentValue) || currentValue < 0) {
    throw new Error("Invalid SALE_RECEIPT_COUNTER value");
  }

  if (currentValue >= 99999999) {
    throw new Error("Invoice number limit reached");
  }

  const nextValue = currentValue + 1;

  await tx.systemSetting.update({
    where: {
      id: setting.id,
    },
    data: {
      value: String(nextValue),
    },
  });

  return String(nextValue).padStart(8, "0");
}

/* =========================================================
   GET RECEIPT BY SALE ID
========================================================= */

export async function getReceiptBySaleId(saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: {
      id: saleId,
    },

    include: {
      branch: true,

      cashier: true,

      customer: true,

      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!sale) {
    throw new Error("Sale not found");
  }

  return {
    receiptNumber: sale.receiptNumber,

    date: sale.createdAt,

    branch: {
      name: sale.branch.name,

      code: sale.branch.code,

      address: sale.branch.address,

      phone: sale.branch.phone,
    },

    cashier: {
      name: sale.cashier.name,
    },

    customer: sale.customer
      ? {
          id: sale.customer.id,

          customerNo: sale.customer.customerNo,

          name: sale.customer.name,

          phone: sale.customer.phone,

          address: sale.customer.address,

          region: sale.customer.region,

          township: sale.customer.township,
        }
      : null,

    items: sale.items.map((item) => ({
      productId: item.productId,

      productName: item.productName,

      quantity: Number(item.quantity),

      unitPrice: Number(item.unitPrice),

      discount: Number(item.discount),

      total: Number(item.total),
    })),

    subtotal: Number(sale.subtotal),

    discount: Number(sale.discount),

    tax: Number(sale.tax),

    total: Number(sale.total),

    paidAmount: Number(sale.paidAmount),

    changeAmount: Number(sale.changeAmount),

    paymentMethod: sale.paymentMethod,

    status: sale.status,
  };
}

/* =========================================================
   CREATE SALE
========================================================= */

export async function createSale(input: CreateSaleInput) {
  if (!input.items || input.items.length === 0) {
    throw new Error("Sale must contain at least one item");
  }

  const paidAmount = Number(input.paidAmount);

  if (!Number.isFinite(paidAmount) || paidAmount < 0) {
    throw new Error("Paid amount cannot be negative");
  }

  const discount = Number(input.discount ?? 0);

  const tax = Number(input.tax ?? 0);

  if (
    !Number.isFinite(discount) ||
    !Number.isFinite(tax) ||
    discount < 0 ||
    tax < 0
  ) {
    throw new Error("Discount and tax cannot be negative");
  }

  return prisma.$transaction(async (tx) => {
    /* =================================================
       1. GENERATE INVOICE NUMBER
       ================================================= */

    const receiptNumber = await generateReceiptNumber(tx);

    /* =================================================
       2. CALCULATE SALE
       ================================================= */

    let subtotal = 0;

    const saleItems: {
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      costPrice: number;
      discount: number;
      total: number;
    }[] = [];

    for (const item of input.items) {
      const quantity = Number(item.quantity);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error("Quantity must be greater than 0");
      }

      const product = await tx.product.findUnique({
        where: {
          id: item.productId,
        },
      });

      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (product.status !== "ACTIVE") {
        throw new Error(`Product is inactive: ${product.name}`);
      }

      const productBranch = await tx.productBranch.findUnique({
        where: {
          productId_branchId: {
            productId: item.productId,
            branchId: input.branchId,
          },
        },
      });

      if (!productBranch) {
        throw new Error(
          `${product.name} is not assigned to this branch`,
        );
      }

      if (Number(productBranch.stock) < quantity) {
        throw new Error(
          `Insufficient stock for ${product.name}. Available: ${productBranch.stock}`,
        );
      }

      const unitPrice =
        item.unitPrice !== undefined
          ? Number(item.unitPrice)
          : Number(product.sellingPrice);

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error("Unit price cannot be negative");
      }

      const itemDiscount = Number(item.discount ?? 0);

      if (!Number.isFinite(itemDiscount) || itemDiscount < 0) {
        throw new Error("Item discount cannot be negative");
      }

      const gross = quantity * unitPrice;

      const itemTotal = gross - itemDiscount;

      if (itemTotal < 0) {
        throw new Error(`Invalid discount for ${product.name}`);
      }

      subtotal += itemTotal;

      saleItems.push({
        productId: product.id,

        productName: product.name,

        quantity,

        unitPrice,

        costPrice: Number(product.costPrice),

        discount: itemDiscount,

        total: itemTotal,
      });
    }

    /* =================================================
       3. FINAL TOTAL
       ================================================= */

    const total = subtotal - discount + tax;

    if (total < 0) {
      throw new Error("Sale total cannot be negative");
    }

    if (paidAmount < total) {
      throw new Error(
        `Insufficient payment. Required: ${total}`,
      );
    }

    const changeAmount = paidAmount - total;

    /* =================================================
       4. CREATE SALE
       ================================================= */

    const sale = await tx.sale.create({
      data: {
        receiptNumber,

        branchId: input.branchId,

        cashierId: input.cashierId,

        customerId: input.customerId ?? null,

        subtotal,

        discount,

        tax,

        total,

        paidAmount,

        changeAmount,

        paymentMethod: input.paymentMethod,

        status: "COMPLETED",

        items: {
          create: saleItems.map((item) => ({
            productId: item.productId,

            quantity: item.quantity,

            unitPrice: item.unitPrice,

            discount: item.discount,

            total: item.total,
          })),
        },
      },

      include: {
        items: true,
      },
    });

    /* =================================================
       5. REDUCE STOCK
       ================================================= */

    for (const item of saleItems) {
      await tx.productBranch.update({
        where: {
          productId_branchId: {
            productId: item.productId,

            branchId: input.branchId,
          },
        },

        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,

          branchId: input.branchId,

          type: "SALE",

          quantity: item.quantity,

          referenceId: sale.id,

          note: `Sale ${sale.receiptNumber}`,
        },
      });
    }

    /* =================================================
       6. RETURN CREATED SALE
       ================================================= */

    return sale;
  });
}

/* =========================================================
   VOID SALE
========================================================= */

export async function voidSale(saleId: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: {
        id: saleId,
      },

      include: {
        items: true,
      },
    });

    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.status !== "COMPLETED") {
      throw new Error(
        `Sale cannot be voided because it is already ${sale.status}`,
      );
    }

    await tx.sale.update({
      where: {
        id: saleId,
      },

      data: {
        status: "VOIDED",
      },
    });

    for (const item of sale.items) {
      await tx.productBranch.update({
        where: {
          productId_branchId: {
            productId: item.productId,

            branchId: sale.branchId,
          },
        },

        data: {
          stock: {
            increment: Number(item.quantity),
          },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,

          branchId: sale.branchId,

          type: "SALE_RETURN",

          quantity: Number(item.quantity),

          referenceId: sale.id,

          note: `Void sale ${sale.receiptNumber}`,
        },
      });
    }

    return tx.sale.findUnique({
      where: {
        id: saleId,
      },

      include: {
        items: true,

        branch: true,

        cashier: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },

        customer: true,
      },
    });
  });
}

/* =========================================================
   REFUND SALE
========================================================= */

export async function refundSale(saleId: string) {
  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: {
        id: saleId,
      },

      include: {
        items: true,
      },
    });

    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.status !== "COMPLETED") {
      throw new Error(
        `Sale cannot be refunded because it is already ${sale.status}`,
      );
    }

    await tx.sale.update({
      where: {
        id: saleId,
      },

      data: {
        status: "REFUNDED",
      },
    });

    for (const item of sale.items) {
      const productBranch = await tx.productBranch.findUnique({
        where: {
          productId_branchId: {
            productId: item.productId,

            branchId: sale.branchId,
          },
        },
      });

      if (!productBranch) {
        throw new Error(
          `Product branch record not found for ${item.productId}`,
        );
      }

      await tx.productBranch.update({
        where: {
          productId_branchId: {
            productId: item.productId,

            branchId: sale.branchId,
          },
        },

        data: {
          stock: {
            increment: Number(item.quantity),
          },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,

          branchId: sale.branchId,

          type: "SALE_RETURN",

          quantity: Number(item.quantity),

          referenceId: sale.id,

          note: `Refund sale ${sale.receiptNumber}`,
        },
      });
    }

    return tx.sale.findUnique({
      where: {
        id: saleId,
      },

      include: {
        items: true,

        branch: true,

        cashier: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },

        customer: true,
      },
    });
  });
}