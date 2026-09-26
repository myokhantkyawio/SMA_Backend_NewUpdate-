import { Response } from "express";

import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/auth";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

const ALLOWED_UNITS = [
  "PCS",
  "BOX",
  "OTHER",
] as const;

const ALLOWED_STATUS = [
  "ACTIVE",
  "INACTIVE",
] as const;

/*
|--------------------------------------------------------------------------
| GET ID
|--------------------------------------------------------------------------
*/

function getId(req: AuthRequest): string {
  const id = req.params.id;

  if (Array.isArray(id)) {
    return id[0];
  }

  return id;
}

/*
|--------------------------------------------------------------------------
| CREATE PRODUCT
|--------------------------------------------------------------------------
*/

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
      stock,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | NAME
    |--------------------------------------------------------------------------
    */

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PRODUCT CODE
    |--------------------------------------------------------------------------
    */

    if (
      typeof productCode !== "string" ||
      !productCode.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Product code is required",
      });
    }

    const cleanName = name.trim();
    const cleanProductCode =
      productCode.trim();

    /*
    |--------------------------------------------------------------------------
    | UNIT
    |--------------------------------------------------------------------------
    */

    if (
      !ALLOWED_UNITS.includes(unit)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Unit must be PCS, BOX, or OTHER",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | SELLING PRICE
    |--------------------------------------------------------------------------
    */

    const price = Number(
      sellingPrice
    );

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selling price must be a valid number",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | STOCK
    |--------------------------------------------------------------------------
    */

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

    const initialStock = Number(stock);

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

    /*
    |--------------------------------------------------------------------------
    | CHECK DUPLICATE PRODUCT CODE
    |--------------------------------------------------------------------------
    */

    const existingProduct =
      await prisma.product.findFirst({
        where: {
          productCode: cleanProductCode,
        },
      });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message:
          "Product code already exists",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE
    |--------------------------------------------------------------------------
    */

    const product =
      await prisma.product.create({
        data: {
          name: cleanName,

          productCode:
            cleanProductCode,

          unit,

          costPrice: 0,

          sellingPrice: price,

          stock: initialStock,

          status: "ACTIVE",
        },
      });

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,
      message:
        "Product created successfully",
      data: product,
    });
  } catch (error: any) {
    console.error(
      "CREATE PRODUCT ERROR:",
      error
    );

    /*
    |--------------------------------------------------------------------------
    | PRISMA UNIQUE ERROR
    |--------------------------------------------------------------------------
    */

    if (error?.code === "P2002") {
      return res.status(409).json({
        success: false,
        message:
          "Product code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create product",
    });
  }
}

/*
|--------------------------------------------------------------------------
| GET ALL PRODUCTS
|--------------------------------------------------------------------------
*/

export async function getProducts(
  req: AuthRequest,
  res: Response
) {
  try {
    const searchValue =
      req.query.search;

    const keyword =
      typeof searchValue === "string"
        ? searchValue.trim()
        : "";

    console.log(
      "GET /api/products"
    );

    console.log(
      "PRODUCT SEARCH:",
      keyword || "NONE"
    );

    /*
    |--------------------------------------------------------------------------
    | WHERE
    |--------------------------------------------------------------------------
    */

    const where =
      keyword.length > 0
        ? {
            OR: [
              {
                name: {
                  contains: keyword,
                  mode: "insensitive" as const,
                },
              },
              {
                productCode: {
                  contains: keyword,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : undefined;

    /*
    |--------------------------------------------------------------------------
    | COUNT
    |--------------------------------------------------------------------------
    */

    const productCount =
      await prisma.product.count({
        where,
      });

    console.log(
      "PRODUCT DATABASE COUNT:",
      productCount
    );

    /*
    |--------------------------------------------------------------------------
    | GET PRODUCTS
    |--------------------------------------------------------------------------
    */

    const products =
      await prisma.product.findMany({
        where,

        orderBy: {
          createdAt: "desc",
        },
      });

    /*
    |--------------------------------------------------------------------------
    | LOG
    |--------------------------------------------------------------------------
    */

    console.log(
      "PRODUCTS RETURNED:",
      products.length
    );

    if (products.length > 0) {
      console.log(
        "FIRST PRODUCT:",
        products[0]
      );
    }

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error(
      "GET PRODUCTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load products",
    });
  }
}

/*
|--------------------------------------------------------------------------
| GET PRODUCT BY ID
|--------------------------------------------------------------------------
*/

export async function getProductById(
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

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error(
      "GET PRODUCT BY ID ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load product",
    });
  }
}

/*
|--------------------------------------------------------------------------
| UPDATE PRODUCT
|
| Stock is intentionally NOT updated here.
|--------------------------------------------------------------------------
*/

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

    /*
    |--------------------------------------------------------------------------
    | ID
    |--------------------------------------------------------------------------
    */

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Product ID is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | NAME
    |--------------------------------------------------------------------------
    */

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product name is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PRODUCT CODE
    |--------------------------------------------------------------------------
    */

    if (
      typeof productCode !== "string" ||
      !productCode.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product code is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | UNIT
    |--------------------------------------------------------------------------
    */

    if (
      !ALLOWED_UNITS.includes(unit)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Unit must be PCS, BOX, or OTHER",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PRICE
    |--------------------------------------------------------------------------
    */

    const price = Number(
      sellingPrice
    );

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selling price must be a valid number",
      });
    }

    const cleanName = name.trim();

    const cleanProductCode =
      productCode.trim();

    /*
    |--------------------------------------------------------------------------
    | FIND PRODUCT
    |--------------------------------------------------------------------------
    */

    const existing =
      await prisma.product.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | DUPLICATE PRODUCT CODE
    |--------------------------------------------------------------------------
    */

    const duplicate =
      await prisma.product.findFirst({
        where: {
          productCode:
            cleanProductCode,

          NOT: {
            id,
          },
        },
      });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "Product code already exists",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE
    |--------------------------------------------------------------------------
    */

    const updatedProduct =
      await prisma.product.update({
        where: {
          id,
        },

        data: {
          name: cleanName,

          productCode:
            cleanProductCode,

          unit,

          sellingPrice: price,
        },
      });

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      message:
        "Product updated successfully",
      data: updatedProduct,
    });
  } catch (error: any) {
    console.error(
      "UPDATE PRODUCT ERROR:",
      error
    );

    if (error?.code === "P2002") {
      return res.status(409).json({
        success: false,
        message:
          "Product code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update product",
    });
  }
}

/*
|--------------------------------------------------------------------------
| UPDATE PRODUCT STOCK
|--------------------------------------------------------------------------
*/

export async function updateProductStock(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const { stock } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Product ID is required",
      });
    }

    if (
      stock === undefined ||
      stock === null ||
      stock === ""
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Stock is required",
      });
    }

    const stockValue = Number(stock);

    if (
      !Number.isInteger(stockValue) ||
      stockValue < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Stock must be a whole number 0 or greater",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK PRODUCT
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | UPDATE STOCK
    |--------------------------------------------------------------------------
    */

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
      "UPDATE PRODUCT STOCK ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update stock",
    });
  }
}

/*
|--------------------------------------------------------------------------
| UPDATE PRODUCT STATUS
|--------------------------------------------------------------------------
*/

export async function updateProductStatus(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const { status } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Product ID is required",
      });
    }

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

    /*
    |--------------------------------------------------------------------------
    | FIND PRODUCT
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | UPDATE
    |--------------------------------------------------------------------------
    */

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
        "Product status updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error(
      "UPDATE PRODUCT STATUS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update product status",
    });
  }
}

/*
|--------------------------------------------------------------------------
| DELETE PRODUCT
|--------------------------------------------------------------------------
*/

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

    /*
    |--------------------------------------------------------------------------
    | FIND PRODUCT
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | DELETE
    |--------------------------------------------------------------------------
    */

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
      "DELETE PRODUCT ERROR:",
      error
    );

    /*
    |--------------------------------------------------------------------------
    | FOREIGN KEY ERROR
    |--------------------------------------------------------------------------
    */

    if (
      error?.code === "P2003"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This product cannot be deleted because it is already used in sales, purchases, or other records.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete product",
    });
  }
}