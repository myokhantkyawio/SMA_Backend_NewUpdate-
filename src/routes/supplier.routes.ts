import { Router } from "express";

import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  updateSupplierStatus,
  deleteSupplier,
} from "../controllers/supplier.controller";

import {
  auth,
  authorize,
} from "../middleware/auth";

const router = Router();

router.post(
  "/",
  auth,
  authorize("OWNER", "ADMIN", "MANAGER"),
  createSupplier
);

router.get(
  "/",
  auth,
  getSuppliers
);

router.get(
  "/:id",
  auth,
  getSupplierById
);

router.put(
  "/:id",
  auth,
  authorize("OWNER", "ADMIN", "MANAGER"),
  updateSupplier
);

router.patch(
  "/:id/status",
  auth,
  authorize("OWNER", "ADMIN", "MANAGER"),
  updateSupplierStatus
);

router.delete(
  "/:id",
  auth,
  authorize("OWNER", "ADMIN"),
  deleteSupplier
);

export default router;