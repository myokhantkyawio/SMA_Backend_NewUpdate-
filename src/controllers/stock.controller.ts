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

/* =========================================================
   CREATE STOCK TRANSFER
========================================================= */

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

/* =========================================================
   COMPLETE STOCK TRANSFER
========================================================= */

export async function completeTransfer(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Transfer ID is required",
      });
    }

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

/* =========================================================
   CANCEL STOCK TRANSFER
========================================================= */

export async function cancelTransfer(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Transfer ID is required",
      });
    }

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

/* =========================================================
   GET STOCK TRANSFERS
========================================================= */

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

/* =========================================================
   STOCK IN
========================================================= */

/**
 * POST /api/stock/in
 *
 * Body:
 *
 * {
 *   "productId": "xxx",
 *   "quantity": 50,
 *   "supplier": "ABC Distribution",
 *   "receivedDate": "2026-09-18",
 *   "note": "Morning delivery"
 * }
 *
 * Result:
 *
 * Product stock will increase.
 *
 * Example:
 * Current stock = 100
 * Stock in      = 50
 * New stock     = 150
 *
 * And StockMovement history will be created.
 */

export async function stockIn(
  req: AuthRequest,
  res: Response
) {
  try {
    /* -----------------------------------------------------
       AUTH CHECK
    ----------------------------------------------------- */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    /* -----------------------------------------------------
       GET BODY
    ----------------------------------------------------- */

    const {
      productId,
      quantity,
      supplier,
      receivedDate,
      note,
    } = req.body;

    /* -----------------------------------------------------
       PRODUCT ID VALIDATION
    ----------------------------------------------------- */

    if (
      !productId ||
      typeof productId !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product ID is required",
      });
    }

    /* -----------------------------------------------------
       QUANTITY VALIDATION
    ----------------------------------------------------- */

    const parsedQuantity =
      Number(quantity);

    if (
      !Number.isInteger(
        parsedQuantity
      ) ||
      parsedQuantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be a positive whole number",
      });
    }

    /* -----------------------------------------------------
       RECEIVED DATE
    ----------------------------------------------------- */

    let parsedReceivedDate:
      Date | null = null;

    if (receivedDate) {
      const date =
        new Date(receivedDate);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid received date",
        });
      }

      parsedReceivedDate = date;
    }

    /* -----------------------------------------------------
       FIND PRODUCT
    ----------------------------------------------------- */

    const product =
      await prisma.product.findUnique({
        where: {
          id: productId,
        },
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found",
      });
    }

    /* -----------------------------------------------------
       STOCK IN TRANSACTION
    ----------------------------------------------------- */

    const result =
      await prisma.$transaction(
        async (tx) => {
          /* ---------------------------------------------
             INCREASE PRODUCT STOCK
          --------------------------------------------- */

          const updatedProduct =
            await tx.product.update({
              where: {
                id: productId,
              },

              data: {
                stock: {
                  increment:
                    parsedQuantity,
                },
              },
            });

          /* ---------------------------------------------
             CREATE STOCK MOVEMENT
          --------------------------------------------- */

          const movement =
            await tx.stockMovement.create({
              data: {
                productId,

                quantity:
                  parsedQuantity,

                type: "STOCK_IN",

                supplier:
                  typeof supplier ===
                    "string" &&
                  supplier.trim()
                    ? supplier.trim()
                    : null,

                receivedDate:
                  parsedReceivedDate,

                note:
                  typeof note ===
                    "string" &&
                  note.trim()
                    ? note.trim()
                    : null,

                createdById:
                  req.user?.userId ||
                  null,
              },
            });

          return {
            product:
              updatedProduct,

            movement,
          };
        }
      );

    /* -----------------------------------------------------
       SUCCESS
    ----------------------------------------------------- */

    return res.status(201).json({
      success: true,

      message:
        "Stock received successfully",

      data: result,
    });
  } catch (error) {
    console.error(
      "Stock in error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to receive stock",
    });
  }
}

/* =========================================================
   GET STOCK HISTORY
========================================================= */

/**
 * GET /api/stock/history
 *
 * Optional query:
 *
 * ?productId=xxx
 * ?type=STOCK_IN
 */

export async function getStockHistory(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      productId,
      type,
    } = req.query;

    const history =
      await prisma.stockMovement.findMany({
        where: {
          ...(productId
            ? {
                productId:
                  String(productId),
              }
            : {}),

          ...(type
            ? {
                type:
                  String(type) as any,
              }
            : {}),
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {
          product: true,
        },
      });

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error(
      "Get stock history error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
}