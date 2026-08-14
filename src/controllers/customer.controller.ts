import { Request, Response } from "express";
import prisma from "../config/prisma";

function getParam(
  value: string | string[] | undefined
): string {
  return Array.isArray(value)
    ? value[0] ?? ""
    : value ?? "";
}

export async function createCustomer(
  req: Request,
  res: Response
) {
  try {
    const {
      name,
      phone,
      email,
      address,
      creditLimit,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    const customer =
      await prisma.customer.create({
        data: {
          name,
          phone,
          email,
          address,
          creditLimit:
            Number(creditLimit ?? 0),
        },
      });

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      data: customer,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to create customer",
    });
  }
}

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
        orderBy: {
          createdAt: "desc",
        },
      });

    return res.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to get customers",
    });
  }
}

export async function getCustomer(
  req: Request,
  res: Response
) {
  try {
    const id = getParam(req.params.id);

    const customer =
      await prisma.customer.findUnique({
        where: { id },
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
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to get customer",
    });
  }
}

export async function updateCustomer(
  req: Request,
  res: Response
) {
  try {
    const id = getParam(req.params.id);

    const {
      name,
      phone,
      email,
      address,
      creditLimit,
      isActive,
    } = req.body;

    const customer =
      await prisma.customer.update({
        where: { id },
        data: {
          name,
          phone,
          email,
          address,
          creditLimit:
            creditLimit !== undefined
              ? Number(creditLimit)
              : undefined,
          isActive,
        },
      });

    return res.json({
      success: true,
      message: "Customer updated successfully",
      data: customer,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to update customer",
    });
  }
}

export async function deleteCustomer(
  req: Request,
  res: Response
) {
  try {
    const id = getParam(req.params.id);

    await prisma.customer.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return res.json({
      success: true,
      message: "Customer deactivated successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete customer",
    });
  }
}