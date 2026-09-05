
import { Router } from "express";

import {
  createOrder,
  getOrders,
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

export default router;
