import { Router } from "express";

import {
  refundSaleController,
} from "../controllers/refund.controller";

import {
  auth,
  authorize,
} from "../middleware/auth";

const router = Router();

router.post(
  "/sale/:saleId",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  refundSaleController
);

export default router;