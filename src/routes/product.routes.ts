import { Router } from "express";

import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  updateProductStatus,
  deleteProduct,
} from "../controllers/product.controller";

import { auth, authorize } from "../middleware/auth";

const router = Router();

/* =========================================================
   CREATE PRODUCT
========================================================= */

router.post("/", auth, authorize("OWNER", "ADMIN", "MANAGER"), createProduct);

/* =========================================================
   GET PRODUCTS
========================================================= */

router.get("/", auth, getProducts);

/* =========================================================
   GET PRODUCT BY ID
========================================================= */

router.get("/:id", auth, getProductById);

/* =========================================================
   UPDATE PRODUCT
   PUT = Full product update
========================================================= */

router.put("/:id", auth, authorize("OWNER", "ADMIN", "MANAGER"), updateProduct);

/* =========================================================
   UPDATE PRODUCT
   PATCH = Partial update
   Used by Stock Management
========================================================= */

router.patch(
  "/:id",
  auth,
  authorize("OWNER", "ADMIN", "MANAGER"),
  updateProduct,
);

/* =========================================================
   UPDATE PRODUCT STATUS
========================================================= */

router.patch(
  "/:id/status",
  auth,
  authorize("OWNER", "ADMIN", "MANAGER"),
  updateProductStatus,
);

/* =========================================================
   DELETE PRODUCT
========================================================= */

router.delete("/:id", auth, authorize("OWNER", "ADMIN"), deleteProduct);

export default router;
