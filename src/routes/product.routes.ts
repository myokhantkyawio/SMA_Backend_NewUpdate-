import { Router } from "express";

import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  updateProductStatus,
  deleteProduct,
} from "../controllers/product.controller";

import {
  auth,
  authorize,
} from "../middleware/auth";

const router = Router();

router.post(
  "/",
  auth,
  authorize("OWNER", "ADMIN", "MANAGER"),
  createProduct
);

router.get(
  "/",
  auth,
  getProducts
);

router.get(
  "/:id",
  auth,
  getProductById
);

router.put(
  "/:id",
  auth,
  authorize("OWNER", "ADMIN", "MANAGER"),
  updateProduct
);

router.patch(
  "/:id/status",
  auth,
  authorize("OWNER", "ADMIN", "MANAGER"),
  updateProductStatus
);

router.delete(
  "/:id",
  auth,
  authorize("OWNER", "ADMIN"),
  deleteProduct
);

export default router;