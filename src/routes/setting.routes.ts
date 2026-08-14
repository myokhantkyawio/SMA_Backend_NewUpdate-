import { Router } from "express";

import {
  getSettings,
  getSetting,
  createSettingController,
  updateSettingController,
  deleteSettingController,
} from "../controllers/setting.controller";

import { auth } from "../middleware/auth";

const router = Router();

router.use(auth);

router.get(
  "/",
  getSettings
);

router.get(
  "/:key",
  getSetting
);

router.post(
  "/",
  createSettingController
);

router.patch(
  "/:id",
  updateSettingController
);

router.delete(
  "/:id",
  deleteSettingController
);

export default router;