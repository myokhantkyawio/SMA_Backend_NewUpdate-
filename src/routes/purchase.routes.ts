import { Router } from "express";

import {
  createPurchase,
  getPurchases,
  getPurchaseById,
} from "../controllers/purchase.controller";

import {
  auth,
  authorize,
} from "../middleware/auth";

const router = Router();

router.post(
  "/",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  createPurchase
);

router.get(
  "/",
  auth,
  getPurchases
);

router.get(
  "/:id",
  auth,
  getPurchaseById
);

export default router;