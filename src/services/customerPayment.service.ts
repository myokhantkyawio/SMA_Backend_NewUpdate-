import prisma from "../config/prisma";

export async function createCustomerPayment(data: {
  customerId: string;
  branchId: string;
  userId: string;
  amount: number;
  paymentMethod:
    | "CASH"
    | "KBZPAY"
    | "WAVE"
    | "BANK"
    | "CARD"
    | "OTHER";
  reference?: string;
  note?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const customer =
      await tx.customer.findUnique({
        where: {
          id: data.customerId,
        },
      });

    if (!customer) {
      throw new Error("Customer not found");
    }

    if (!customer.isActive) {
      throw new Error("Customer is inactive");
    }

    const amount = Number(data.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Invalid payment amount");
    }

    const sales =
      await tx.sale.findMany({
        where: {
          customerId: customer.id,
          branchId: data.branchId,
          status: {
            notIn: ["VOIDED"],
          },
        },
      });

    const totalSales = sales.reduce(
      (sum, sale) =>
        sum + Number(sale.total),
      0
    );

    const totalSalePaid = sales.reduce(
      (sum, sale) =>
        sum + Number(sale.paidAmount),
      0
    );

    const payments =
      await tx.customerPayment.findMany({
        where: {
          customerId: customer.id,
          branchId: data.branchId,
        },
      });

    const previousPayments =
      payments.reduce(
        (sum, payment) =>
          sum + Number(payment.amount),
        0
      );

    const outstanding =
      totalSales -
      totalSalePaid -
      previousPayments;

    if (outstanding <= 0) {
      throw new Error(
        "Customer has no outstanding balance"
      );
    }

    if (amount > outstanding) {
      throw new Error(
        `Payment exceeds outstanding balance. Remaining: ${outstanding}`
      );
    }

    const payment =
      await tx.customerPayment.create({
        data: {
          customerId: customer.id,
          branchId: data.branchId,
          userId: data.userId,
          amount,
          paymentMethod: data.paymentMethod,
          reference: data.reference,
          note: data.note,
        },
      });

    return {
      payment,
      previousOutstanding: outstanding,
      paidAmount: amount,
      remaining:
        outstanding - amount,
    };
  });
}