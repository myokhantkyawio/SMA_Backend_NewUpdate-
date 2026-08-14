import { Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/auth";

function getId(req: AuthRequest): string {
  const id = req.params.id;

  return Array.isArray(id) ? id[0] : id;
}

// CREATE
export async function createSupplier(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      name,
      phone,
      email,
      address,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required",
      });
    }

    const supplier =
      await prisma.supplier.create({
        data: {
          name: String(name).trim(),
          phone: phone
            ? String(phone).trim()
            : null,
          email: email
            ? String(email).trim()
            : null,
          address: address
            ? String(address).trim()
            : null,
        },
      });

    return res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: supplier,
    });
  } catch (error) {
    console.error(
      "Create supplier error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// GET ALL
export async function getSuppliers(
  _req: AuthRequest,
  res: Response
) {
  try {
    const suppliers =
      await prisma.supplier.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

    return res.status(200).json({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    console.error(
      "Get suppliers error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// GET ONE
export async function getSupplierById(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const supplier =
      await prisma.supplier.findUnique({
        where: {
          id,
        },

        include: {
          purchases: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error(
      "Get supplier error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// UPDATE
export async function updateSupplier(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const {
      name,
      phone,
      email,
      address,
    } = req.body;

    const existing =
      await prisma.supplier.findUnique({
        where: {
          id,
        },
      });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const supplier =
      await prisma.supplier.update({
        where: {
          id,
        },

        data: {
          ...(name !== undefined && {
            name: String(name).trim(),
          }),

          ...(phone !== undefined && {
            phone: phone
              ? String(phone).trim()
              : null,
          }),

          ...(email !== undefined && {
            email: email
              ? String(email).trim()
              : null,
          }),

          ...(address !== undefined && {
            address: address
              ? String(address).trim()
              : null,
          }),
        },
      });

    return res.status(200).json({
      success: true,
      message: "Supplier updated successfully",
      data: supplier,
    });
  } catch (error) {
    console.error(
      "Update supplier error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// STATUS
export async function updateSupplierStatus(
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

    const supplier =
      await prisma.supplier.findUnique({
        where: {
          id,
        },
      });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const updated =
      await prisma.supplier.update({
        where: {
          id,
        },
        data: {
          isActive,
        },
      });

    return res.status(200).json({
      success: true,
      message: "Supplier status updated",
      data: updated,
    });
  } catch (error) {
    console.error(
      "Supplier status error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

// DELETE
export async function deleteSupplier(
  req: AuthRequest,
  res: Response
) {
  try {
    const id = getId(req);

    const supplier =
      await prisma.supplier.findUnique({
        where: {
          id,
        },
      });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const purchaseCount =
      await prisma.purchase.count({
        where: {
          supplierId: id,
        },
      });

    if (purchaseCount > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Supplier cannot be deleted because purchase history exists. Deactivate it instead.",
      });
    }

    await prisma.supplier.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete supplier error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}