import prisma from "../config/prisma";

interface ReturnItemInput {
  saleItemId: string;
  quantity: number;
}

function generateReturnNumber(): string {
  const time = Date.now();

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `RET-${time}-${random}`;
}

export async function createSaleReturn(data: {
  saleId: string;
  branchId: string;
  userId: string;
  reason?: string;
  items: ReturnItemInput[];
}) {
  if (!data.items.length) {
    throw new Error(
      "At least one return item is required"
    );
  }

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: {
        id: data.saleId,
      },

      include: {
        items: true,
      },
    });

    if (!sale) {
      throw new Error("Sale not found");
    }

    if (sale.branchId !== data.branchId) {
      throw new Error(
        "Sale does not belong to this branch"
      );
    }

    if (
      sale.status !== "COMPLETED" &&
      sale.status !== "PARTIALLY_REFUNDED"
    ) {
      throw new Error(
        "This sale cannot be returned"
      );
    }

    let refundAmount = 0;

    const returnItems: {
      saleItemId: string;
      productId: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }[] = [];

    for (const input of data.items) {
      const saleItem =
        sale.items.find(
          (item) =>
            item.id === input.saleItemId
        );

      if (!saleItem) {
        throw new Error(
          "Sale item not found"
        );
      }

      const requestedQty =
        Number(input.quantity);

      if (
        !Number.isFinite(
          requestedQty
        ) ||
        requestedQty <= 0
      ) {
        throw new Error(
          "Invalid return quantity"
        );
      }

      const soldQty =
        Number(saleItem.quantity);

      const alreadyReturned =
        Number(saleItem.returnedQty);

      const remainingQty =
        soldQty - alreadyReturned;

      if (
        requestedQty >
        remainingQty
      ) {
        throw new Error(
          `Cannot return more than remaining quantity for ${saleItem.productName}`
        );
      }

      const unitPrice =
        Number(saleItem.unitPrice);

      const total =
        requestedQty * unitPrice;

      refundAmount += total;

      returnItems.push({
        saleItemId: saleItem.id,
        productId: saleItem.productId,
        quantity: requestedQty,
        unitPrice,
        total,
      });
    }

    const returnRecord =
      await tx.saleReturn.create({
        data: {
          returnNumber:
            generateReturnNumber(),

          saleId: sale.id,
          branchId: data.branchId,
          userId: data.userId,

          refundAmount,
          reason: data.reason,

          items: {
            create: returnItems.map(
              (item) => ({
                saleItemId:
                  item.saleItemId,

                productId:
                  item.productId,

                quantity:
                  item.quantity,

                unitPrice:
                  item.unitPrice,

                total:
                  item.total,
              })
            ),
          },
        },

        include: {
          items: true,
        },
      });

    for (const item of returnItems) {
      const saleItem =
        sale.items.find(
          (x) =>
            x.id === item.saleItemId
        );

      if (!saleItem) {
        throw new Error(
          "Sale item not found"
        );
      }

      await tx.saleItem.update({
        where: {
          id: item.saleItemId,
        },

        data: {
          returnedQty: {
            increment: item.quantity,
          },
        },
      });

      const productBranch =
        await tx.productBranch.findUnique({
          where: {
            productId_branchId: {
              productId:
                item.productId,

              branchId:
                data.branchId,
            },
          },
        });

      if (!productBranch) {
        throw new Error(
          "Product branch stock not found"
        );
      }

      await tx.productBranch.update({
        where: {
          id: productBranch.id,
        },

        data: {
          stock: {
            increment:
              item.quantity,
          },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId:
            item.productId,

          branchId:
            data.branchId,

          type: "SALE_RETURN",

          quantity:
            item.quantity,

          referenceId:
            returnRecord.id,

          note:
            `Sale return ${returnRecord.returnNumber}`,
        },
      });
    }

    const updatedSale =
      await tx.sale.findUnique({
        where: {
          id: sale.id,
        },

        include: {
          items: true,
        },
      });

    if (!updatedSale) {
      throw new Error(
        "Sale not found after return"
      );
    }

    const fullyReturned =
      updatedSale.items.every(
        (item) =>
          Number(item.returnedQty) >=
          Number(item.quantity)
      );

    await tx.sale.update({
      where: {
        id: sale.id,
      },

      data: {
        status: fullyReturned
          ? "REFUNDED"
          : "PARTIALLY_REFUNDED",
      },
    });

    return returnRecord;
  });
}