import { Response } from "express";

import {
  AuthRequest,
} from "../middleware/auth";

import {
  createPurchasePayment,
} from "../services/purchasePayment.service";

function getParam(
  value: string | string[] | undefined
) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export async function createPurchasePaymentController(
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
      amount,
      paymentMethod,
      reference,
      note,
    } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message:
          "Payment amount is required",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message:
          "Payment method is required",
      });
    }

    const result =
      await createPurchasePayment({
        purchaseId,
        branchId,
        userId,
        amount: Number(amount),
        paymentMethod,
        reference,
        note,
      });

    return res.status(201).json({
      success: true,
      message:
        "Purchase payment created successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "Purchase payment error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create purchase payment",
    });
  }
}