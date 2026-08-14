import { Router } from "express";

import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
} from "../controllers/category.controller";

import {
  auth,
  authorize,
} from "../middleware/auth";

const router = Router();

router.post(
  "/",
  auth,
  authorize("OWNER", "ADMIN", "MANAGER"),
  createCategory
);

router.get(
  "/",
  auth,
  getCategories
);

router.get(
  "/:id",
  auth,
  getCategoryById
);

router.put(
  "/:id",
  auth,
  authorize("OWNER", "ADMIN", "MANAGER"),
  updateCategory
);

router.patch(
  "/:id/status",
  auth,
  authorize("OWNER", "ADMIN", "MANAGER"),
  updateCategoryStatus
);

router.delete(
  "/:id",
  auth,
  authorize("OWNER", "ADMIN"),
  deleteCategory
);

export default router;