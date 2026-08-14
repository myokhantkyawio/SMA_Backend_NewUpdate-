import { Router } from "express";

import {
  createPurchaseReturnController,
} from "../controllers/purchaseReturn.controller";

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
  createPurchaseReturnController
);

export default router;