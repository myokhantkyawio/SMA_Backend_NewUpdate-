import { Router } from "express";

import {
  getReturns,
  getReturnById,
  createReturn,
  completeReturn,
  cancelReturn,
  deleteReturn,
} from "../controllers/return.controller";

import {
  auth,
  authorize,
} from "../middleware/auth";

const router = Router();

router.get(
  "/",
  auth,
  getReturns
);

router.get(
  "/:id",
  auth,
  getReturnById
);

router.post(
  "/",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER",
    "CASHIER"
  ),
  createReturn
);

router.post(
  "/:id/complete",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  completeReturn
);

router.post(
  "/:id/cancel",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  cancelReturn
);

router.delete(
  "/:id",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  deleteReturn
);

export default router;