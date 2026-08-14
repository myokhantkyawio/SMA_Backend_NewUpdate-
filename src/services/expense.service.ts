import prisma from "../config/prisma";

export async function createExpense(data: {
  branchId: string;
  userId: string;
  title: string;
  amount: number;
  note?: string;
}) {
  if (!data.branchId) {
    throw new Error("Branch is required");
  }

  if (!data.userId) {
    throw new Error("User is required");
  }

  if (!data.title?.trim()) {
    throw new Error("Expense title is required");
  }

  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error("Expense amount must be greater than 0");
  }

  const branch = await prisma.branch.findUnique({
    where: {
      id: data.branchId,
    },
  });

  if (!branch) {
    throw new Error("Branch not found");
  }

  if (!branch.isActive) {
    throw new Error("Branch is inactive");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: data.userId,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return prisma.expense.create({
    data: {
      branchId: data.branchId,
      userId: data.userId,
      title: data.title.trim(),
      amount: data.amount,
      note: data.note?.trim() || null,
    },

    include: {
      branch: true,
      user: {
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

export async function getExpenses(params?: {
  branchId?: string;
  status?: "ACTIVE" | "VOIDED";
  from?: Date;
  to?: Date;
}) {
  return prisma.expense.findMany({
    where: {
      ...(params?.branchId
        ? {
            branchId: params.branchId,
          }
        : {}),

      ...(params?.status
        ? {
            status: params.status,
          }
        : {}),

      ...(params?.from || params?.to
        ? {
            createdAt: {
              ...(params.from
                ? {
                    gte: params.from,
                  }
                : {}),

              ...(params.to
                ? {
                    lte: params.to,
                  }
                : {}),
            },
          }
        : {}),
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      branch: true,

      user: {
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

export async function getExpenseById(
  id: string
) {
  const expense = await prisma.expense.findUnique({
    where: {
      id,
    },

    include: {
      branch: true,

      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!expense) {
    throw new Error("Expense not found");
  }

  return expense;
}

export async function updateExpense(
  id: string,
  data: {
    title?: string;
    amount?: number;
    note?: string | null;
  }
) {
  const expense = await prisma.expense.findUnique({
    where: {
      id,
    },
  });

  if (!expense) {
    throw new Error("Expense not found");
  }

  if (expense.status !== "ACTIVE") {
    throw new Error(
      "Voided expense cannot be edited"
    );
  }

  if (
    data.amount !== undefined &&
    (!Number.isFinite(data.amount) ||
      data.amount <= 0)
  ) {
    throw new Error(
      "Expense amount must be greater than 0"
    );
  }

  return prisma.expense.update({
    where: {
      id,
    },

    data: {
      ...(data.title !== undefined
        ? {
            title: data.title.trim(),
          }
        : {}),

      ...(data.amount !== undefined
        ? {
            amount: data.amount,
          }
        : {}),

      ...(data.note !== undefined
        ? {
            note: data.note?.trim() || null,
          }
        : {}),
    },

    include: {
      branch: true,

      user: {
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

export async function voidExpense(
  id: string
) {
  const expense = await prisma.expense.findUnique({
    where: {
      id,
    },
  });

  if (!expense) {
    throw new Error("Expense not found");
  }

  if (expense.status !== "ACTIVE") {
    throw new Error(
      "Expense is already voided"
    );
  }

  return prisma.expense.update({
    where: {
      id,
    },

    data: {
      status: "VOIDED",
    },

    include: {
      branch: true,

      user: {
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