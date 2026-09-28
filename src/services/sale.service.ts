import { Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/auth";

/* =========================================================
   RECEIPT NUMBER GENERATOR
   Result:
   SMA00000001
   SMA00000002
   SMA00000003
   ...
========================================================= */

async function generateReceiptNumber(
  tx: any
): Promise<string> {
  const rows =
    await tx.$queryRaw<
      Array<{
        id: string;
        value: string | null;
      }>
    >`
      SELECT "id", "value"
      FROM "SystemSetting"
      WHERE "key" = 'SALE_RECEIPT_COUNTER'
      FOR UPDATE
    `;

  if (!rows || rows.length === 0) {
    throw new Error(
      "SALE_RECEIPT_COUNTER setting not found"
    );
  }

  const setting = rows[0];

  const currentValue =
    Number(setting.value ?? "0");

  if (
    !Number.isInteger(currentValue) ||
    currentValue < 0
  ) {
    throw new Error(
      "Invalid SALE_RECEIPT_COUNTER value"
    );
  }

  if (currentValue >= 99999999) {
    throw new Error(
      "Invoice number limit reached"
    );
  }

  const nextValue =
    currentValue + 1;

  await tx.systemSetting.update({
    where: {
      id: setting.id,
    },

    data: {
      value: String(nextValue),
    },
  });

  return `SMA${String(nextValue).padStart(8, "0")}`;
}

/* =========================================================
   CREATE ORDER
========================================================= */

export async function createOrder(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      customerAddress,
      items,
      subtotal,
      discount,
      total,
      paymentMethod,
    } = req.body;

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Order items are required",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message:
          "Payment method is required",
      });
    }

    const order =
      await prisma.$transaction(
        async (tx) => {
          /* ==========================================
             1. GENERATE INVOICE NUMBER

             IMPORTANT:
             THIS VARIABLE MUST EXIST
             BEFORE tx.order.create()
          ========================================== */

          const receiptNumber =
            await generateReceiptNumber(tx);

          /* ==========================================
             2. DECREASE STOCK
          ========================================== */

          for (const item of items) {
            const productId =
              String(
                item.productId ||
                  item.id ||
                  ""
              );

            const quantity =
              Number(
                item.quantity ||
                  item.qty ||
                  0
              );

            if (!productId) {
              throw new Error(
                "Product ID is required"
              );
            }

            if (
              !Number.isInteger(
                quantity
              ) ||
              quantity <= 0
            ) {
              throw new Error(
                `Invalid quantity for product ${productId}`
              );
            }

            const updatedProduct =
              await tx.product.updateMany({
                where: {
                  id: productId,

                  status: "ACTIVE",

                  stock: {
                    gte: quantity,
                  },
                },

                data: {
                  stock: {
                    decrement: quantity,
                  },
                },
              });

            if (
              updatedProduct.count === 0
            ) {
              const product =
                await tx.product.findUnique({
                  where: {
                    id: productId,
                  },
                });

              if (!product) {
                throw new Error(
                  "Product not found"
                );
              }

              throw new Error(
                `${product.name} has only ${product.stock} stock available`
              );
            }
          }

          /* ==========================================
             3. CREATE ORDER
          ========================================== */

          const createdOrder =
            await tx.order.create({
              data: {
                receiptNumber,

                customerId:
                  customerId || null,

                customerName:
                  customerName ||
                  "Walk-in Customer",

                customerPhone:
                  customerPhone ||
                  null,

                customerAddress:
                  customerAddress ||
                  null,

                subtotal:
                  Number(
                    subtotal || 0
                  ),

                discount:
                  Number(
                    discount || 0
                  ),

                total:
                  Number(
                    total || 0
                  ),

                paymentMethod:
                  String(
                    paymentMethod
                  ),

                items: {
                  create:
                    items.map(
                      (item: any) => {
                        const quantity =
                          Number(
                            item.quantity ||
                              item.qty ||
                              0
                          );

                        const price =
                          Number(
                            item.price ||
                              0
                          );

                        return {
                          productId:
                            String(
                              item.productId ||
                                item.id
                            ),

                          name:
                            String(
                              item.name ||
                                "Unnamed Product"
                            ),

                          price,

                          quantity,

                          amount:
                            price *
                            quantity,
                        };
                      }
                    ),
                },
              },

              include: {
                items: true,
              },
            });

          return createdOrder;
        }
      );

    /* ==========================================
       4. RESPONSE
    ========================================== */

    return res.status(201).json({
      success: true,

      message:
        "Order created successfully",

      data: order,
    });
  } catch (error: any) {
    console.error(
      "Create order error:",
      error
    );

    return res.status(400).json({
      success: false,

      message:
        error?.message ||
        "Failed to create order",
    });
  }
}

/* =========================================================
   GET ORDERS
========================================================= */

export async function getOrders(
  req: AuthRequest,
  res: Response
) {
  try {
    const orders =
      await prisma.order.findMany({
        include: {
          items: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return res.json({
      success: true,

      data: orders,
    });
  } catch (error) {
    console.error(
      "Get orders error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to get orders",
    });
  }
}

/* =========================================================
   DELETE ORDER
========================================================= */

export async function deleteOrder(
  req: AuthRequest,
  res: Response
) {
  try {
    const id =
      String(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,

        message:
          "Order ID is required",
      });
    }

    const order =
      await prisma.order.findUnique({
        where: {
          id,
        },
      });

    if (!order) {
      return res.status(404).json({
        success: false,

        message:
          "Order not found",
      });
    }

    await prisma.order.delete({
      where: {
        id,
      },
    });

    return res.json({
      success: true,

      message:
        "Order deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete order error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to delete order",
    });
  }
}