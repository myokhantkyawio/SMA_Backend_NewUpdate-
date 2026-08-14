import { Response } from "express";

import {
  AuthRequest,
} from "../middleware/auth";

import {
  createCustomerPayment,
} from "../services/customerPayment.service";

function getParam(
  value: string | string[] | undefined
): string {
  return Array.isArray(value)
    ? value[0] ?? ""
    : value ?? "";
}

export async function createCustomerPaymentController(
  req: AuthRequest,
  res: Response
) {
  try {
    const customerId =
      getParam(req.params.customerId);

    const userId = req.user?.id;
    const branchId = req.user?.branchId;

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
        message: "Amount is required",
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
      await createCustomerPayment({
        customerId,
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
        "Customer payment created successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "Customer payment error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create customer payment",
    });
  }
}