import { Response } from "express";

import {
  AuthRequest,
} from "../middleware/auth";

import {
  createPurchaseReturn,
} from "../services/purchaseReturn.service";

function getParam(
  value: string | string[] | undefined
) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export async function createPurchaseReturnController(
  req: AuthRequest,
  res: Response
) {
  try {
    const purchaseId =
      getParam(
        req.params.purchaseId
      );

    const userId =
      req.user?.id;

    const branchId =
      req.user?.branchId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message:
          "User is not assigned to a branch",
      });
    }

    const {
      items,
      reason,
    } = req.body;

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Return items are required",
      });
    }

    const result =
      await createPurchaseReturn({
        purchaseId,
        branchId,
        userId,
        reason,
        items,
      });

    return res.status(201).json({
      success: true,
      message:
        "Purchase return created successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "Purchase return error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create purchase return",
    });
  }
}