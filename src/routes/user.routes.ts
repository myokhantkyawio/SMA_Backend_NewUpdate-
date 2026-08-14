import { Router } from "express";

import {
  getUsersController,
  getUserController,
  createUserController,
  updateUserController,
  updateUserStatusController,
} from "../controllers/user.controller";

import {
  auth,
  authorize,
} from "../middleware/auth";

const router = Router();

router.get(
  "/",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  getUsersController
);

router.get(
  "/:id",
  auth,
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  getUserController
);

router.post(
  "/",
  auth,
  authorize(
    "OWNER",
    "ADMIN"
  ),
  createUserController
);

router.patch(
  "/:id",
  auth,
  authorize(
    "OWNER",
    "ADMIN"
  ),
  updateUserController
);

router.patch(
  "/:id/status",
  auth,
  authorize(
    "OWNER",
    "ADMIN"
  ),
  updateUserStatusController
);

export default router;