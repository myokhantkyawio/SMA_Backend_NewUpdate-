import { Response } from "express";

import {
  AuthRequest,
} from "../middleware/auth";

import {
  getSalesReport,
  getPurchaseReport,
  getExpenseReport,
  getStockReport,
} from "../services/report.service";

export async function salesReport(
  req: AuthRequest,
  res: Response
) {
  try {
    const branchId =
      req.query.branchId
        ? String(req.query.branchId)
        : undefined;

    const from =
      req.query.from
        ? String(req.query.from)
        : undefined;

    const to =
      req.query.to
        ? String(req.query.to)
        : undefined;

    const data =
      await getSalesReport(
        branchId,
        from,
        to
      );

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to load sales report",
    });
  }
}

export async function purchaseReport(
  req: AuthRequest,
  res: Response
) {
  try {
    const branchId =
      req.query.branchId
        ? String(req.query.branchId)
        : undefined;

    const from =
      req.query.from
        ? String(req.query.from)
        : undefined;

    const to =
      req.query.to
        ? String(req.query.to)
        : undefined;

    const data =
      await getPurchaseReport(
        branchId,
        from,
        to
      );

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to load purchase report",
    });
  }
}

export async function expenseReport(
  req: AuthRequest,
  res: Response
) {
  try {
    const branchId =
      req.query.branchId
        ? String(req.query.branchId)
        : undefined;

    const from =
      req.query.from
        ? String(req.query.from)
        : undefined;

    const to =
      req.query.to
        ? String(req.query.to)
        : undefined;

    const data =
      await getExpenseReport(
        branchId,
        from,
        to
      );

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to load expense report",
    });
  }
}

export async function stockReport(
  req: AuthRequest,
  res: Response
) {
  try {
    const branchId =
      req.query.branchId
        ? String(req.query.branchId)
        : undefined;

    const data =
      await getStockReport(
        branchId
      );

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to load stock report",
    });
  }
}