import prisma from "../config/prisma";

export async function getDashboardSummary(
  branchId?: string
) {
  const now = new Date();

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const saleWhere = {
    ...(branchId ? { branchId } : {}),
    status: "COMPLETED" as const,
    createdAt: {
      gte: startOfDay,
      lte: endOfDay,
    },
  };

  const purchaseWhere = {
    ...(branchId ? { branchId } : {}),
    status: {
      not: "CANCELLED" as const,
    },
    createdAt: {
      gte: startOfDay,
      lte: endOfDay,
    },
  };

  const expenseWhere = {
    ...(branchId ? { branchId } : {}),
    status: "ACTIVE" as const,
    createdAt: {
      gte: startOfDay,
      lte: endOfDay,
    },
  };

  const [
    sales,
    purchases,
    expenses,
    productCount,
    branchCount,
    lowStockProducts,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: saleWhere,
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      },
    }),

    prisma.purchase.aggregate({
      where: purchaseWhere,
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      },
    }),

    prisma.expense.aggregate({
      where: expenseWhere,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    }),

    prisma.product.count({
      where: {
        status: "ACTIVE",
      },
    }),

    prisma.branch.count({
      where: {
        isActive: true,
      },
    }),

    prisma.productBranch.findMany({
      where: {
        ...(branchId
          ? {
              branchId,
            }
          : {}),

        isActive: true,
      },

      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            sellingPrice: true,
          },
        },

        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },

      orderBy: {
        stock: "asc",
      },

      take: 20,
    }),
  ]);

  const lowStock = lowStockProducts.filter(
    (item) =>
      Number(item.stock) <=
      Number(item.minStock)
  );

  return {
    today: {
      sales: sales._sum.total ?? 0,
      salesCount: sales._count.id,
      purchases:
        purchases._sum.total ?? 0,
      purchasesCount:
        purchases._count.id,
      expenses:
        expenses._sum.amount ?? 0,
      expensesCount:
        expenses._count.id,
    },

    totals: {
      products: productCount,
      branches: branchCount,
      lowStock: lowStock.length,
    },

    lowStockProducts: lowStock,
  };
}