import { Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/auth";

function getId(req: AuthRequest): string {
  const id = req.params.id;

  if (Array.isArray(id)) {
    return id[0];
  }

  return id;
}


export async function createProduct(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      name,
      costPrice,
      sellingPrice,
      unit,
      categoryId,
      branchId,
      stock,
      minStock,
      maxStock,
    } = req.body;

    /* =================================
       VALIDATION
    ================================= */

    if (
      !name ||
      costPrice === undefined ||
      sellingPrice === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, costPrice and sellingPrice are required",
      });
    }

    /* =================================
       CHECK CATEGORY
    ================================= */

    if (categoryId) {
      const category =
        await prisma.category.findUnique({
          where: {
            id: String(categoryId),
          },
        });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
    }

    /* =================================
       CHECK BRANCH
    ================================= */

    if (branchId) {
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
    }

    /* =================================
       CREATE PRODUCT
    ================================= */

    const product =
      await prisma.product.create({
        data: {
          name: String(name).trim(),

          costPrice: Number(costPrice),

          sellingPrice: Number(
            sellingPrice
          ),

          unit: unit
            ? String(unit).trim()
            : "pcs",

          categoryId: categoryId
            ? String(categoryId)
            : null,

          branches: branchId
            ? {
                create: {
                  branchId:
                    String(branchId),

                  stock:
                    stock !== undefined &&
                    stock !== ""
                      ? Number(stock)
                      : 0,

                  minStock:
                    minStock !== undefined &&
                    minStock !== ""
                      ? Number(minStock)
                      : 0,

                  maxStock:
                    maxStock !== undefined &&
                    maxStock !== ""
                      ? Number(maxStock)
                      : null,
                },
              }
            : undefined,
        },

        include: {
          category: true,

          branches: {
            include: {
              branch: true,
            },
          },
        },
      });

    /* =================================
       SUCCESS
    ================================= */

    return res.status(201).json({
      success: true,

      message:
        "Product created successfully",

      data: product,
    });
  } catch (error) {
    console.error(
      "Create product error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Internal server error",
    });
  }
}
// GET ALL PRODUCTS
export async function getProducts(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      search,
      categoryId,
      branchId,
      status,
    } = req.query;

    const products =
      await prisma.product.findMany({
        where: {
          ...(search
            ? {
                OR: [
                  {
                    name: {
                      contains: String(search),
                      mode: "insensitive",
                    },
                  },
                  {
                    sku: {
                      contains: String(search),
                      mode: "insensitive",
                    },
                  },
                  {
                    barcode: {
                      contains: String(search),
                      mode: "insensitive",
                    },
                  },
                ],
              }
            : {}),

          ...(categoryId
            ? {
                categoryId: String(categoryId),
              }
            : {}),

          ...(status
            ? {
                status: status as any,
              }
            : {}),

          ...(branchId
            ? {
                branches: {
                  some: {
                    branchId: String(branchId),
                  },
                },
              }
            : {}),
        },

        orderBy: {
          createdAt: "desc",
        },

        include: {
          category: true,

          branches: {
            include: {
              branch: true,
            },
          },
        },
      });

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// GET PRODUCT BY ID
export async function getProductById(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const product =
      await prisma.product.findUnique({
        where: {
          id,
        },

        include: {
          category: true,

          branches: {
            include: {
              branch: true,
            },
          },
        },
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error(
      "Get product error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// UPDATE PRODUCT
export async function updateProduct(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const {
      sku,
      barcode,
      name,
      description,
      costPrice,
      sellingPrice,
      unit,
      categoryId,
    } = req.body;

    const existingProduct =
      await prisma.product.findUnique({
        where: {
          id,
        },
      });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (sku !== undefined) {
      const skuExists =
        await prisma.product.findFirst({
          where: {
            sku: String(sku).trim(),
          },
        });

      if (
        skuExists &&
        skuExists.id !== id
      ) {
        return res.status(409).json({
          success: false,
          message: "SKU already exists",
        });
      }
    }

    if (barcode !== undefined && barcode) {
      const barcodeExists =
        await prisma.product.findFirst({
          where: {
            barcode: String(barcode).trim(),
          },
        });

      if (
        barcodeExists &&
        barcodeExists.id !== id
      ) {
        return res.status(409).json({
          success: false,
          message: "Barcode already exists",
        });
      }
    }

    const product =
      await prisma.product.update({
        where: {
          id,
        },

        data: {
          ...(sku !== undefined && {
            sku: String(sku).trim(),
          }),

          ...(barcode !== undefined && {
            barcode: barcode
              ? String(barcode).trim()
              : null,
          }),

          ...(name !== undefined && {
            name: String(name).trim(),
          }),

          ...(description !== undefined && {
            description: description
              ? String(description).trim()
              : null,
          }),

          ...(costPrice !== undefined && {
            costPrice: Number(costPrice),
          }),

          ...(sellingPrice !== undefined && {
            sellingPrice: Number(sellingPrice),
          }),

          ...(unit !== undefined && {
            unit: String(unit).trim(),
          }),

          ...(categoryId !== undefined && {
            categoryId: categoryId
              ? String(categoryId)
              : null,
          }),
        },

        include: {
          category: true,
          branches: {
            include: {
              branch: true,
            },
          },
        },
      });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error(
      "Update product error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// UPDATE STATUS
export async function updateProductStatus(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);
    const { status } = req.body;

    if (
      status !== "ACTIVE" &&
      status !== "INACTIVE"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Status must be ACTIVE or INACTIVE",
      });
    }

    const product =
      await prisma.product.findUnique({
        where: {
          id,
        },
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const updated =
      await prisma.product.update({
        where: {
          id,
        },
        data: {
          status,
        },
      });

    return res.status(200).json({
      success: true,
      message: "Product status updated",
      data: updated,
    });
  } catch (error) {
    console.error(
      "Update product status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// DELETE PRODUCT
export async function deleteProduct(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const product =
      await prisma.product.findUnique({
        where: {
          id,
        },
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const [
      saleItemCount,
      purchaseItemCount,
      stockMovementCount,
      transferItemCount,
    ] = await Promise.all([
      prisma.saleItem.count({
        where: {
          productId: id,
        },
      }),

      prisma.purchaseItem.count({
        where: {
          productId: id,
        },
      }),

      prisma.stockMovement.count({
        where: {
          productId: id,
        },
      }),

      prisma.stockTransferItem.count({
        where: {
          productId: id,
        },
      }),
    ]);

    const hasHistory =
      saleItemCount > 0 ||
      purchaseItemCount > 0 ||
      stockMovementCount > 0 ||
      transferItemCount > 0;

    if (hasHistory) {
      return res.status(400).json({
        success: false,
        message:
          "Product cannot be deleted because transaction history exists. Set it to INACTIVE instead.",
      });
    }

    await prisma.product.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete product error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}