import { Response } from "express";

import {
  AuthRequest,
} from "../middleware/auth";

import {
  refundSale,
} from "../services/refund.service";

function getParam(
  value: string | string[] | undefined
): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export async function refundSaleController(
  req: AuthRequest,
  res: Response
) {
  try {
    const saleId = getParam(
      req.params.saleId
    );

    const branchId =
      req.user?.branchId;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message:
          "User is not assigned to a branch",
      });
    }

    if (!saleId) {
      return res.status(400).json({
        success: false,
        message:
          "Sale ID is required",
      });
    }

    const sale =
      await refundSale(
        saleId,
        branchId
      );

    return res.json({
      success: true,
      message:
        "Sale refunded successfully",
      data: sale,
    });
  } catch (error) {
    console.error(
      "Refund error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to refund sale",
    });
  }
}