import { Router } from "express";

import {
  getAuditLogs,
  getAuditLog,
} from "../controllers/audit.controller";

import { auth } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  auth,
  getAuditLogs
);

router.get(
  "/:id",
  auth,
  getAuditLog
);

export default router;