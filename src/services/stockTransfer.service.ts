import prisma from "../config/prisma";

export async function createTransfer(data: {
  fromBranchId: string;
  toBranchId: string;
  note?: string;
  items: {
    productId: string;
    quantity: number;
  }[];
}) {
  if (data.fromBranchId === data.toBranchId) {
    throw new Error("Source and destination branches cannot be the same");
  }

  if (!data.items.length) {
    throw new Error("Transfer must contain at least one product");
  }

  for (const item of data.items) {
    if (item.quantity <= 0) {
      throw new Error("Quantity must be greater than zero");
    }
  }

  return prisma.$transaction(async (tx) => {
    for (const item of data.items) {
      const stock = await tx.productBranch.findUnique({
        where: {
          productId_branchId: {
            productId: item.productId,
            branchId: data.fromBranchId,
          },
        },
      });

      if (!stock) {
        throw new Error(
          `Product ${item.productId} is not available in source branch`
        );
      }

      if (Number(stock.stock) < item.quantity) {
        throw new Error(
          `Insufficient stock for product ${item.productId}`
        );
      }
    }

    const transfer = await tx.stockTransfer.create({
      data: {
        fromBranchId: data.fromBranchId,
        toBranchId: data.toBranchId,
        note: data.note,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return transfer;
  });
}
export async function completeTransfer(
  transferId: string
) {
  return prisma.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.findUnique({
      where: {
        id: transferId,
      },
      include: {
        items: true,
      },
    });

    if (!transfer) {
      throw new Error("Transfer not found");
    }

    if (transfer.status !== "PENDING") {
      throw new Error("Transfer is not pending");
    }

    for (const item of transfer.items) {
      const source = await tx.productBranch.findUnique({
        where: {
          productId_branchId: {
            productId: item.productId,
            branchId: transfer.fromBranchId,
          },
        },
      });

      if (!source) {
        throw new Error("Source stock not found");
      }

      if (Number(source.stock) < Number(item.quantity)) {
        throw new Error(
          `Insufficient stock for product ${item.productId}`
        );
      }

      await tx.productBranch.update({
        where: {
          productId_branchId: {
            productId: item.productId,
            branchId: transfer.fromBranchId,
          },
        },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });

      await tx.productBranch.upsert({
        where: {
          productId_branchId: {
            productId: item.productId,
            branchId: transfer.toBranchId,
          },
        },
        create: {
          productId: item.productId,
          branchId: transfer.toBranchId,
          stock: item.quantity,
        },
        update: {
          stock: {
            increment: item.quantity,
          },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          branchId: transfer.fromBranchId,
          type: "TRANSFER_OUT",
          quantity: item.quantity,
          referenceId: transfer.id,
          note: "Stock transferred out",
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          branchId: transfer.toBranchId,
          type: "TRANSFER_IN",
          quantity: item.quantity,
          referenceId: transfer.id,
          note: "Stock transferred in",
        },
      });
    }

    return tx.stockTransfer.update({
      where: {
        id: transfer.id,
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
      include: {
        items: true,
      },
    });
  });
}