import { Response } from "express";

import {
  AuthRequest,
} from "../middleware/auth";

import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  voidExpense,
} from "../services/expense.service";

function getId(
  req: AuthRequest
): string {
  const id = req.params.id;

  return Array.isArray(id)
    ? id[0]
    : id;
}

export async function createExpenseController(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      branchId,
      title,
      amount,
      note,
    } = req.body;

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const expense =
      await createExpense({
        branchId: String(branchId),
        userId,
        title: String(title),
        amount: Number(amount),
        note,
      });

    return res.status(201).json({
      success: true,
      message:
        "Expense created successfully",
      data: expense,
    });
  } catch (error) {
    console.error(
      "Create expense error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create expense",
    });
  }
}

export async function getExpensesController(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      branchId,
      status,
      from,
      to,
    } = req.query;

    let fromDate: Date | undefined;
    let toDate: Date | undefined;

    if (from) {
      fromDate = new Date(
        String(from)
      );

      if (Number.isNaN(fromDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid from date",
        });
      }
    }

    if (to) {
      toDate = new Date(
        String(to)
      );

      if (Number.isNaN(toDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid to date",
        });
      }
    }

    const expenses =
      await getExpenses({
        branchId: branchId
          ? String(branchId)
          : undefined,

        status:
          status === "ACTIVE" ||
          status === "VOIDED"
            ? status
            : undefined,

        from: fromDate,
        to: toDate,
      });

    return res.json({
      success: true,
      data: expenses,
    });
  } catch (error) {
    console.error(
      "Get expenses error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
}

export async function getExpenseController(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const expense =
      await getExpenseById(id);

    return res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Expense not found",
    });
  }
}

export async function updateExpenseController(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const {
      title,
      amount,
      note,
    } = req.body;

    const expense =
      await updateExpense(id, {
        title,
        amount:
          amount !== undefined
            ? Number(amount)
            : undefined,
        note,
      });

    return res.json({
      success: true,
      message:
        "Expense updated successfully",
      data: expense,
    });
  } catch (error) {
    console.error(
      "Update expense error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update expense",
    });
  }
}

export async function voidExpenseController(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const expense =
      await voidExpense(id);

    return res.json({
      success: true,
      message:
        "Expense voided successfully",
      data: expense,
    });
  } catch (error) {
    console.error(
      "Void expense error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to void expense",
    });
  }
}