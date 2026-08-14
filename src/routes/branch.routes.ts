import { Router } from "express";

import {
  createBranch,
  getBranches,
  getBranchById,
  updateBranch,
  updateBranchStatus,
  deleteBranch,
} from "../controllers/branch.controller";

import {
  auth,
  authorize,
} from "../middleware/auth";

const router = Router();

router.post(
  "/",
  auth,
  authorize("OWNER", "ADMIN"),
  createBranch
);

router.get(
  "/",
  auth,
  getBranches
);

router.get(
  "/:id",
  auth,
  getBranchById
);

router.put(
  "/:id",
  auth,
  authorize("OWNER", "ADMIN"),
  updateBranch
);

router.patch(
  "/:id/status",
  auth,
  authorize("OWNER", "ADMIN"),
  updateBranchStatus
);

router.delete(
  "/:id",
  auth,
  authorize("OWNER"),
  deleteBranch
);

export default router;