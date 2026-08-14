import prisma from "../config/prisma";

export async function openCashShift(
  branchId: string,
  cashierId: string,
  openingCash: number,
  note?: string
) {
  if (openingCash < 0) {
    throw new Error("Opening cash cannot be negative");
  }

  const existing = await prisma.cashShift.findFirst({
    where: {
      cashierId,
      branchId,
      status: "OPEN",
    },
  });

  if (existing) {
    throw new Error("Cashier already has an open shift");
  }

  return prisma.cashShift.create({
    data: {
      branchId,
      cashierId,
      openingCash,
      note,
      status: "OPEN",
    },
  });
}

export async function getCurrentCashShift(
  branchId: string,
  cashierId: string
) {
  return prisma.cashShift.findFirst({
    where: {
      branchId,
      cashierId,
      status: "OPEN",
    },
    include: {
      movements: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });
}

export async function cashIn(
  shiftId: string,
  branchId: string,
  userId: string,
  amount: number,
  reason?: string,
  reference?: string
) {
  if (amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const shift = await prisma.cashShift.findFirst({
    where: {
      id: shiftId,
      branchId,
      status: "OPEN",
    },
  });

  if (!shift) {
    throw new Error("Open cash shift not found");
  }

  return prisma.cashMovement.create({
    data: {
      shiftId,
      branchId,
      userId,
      type: "CASH_IN",
      amount,
      reason,
      reference,
    },
  });
}

export async function cashOut(
  shiftId: string,
  branchId: string,
  userId: string,
  amount: number,
  reason?: string,
  reference?: string
) {
  if (amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  const shift = await prisma.cashShift.findFirst({
    where: {
      id: shiftId,
      branchId,
      status: "OPEN",
    },
  });

  if (!shift) {
    throw new Error("Open cash shift not found");
  }

  const current = await calculateExpectedCash(
    shiftId
  );

  if (amount > current.expectedCash) {
    throw new Error(
      "Cash out amount exceeds available cash"
    );
  }

  return prisma.cashMovement.create({
    data: {
      shiftId,
      branchId,
      userId,
      type: "CASH_OUT",
      amount,
      reason,
      reference,
    },
  });
}

export async function calculateExpectedCash(
  shiftId: string
) {
  const shift = await prisma.cashShift.findUnique({
    where: {
      id: shiftId,
    },
  });

  if (!shift) {
    throw new Error("Cash shift not found");
  }

  const sales = await prisma.sale.aggregate({
    where: {
      branchId: shift.branchId,
      cashierId: shift.cashierId,
      status: {
        not: "VOIDED",
      },
      createdAt: {
        gte: shift.openedAt,
      },
    },
    _sum: {
      total: true,
    },
  });

  const cashSales = await prisma.sale.aggregate({
    where: {
      branchId: shift.branchId,
      cashierId: shift.cashierId,
      paymentMethod: "CASH",
      status: {
        not: "VOIDED",
      },
      createdAt: {
        gte: shift.openedAt,
      },
    },
    _sum: {
      total: true,
    },
  });

  const movements =
    await prisma.cashMovement.findMany({
      where: {
        shiftId,
      },
    });

  const cashIn = movements
    .filter((m) => m.type === "CASH_IN")
    .reduce(
      (sum, m) => sum + Number(m.amount),
      0
    );

  const cashOut = movements
    .filter((m) => m.type === "CASH_OUT")
    .reduce(
      (sum, m) => sum + Number(m.amount),
      0
    );

  const openingCash = Number(
    shift.openingCash
  );

  const cashSalesAmount = Number(
    cashSales._sum.total ?? 0
  );

  const expectedCash =
    openingCash +
    cashSalesAmount +
    cashIn -
    cashOut;

  return {
    openingCash,
    totalSales: Number(
      sales._sum.total ?? 0
    ),
    cashSales: cashSalesAmount,
    cashIn,
    cashOut,
    expectedCash,
  };
}

export async function closeCashShift(
  shiftId: string,
  branchId: string,
  cashierId: string,
  closingCash: number
) {
  if (closingCash < 0) {
    throw new Error(
      "Closing cash cannot be negative"
    );
  }

  const shift = await prisma.cashShift.findFirst({
    where: {
      id: shiftId,
      branchId,
      cashierId,
      status: "OPEN",
    },
  });

  if (!shift) {
    throw new Error("Open cash shift not found");
  }

  const expected =
    await calculateExpectedCash(shiftId);

  const difference =
    closingCash - expected.expectedCash;

  return prisma.cashShift.update({
    where: {
      id: shiftId,
    },
    data: {
      closingCash,
      expectedCash: expected.expectedCash,
      difference,
      status: "CLOSED",
      closedAt: new Date(),
    },
  });
}

export async function getCashShiftById(
  id: string,
  branchId: string
) {
  const shift =
    await prisma.cashShift.findFirst({
      where: {
        id,
        branchId,
      },
      include: {
        cashier: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        movements: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

  if (!shift) {
    throw new Error("Cash shift not found");
  }

  const expected =
    shift.status === "OPEN"
      ? await calculateExpectedCash(id)
      : {
          openingCash: Number(
            shift.openingCash
          ),
          expectedCash: Number(
            shift.expectedCash ?? 0
          ),
        };

  return {
    ...shift,
    calculated: expected,
  };
}

export async function getCashShifts(
  branchId: string
) {
  return prisma.cashShift.findMany({
    where: {
      branchId,
    },
    orderBy: {
      openedAt: "desc",
    },
    include: {
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