
import { Router } from "express";

import {
  createOrder,
  getOrders,
  deleteOrder,
} from "../controllers/order.controller";

import { auth } from "../middleware/auth";

const router = Router();

/* ==========================================
   GET ALL ORDERS
========================================== */

router.get(
  "/",
  auth,
  getOrders
);

/* ==========================================
   CREATE ORDER
========================================== */

router.post(
  "/",
  auth,
  createOrder
);

/* ==========================================
   DELETE ORDER - TEMPORARY
========================================== */

router.delete(
  "/:id",
  auth,
  deleteOrder
);

export default router;
