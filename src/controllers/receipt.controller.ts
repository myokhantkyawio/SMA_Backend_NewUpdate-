import { Request, Response } from "express";

import {
  getReceiptBySaleId,
} from "../services/receipt.service";

export async function getReceipt(
  req: Request,
  res: Response
) {
  try {
    const saleId = req.params.saleId;

    if (typeof saleId !== "string" || !saleId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Sale ID is required",
      });
    }

    const receipt =
      await getReceiptBySaleId(saleId);

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: "Receipt not found",
      });
    }

    return res.json({
      success: true,
      data: receipt,
    });
  } catch (error: any) {
    console.error(
      "Get receipt error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to get receipt",
    });
  }
}