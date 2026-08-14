import { Response } from "express";
import prisma from "../config/prisma";
import {
  AuthRequest,
} from "../middleware/auth";

import {
  createSale,
  voidSale,
  refundSale,
} from "../services/sale.service";
import {
  createAuditLog,
} from "../services/audit.service";
function getId(req: AuthRequest): string {
  const id = req.params.id;

  return Array.isArray(id) ? id[0] : id;
}

export async function createSaleController(
  req: AuthRequest,
  res: Response
) {
  try {
    const cashierId = req.user?.id;

    if (!cashierId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const {
      branchId,
      discount,
      tax,
      paidAmount,
      paymentMethod,
      items,
    } = req.body;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "branchId is required",
      });
    }

    if (
      paidAmount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "paidAmount is required",
      });
    }

    const validPaymentMethods = [
      "CASH",
      "CARD",
      "KBZPAY",
      "WAVE",
      "OTHER",
    ];

    if (
      !validPaymentMethods.includes(
        paymentMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid payment method",
      });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: "items must be an array",
      });
    }

    const sale = await createSale({
      branchId: String(branchId),
      cashierId,

      discount:
        discount !== undefined
          ? Number(discount)
          : 0,

      tax:
        tax !== undefined
          ? Number(tax)
          : 0,

      paidAmount:
        Number(paidAmount),

      paymentMethod,

      items,
    });
    await createAuditLog({
  userId: req.user?.id,
  branchId: req.user?.branchId ?? undefined,

  action: "CREATE",

  module: "SALE",

  entityId: sale.id,

  description:
    `Sale ${sale.receiptNumber} created`,

  newData: {
    receiptNumber:
      sale.receiptNumber,
    total: Number(sale.total),
    paymentMethod:
      sale.paymentMethod,
  },

  ipAddress:
    req.ip,

  userAgent:
    req.get("user-agent"),
});

    return res.status(201).json({
      success: true,
      message: "Sale completed successfully",
      data: sale,
    });
  } catch (error) {
    console.error(
      "Create sale error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to complete sale",
    });
  }
}

// GET ALL SALES
export async function getSales(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      branchId,
      cashierId,
      status,
      paymentMethod,
    } = req.query;

    const sales =
      await prisma.sale.findMany({
        where: {
          ...(branchId
            ? {
                branchId:
                  String(branchId),
              }
            : {}),

          ...(cashierId
            ? {
                cashierId:
                  String(cashierId),
              }
            : {}),

          ...(status
            ? {
                status: status as any,
              }
            : {}),

          ...(paymentMethod
            ? {
                paymentMethod:
                  paymentMethod as any,
              }
            : {}),
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {
          branch: true,

          cashier: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },

          items: {
            include: {
              product: true,
            },
          },
        },
      });

    return res.status(200).json({
      success: true,
      data: sales,
    });
  } catch (error) {
    console.error(
      "Get sales error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// GET ONE SALE
export async function getSaleById(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const sale =
      await prisma.sale.findUnique({
        where: {
          id,
        },

        include: {
          branch: true,

          cashier: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },

          items: {
            include: {
              product: true,
            },
          },
        },
      });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: sale,
    });
  } catch (error) {
    console.error(
      "Get sale error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}
export async function voidSaleController(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const sale = await voidSale(id);

    return res.status(200).json({
      success: true,
      message: "Sale voided successfully",
      data: sale,
    });
  } catch (error) {
    console.error(
      "Void sale error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to void sale",
    });
  }
}
export async function refundSaleController(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const sale = await refundSale(id);

    return res.status(200).json({
      success: true,
      message: "Sale refunded successfully",
      data: sale,
    });
  } catch (error) {
    console.error(
      "Refund sale error:",
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