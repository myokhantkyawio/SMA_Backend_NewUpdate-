import { Router } from "express";

import {
  createPurchasePaymentController,
} from "../controllers/purchasePayment.controller";

import {
  auth,
  authorize,
} from "../middleware/auth";

const router = Router();

router.post(
  "/purchase/:purchaseId",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  createPurchasePaymentController
);

export default router;