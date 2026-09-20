import { Router } from "express";
import {
  getReturns,
  getReturnById,
  createReturn,
  completeReturn,
  cancelReturn,
  deleteReturn,
} from "../controllers/return.controller";

import {
  auth,
  authorize,
} from "../middleware/auth";

const router = Router();


/**
 * GET
 * /api/returns
 *
 * All authenticated users
 */
router.get(
  "/",
  auth,
  getReturns
);


/**
 * GET
 * /api/returns/:id
 *
 * Return detail
 */
router.get(
  "/:id",
  auth,
  getReturnById
);


/**
 * POST
 * /api/returns
 *
 * Cashier can create return
 */
router.post(
  "/",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER",
    "CASHIER"
  ),
  createReturn
);


/**
 * POST
 * /api/returns/:id/complete
 *
 * Only management can approve
 */
router.post(
  "/:id/complete",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  completeReturn
);


/**
 * POST
 * /api/returns/:id/cancel
 *
 * Only management can cancel
 */
router.post(
  "/:id/cancel",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  cancelReturn
);

/**
 * DELETE
 * /api/returns/:id
 *
 * Only management can delete
 */
router.delete(
  "/:id",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  deleteReturn
);

export default router;