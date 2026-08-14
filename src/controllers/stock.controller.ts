import { Response } from "express";

import prisma from "../config/prisma";

import {
  createStockTransfer,
  completeStockTransfer,
  cancelStockTransfer,
} from "../services/stock.service";

import {
  AuthRequest,
} from "../middleware/auth";

function getId(req: AuthRequest): string {
  const id = req.params.id;

  return Array.isArray(id)
    ? id[0]
    : id;
}
export async function createTransfer(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      fromBranchId,
      toBranchId,
      note,
      items,
    } = req.body;

    if (
      !fromBranchId ||
      !toBranchId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "fromBranchId and toBranchId are required",
      });
    }

    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message:
          "items must be an array",
      });
    }

    const transfer =
      await createStockTransfer(
        String(fromBranchId),
        String(toBranchId),
        items,
        note
      );

    return res.status(201).json({
      success: true,
      message:
        "Stock transfer created successfully",
      data: transfer,
    });
  } catch (error) {
    console.error(
      "Create transfer error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create transfer",
    });
  }
}
export async function completeTransfer(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const transfer =
      await completeStockTransfer(id);

    return res.status(200).json({
      success: true,
      message:
        "Stock transfer completed successfully",
      data: transfer,
    });
  } catch (error) {
    console.error(
      "Complete transfer error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to complete transfer",
    });
  }
}
export async function cancelTransfer(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const transfer =
      await cancelStockTransfer(id);

    return res.status(200).json({
      success: true,
      message:
        "Stock transfer cancelled successfully",
      data: transfer,
    });
  } catch (error) {
    console.error(
      "Cancel transfer error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to cancel transfer",
    });
  }
}
export async function getTransfers(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      fromBranchId,
      toBranchId,
      status,
    } = req.query;

    const transfers =
      await prisma.stockTransfer.findMany({
        where: {
          ...(fromBranchId
            ? {
                fromBranchId:
                  String(fromBranchId),
              }
            : {}),

          ...(toBranchId
            ? {
                toBranchId:
                  String(toBranchId),
              }
            : {}),

          ...(status
            ? {
                status:
                  status as any,
              }
            : {}),
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {
          fromBranch: true,
          toBranch: true,

          items: {
            include: {
              product: true,
            },
          },
        },
      });

    return res.status(200).json({
      success: true,
      data: transfers,
    });
  } catch (error) {
    console.error(
      "Get transfers error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
}