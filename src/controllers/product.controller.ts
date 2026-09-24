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

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      productCode,
      unit,
      sellingPrice,
      stock,
    } = req.body;

    // =========================
    // REQUIRED FIELDS
    // =========================

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (
      !productCode ||
      !productCode.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Product code is required",
      });
    }

    // =========================
    // UNIT
    // =========================

    const allowedUnits = [
      "PCS",
      "BOX",
      "OTHER",
    ];

    if (!allowedUnits.includes(unit)) {
      return res.status(400).json({
        success: false,
        message:
          "Unit must be PCS, BOX, or OTHER",
      });
    }

    // =========================
    // SELLING PRICE
    // =========================

    const price = Number(sellingPrice);

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid selling price",
      });
    }

    // =========================
    // STOCK
    // =========================

    const initialStock = Number(stock);

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

    if (
      !Number.isInteger(initialStock) ||
      initialStock < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Stock must be a whole number 0 or greater",
      });
    }

    // =========================
    // CHECK DUPLICATE PRODUCT CODE
    // =========================

    const existingProduct =
      await prisma.product.findFirst({
        where: {
          productCode:
            productCode.trim(),
        },
      });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message:
          "Product code already exists",
      });
    }

    // =========================
    // CREATE PRODUCT
    // =========================

    const product =
      await prisma.product.create({
        data: {
          name: name.trim(),

          productCode:
            productCode.trim(),

          unit,

          costPrice: 0,

          sellingPrice: price,

          // ⭐ STOCK GOES TO DATABASE
          stock: initialStock,

          status: "ACTIVE",
        },
      });

    // =========================
    // RESPONSE
    // =========================

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
        "Failed to create product",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};

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

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      productCode,
      unit,
      sellingPrice,
    } = req.body;

    // =========================
    // REQUIRED
    // =========================

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (
      !productCode ||
      !productCode.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Product code is required",
      });
    }

    // =========================
    // UNIT
    // =========================

    const allowedUnits = [
      "PCS",
      "BOX",
      "OTHER",
    ];

    if (!allowedUnits.includes(unit)) {
      return res.status(400).json({
        success: false,
        message:
          "Unit must be PCS, BOX, or OTHER",
      });
    }

    // =========================
    // PRICE
    // =========================

    const price = Number(sellingPrice);

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid selling price",
      });
    }

    // =========================
    // FIND PRODUCT
    // =========================

    const product =
      await prisma.product.findUnique({
        where: { id },
      });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // =========================
    // DUPLICATE CODE
    // =========================

    const existingProduct =
      await prisma.product.findFirst({
        where: {
          productCode:
            productCode.trim(),

          NOT: {
            id,
          },
        },
      });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message:
          "Product code already exists",
      });
    }

    // =========================
    // UPDATE
    // =========================

    const updatedProduct =
      await prisma.product.update({
        where: { id },

        data: {
          name: name.trim(),

          productCode:
            productCode.trim(),

          unit,

          sellingPrice: price,

          /*
           * IMPORTANT
           *
           * stock is intentionally NOT here.
           *
           * Therefore Edit Product
           * cannot change stock.
           */
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Product updated successfully",

      data: updatedProduct,
    });
  } catch (error) {
    console.error(
      "Update product error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update product",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};
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