import { Request, Response } from "express";
import prisma from "../config/prisma";

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value)
    ? value[0] ?? ""
    : value ?? "";
}

/* =========================================================
   CREATE CUSTOMER
========================================================= */

export async function createCustomer(
  req: Request,
  res: Response
) {
  try {
    const {
      name,
      contactPersonName,
      phone,
      email,
      address,
      region,
      regionCode,
      township,
      townshipCode,
      creditLimit,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    const customer =
      await prisma.customer.create({
        data: {
          name: String(name).trim(),

          contactPersonName:
            contactPersonName
              ? String(contactPersonName).trim()
              : null,

          phone:
            phone
              ? String(phone).trim()
              : null,

          email:
            email
              ? String(email).trim()
              : null,

          address:
            address
              ? String(address).trim()
              : null,

          region:
            region
              ? String(region).trim()
              : null,

          regionCode:
            regionCode
              ? String(regionCode).trim()
              : null,

          township:
            township
              ? String(township).trim()
              : null,

          townshipCode:
            townshipCode
              ? String(townshipCode).trim()
              : null,

          creditLimit:
            Number(creditLimit ?? 0),
        },
      });

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error: any) {
    console.error(
      "CREATE CUSTOMER ERROR:",
      error
    );

    if (error?.code === "P2002") {
      return res.status(409).json({
        success: false,
        message:
          "A customer with this phone number already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create customer",
    });
  }
}

/* =========================================================
   GET CUSTOMERS
========================================================= */

export async function getCustomers(
  req: Request,
  res: Response
) {
  try {
    const customers =
      await prisma.customer.findMany({
        where: {
          isActive: true,
        },

        orderBy: [
          {
            customerNo: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      });

    return res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error(
      "GET CUSTOMERS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get customers",
    });
  }
}

/* =========================================================
   GET SINGLE CUSTOMER
========================================================= */

export async function getCustomer(
  req: Request,
  res: Response
) {
  try {
    const id = getParam(req.params.id);

    const customer =
      await prisma.customer.findUnique({
        where: {
          id,
        },

        include: {
          sales: {
            orderBy: {
              createdAt: "desc",
            },
          },

          payments: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const totalSales =
      customer.sales.reduce(
        (sum, sale) =>
          sum + Number(sale.total),
        0
      );

    const totalPaid =
      customer.sales.reduce(
        (sum, sale) =>
          sum + Number(sale.paidAmount),
        0
      );

    const customerPayments =
      customer.payments.reduce(
        (sum, payment) =>
          sum + Number(payment.amount),
        0
      );

    const outstanding =
      totalSales -
      totalPaid -
      customerPayments;

    return res.json({
      success: true,

      data: {
        customer,
        totalSales,
        totalPaid,
        customerPayments,
        outstanding,
      },
    });
  } catch (error) {
    console.error(
      "GET CUSTOMER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get customer",
    });
  }
}

/* =========================================================
   UPDATE CUSTOMER
========================================================= */

export async function updateCustomer(
  req: Request,
  res: Response
) {
  try {
    const id = getParam(req.params.id);

    const {
      name,
      contactPersonName,
      phone,
      email,
      address,
      region,
      regionCode,
      township,
      townshipCode,
      creditLimit,
      isActive,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    const customer =
      await prisma.customer.update({
        where: {
          id,
        },

        data: {
          name: String(name).trim(),

          contactPersonName:
            contactPersonName
              ? String(contactPersonName).trim()
              : null,

          phone:
            phone
              ? String(phone).trim()
              : null,

          email:
            email
              ? String(email).trim()
              : null,

          address:
            address
              ? String(address).trim()
              : null,

          region:
            region
              ? String(region).trim()
              : null,

          regionCode:
            regionCode
              ? String(regionCode).trim()
              : null,

          township:
            township
              ? String(township).trim()
              : null,

          townshipCode:
            townshipCode
              ? String(townshipCode).trim()
              : null,

          creditLimit:
            creditLimit !== undefined
              ? Number(creditLimit)
              : undefined,

          isActive:
            isActive !== undefined
              ? Boolean(isActive)
              : undefined,
        },
      });

    return res.json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error: any) {
    console.error(
      "UPDATE CUSTOMER ERROR:",
      error
    );

    if (error?.code === "P2002") {
      return res.status(409).json({
        success: false,
        message:
          "A customer with this phone number already exists",
      });
    }

    if (error?.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update customer",
    });
  }
}

/* =========================================================
   DELETE CUSTOMER
========================================================= */

export async function deleteCustomer(
  req: Request,
  res: Response
) {
  try {
    const id = getParam(req.params.id);

    await prisma.customer.update({
      where: {
        id,
      },

      data: {
        isActive: false,
      },
    });

    return res.json({
      success: true,
      message:
        "Customer deactivated successfully",
    });
  } catch (error: any) {
    console.error(
      "DELETE CUSTOMER ERROR:",
      error
    );

    if (error?.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete customer",
    });
  }
}