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

import {
  auth,
  authorize,
} from "../middleware/auth";

const router = Router();

/* =========================================================
   CREATE PRODUCT
========================================================= */

router.post(
  "/",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  createProduct
);

/* =========================================================
   GET ALL PRODUCTS
========================================================= */

router.get(
  "/",
  auth,
  getProducts
);

/* =========================================================
   GET PRODUCT BY ID
========================================================= */

router.get(
  "/:id",
  auth,
  getProductById
);

/* =========================================================
   UPDATE PRODUCT

   Name
   Product Code
   Unit
   Selling Price

   Stock CANNOT be changed here.
========================================================= */

router.put(
  "/:id",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  updateProduct
);

/* =========================================================
   UPDATE STOCK

   Stock Management only
========================================================= */

router.patch(
  "/:id",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  updateProductStock
);

/* =========================================================
   UPDATE STATUS
========================================================= */

router.patch(
  "/:id/status",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  updateProductStatus
);

/* =========================================================
   DELETE PRODUCT
========================================================= */

router.delete(
  "/:id",
  auth,
  authorize(
    "OWNER",
    "ADMIN"
  ),
  deleteProduct
);

export default router;