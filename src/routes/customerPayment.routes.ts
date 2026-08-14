import { Router } from "express";

import {
  createCustomerPaymentController,
} from "../controllers/customerPayment.controller";

import {
  auth,
} from "../middleware/auth";

const router = Router();

router.post(
  "/customer/:customerId",
  auth,
  createCustomerPaymentController
);

export default router;