import { Response } from "express";

import {
  AuthRequest,
} from "../middleware/auth";

import {
  getDashboardSummary,
} from "../services/dashboard.service";

export async function dashboardSummary(
  req: AuthRequest,
  res: Response
) {
  try {
    const branchId =
      req.query.branchId
        ? String(req.query.branchId)
        : undefined;

    const data =
      await getDashboardSummary(
        branchId
      );

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Dashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load dashboard",
    });
  }
}