import { Router } from "express";

import {
  createSaleController,
  getSales,
  getSaleById,
  voidSaleController,
  refundSaleController,
} from "../controllers/sale.controller";

import { auth } from "../middleware/auth";

const router = Router();

router.post(
  "/",
  auth,
  createSaleController
);

router.get(
  "/",
  auth,
  getSales
);

router.get(
  "/:id",
  auth,
  getSaleById
);

router.post(
  "/:id/void",
  auth,
  voidSaleController
);

router.post(
  "/:id/refund",
  auth,
  refundSaleController
);

export default router;