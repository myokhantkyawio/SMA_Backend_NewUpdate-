import { Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/auth";

function getId(req: AuthRequest): string {
  const id = req.params.id;

  return Array.isArray(id) ? id[0] : id;
}

// CREATE
export async function createCategory(
  req: AuthRequest,
  res: Response
) {
  try {
    const { name, code } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const normalizedName = String(name).trim();

    const existingName =
      await prisma.category.findFirst({
        where: {
          name: normalizedName,
        },
      });

    if (existingName) {
      return res.status(409).json({
        success: false,
        message: "Category name already exists",
      });
    }

    let normalizedCode: string | null = null;

    if (code) {
      normalizedCode = String(code)
        .trim()
        .toUpperCase();

      const existingCode =
        await prisma.category.findUnique({
          where: {
            code: normalizedCode,
          },
        });

      if (existingCode) {
        return res.status(409).json({
          success: false,
          message: "Category code already exists",
        });
      }
    }

    const category =
      await prisma.category.create({
        data: {
          name: normalizedName,
          code: normalizedCode,
        },
      });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error(
      "Create category error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// GET ALL
export async function getCategories(
  _req: AuthRequest,
  res: Response
) {
  try {
    const categories =
      await prisma.category.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error(
      "Get categories error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// GET ONE
export async function getCategoryById(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const category =
      await prisma.category.findUnique({
        where: {
          id,
        },

        include: {
          products: true,
        },
      });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error(
      "Get category error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// UPDATE
export async function updateCategory(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);
    const { name, code } = req.body;

    const existing =
      await prisma.category.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (name !== undefined) {
      const nameExists =
        await prisma.category.findFirst({
          where: {
            name: String(name).trim(),
          },
        });

      if (
        nameExists &&
        nameExists.id !== id
      ) {
        return res.status(409).json({
          success: false,
          message: "Category name already exists",
        });
      }
    }

    if (code !== undefined && code) {
      const normalizedCode = String(code)
        .trim()
        .toUpperCase();

      const codeExists =
        await prisma.category.findUnique({
          where: {
            code: normalizedCode,
          },
        });

      if (
        codeExists &&
        codeExists.id !== id
      ) {
        return res.status(409).json({
          success: false,
          message: "Category code already exists",
        });
      }
    }

    const category =
      await prisma.category.update({
        where: {
          id,
        },

        data: {
          ...(name !== undefined && {
            name: String(name).trim(),
          }),

          ...(code !== undefined && {
            code: code
              ? String(code).trim().toUpperCase()
              : null,
          }),
        },
      });

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error(
      "Update category error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// STATUS
export async function updateCategoryStatus(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be boolean",
      });
    }

    const category =
      await prisma.category.findUnique({
        where: {
          id,
        },
      });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const updated =
      await prisma.category.update({
        where: {
          id,
        },
        data: {
          isActive,
        },
      });

    return res.status(200).json({
      success: true,
      message: "Category status updated",
      data: updated,
    });
  } catch (error) {
    console.error(
      "Category status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// DELETE
export async function deleteCategory(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const category =
      await prisma.category.findUnique({
        where: {
          id,
        },
      });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const productCount =
      await prisma.product.count({
        where: {
          categoryId: id,
        },
      });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Category cannot be deleted because products are using it. Deactivate it instead.",
      });
    }

    await prisma.category.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete category error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}