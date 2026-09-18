
import { Response } from "express";

import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/auth";

/*
|--------------------------------------------------------------------------
| GET /api/returns
|--------------------------------------------------------------------------
*/

export async function getReturns(
  req: AuthRequest,
  res: Response
) {
  try {
    console.log(
      "GET /api/returns"
    );

    const {
      status,
      productId,
      saleId,
    } = req.query;

    const where = {};

    if (status) {
      where.status = String(status);
    }

    if (productId) {
      where.productId =
        String(productId);
    }

    if (saleId) {
      where.saleId =
        String(saleId);
    }

    console.log(
      "Return query:",
      where
    );

    const returns =
      await prisma.return.findMany({
        where,

        orderBy: {
          createdAt: "desc",
        },

        include: {
          product: true,
        },
      });

    console.log(
      "Returns found:",
      returns.length
    );

    return res.status(200).json({
      success: true,
      data: returns,
    });
  } catch (error) {
    console.error(
      "GET RETURNS ERROR:"
    );

    console.error(error);

    return res.status(500).json({
      success: false,

      message:
        error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
}


/*
|--------------------------------------------------------------------------
| GET /api/returns/:id
|--------------------------------------------------------------------------
*/

export async function getReturnById(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = Array.isArray(
      req.params.id
    )
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
      "GET RETURN ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
}


/*
|--------------------------------------------------------------------------
| POST /api/returns
|--------------------------------------------------------------------------
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
      "CREATE RETURN ERROR:",
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


/*
|--------------------------------------------------------------------------
| POST /api/returns/:id/complete
|--------------------------------------------------------------------------
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

    const id = Array.isArray(
      req.params.id
    )
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
          `Return is already ${existingReturn.status}`,
      });
    }

    const result =
      await prisma.$transaction(
        async (tx) => {

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
                  req.user.userId,
              },
            });

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
        "Return completed successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "COMPLETE RETURN ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to complete return",
    });
  }
}


/*
|--------------------------------------------------------------------------
| POST /api/returns/:id/cancel
|--------------------------------------------------------------------------
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

    const id = Array.isArray(
      req.params.id
    )
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
          `Cannot cancel ${existingReturn.status} return`,
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
      "CANCEL RETURN ERROR:",
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

