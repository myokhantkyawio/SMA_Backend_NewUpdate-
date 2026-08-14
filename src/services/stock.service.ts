import prisma from "../config/prisma";

export async function increaseStock(
  productId: string,
  branchId: string,
  quantity: number,
  referenceId?: string,
  note?: string
) {
  if (quantity <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  const productBranch =
    await prisma.productBranch.findUnique({
      where: {
        productId_branchId: {
          productId,
          branchId,
        },
      },
    });

  if (!productBranch) {
    throw new Error(
      "Product is not assigned to this branch"
    );
  }

  const updated =
    await prisma.$transaction(async (tx) => {
      const stock =
        await tx.productBranch.update({
          where: {
            productId_branchId: {
              productId,
              branchId,
            },
          },
          data: {
            stock: {
              increment: quantity,
            },
          },
        });

      await tx.stockMovement.create({
        data: {
          productId,
          branchId,
          type: "PURCHASE",
          quantity,
          referenceId,
          note,
        },
      });

      return stock;
    });

  return updated;
}
export async function createStockTransfer(
  fromBranchId: string,
  toBranchId: string,
  items: {
    productId: string;
    quantity: number;
  }[],
  note?: string
) {
  if (fromBranchId === toBranchId) {
    throw new Error(
      "Source and destination branches cannot be the same"
    );
  }

  if (!items.length) {
    throw new Error(
      "Transfer must contain at least one item"
    );
  }

  const fromBranch =
    await prisma.branch.findUnique({
      where: {
        id: fromBranchId,
      },
    });

  if (!fromBranch) {
    throw new Error(
      "Source branch not found"
    );
  }

  const toBranch =
    await prisma.branch.findUnique({
      where: {
        id: toBranchId,
      },
    });

  if (!toBranch) {
    throw new Error(
      "Destination branch not found"
    );
  }

  if (
    !fromBranch.isActive ||
    !toBranch.isActive
  ) {
    throw new Error(
      "Both branches must be active"
    );
  }

  for (const item of items) {
    if (
      !item.productId ||
      Number(item.quantity) <= 0
    ) {
      throw new Error(
        "Invalid transfer item"
      );
    }

    const product =
      await prisma.product.findUnique({
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

    const sourceStock =
      await prisma.productBranch.findUnique({
        where: {
          productId_branchId: {
            productId: item.productId,
            branchId: fromBranchId,
          },
        },
      });

    if (!sourceStock) {
      throw new Error(
        `${product.name} is not assigned to source branch`
      );
    }

    if (
      Number(sourceStock.stock) <
      Number(item.quantity)
    ) {
      throw new Error(
        `Insufficient stock for ${product.name}. Available: ${sourceStock.stock}`
      );
    }
  }

  return prisma.stockTransfer.create({
    data: {
      fromBranchId,
      toBranchId,
      note,

      status: "PENDING",

      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
        })),
      },
    },

    include: {
      fromBranch: true,
      toBranch: true,

      items: {
        include: {
          product: true,
        },
      },
    },
  });
}
export async function completeStockTransfer(
  transferId: string
) {
  return prisma.$transaction(
    async (tx) => {
      const transfer =
        await tx.stockTransfer.findUnique({
          where: {
            id: transferId,
          },

          include: {
            items: true,
          },
        });

      if (!transfer) {
        throw new Error(
          "Stock transfer not found"
        );
      }

      if (
        transfer.status !== "PENDING"
      ) {
        throw new Error(
          `Transfer cannot be completed because it is already ${transfer.status}`
        );
      }

      // Check source stock again
      // Important: prevent stock race conditions
      for (const item of transfer.items) {
        const sourceStock =
          await tx.productBranch.findUnique({
            where: {
              productId_branchId: {
                productId:
                  item.productId,

                branchId:
                  transfer.fromBranchId,
              },
            },
          });

        if (!sourceStock) {
          throw new Error(
            `Source stock not found for product ${item.productId}`
          );
        }

        if (
          Number(sourceStock.stock) <
          Number(item.quantity)
        ) {
          throw new Error(
            `Insufficient stock for product ${item.productId}`
          );
        }
      }

      // Move every item
      for (const item of transfer.items) {
        // SOURCE STOCK OUT
        await tx.productBranch.update({
          where: {
            productId_branchId: {
              productId:
                item.productId,

              branchId:
                transfer.fromBranchId,
            },
          },

          data: {
            stock: {
              decrement:
                Number(item.quantity),
            },
          },
        });

        // DESTINATION STOCK
        await tx.productBranch.upsert({
          where: {
            productId_branchId: {
              productId:
                item.productId,

              branchId:
                transfer.toBranchId,
            },
          },

          create: {
            productId:
              item.productId,

            branchId:
              transfer.toBranchId,

            stock:
              Number(item.quantity),
          },

          update: {
            stock: {
              increment:
                Number(item.quantity),
            },
          },
        });

        // SOURCE MOVEMENT
        await tx.stockMovement.create({
          data: {
            productId:
              item.productId,

            branchId:
              transfer.fromBranchId,

            type: "TRANSFER_OUT",

            quantity:
              Number(item.quantity),

            referenceId:
              transfer.id,

            note:
              `Transfer to ${transfer.toBranchId}`,
          },
        });

        // DESTINATION MOVEMENT
        await tx.stockMovement.create({
          data: {
            productId:
              item.productId,

            branchId:
              transfer.toBranchId,

            type: "TRANSFER_IN",

            quantity:
              Number(item.quantity),

            referenceId:
              transfer.id,

            note:
              `Transfer from ${transfer.fromBranchId}`,
          },
        });
      }

      // Mark completed
      const completed =
        await tx.stockTransfer.update({
          where: {
            id: transfer.id,
          },

          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },

          include: {
            fromBranch: true,
            toBranch: true,

            items: {
              include: {
                product: true,
              },
            },
          },
        });

      return completed;
    }
  );
}
export async function cancelStockTransfer(
  transferId: string
) {
  const transfer =
    await prisma.stockTransfer.findUnique({
      where: {
        id: transferId,
      },
    });

  if (!transfer) {
    throw new Error(
      "Stock transfer not found"
    );
  }

  if (
    transfer.status !== "PENDING"
  ) {
    throw new Error(
      "Only pending transfers can be cancelled"
    );
  }

  return prisma.stockTransfer.update({
    where: {
      id: transferId,
    },

    data: {
      status: "CANCELLED",
    },

    include: {
      fromBranch: true,
      toBranch: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });
}