import { Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/auth";

function getId(req: AuthRequest): string {
  const id = req.params.id;

  return Array.isArray(id) ? id[0] : id;
}

// CREATE PURCHASE
export async function createPurchase(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      invoiceNumber,
      supplierId,
      branchId,
      discount = 0,
      tax = 0,
      purchasedAt,
      items,
    } = req.body;

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (
      !invoiceNumber ||
      !branchId ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "invoiceNumber, branchId and items are required",
      });
    }

    // Check branch
    const branch =
      await prisma.branch.findUnique({
        where: {
          id: String(branchId),
        },
      });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    // Check supplier
    if (supplierId) {
      const supplier =
        await prisma.supplier.findUnique({
          where: {
            id: String(supplierId),
          },
        });

      if (!supplier) {
        return res.status(404).json({
          success: false,
          message: "Supplier not found",
        });
      }

      if (!supplier.isActive) {
        return res.status(400).json({
          success: false,
          message: "Supplier is inactive",
        });
      }
    }

    // Check invoice
    const existingInvoice =
      await prisma.purchase.findUnique({
        where: {
          invoiceNumber: String(
            invoiceNumber
          ),
        },
      });

    if (existingInvoice) {
      return res.status(409).json({
        success: false,
        message: "Invoice number already exists",
      });
    }

    let subtotal = 0;

    const preparedItems: {
      productId: string;
      quantity: number;
      costPrice: number;
      total: number;
    }[] = [];

    for (const item of items) {
      if (
        !item.productId ||
        item.quantity === undefined ||
        item.costPrice === undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Each item requires productId, quantity and costPrice",
        });
      }

      const quantity = Number(item.quantity);
      const costPrice = Number(item.costPrice);

      if (
        quantity <= 0 ||
        costPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid quantity or costPrice",
        });
      }

      const product =
        await prisma.product.findUnique({
          where: {
            id: String(item.productId),
          },
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            `Product not found: ${item.productId}`,
        });
      }

      if (product.status !== "ACTIVE") {
        return res.status(400).json({
          success: false,
          message:
            `Product is inactive: ${product.name}`,
        });
      }

      const total = quantity * costPrice;

      subtotal += total;

      preparedItems.push({
        productId: String(item.productId),
        quantity,
        costPrice,
        total,
      });
    }

    const discountAmount = Number(discount);
    const taxAmount = Number(tax);

    if (
      discountAmount < 0 ||
      taxAmount < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Discount and tax cannot be negative",
      });
    }

    const total =
      subtotal -
      discountAmount +
      taxAmount;

    if (total < 0) {
      return res.status(400).json({
        success: false,
        message: "Total cannot be negative",
      });
    }

    // Atomic transaction
    const purchase =
      await prisma.$transaction(async (tx) => {
        const createdPurchase =
          await tx.purchase.create({
            data: {
              invoiceNumber: String(
                invoiceNumber
              ),
              supplierId: supplierId
                ? String(supplierId)
                : null,
              branchId: String(branchId),
              userId,

              subtotal,
              discount: discountAmount,
              tax: taxAmount,
              total,

              status: "RECEIVED",

              purchasedAt:
                purchasedAt
                  ? new Date(purchasedAt)
                  : new Date(),

              items: {
                create:
                  preparedItems.map(
                    (item) => ({
                      productId:
                        item.productId,
                      quantity:
                        item.quantity,
                      costPrice:
                        item.costPrice,
                      total:
                        item.total,
                    })
                  ),
              },
            },

            include: {
              supplier: true,
              branch: true,
              user: {
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

        // Update stock
        for (const item of preparedItems) {
          const productBranch =
            await tx.productBranch.findUnique(
              {
                where: {
                  productId_branchId: {
                    productId:
                      item.productId,
                    branchId:
                      String(branchId),
                  },
                },
              }
            );

          if (!productBranch) {
            throw new Error(
              `Product is not assigned to branch: ${item.productId}`
            );
          }

          await tx.productBranch.update({
            where: {
              productId_branchId: {
                productId:
                  item.productId,
                branchId:
                  String(branchId),
              },
            },

            data: {
              stock: {
                increment:
                  item.quantity,
              },

              // Update cost price
              product: {
                update: {
                  costPrice:
                    item.costPrice,
                },
              },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId:
                item.productId,
              branchId:
                String(branchId),
              type: "PURCHASE",
              quantity:
                item.quantity,
              referenceId:
                createdPurchase.id,
              note: `Purchase ${createdPurchase.invoiceNumber}`,
            },
          });
        }

        return createdPurchase;
      });

    return res.status(201).json({
      success: true,
      message:
        "Purchase created and stock updated successfully",
      data: purchase,
    });
  } catch (error) {
    console.error(
      "Create purchase error:",
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

// GET ALL PURCHASES
export async function getPurchases(
  req: AuthRequest,
  res: Response
) {
  try {
    const { branchId, supplierId, status } =
      req.query;

    const purchases =
      await prisma.purchase.findMany({
        where: {
          ...(branchId
            ? {
                branchId: String(branchId),
              }
            : {}),

          ...(supplierId
            ? {
                supplierId:
                  String(supplierId),
              }
            : {}),

          ...(status
            ? {
                status: status as any,
              }
            : {}),
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {
          supplier: true,
          branch: true,
          user: {
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
      data: purchases,
    });
  } catch (error) {
    console.error(
      "Get purchases error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// GET PURCHASE BY ID
export async function getPurchaseById(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const purchase =
      await prisma.purchase.findUnique({
        where: {
          id,
        },

        include: {
          supplier: true,
          branch: true,

          user: {
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

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    console.error(
      "Get purchase error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}