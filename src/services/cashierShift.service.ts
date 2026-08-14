import prisma from "../config/prisma";

export async function openShift(data: {
  branchId: string;
  cashierId: string;
  openingCash: number;
}) {
  if (data.openingCash < 0) {
    throw new Error(
      "Opening cash cannot be negative"
    );
  }

  const branch =
    await prisma.branch.findUnique({
      where: {
        id: data.branchId,
      },
    });

  if (!branch) {
    throw new Error(
      "Branch not found"
    );
  }

  if (!branch.isActive) {
    throw new Error(
      "Branch is inactive"
    );
  }

  const cashier =
    await prisma.user.findUnique({
      where: {
        id: data.cashierId,
      },
    });

  if (!cashier) {
    throw new Error(
      "Cashier not found"
    );
  }

  if (!cashier.isActive) {
    throw new Error(
      "User is inactive"
    );
  }

  const existing =
    await prisma.cashierShift.findFirst({
      where: {
        cashierId: data.cashierId,
        status: "OPEN",
      },
    });

  if (existing) {
    throw new Error(
      "Cashier already has an open shift"
    );
  }

  return prisma.cashierShift.create({
    data: {
      branchId: data.branchId,
      cashierId: data.cashierId,
      openingCash: data.openingCash,
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
    },
  });
}
export async function getCurrentShift(
  cashierId: string
) {
  return prisma.cashierShift.findFirst({
    where: {
      cashierId,
      status: "OPEN",
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
    },

    orderBy: {
      openedAt: "desc",
    },
  });
}
export async function getShiftSummary(
  shiftId: string
) {
  const shift =
    await prisma.cashierShift.findUnique({
      where: {
        id: shiftId,
      },
    });

  if (!shift) {
    throw new Error(
      "Shift not found"
    );
  }

  const sales =
    await prisma.sale.findMany({
      where: {
        cashierId: shift.cashierId,
        branchId: shift.branchId,
        status: "COMPLETED",

        createdAt: {
          gte: shift.openedAt,

          ...(shift.closedAt
            ? {
                lte: shift.closedAt,
              }
            : {}),
        },
      },

      select: {
        total: true,
        paidAmount: true,
        paymentMethod: true,
      },
    });

  let totalSales = 0;
  let cashSales = 0;
  let cardSales = 0;
  let kbzpaySales = 0;
  let waveSales = 0;
  let otherSales = 0;

  for (const sale of sales) {
    const total = Number(
      sale.total
    );

    totalSales += total;

    switch (sale.paymentMethod) {
      case "CASH":
        cashSales += total;
        break;

      case "CARD":
        cardSales += total;
        break;

      case "KBZPAY":
        kbzpaySales += total;
        break;

      case "WAVE":
        waveSales += total;
        break;

      default:
        otherSales += total;
    }
  }

  const expectedCash =
    Number(shift.openingCash) +
    cashSales;

  return {
    shift,

    summary: {
      totalSales,
      cashSales,
      cardSales,
      kbzpaySales,
      waveSales,
      otherSales,
      expectedCash,
      salesCount: sales.length,
    },
  };
}
export async function closeShift(
  shiftId: string,
  closingCash: number
) {
  if (closingCash < 0) {
    throw new Error(
      "Closing cash cannot be negative"
    );
  }

  const shift =
    await prisma.cashierShift.findUnique({
      where: {
        id: shiftId,
      },
    });

  if (!shift) {
    throw new Error(
      "Shift not found"
    );
  }

  if (shift.status === "CLOSED") {
    throw new Error(
      "Shift is already closed"
    );
  }

  const summary =
    await getShiftSummary(
      shiftId
    );

  const expectedCash =
    summary.summary.expectedCash;

  const difference =
    closingCash - expectedCash;

  return prisma.cashierShift.update({
    where: {
      id: shiftId,
    },

    data: {
      closingCash,
      expectedCash,
      difference,

      totalSales:
        summary.summary.totalSales,

      cashSales:
        summary.summary.cashSales,

      cardSales:
        summary.summary.cardSales,

      kbzpaySales:
        summary.summary.kbzpaySales,

      waveSales:
        summary.summary.waveSales,

      otherSales:
        summary.summary.otherSales,

      status: "CLOSED",
      closedAt: new Date(),
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
    },
  });
}