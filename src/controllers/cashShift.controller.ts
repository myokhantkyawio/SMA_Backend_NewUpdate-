import { Response } from "express";
import { AuthRequest } from "../middleware/auth";

import {
  openCashShift,
  getCurrentCashShift,
  cashIn,
  cashOut,
  closeCashShift,
  getCashShiftById,
  getCashShifts,
} from "../services/cashShift.service";

/**
 * Helper
 * Express params can be typed as string | string[]
 * We only accept a single string shiftId.
 */
function getShiftId(req: AuthRequest): string | null {
  const value = req.params.shiftId;

  if (typeof value !== "string") {
    return null;
  }

  if (!value.trim()) {
    return null;
  }

  return value;
}

/**
 * OPEN CASH SHIFT
 */
export async function openShift(
  req: AuthRequest,
  res: Response
) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!user.branchId) {
      return res.status(400).json({
        success: false,
        message: "User is not assigned to a branch",
      });
    }

    const openingCash = Number(req.body.openingCash);

    const note =
      req.body.note !== undefined &&
      req.body.note !== null
        ? String(req.body.note)
        : undefined;

    if (
      !Number.isFinite(openingCash) ||
      openingCash < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid openingCash",
      });
    }

    const shift = await openCashShift(
      user.branchId,
      user.id,
      openingCash,
      note
    );

    return res.status(201).json({
      success: true,
      message: "Cash shift opened successfully",
      data: shift,
    });
  } catch (error: any) {
    console.error("Open cash shift error:", error);

    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "Failed to open cash shift",
    });
  }
}

/**
 * GET CURRENT CASH SHIFT
 */
export async function currentShift(
  req: AuthRequest,
  res: Response
) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!user.branchId) {
      return res.status(400).json({
        success: false,
        message: "Branch is required",
      });
    }

    const shift =
      await getCurrentCashShift(
        user.branchId,
        user.id
      );

    if (!shift) {
      return res.json({
        success: true,
        data: null,
        message: "No open cash shift",
      });
    }

    return res.json({
      success: true,
      data: shift,
    });
  } catch (error: any) {
    console.error(
      "Get current cash shift error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to get current shift",
    });
  }
}

/**
 * CASH IN
 */
export async function cashInController(
  req: AuthRequest,
  res: Response
) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!user.branchId) {
      return res.status(400).json({
        success: false,
        message: "Branch is required",
      });
    }

    const shiftId = getShiftId(req);

    if (!shiftId) {
      return res.status(400).json({
        success: false,
        message: "Valid shiftId is required",
      });
    }

    const amount = Number(req.body.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    const reason =
      req.body.reason !== undefined &&
      req.body.reason !== null
        ? String(req.body.reason)
        : undefined;

    const reference =
      req.body.reference !== undefined &&
      req.body.reference !== null
        ? String(req.body.reference)
        : undefined;

    const movement = await cashIn(
      shiftId,
      user.branchId,
      user.id,
      amount,
      reason,
      reference
    );

    return res.status(201).json({
      success: true,
      message: "Cash in recorded",
      data: movement,
    });
  } catch (error: any) {
    console.error("Cash in error:", error);

    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "Failed to record cash in",
    });
  }
}

/**
 * CASH OUT
 */
export async function cashOutController(
  req: AuthRequest,
  res: Response
) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!user.branchId) {
      return res.status(400).json({
        success: false,
        message: "Branch is required",
      });
    }

    const shiftId = getShiftId(req);

    if (!shiftId) {
      return res.status(400).json({
        success: false,
        message: "Valid shiftId is required",
      });
    }

    const amount = Number(req.body.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    const reason =
      req.body.reason !== undefined &&
      req.body.reason !== null
        ? String(req.body.reason)
        : undefined;

    const reference =
      req.body.reference !== undefined &&
      req.body.reference !== null
        ? String(req.body.reference)
        : undefined;

    const movement = await cashOut(
      shiftId,
      user.branchId,
      user.id,
      amount,
      reason,
      reference
    );

    return res.status(201).json({
      success: true,
      message: "Cash out recorded",
      data: movement,
    });
  } catch (error: any) {
    console.error("Cash out error:", error);

    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "Failed to record cash out",
    });
  }
}

/**
 * CLOSE CASH SHIFT
 */
export async function closeShift(
  req: AuthRequest,
  res: Response
) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!user.branchId) {
      return res.status(400).json({
        success: false,
        message: "Branch is required",
      });
    }

    const shiftId = getShiftId(req);

    if (!shiftId) {
      return res.status(400).json({
        success: false,
        message: "Valid shiftId is required",
      });
    }

    const closingCash = Number(
      req.body.closingCash
    );

    if (
      !Number.isFinite(closingCash) ||
      closingCash < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid closingCash",
      });
    }

    const shift =
      await closeCashShift(
        shiftId,
        user.branchId,
        user.id,
        closingCash
      );

    return res.json({
      success: true,
      message: "Cash shift closed successfully",
      data: shift,
    });
  } catch (error: any) {
    console.error(
      "Close cash shift error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error?.message ||
        "Failed to close cash shift",
    });
  }
}

/**
 * GET SHIFT DETAIL
 */
export async function shiftDetail(
  req: AuthRequest,
  res: Response
) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!user.branchId) {
      return res.status(400).json({
        success: false,
        message: "Branch is required",
      });
    }

    const shiftId = getShiftId(req);

    if (!shiftId) {
      return res.status(400).json({
        success: false,
        message: "Valid shiftId is required",
      });
    }

    const shift =
      await getCashShiftById(
        shiftId,
        user.branchId
      );

    if (!shift) {
      return res.status(404).json({
        success: false,
        message: "Cash shift not found",
      });
    }

    return res.json({
      success: true,
      data: shift,
    });
  } catch (error: any) {
    console.error(
      "Get cash shift detail error:",
      error
    );

    return res.status(404).json({
      success: false,
      message:
        error?.message ||
        "Cash shift not found",
    });
  }
}

/**
 * GET CASH SHIFT LIST
 */
export async function shiftList(
  req: AuthRequest,
  res: Response
) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!user.branchId) {
      return res.status(400).json({
        success: false,
        message: "Branch is required",
      });
    }

    const shifts =
      await getCashShifts(
        user.branchId
      );

    return res.json({
      success: true,
      data: shifts,
    });
  } catch (error: any) {
    console.error(
      "Get cash shifts error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to load cash shifts",
    });
  }
}