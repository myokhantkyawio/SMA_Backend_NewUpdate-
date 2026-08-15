import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes";
import branchRoutes from "./routes/branch.routes";
import productRoutes from "./routes/product.routes";
import categoryRoutes from "./routes/category.routes";
import supplierRoutes from "./routes/supplier.routes";
import purchaseRoutes from "./routes/purchase.routes";
import saleRoutes from "./routes/sale.routes";
import stockRoutes from "./routes/stock.routes";
import expenseRoutes from "./routes/expense.routes";
import userRoutes from "./routes/user.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import reportRoutes from "./routes/report.routes";
import cashierShiftRoutes from "./routes/cashierShift.routes";
import refundRoutes from "./routes/refund.routes";
import receiptRoutes from "./routes/receipt.routes";
import saleReturnRoutes from "./routes/saleReturn.routes";
import purchaseReturnRoutes from "./routes/purchaseReturn.routes";
import purchasePaymentRoutes from "./routes/purchasePayment.routes";
import customerRoutes from "./routes/customer.routes";
import customerPaymentRoutes from "./routes/customerPayment.routes";
import cashShiftRoutes from "./routes/cashShift.routes";
import stockTransferRoutes from "./routes/stockTransfer.routes";
import auditRoutes from "./routes/audit.routes";
import settingRoutes from "./routes/setting.routes";
import prisma from "./config/prisma";
const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/branches", branchRoutes);
app.use(
  "/api/products",
  productRoutes
);
app.use(
  "/api/categories",
  categoryRoutes
);
app.use(
  "/api/suppliers",
  supplierRoutes
);
app.use(
  "/api/purchases",
  purchaseRoutes
);
app.use(
  "/api/sales",
  saleRoutes
);
app.use(
  "/api/stock",
  stockRoutes
);
app.use(
  "/api/expenses",
  expenseRoutes
);
app.use(
  "/api/users",
  userRoutes
);
app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/reports",
  reportRoutes
);
app.use(
  "/api/cashier/shifts",
  cashierShiftRoutes
);
app.use(
  "/api/refunds",
  refundRoutes
);
app.use(
  "/api/salereturns",
  saleReturnRoutes
);

app.use(
  "/api/purchasereturns",
  purchaseReturnRoutes
);

app.use(
  "/api/purchase-payments",
  purchasePaymentRoutes
);
app.use(
  "/api/customers",
  customerRoutes
);
app.use(
  "/api/customer-payments",
  customerPaymentRoutes
);

app.use(
  "/api/cash-shifts",
  cashShiftRoutes
);
app.use(
  "/api/stock-transfers",
  stockTransferRoutes
);
app.use(
  "/api/audit-logs",
  auditRoutes
);
app.use(
  "/api/receipts",
  receiptRoutes
);
app.use(
  "/api/settings",
  settingRoutes
);
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      success: true,
      message: "SMA POS Backend and Database are connected",
    });
  } catch (error) {
    console.error("DATABASE HEALTH ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Database connection failed",
      error:
        error instanceof Error
          ? error.message
          : "Unknown database error",
    });
  }
});

export default app;