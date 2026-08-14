import prisma from "../config/prisma";

interface ReturnItem {
  purchaseItemId: string;
  quantity: number;
}

function generateReturnNumber() {
  return `PR-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
}

export async function createPurchaseReturn(data: {
  purchaseId: string;
  branchId: string;
  userId: string;
  reason?: string;
  items: ReturnItem[];
}) {
  if (!data.items.length) {
    throw new Error(
      "At least one return item is required"
    );
  }

  return prisma.$transaction(async (tx) => {
    const purchase =
      await tx.purchase.findUnique({
        where: {
          id: data.purchaseId,
        },
        include: {
          items: true,
        },
      });

    if (!purchase) {
      throw new Error(
        "Purchase not found"
      );
    }

    if (
      purchase.branchId !==
      data.branchId
    ) {
      throw new Error(
        "Purchase does not belong to this branch"
      );
    }

    if (
      purchase.status ===
      "CANCELLED"
    ) {
      throw new Error(
        "Cancelled purchase cannot be returned"
      );
    }

    let total = 0;

    const returnItems = [];

    for (const input of data.items) {
      const purchaseItem =
        purchase.items.find(
          (item) =>
            item.id ===
            input.purchaseItemId
        );

      if (!purchaseItem) {
        throw new Error(
          "Purchase item not found"
        );
      }

      const quantity =
        Number(input.quantity);

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        throw new Error(
          "Invalid return quantity"
        );
      }

      if (
        quantity >
        Number(purchaseItem.quantity)
      ) {
        throw new Error(
          `Cannot return more than purchased quantity for ${purchaseItem.productId}`
        );
      }

      const costPrice =
        Number(
          purchaseItem.costPrice
        );

      const itemTotal =
        quantity * costPrice;

      total += itemTotal;

      returnItems.push({
        purchaseItemId:
          purchaseItem.id,

        productId:
          purchaseItem.productId,

        quantity,

        costPrice,

        total: itemTotal,
      });
    }

    const purchaseReturn =
      await tx.purchaseReturn.create({
        data: {
          returnNumber:
            generateReturnNumber(),

          purchaseId:
            purchase.id,

          supplierId:
            purchase.supplierId,

          branchId:
            data.branchId,

          userId:
            data.userId,

          total,

          reason:
            data.reason,

          items: {
            create:
              returnItems,
          },
        },

        include: {
          items: true,
        },
      });

    for (const item of returnItems) {
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
          "Product branch not found"
        );
      }

      const currentStock =
        Number(
          productBranch.stock
        );

      if (
        currentStock <
        item.quantity
      ) {
        throw new Error(
          `Insufficient stock for product ${item.productId}`
        );
      }

      await tx.productBranch.update({
        where: {
          id: productBranch.id,
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
            data.branchId,

          type:
            "PURCHASE_RETURN",

          quantity:
            item.quantity,

          referenceId:
            purchaseReturn.id,

          note:
            `Purchase return ${purchaseReturn.returnNumber}`,
        },
      });
    }

    return purchaseReturn;
  });
}