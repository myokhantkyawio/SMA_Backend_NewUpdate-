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
========================================================= */

export async function createProduct(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      name,
      productCode,
      unit,
      sellingPrice,
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
      !productCode ||
      !String(productCode).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Product code is required",
      });
    }

    if (!unit) {
      return res.status(400).json({
        success: false,
        message: "Product unit is required",
      });
    }

    if (
      unit !== "PCS" &&
      unit !== "BOX" &&
      unit !== "OTHER"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Unit must be PCS, BOX or OTHER",
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

    /* =====================================================
       NUMBER VALIDATION
    ===================================================== */

    const price = Number(sellingPrice);

    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid selling price",
      });
    }

    /* =====================================================
       PRODUCT CODE DUPLICATE
    ===================================================== */

    const existingProductCode =
      await prisma.product.findFirst({
        where: {
          productCode:
            String(productCode).trim(),
        },
      });

    if (existingProductCode) {
      return res.status(409).json({
        success: false,
        message:
          "Product code already exists",
      });
    }

    /* =====================================================
       CREATE PRODUCT

       Stock is NOT accepted from frontend.
       New product starts with stock = 0.
    ===================================================== */

    const product =
      await prisma.product.create({
        data: {
          name: String(name).trim(),

          productCode:
            String(productCode).trim(),

          unit,

          costPrice: 0,

          sellingPrice: price,

          stock: 0,

          status: "ACTIVE",
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
   - productCode
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
                  productCode: {
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

   Editable:
   - name
   - productCode
   - unit
   - sellingPrice

   NOT editable:
   - stock
========================================================= */

export async function updateProduct(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const {
      name,
      productCode,
      unit,
      sellingPrice,
    } = req.body;

    /* =====================================================
       ID
    ===================================================== */

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Product ID is required",
      });
    }

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Product name is required",
      });
    }

    if (
      !productCode ||
      !String(productCode).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product code is required",
      });
    }

    if (
      unit !== "PCS" &&
      unit !== "BOX" &&
      unit !== "OTHER"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Unit must be PCS, BOX or OTHER",
      });
    }

    if (
      sellingPrice === undefined ||
      sellingPrice === null ||
      sellingPrice === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selling price is required",
      });
    }

    const price = Number(sellingPrice);

    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid selling price",
      });
    }

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
       PRODUCT CODE DUPLICATE
    ===================================================== */

    const existingProductCode =
      await prisma.product.findFirst({
        where: {
          productCode:
            String(productCode).trim(),

          NOT: {
            id,
          },
        },
      });

    if (existingProductCode) {
      return res.status(409).json({
        success: false,
        message:
          "Product code already exists",
      });
    }

    /* =====================================================
       UPDATE

       IMPORTANT:
       stock is NOT included here.
       Existing stock remains unchanged.
    ===================================================== */

    const product =
      await prisma.product.update({
        where: {
          id,
        },

        data: {
          name:
            String(name).trim(),

          productCode:
            String(productCode).trim(),

          unit,

          sellingPrice: price,
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
   UPDATE PRODUCT STOCK

   ONLY Stock Management uses this.
========================================================= */

export async function updateProductStock(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const { stock } = req.body;

    const stockValue = Number(stock);

    if (
      !Number.isInteger(stockValue) ||
      stockValue < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Stock must be a valid number greater than or equal to 0",
      });
    }

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

    const product =
      await prisma.product.update({
        where: {
          id,
        },

        data: {
          stock: stockValue,
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Stock updated successfully",
      data: product,
    });
  } catch (error) {
    console.error(
      "Update product stock error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update stock",
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

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Product ID is required",
      });
    }

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
  } catch (error: any) {
    console.error(
      "Delete product error:",
      error
    );

    if (error?.code === "P2003") {
      return res.status(409).json({
        success: false,
        message:
          "This product cannot be deleted because it is already used in sales, purchases, or other records.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
}