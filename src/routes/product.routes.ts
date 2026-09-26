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
  authenticate,
  authorize,
} from "../middleware/auth";

const router = Router();

/*
|--------------------------------------------------------------------------
| CREATE
|--------------------------------------------------------------------------
| POST /api/products
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authenticate,
  authorize("OWNER", "ADMIN", "MANAGER"),
  createProduct
);

/*
|--------------------------------------------------------------------------
| GET ALL
|--------------------------------------------------------------------------
| GET /api/products
| GET /api/products?keyword=milk
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authenticate,
  getProducts
);

/*
|--------------------------------------------------------------------------
| GET ONE
|--------------------------------------------------------------------------
| GET /api/products/:id
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  authenticate,
  getProductById
);

/*
|--------------------------------------------------------------------------
| UPDATE
|--------------------------------------------------------------------------
| PUT /api/products/:id
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",
  authenticate,
  authorize("OWNER", "ADMIN", "MANAGER"),
  updateProduct
);

/*
|--------------------------------------------------------------------------
| UPDATE STOCK
|--------------------------------------------------------------------------
| PATCH /api/products/:id
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id",
  authenticate,
  authorize("OWNER", "ADMIN", "MANAGER"),
  updateProductStock
);

/*
|--------------------------------------------------------------------------
| UPDATE STATUS
|--------------------------------------------------------------------------
| PATCH /api/products/:id/status
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/status",
  authenticate,
  authorize("OWNER", "ADMIN", "MANAGER"),
  updateProductStatus
);

/*
|--------------------------------------------------------------------------
| DELETE
|--------------------------------------------------------------------------
| DELETE /api/products/:id
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  authenticate,
  authorize("OWNER", "ADMIN"),
  deleteProduct
);

export default router;