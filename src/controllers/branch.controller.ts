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

export async function createBranch(
  req: AuthRequest,
  res: Response
) {
  try {
    const { name, code, address, phone } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Branch name and code are required",
      });
    }

    const normalizedCode = String(code)
      .trim()
      .toUpperCase();

    const existingBranch = await prisma.branch.findUnique({
      where: {
        code: normalizedCode,
      },
    });

    if (existingBranch) {
      return res.status(409).json({
        success: false,
        message: "Branch code already exists",
      });
    }

    const branch = await prisma.branch.create({
      data: {
        name: String(name).trim(),
        code: normalizedCode,
        address: address
          ? String(address).trim()
          : null,
        phone: phone
          ? String(phone).trim()
          : null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Branch created successfully",
      data: branch,
    });
  } catch (error) {
    console.error("Create branch error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function getBranches(
  _req: AuthRequest,
  res: Response
) {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      data: branches,
    });
  } catch (error) {
    console.error("Get branches error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function getBranchById(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const branch = await prisma.branch.findUnique({
      where: {
        id,
      },
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: branch,
    });
  } catch (error) {
    console.error("Get branch error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function updateBranch(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const {
      name,
      code,
      address,
      phone,
    } = req.body;

    const existingBranch =
      await prisma.branch.findUnique({
        where: {
          id,
        },
      });

    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    if (code !== undefined) {
      const normalizedCode = String(code)
        .trim()
        .toUpperCase();

      const codeExists =
        await prisma.branch.findFirst({
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
          message: "Branch code already exists",
        });
      }
    }

    const branch = await prisma.branch.update({
      where: {
        id,
      },
      data: {
        ...(name !== undefined && {
          name: String(name).trim(),
        }),

        ...(code !== undefined && {
          code: String(code)
            .trim()
            .toUpperCase(),
        }),

        ...(address !== undefined && {
          address: address
            ? String(address).trim()
            : null,
        }),

        ...(phone !== undefined && {
          phone: phone
            ? String(phone).trim()
            : null,
        }),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Branch updated successfully",
      data: branch,
    });
  } catch (error) {
    console.error("Update branch error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function updateBranchStatus(
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

    const branch =
      await prisma.branch.findUnique({
        where: {
          id,
        },
      });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    const updatedBranch =
      await prisma.branch.update({
        where: {
          id,
        },
        data: {
          isActive,
        },
      });

    return res.status(200).json({
      success: true,
      message: isActive
        ? "Branch activated successfully"
        : "Branch deactivated successfully",
      data: updatedBranch,
    });
  } catch (error) {
    console.error(
      "Update branch status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function deleteBranch(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const branch =
      await prisma.branch.findUnique({
        where: {
          id,
        },
      });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    // Check related records manually
    const [
      userCount,
      productCount,
      saleCount,
      purchaseCount,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          branchId: id,
        },
      }),

      prisma.productBranch.count({
        where: {
          branchId: id,
        },
      }),

      prisma.sale.count({
        where: {
          branchId: id,
        },
      }),

      prisma.purchase.count({
        where: {
          branchId: id,
        },
      }),
    ]);

    const hasData =
      userCount > 0 ||
      productCount > 0 ||
      saleCount > 0 ||
      purchaseCount > 0;

    if (hasData) {
      return res.status(400).json({
        success: false,
        message:
          "Branch cannot be deleted because it contains related data. Deactivate it instead.",
        data: {
          users: userCount,
          products: productCount,
          sales: saleCount,
          purchases: purchaseCount,
        },
      });
    }

    await prisma.branch.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Branch deleted successfully",
    });
  } catch (error) {
    console.error("Delete branch error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}