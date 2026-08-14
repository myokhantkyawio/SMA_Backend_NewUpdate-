import prisma from "../config/prisma";

export async function createAuditLog(data: {
  userId?: string;
  branchId?: string;
  action:
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "VOID"
    | "REFUND"
    | "LOGIN"
    | "LOGOUT"
    | "STOCK_IN"
    | "STOCK_OUT"
    | "TRANSFER"
    | "PAYMENT";
  module: string;
  entityId?: string;
  description?: string;
  oldData?: unknown;
  newData?: unknown;
  ipAddress?: string;
  userAgent?: string;
}) {
  return prisma.auditLog.create({
    data: {
      userId: data.userId,
      branchId: data.branchId,
      action: data.action,
      module: data.module,
      entityId: data.entityId,
      description: data.description,

      oldData:
        data.oldData !== undefined
          ? JSON.parse(
              JSON.stringify(data.oldData)
            )
          : undefined,

      newData:
        data.newData !== undefined
          ? JSON.parse(
              JSON.stringify(data.newData)
            )
          : undefined,

      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  });
}