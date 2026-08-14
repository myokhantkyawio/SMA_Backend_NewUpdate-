import { Response } from "express";

import {
  AuthRequest,
} from "../middleware/auth";

import {
  openShift,
  getCurrentShift,
  getShiftSummary,
  closeShift,
} from "../services/cashierShift.service";

function getId(
  req: AuthRequest
): string {
  const id = req.params.id;

  return Array.isArray(id)
    ? id[0]
    : id;
}

export async function openShiftController(
  req: AuthRequest,
  res: Response
) {
  try {
    const cashierId =
      req.user?.id;

    if (!cashierId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const {
      branchId,
      openingCash,
    } = req.body;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message:
          "Branch ID is required",
      });
    }

    const shift =
      await openShift({
        branchId: String(branchId),
        cashierId,
        openingCash:
          Number(openingCash),
      });

    return res.status(201).json({
      success: true,
      message:
        "Cashier shift opened successfully",
      data: shift,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to open shift",
    });
  }
}
export async function currentShiftController(
  req: AuthRequest,
  res: Response
) {
  try {
    const cashierId =
      req.user?.id;

    if (!cashierId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const shift =
      await getCurrentShift(
        cashierId
      );

    return res.json({
      success: true,
      data: shift,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to get current shift",
    });
  }
}
export async function shiftSummaryController(
  req: AuthRequest,
  res: Response
) {
  try {
    const summary =
      await getShiftSummary(
        getId(req)
      );

    return res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Shift not found",
    });
  }
}
export async function closeShiftController(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      closingCash,
    } = req.body;

    if (
      closingCash === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Closing cash is required",
      });
    }

    const shift =
      await closeShift(
        getId(req),
        Number(closingCash)
      );

    return res.json({
      success: true,
      message:
        "Cashier shift closed successfully",
      data: shift,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to close shift",
    });
  }
}