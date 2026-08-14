import { Router } from "express";

import {
  createTransferController,
  completeTransferController,
} from "../controllers/stockTransfer.controller";

import { auth } from "../middleware/auth";

const router = Router();

router.post(
  "/",
  auth,
  createTransferController
);

router.post(
  "/:id/complete",
  auth,
  completeTransferController
);

export default router;