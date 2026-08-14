import { Router } from "express";

import {
  createExpenseController,
  getExpensesController,
  getExpenseController,
  updateExpenseController,
  voidExpenseController,
} from "../controllers/expense.controller";

import {
  auth,
  authorize,
} from "../middleware/auth";

const router = Router();

router.get(
  "/",
  auth,
  getExpensesController
);

router.get(
  "/:id",
  auth,
  getExpenseController
);

router.post(
  "/",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  createExpenseController
);

router.patch(
  "/:id",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  updateExpenseController
);

router.post(
  "/:id/void",
  auth,
  authorize(
    "OWNER",
    "ADMIN"
  ),
  voidExpenseController
);

export default router;