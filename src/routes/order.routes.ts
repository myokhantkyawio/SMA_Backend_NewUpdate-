import { Router } from "express";

import {
  createOrder,
} from "../controllers/order.controller";

import { auth } from "../middleware/auth";

const router = Router();

/* =========================================================
   CREATE ORDER
========================================================= */

router.post(
  "/",
  auth,
  createOrder
);

export default router;