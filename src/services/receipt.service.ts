import prisma from "../config/prisma";

export async function getReceiptBySaleId(saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: {
      id: saleId,
    },
    include: {
      branch: true,
      cashier: true,
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!sale) {
    throw new Error("Sale not found");
  }

  return {
    receiptNumber: sale.receiptNumber,
    date: sale.createdAt,

    branch: {
      name: sale.branch.name,
      code: sale.branch.code,
      address: sale.branch.address,
      phone: sale.branch.phone,
    },

    cashier: {
      name: sale.cashier.name,
    },

    customer: sale.customer
      ? {
          name: sale.customer.name,
          phone: sale.customer.phone,
        }
      : null,

    items: sale.items.map((item) => ({
      productName: item.productName,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount),
      total: Number(item.total),
    })),

    subtotal: Number(sale.subtotal),
    discount: Number(sale.discount),
    tax: Number(sale.tax),
    total: Number(sale.total),
    paidAmount: Number(sale.paidAmount),
    changeAmount: Number(sale.changeAmount),

    paymentMethod: sale.paymentMethod,
    status: sale.status,
  };
}