import { Router } from "express";

import {
  dashboardSummary,
} from "../controllers/dashboard.controller";

import {
  auth,
  authorize,
} from "../middleware/auth";

const router = Router();

router.get(
  "/summary",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  dashboardSummary
);

export default router;