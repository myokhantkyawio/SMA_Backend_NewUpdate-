import { Router } from "express";

import {
  createCustomer,
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customer.controller";

import {
  auth,
} from "../middleware/auth";

const router = Router();

router.post(
  "/",
  auth,
  createCustomer
);

router.get(
  "/",
  auth,
  getCustomers
);

router.get(
  "/:id",
  auth,
  getCustomer
);

router.patch(
  "/:id",
  auth,
  updateCustomer
);

router.delete(
  "/:id",
  auth,
  deleteCustomer
);

export default router;