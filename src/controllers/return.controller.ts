import { Response } from "express";

import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/auth";

/**
 * GET /api/returns
 *
 * Get all returns
 */
export async function getReturns(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      status,
      productId,
      saleId,
    } = req.query;

    const returns =
      await prisma.return.findMany({
        where: {
          ...(status
            ? {
                status:
                  String(status) as any,
              }
            : {}),

          ...(productId
            ? {
                productId:
                  String(productId),
              }
            : {}),

          ...(saleId
            ? {
                saleId:
                  String(saleId),
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
      data: returns,
    });
  } catch (error) {
    console.error(
      "Get returns error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
}


/**
 * GET /api/returns/:id
 *
 * Get single return
 */
export async function getReturnById(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Return ID is required",
      });
    }

    const returnItem =
      await prisma.return.findUnique({
        where: {
          id,
        },

        include: {
          product: true,
        },
      });

    if (!returnItem) {
      return res.status(404).json({
        success: false,
        message:
          "Return not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: returnItem,
    });
  } catch (error) {
    console.error(
      "Get return error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
}


/**
 * POST /api/returns
 *
 * Create new return
 *
 * IMPORTANT:
 * Creating a return does NOT change stock.
 *
 * Stock is restored only when
 * the return is COMPLETED.
 */
export async function createReturn(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const {
      saleId,
      productId,
      customerName,
      quantity,
      amount,
      reason,
    } = req.body;

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

    const parsedAmount =
      Number(amount);

    if (
      !Number.isFinite(
        parsedAmount
      ) ||
      parsedAmount < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Amount must be a valid number",
      });
    }

    if (
      !reason ||
      typeof reason !== "string" ||
      !reason.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Return reason is required",
      });
    }

    /**
     * Check product
     */
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

    /**
     * Create pending return
     *
     * Do NOT increase stock here.
     */
    const returnItem =
      await prisma.return.create({
        data: {
          saleId:
            typeof saleId === "string" &&
            saleId.trim()
              ? saleId.trim()
              : null,

          productId,

          customerName:
            typeof customerName ===
              "string" &&
            customerName.trim()
              ? customerName.trim()
              : null,

          quantity:
            parsedQuantity,

          amount:
            parsedAmount,

          reason:
            reason.trim(),

          status:
            "PENDING",

          createdById:
            req.user.userId,
        },

        include: {
          product: true,
        },
      });

    return res.status(201).json({
      success: true,
      message:
        "Return created successfully",
      data: returnItem,
    });
  } catch (error) {
    console.error(
      "Create return error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create return",
    });
  }
}


/**
 * POST /api/returns/:id/complete
 *
 * Complete return
 *
 * This will:
 *
 * 1. Check return
 * 2. Check pending status
 * 3. Increase product stock
 * 4. Create StockMovement RETURN
 * 5. Change return status to COMPLETED
 *
 * Everything happens inside one transaction.
 */
export async function completeReturn(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Return ID is required",
      });
    }

    /**
     * Get return first
     */
    const existingReturn =
      await prisma.return.findUnique({
        where: {
          id,
        },
      });

    if (!existingReturn) {
      return res.status(404).json({
        success: false,
        message:
          "Return not found",
      });
    }

    /**
     * Only PENDING return can be completed
     */
    if (
      existingReturn.status !==
      "PENDING"
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Return is already ${existingReturn.status.toLowerCase()}`,
      });
    }

    /**
     * Transaction
     */
    const result =
      await prisma.$transaction(
        async (tx) => {

          /**
           * Check product again
           * inside transaction
           */
          const product =
            await tx.product.findUnique({
              where: {
                id:
                  existingReturn.productId,
              },
            });

          if (!product) {
            throw new Error(
              "Product not found"
            );
          }

          /**
           * Increase stock
           */
          const updatedProduct =
            await tx.product.update({
              where: {
                id:
                  existingReturn.productId,
              },

              data: {
                stock: {
                  increment:
                    existingReturn.quantity,
                },
              },
            });

          /**
           * Create stock movement
           */
          const movement =
            await tx.stockMovement.create({
              data: {
                productId:
                  existingReturn.productId,

                quantity:
                  existingReturn.quantity,

                type:
                  "RETURN",

                note:
                  `Product return ${existingReturn.id}`,

                createdById:
                  req.user?.userId ||
                  null,
              },
            });

          /**
           * Update return status
           */
          const updatedReturn =
            await tx.return.update({
              where: {
                id,
              },

              data: {
                status:
                  "COMPLETED",
              },

              include: {
                product: true,
              },
            });

          return {
            returnItem:
              updatedReturn,

            product:
              updatedProduct,

            movement,
          };
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Return completed successfully. Stock has been restored.",
      data: result,
    });
  } catch (error) {
    console.error(
      "Complete return error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to complete return",
    });
  }
}


/**
 * POST /api/returns/:id/cancel
 *
 * Cancel pending return
 */
export async function cancelReturn(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Return ID is required",
      });
    }

    const existingReturn =
      await prisma.return.findUnique({
        where: {
          id,
        },
      });

    if (!existingReturn) {
      return res.status(404).json({
        success: false,
        message:
          "Return not found",
      });
    }

    if (
      existingReturn.status !==
      "PENDING"
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Cannot cancel ${existingReturn.status.toLowerCase()} return`,
      });
    }

    const cancelledReturn =
      await prisma.return.update({
        where: {
          id,
        },

        data: {
          status:
            "CANCELLED",
        },

        include: {
          product: true,
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Return cancelled successfully",
      data: cancelledReturn,
    });
  } catch (error) {
    console.error(
      "Cancel return error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to cancel return",
    });
  }
}