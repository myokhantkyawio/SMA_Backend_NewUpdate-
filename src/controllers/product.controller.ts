import { Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/auth";

/* =========================================================
   GET ID
========================================================= */

function getId(req: AuthRequest): string {
  const id = req.params.id;

  if (Array.isArray(id)) {
    return id[0];
  }

  return id;
}

/* =========================================================
   CREATE PRODUCT
   Fields:
   - name
   - barcode
   - sellingPrice
   - stock
========================================================= */

export async function createProduct(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      name,
      barcode,
      sellingPrice,
      stock,
      branchId,
    } = req.body;

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (
      !barcode ||
      !String(barcode).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Barcode is required",
      });
    }

    if (
      sellingPrice === undefined ||
      sellingPrice === null ||
      sellingPrice === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Selling price is required",
      });
    }

    if (
      stock === undefined ||
      stock === null ||
      stock === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Stock is required",
      });
    }

    /* =====================================================
       CONVERT NUMBERS
    ===================================================== */

    const price = Number(sellingPrice);
    const stockValue = Number(stock);

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid selling price",
      });
    }

    if (
      !Number.isFinite(stockValue) ||
      stockValue < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid stock",
      });
    }

    /* =====================================================
       CHECK BARCODE
    ===================================================== */

    const existingBarcode =
      await prisma.product.findUnique({
        where: {
          barcode: String(
            barcode
          ).trim(),
        },
      });

    if (existingBarcode) {
      return res.status(409).json({
        success: false,
        message: "Barcode already exists",
      });
    }

    /* =====================================================
       BRANCH CHECK
       branchId က ပေးထားရင်သာ check
    ===================================================== */

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

    /* =====================================================
       CREATE PRODUCT
    ===================================================== */

    const product =
      await prisma.product.create({
        data: {
          name: String(name).trim(),

          barcode:
            String(barcode).trim(),

          sellingPrice: price,

          /*
             ProductBranch relation က
             branchId လိုအပ်တဲ့ schema ဖြစ်ရင်
             branchId ပေးထားတဲ့အချိန်မှာပဲ create လုပ်မယ်။
          */

          branches: branchId
            ? {
                create: {
                  branchId:
                    String(branchId),

                  stock: stockValue,
                },
              }
            : undefined,
        },

        include: {
          branches: {
            include: {
              branch: true,
            },
          },
        },
      });

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

/* =========================================================
   GET ALL PRODUCTS
   Search:
   - name
   - barcode
========================================================= */

export async function getProducts(
  req: AuthRequest,
  res: Response
) {
  try {
    const { search } = req.query;

    const keyword = search
      ? String(search).trim()
      : "";

    const products =
      await prisma.product.findMany({
        where: keyword
          ? {
              OR: [
                {
                  name: {
                    contains: keyword,
                    mode: "insensitive",
                  },
                },
                {
                  barcode: {
                    contains: keyword,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : undefined,

        orderBy: {
          createdAt: "desc",
        },

        include: {
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
    console.error(
      "Get products error:",
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
   GET PRODUCT BY ID
========================================================= */

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
        message:
          "Product not found",
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

      message:
        "Internal server error",
    });
  }
}

/* =========================================================
   UPDATE PRODUCT
   Fields:
   - name
   - barcode
   - sellingPrice
========================================================= */

export async function updateProduct(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const {
      name,
      barcode,
      sellingPrice,
    } = req.body;

    /* =====================================================
       CHECK PRODUCT
    ===================================================== */

    const existingProduct =
      await prisma.product.findUnique({
        where: {
          id,
        },
      });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,

        message:
          "Product not found",
      });
    }

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (
      name !== undefined &&
      !String(name).trim()
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Product name cannot be empty",
      });
    }

    if (
      barcode !== undefined &&
      !String(barcode).trim()
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Barcode cannot be empty",
      });
    }

    if (
      sellingPrice !== undefined &&
      sellingPrice !== null &&
      sellingPrice !== ""
    ) {
      const price =
        Number(sellingPrice);

      if (
        !Number.isFinite(price) ||
        price < 0
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid selling price",
        });
      }
    }

    /* =====================================================
       CHECK BARCODE DUPLICATE
    ===================================================== */

    if (
      barcode !== undefined &&
      barcode
    ) {
      const barcodeValue =
        String(barcode).trim();

      const barcodeExists =
        await prisma.product.findFirst({
          where: {
            barcode: barcodeValue,

            NOT: {
              id,
            },
          },
        });

      if (barcodeExists) {
        return res.status(409).json({
          success: false,

          message:
            "Barcode already exists",
        });
      }
    }

    /* =====================================================
       UPDATE PRODUCT
    ===================================================== */

    const product =
      await prisma.product.update({
        where: {
          id,
        },

        data: {
          ...(name !== undefined && {
            name:
              String(name).trim(),
          }),

          ...(barcode !== undefined && {
            barcode:
              String(barcode).trim(),
          }),

          ...(sellingPrice !==
            undefined && {
            sellingPrice:
              Number(sellingPrice),
          }),
        },

        include: {
          branches: {
            include: {
              branch: true,
            },
          },
        },
      });

    return res.status(200).json({
      success: true,

      message:
        "Product updated successfully",

      data: product,
    });
  } catch (error) {
    console.error(
      "Update product error:",
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
   UPDATE PRODUCT STATUS
========================================================= */

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

        message:
          "Product not found",
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

      message:
        "Product status updated",

      data: updated,
    });
  } catch (error) {
    console.error(
      "Update product status error:",
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
   DELETE PRODUCT
========================================================= */

export async function deleteProduct(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    /* =====================================================
       CHECK PRODUCT
    ===================================================== */

    const product =
      await prisma.product.findUnique({
        where: {
          id,
        },
      });

    if (!product) {
      return res.status(404).json({
        success: false,

        message:
          "Product not found",
      });
    }

    /* =====================================================
       CHECK TRANSACTION HISTORY
    ===================================================== */

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

    /* =====================================================
       DELETE
    ===================================================== */

    await prisma.product.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,

      message:
        "Product deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete product error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Internal server error",
    });
  }
}