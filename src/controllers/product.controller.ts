import type { Request, Response } from "express";
import prisma from "../config/prisma";

/*
|--------------------------------------------------------------------------
| CREATE PRODUCT
|--------------------------------------------------------------------------
*/
export async function createProduct(
  req: Request,
  res: Response
) {
  try {
    console.log("====================================");
    console.log("POST /api/products");
    console.log("BODY:", req.body);
    console.log("====================================");

    const {
      name,
      productCode,
      unit,
      sellingPrice,
      price,
      stock,
      initialStock,
    } = req.body;

    const productName = String(name ?? "").trim();
    const code = String(productCode ?? "").trim();

    const productUnit = String(unit ?? "PCS").toUpperCase();

    const productPrice = Number(
      sellingPrice ?? price ?? 0
    );

    const productStock = Number(
      initialStock ?? stock ?? 0
    );

    if (!productName) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Product code is required",
      });
    }

    if (!["PCS", "BOX", "OTHER"].includes(productUnit)) {
      return res.status(400).json({
        success: false,
        message: "Unit must be PCS, BOX or OTHER",
      });
    }

    if (
      !Number.isFinite(productPrice) ||
      productPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Selling price must be a valid number",
      });
    }

    if (
      !Number.isInteger(productStock) ||
      productStock < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Stock must be a valid integer",
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
          productCode: code,
        },
      });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: "Product code already exists",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE
    |--------------------------------------------------------------------------
    */

    const product = await prisma.product.create({
      data: {
        name: productName,
        productCode: code,
        unit: productUnit as any,
        costPrice: 0,
        sellingPrice: productPrice,
        stock: productStock,
        status: "ACTIVE",
      },
    });

    console.log("PRODUCT CREATED:");
    console.log(product);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error: any) {
    console.error("CREATE PRODUCT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create product",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error?.message,
    });
  }
}

/*
|--------------------------------------------------------------------------
| GET PRODUCTS
|--------------------------------------------------------------------------
*/
export async function getProducts(
  req: Request,
  res: Response
) {
  try {
    const keyword =
      typeof req.query.keyword === "string"
        ? req.query.keyword.trim()
        : "";

    console.log("====================================");
    console.log("GET /api/products");
    console.log("KEYWORD:", keyword);
    console.log("DATABASE URL EXISTS:", !!process.env.DATABASE_URL);
    console.log("====================================");

    /*
    |--------------------------------------------------------------------------
    | WHERE
    |--------------------------------------------------------------------------
    */

    const where = keyword
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

    const totalProducts =
      await prisma.product.count({
        where,
      });

    console.log(
      "DATABASE PRODUCT COUNT:",
      totalProducts
    );

    /*
    |--------------------------------------------------------------------------
    | FIND PRODUCTS
    |--------------------------------------------------------------------------
    */

    const products =
      await prisma.product.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
      });

    console.log(
      "DATABASE PRODUCTS:",
      products
    );

    console.log(
      "DATABASE PRODUCTS LENGTH:",
      products.length
    );

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.status(200).json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error: any) {
    console.error("GET PRODUCTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get products",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error?.message,
    });
  }
}

/*
|--------------------------------------------------------------------------
| GET PRODUCT BY ID
|--------------------------------------------------------------------------
*/
export async function getProductById(
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
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

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    console.error(
      "GET PRODUCT BY ID ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get product",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error?.message,
    });
  }
}

/*
|--------------------------------------------------------------------------
| UPDATE PRODUCT
|--------------------------------------------------------------------------
*/
export async function updateProduct(
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;

    const {
      name,
      productCode,
      unit,
      sellingPrice,
      price,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
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
        message: "Product not found",
      });
    }

    const updateData: any = {};

    if (name !== undefined) {
      const productName = String(name).trim();

      if (!productName) {
        return res.status(400).json({
          success: false,
          message: "Product name is required",
        });
      }

      updateData.name = productName;
    }

    if (productCode !== undefined) {
      const code = String(productCode).trim();

      if (!code) {
        return res.status(400).json({
          success: false,
          message: "Product code is required",
        });
      }

      const duplicate =
        await prisma.product.findFirst({
          where: {
            productCode: code,
            NOT: {
              id,
            },
          },
        });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "Product code already exists",
        });
      }

      updateData.productCode = code;
    }

    if (unit !== undefined) {
      const productUnit =
        String(unit).toUpperCase();

      if (
        !["PCS", "BOX", "OTHER"].includes(
          productUnit
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Unit must be PCS, BOX or OTHER",
        });
      }

      updateData.unit = productUnit;
    }

    if (
      sellingPrice !== undefined ||
      price !== undefined
    ) {
      const productPrice = Number(
        sellingPrice ?? price
      );

      if (
        !Number.isFinite(productPrice) ||
        productPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Selling price must be a valid number",
        });
      }

      updateData.sellingPrice =
        productPrice;
    }

    const product =
      await prisma.product.update({
        where: {
          id,
        },
        data: updateData,
      });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error: any) {
    console.error(
      "UPDATE PRODUCT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error?.message,
    });
  }
}

/*
|--------------------------------------------------------------------------
| UPDATE STOCK
|--------------------------------------------------------------------------
*/
export async function updateProductStock(
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    const newStock = Number(stock);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (
      !Number.isInteger(newStock) ||
      newStock < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Stock must be a valid integer",
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
        message: "Product not found",
      });
    }

    const product =
      await prisma.product.update({
        where: {
          id,
        },
        data: {
          stock: newStock,
        },
      });

    return res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      data: product,
    });
  } catch (error: any) {
    console.error(
      "UPDATE PRODUCT STOCK ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update stock",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error?.message,
    });
  }
}

/*
|--------------------------------------------------------------------------
| UPDATE STATUS
|--------------------------------------------------------------------------
*/
export async function updateProductStatus(
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
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

    const product =
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
      message: "Product status updated successfully",
      data: product,
    });
  } catch (error: any) {
    console.error(
      "UPDATE PRODUCT STATUS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update product status",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error?.message,
    });
  }
}

/*
|--------------------------------------------------------------------------
| DELETE PRODUCT
|--------------------------------------------------------------------------
*/
export async function deleteProduct(
  req: Request,
  res: Response
) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
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
        message: "Product not found",
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
  } catch (error: any) {
    console.error(
      "DELETE PRODUCT ERROR:",
      error
    );

    /*
    |----------------------------------------------------------------------
    | Prisma foreign key constraint
    |----------------------------------------------------------------------
    */

    if (error?.code === "P2003") {
      return res.status(409).json({
        success: false,
        message:
          "Cannot delete this product because it is already used in other records.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error?.message,
    });
  }
}