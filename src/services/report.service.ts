import prisma from "../config/prisma";

function getDateRange(
  from?: string,
  to?: string
) {
  const start = from
    ? new Date(from)
    : new Date();

  const end = to
    ? new Date(to)
    : new Date();

  if (!from) {
    start.setDate(
      start.getDate() - 30
    );
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return {
    start,
    end,
  };
}

export async function getSalesReport(
  branchId?: string,
  from?: string,
  to?: string
) {
  const {
    start,
    end,
  } = getDateRange(from, to);

  const sales =
    await prisma.sale.findMany({
      where: {
        ...(branchId
          ? { branchId }
          : {}),

        status: "COMPLETED",

        createdAt: {
          gte: start,
          lte: end,
        },
      },

      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },

        cashier: {
          select: {
            id: true,
            name: true,
          },
        },

        items: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  const totalSales = sales.reduce(
    (sum, sale) =>
      sum + Number(sale.total),
    0
  );

  const totalDiscount = sales.reduce(
    (sum, sale) =>
      sum + Number(sale.discount),
    0
  );

  const totalTax = sales.reduce(
    (sum, sale) =>
      sum + Number(sale.tax),
    0
  );

  const totalProfit = sales.reduce(
    (sum, sale) => {
      const profit =
        sale.items.reduce(
          (itemSum, item) =>
            itemSum +
            (Number(item.unitPrice) -
              Number(item.costPrice)) *
              Number(item.quantity) -
            Number(item.discount),
          0
        );

      return sum + profit;
    },
    0
  );

  return {
    period: {
      from: start,
      to: end,
    },

    summary: {
      salesCount: sales.length,
      totalSales,
      totalDiscount,
      totalTax,
      grossProfit: totalProfit,
    },

    sales,
  };
}

export async function getPurchaseReport(
  branchId?: string,
  from?: string,
  to?: string
) {
  const {
    start,
    end,
  } = getDateRange(from, to);

  const purchases =
    await prisma.purchase.findMany({
      where: {
        ...(branchId
          ? { branchId }
          : {}),

        status: {
          not: "CANCELLED",
        },

        createdAt: {
          gte: start,
          lte: end,
        },
      },

      include: {
        supplier: true,

        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },

        items: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  const totalPurchases =
    purchases.reduce(
      (sum, purchase) =>
        sum +
        Number(purchase.total),
      0
    );

  return {
    period: {
      from: start,
      to: end,
    },

    summary: {
      purchaseCount:
        purchases.length,
      totalPurchases,
    },

    purchases,
  };
}

export async function getExpenseReport(
  branchId?: string,
  from?: string,
  to?: string
) {
  const {
    start,
    end,
  } = getDateRange(from, to);

  const expenses =
    await prisma.expense.findMany({
      where: {
        ...(branchId
          ? { branchId }
          : {}),

        status: "ACTIVE",

        createdAt: {
          gte: start,
          lte: end,
        },
      },

      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },

        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

  const totalExpenses =
    expenses.reduce(
      (sum, expense) =>
        sum + Number(expense.amount),
      0
    );

  return {
    period: {
      from: start,
      to: end,
    },

    summary: {
      expenseCount:
        expenses.length,
      totalExpenses,
    },

    expenses,
  };
}

export async function getStockReport(
  branchId?: string
) {
  const stock =
    await prisma.productBranch.findMany({
      where: {
        ...(branchId
          ? { branchId }
          : {}),
        isActive: true,
      },

      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            costPrice: true,
            sellingPrice: true,
            unit: true,
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
    });

  const totalStockValue =
    stock.reduce(
      (sum, item) =>
        sum +
        Number(item.stock) *
          Number(item.product.costPrice),
      0
    );

  const totalRetailValue =
    stock.reduce(
      (sum, item) =>
        sum +
        Number(item.stock) *
          Number(
            item.product.sellingPrice
          ),
      0
    );

  const lowStock = stock.filter(
    (item) =>
      Number(item.stock) <=
      Number(item.minStock)
  );

  return {
    summary: {
      totalItems: stock.length,
      totalStockValue,
      totalRetailValue,
      lowStockCount:
        lowStock.length,
    },

    lowStock,

    stock,
  };
}