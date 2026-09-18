import { Router } from "express";

import {
  createTransfer,
  completeTransfer,
  cancelTransfer,
  getTransfers,
  stockIn,
  getStockHistory,
} from "../controllers/stock.controller";

import {
  auth,
  authorize,
} from "../middleware/auth";

const router = Router();

/* =========================================================
   STOCK HISTORY
   ========================================================= */

router.get(
  "/history",
  auth,
  getStockHistory,
);

/* =========================================================
   STOCK IN
   Cashier / Manager / Admin / Owner
   ========================================================= */

router.post(
  "/in",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER",
    "CASHIER",
  ),
  stockIn,
);

/* =========================================================
   STOCK TRANSFERS
   ========================================================= */

router.get(
  "/transfers",
  auth,
  getTransfers,
);

router.post(
  "/transfers",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER",
  ),
  createTransfer,
);

router.post(
  "/transfers/:id/complete",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER",
  ),
  completeTransfer,
);

router.post(
  "/transfers/:id/cancel",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER",
  ),
  cancelTransfer,
);

export default router;