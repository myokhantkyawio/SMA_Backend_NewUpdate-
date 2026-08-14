import prisma from "../config/prisma";

export async function refundSale(
  saleId: string,
  branchId: string
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

    if (sale.branchId !== branchId) {
      throw new Error(
        "Sale does not belong to this branch"
      );
    }

    if (sale.status !== "COMPLETED") {
      throw new Error(
        "Only completed sales can be refunded"
      );
    }

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
          `Product stock not found: ${item.productName}`
        );
      }

      await tx.productBranch.update({
        where: {
          id: productBranch.id,
        },
        data: {
          stock: {
            increment: item.quantity,
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
          note: `Refund for receipt ${sale.receiptNumber}`,
        },
      });
    }

    const updatedSale =
      await tx.sale.update({
        where: {
          id: sale.id,
        },
        data: {
          status: "REFUNDED",
        },
        include: {
          items: true,
          branch: true,
          cashier: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

    return updatedSale;
  });
}