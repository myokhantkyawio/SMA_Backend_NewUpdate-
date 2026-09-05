import { Router } from "express";

import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  updateProductStock,
  updateProductStatus,
  deleteProduct,
} from "../controllers/product.controller";

import { auth, authorize } from "../middleware/auth";

const router = Router();

/* =========================================================
   CREATE
========================================================= */

router.post("/", auth, authorize("OWNER", "ADMIN", "MANAGER"), createProduct);

/* =========================================================
   GET ALL
========================================================= */

router.get("/", auth, getProducts);

/* =========================================================
   GET BY ID
========================================================= */

router.get("/:id", auth, getProductById);

/* =========================================================
   FULL PRODUCT UPDATE
========================================================= */

router.put("/:id", auth, authorize("OWNER", "ADMIN", "MANAGER"), updateProduct);

/* =========================================================
   STOCK UPDATE
   Used by Stock Management
========================================================= */

router.patch(
  "/:id",
  auth,
  authorize("OWNER", "ADMIN", "MANAGER"),
  updateProductStock,
);

/* =========================================================
   STATUS UPDATE
========================================================= */

router.patch(
  "/:id/status",
  auth,
  authorize("OWNER", "ADMIN", "MANAGER"),
  updateProductStatus,
);

/* =========================================================
   DELETE
========================================================= */

router.delete("/:id", auth, authorize("OWNER", "ADMIN"), deleteProduct);

export default router;
