import { Router } from "express";

import {
  salesReport,
  purchaseReport,
  expenseReport,
  stockReport,
} from "../controllers/report.controller";

import {
  auth,
  authorize,
} from "../middleware/auth";

const router = Router();

router.get(
  "/sales",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  salesReport
);

router.get(
  "/purchases",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  purchaseReport
);

router.get(
  "/expenses",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  expenseReport
);

router.get(
  "/stock",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  stockReport
);

export default router;