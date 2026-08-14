import prisma from "../config/prisma";

export interface SaleItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
  discount?: number;
}

export interface CreateSaleInput {
  branchId: string;
  cashierId: string;
  discount?: number;
  tax?: number;
  paidAmount: number;
  paymentMethod:
    | "CASH"
    | "CARD"
    | "KBZPAY"
    | "WAVE"
    | "OTHER";
  items: SaleItemInput[];
}

function generateReceiptNumber(): string {
  const now = new Date();

  const date =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");

  const time =
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  const random = Math.floor(
    Math.random() * 1000
  )
    .toString()
    .padStart(3, "0");

  return `SAL-${date}-${time}-${random}`;
}

export async function createSale(
  input: CreateSaleInput
) {
  if (input.items.length === 0) {
    throw new Error("Sale must contain at least one item");
  }

  if (input.paidAmount < 0) {
    throw new Error(
      "Paid amount cannot be negative"
    );
  }

  const discount = Number(
    input.discount ?? 0
  );

  const tax = Number(input.tax ?? 0);

  if (discount < 0 || tax < 0) {
    throw new Error(
      "Discount and tax cannot be negative"
    );
  }

  return prisma.$transaction(
    async (tx) => {
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
        const quantity = Number(
          item.quantity
        );

        if (quantity <= 0) {
          throw new Error(
            "Quantity must be greater than 0"
          );
        }

        const product =
          await tx.product.findUnique({
            where: {
              id: item.productId,
            },
          });

        if (!product) {
          throw new Error(
            `Product not found: ${item.productId}`
          );
        }

        if (product.status !== "ACTIVE") {
          throw new Error(
            `Product is inactive: ${product.name}`
          );
        }

        const productBranch =
          await tx.productBranch.findUnique({
            where: {
              productId_branchId: {
                productId: item.productId,
                branchId: input.branchId,
              },
            },
          });

        if (!productBranch) {
          throw new Error(
            `${product.name} is not assigned to this branch`
          );
        }

        if (
          Number(productBranch.stock) <
          quantity
        ) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available: ${productBranch.stock}`
          );
        }

        const unitPrice =
          item.unitPrice !== undefined
            ? Number(item.unitPrice)
            : Number(product.sellingPrice);

        if (unitPrice < 0) {
          throw new Error(
            "Unit price cannot be negative"
          );
        }

        const itemDiscount = Number(
          item.discount ?? 0
        );

        if (itemDiscount < 0) {
          throw new Error(
            "Item discount cannot be negative"
          );
        }

        const gross =
          quantity * unitPrice;

        const itemTotal =
          gross - itemDiscount;

        if (itemTotal < 0) {
          throw new Error(
            `Invalid discount for ${product.name}`
          );
        }

        subtotal += itemTotal;

        saleItems.push({
          productId: product.id,
          productName: product.name,
          quantity,
          unitPrice,
          costPrice: Number(
            product.costPrice
          ),
          discount: itemDiscount,
          total: itemTotal,
        });
      }

      const total =
        subtotal - discount + tax;

      if (total < 0) {
        throw new Error(
          "Sale total cannot be negative"
        );
      }

      if (
        input.paidAmount < total
      ) {
        throw new Error(
          `Insufficient payment. Required: ${total}`
        );
      }

      const changeAmount =
        input.paidAmount - total;

      const receiptNumber =
        generateReceiptNumber();

      const sale =
        await tx.sale.create({
          data: {
            receiptNumber,
            branchId: input.branchId,
            cashierId: input.cashierId,

            subtotal,
            discount,
            tax,
            total,

            paidAmount:
              input.paidAmount,

            changeAmount,

            paymentMethod:
              input.paymentMethod,

            status: "COMPLETED",

            items: {
              create:
                saleItems.map(
                  (item) => ({
                    productId:
                      item.productId,
                    productName:
                      item.productName,
                    quantity:
                      item.quantity,
                    unitPrice:
                      item.unitPrice,
                    costPrice:
                      item.costPrice,
                    discount:
                      item.discount,
                    total:
                      item.total,
                  })
                ),
            },
          },

          include: {
            branch: true,

            cashier: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },

            items: {
              include: {
                product: true,
              },
            },
          },
        });

      // Reduce stock
      for (const item of saleItems) {
        await tx.productBranch.update({
          where: {
            productId_branchId: {
              productId:
                item.productId,
              branchId:
                input.branchId,
            },
          },

          data: {
            stock: {
              decrement:
                item.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId:
              item.productId,

            branchId:
              input.branchId,

            type: "SALE",

            quantity:
              item.quantity,

            referenceId:
              sale.id,

            note: `Sale ${sale.receiptNumber}`,
          },
        });
      }

      return sale;
    }
  );
}
export async function voidSale(
  saleId: string
) {
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
        `Sale cannot be voided because it is already ${sale.status}`
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
          quantity: item.quantity,
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
      },
    });
  });
}
export async function refundSale(
  saleId: string
) {
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
        `Sale cannot be refunded because it is already ${sale.status}`
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
      const productBranch =
        await tx.productBranch.findUnique({
          where: {
            productId_branchId: {
              productId: item.productId,
              branchId: sale.branchId,
            },
          },
        });

      if (!productBranch) {
        throw new Error(
          `Product branch record not found for ${item.productId}`
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
          quantity: item.quantity,
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
      },
    });
  });
}