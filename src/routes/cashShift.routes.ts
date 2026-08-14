import { Router } from "express";

import { auth } from "../middleware/auth";

import {
  openShift,
  currentShift,
  cashInController,
  cashOutController,
  closeShift,
  shiftDetail,
  shiftList,
} from "../controllers/cashShift.controller";

const router = Router();

router.use(auth);

router.post(
  "/open",
  openShift
);

router.get(
  "/current",
  currentShift
);

router.get(
  "/",
  shiftList
);

router.get(
  "/:shiftId",
  shiftDetail
);

router.post(
  "/:shiftId/cash-in",
  cashInController
);

router.post(
  "/:shiftId/cash-out",
  cashOutController
);

router.post(
  "/:shiftId/close",
  closeShift
);

export default router;