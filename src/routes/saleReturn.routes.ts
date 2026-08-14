import { Router } from "express";

import {
  createSaleReturnController,
} from "../controllers/saleReturn.controller";

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
  createSaleReturnController
);

export default router;