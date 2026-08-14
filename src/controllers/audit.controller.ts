import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../config/prisma";

function getParam(
  value: string | string[] | undefined
): string {
  return Array.isArray(value)
    ? value[0] ?? ""
    : value ?? "";
}

export async function getAuditLogs(
  req: AuthRequest,
  res: Response
) {
  try {
    const branchId = req.user?.branchId;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "Branch is required",
      });
    }

    const pageValue = Array.isArray(req.query.page)
      ? req.query.page[0]
      : req.query.page;

    const limitValue = Array.isArray(req.query.limit)
      ? req.query.limit[0]
      : req.query.limit;

    const page = Math.max(
      Number(pageValue ?? 1),
      1
    );

    const limit = Math.min(
      Math.max(
        Number(limitValue ?? 50),
        1
      ),
      100
    );

    const skip = (page - 1) * limit;

    const [logs, total] =
      await Promise.all([
        prisma.auditLog.findMany({
          where: {
            branchId,
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        }),

        prisma.auditLog.count({
          where: {
            branchId,
          },
        }),
      ]);

    return res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(
          total / limit
        ),
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to get audit logs",
    });
  }
}

export async function getAuditLog(
  req: AuthRequest,
  res: Response
) {
  try {
    const branchId = req.user?.branchId;
    const id = getParam(req.params.id);

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "Branch is required",
      });
    }

    const log =
      await prisma.auditLog.findFirst({
        where: {
          id,
          branchId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Audit log not found",
      });
    }

    return res.json({
      success: true,
      data: log,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get audit log",
    });
  }
}