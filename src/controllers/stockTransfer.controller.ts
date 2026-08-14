import { Response } from "express";
import { AuthRequest } from "../middleware/auth";

import {
  createTransfer,
  completeTransfer,
} from "../services/stockTransfer.service";

function getParam(
  value: string | string[] | undefined
): string {
  return Array.isArray(value)
    ? value[0] ?? ""
    : value ?? "";
}

export async function createTransferController(
  req: AuthRequest,
  res: Response
) {
  try {
    const fromBranchId = req.user?.branchId;

    if (!fromBranchId) {
      return res.status(400).json({
        success: false,
        message: "User has no branch",
      });
    }

    const {
      toBranchId,
      note,
      items,
    } = req.body;

    if (!toBranchId) {
      return res.status(400).json({
        success: false,
        message: "Destination branch is required",
      });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "Items must be an array",
      });
    }

    const transfer = await createTransfer({
      fromBranchId,
      toBranchId,
      note,
      items,
    });

    return res.status(201).json({
      success: true,
      message: "Stock transfer created",
      data: transfer,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create transfer",
    });
  }
}

export async function completeTransferController(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getParam(req.params.id);

    const transfer =
      await completeTransfer(id);

    return res.json({
      success: true,
      message: "Stock transfer completed",
      data: transfer,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to complete transfer",
    });
  }
}