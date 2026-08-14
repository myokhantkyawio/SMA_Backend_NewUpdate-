import prisma from "../config/prisma";

export async function createPurchasePayment(data: {
  purchaseId: string;
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
    const purchase =
      await tx.purchase.findUnique({
        where: {
          id: data.purchaseId,
        },
        include: {
          payments: true,
        },
      });

    if (!purchase) {
      throw new Error(
        "Purchase not found"
      );
    }

    if (
      purchase.branchId !==
      data.branchId
    ) {
      throw new Error(
        "Purchase does not belong to this branch"
      );
    }

    if (
      purchase.status === "CANCELLED"
    ) {
      throw new Error(
        "Cannot pay cancelled purchase"
      );
    }

    const amount =
      Number(data.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      throw new Error(
        "Invalid payment amount"
      );
    }

    const paidAmount =
      purchase.payments.reduce(
        (sum, payment) =>
          sum + Number(payment.amount),
        0
      );

    const total =
      Number(purchase.total);

    const remaining =
      total - paidAmount;

    if (amount > remaining) {
      throw new Error(
        `Payment exceeds remaining balance. Remaining: ${remaining}`
      );
    }

    const payment =
      await tx.purchasePayment.create({
        data: {
          purchaseId:
            purchase.id,

          supplierId:
            purchase.supplierId,

          branchId:
            data.branchId,

          userId:
            data.userId,

          amount,

          paymentMethod:
            data.paymentMethod,

          reference:
            data.reference,

          note:
            data.note,
        },
      });

    return {
      payment,
      purchaseTotal: total,
      previousPaid: paidAmount,
      currentPayment: amount,
      totalPaid:
        paidAmount + amount,
      remaining:
        total -
        (paidAmount + amount),
    };
  });
}