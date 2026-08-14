import {
  Request,
  Response,
  NextFunction,
} from "express";

import prisma from "../config/prisma";
import { verifyToken } from "../utils/jwt";

export type UserRole =
  | "OWNER"
  | "ADMIN"
  | "MANAGER"
  | "CASHIER";

export interface AuthRequest
  extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    branchId: string | null;
  };
}

export async function auth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authorization =
      req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        success: false,
        message:
          "Authorization token is required",
      });
    }

    if (
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authorization format",
      });
    }

    const token =
      authorization
        .substring(7)
        .trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token is missing",
      });
    }

    /*
     * JWT normally has 3 parts:
     * header.payload.signature
     */
    const parts = token.split(".");

    if (parts.length !== 3) {
      console.error(
        "Invalid JWT format. Parts:",
        parts.length
      );

      return res.status(401).json({
        success: false,
        message:
          "Invalid token format",
      });
    }

    const decoded =
      verifyToken(token);

    const user =
      await prisma.user.findUnique({
        where: {
          id: decoded.userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          branchId: true,
          isActive: true,
        },
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          "User account is inactive",
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      branchId: user.branchId,
    };

    next();
  } catch (error: any) {
    console.error(
      "Auth middleware error:",
      error
    );

    return res.status(401).json({
      success: false,
      message:
        error?.message ||
        "Invalid or expired token",
    });
  }
}

export function authorize(
  ...allowedRoles: UserRole[]
) {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (
      !allowedRoles.includes(
        req.user.role
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this resource",
      });
    }

    next();
  };
}