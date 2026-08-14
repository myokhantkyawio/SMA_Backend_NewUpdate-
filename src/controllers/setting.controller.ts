import { Request, Response } from "express";

import {
  getAllSettings,
  getSettingByKey,
  createSetting,
  updateSetting,
  deleteSetting,
} from "../services/setting.service";

/**
 * Express params can be string | string[]
 * We only accept a single string value.
 */
function getParam(
  req: Request,
  name: string
): string | null {
  const value = req.params[name];

  if (typeof value !== "string") {
    return null;
  }

  if (!value.trim()) {
    return null;
  }

  return value;
}

/**
 * GET ALL SETTINGS
 */
export async function getSettings(
  _req: Request,
  res: Response
) {
  try {
    const settings = await getAllSettings();

    return res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error(
      "Get settings error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get settings",
    });
  }
}

/**
 * GET SETTING BY KEY
 */
export async function getSetting(
  req: Request,
  res: Response
) {
  try {
    const key = getParam(req, "key");

    if (!key) {
      return res.status(400).json({
        success: false,
        message: "Setting key is required",
      });
    }

    const setting =
      await getSettingByKey(key);

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: "Setting not found",
      });
    }

    return res.json({
      success: true,
      data: setting,
    });
  } catch (error) {
    console.error(
      "Get setting error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get setting",
    });
  }
}

/**
 * CREATE SETTING
 */
export async function createSettingController(
  req: Request,
  res: Response
) {
  try {
    const {
      key,
      value,
      type,
      description,
    } = req.body;

    if (
      typeof key !== "string" ||
      !key.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "key is required",
      });
    }

    const existing =
      await getSettingByKey(key);

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Setting already exists",
      });
    }

    const setting =
      await createSetting({
        key: key.trim(),
        value,
        type,
        description,
      });

    return res.status(201).json({
      success: true,
      message:
        "Setting created successfully",
      data: setting,
    });
  } catch (error) {
    console.error(
      "Create setting error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create setting",
    });
  }
}

/**
 * UPDATE SETTING
 */
export async function updateSettingController(
  req: Request,
  res: Response
) {
  try {
    const id = getParam(req, "id");

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Setting ID is required",
      });
    }

    const {
      value,
      type,
      description,
      isActive,
    } = req.body;

    const setting =
      await updateSetting(id, {
        value,
        type,
        description,
        isActive,
      });

    return res.json({
      success: true,
      message:
        "Setting updated successfully",
      data: setting,
    });
  } catch (error) {
    console.error(
      "Update setting error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update setting",
    });
  }
}

/**
 * DELETE SETTING
 */
export async function deleteSettingController(
  req: Request,
  res: Response
) {
  try {
    const id = getParam(req, "id");

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Setting ID is required",
      });
    }

    await deleteSetting(id);

    return res.json({
      success: true,
      message:
        "Setting deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete setting error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete setting",
    });
  }
}