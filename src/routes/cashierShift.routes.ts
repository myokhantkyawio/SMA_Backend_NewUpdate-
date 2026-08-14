import { Router } from "express";

import {
  openShiftController,
  currentShiftController,
  shiftSummaryController,
  closeShiftController,
} from "../controllers/cashierShift.controller";

import {
  auth,
} from "../middleware/auth";

const router = Router();

router.post(
  "/open",
  auth,
  openShiftController
);

router.get(
  "/current",
  auth,
  currentShiftController
);

router.get(
  "/:id/summary",
  auth,
  shiftSummaryController
);

router.post(
  "/:id/close",
  auth,
  closeShiftController
);

export default router;