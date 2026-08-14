import { Response } from "express";

import {
  AuthRequest,
} from "../middleware/auth";

import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
} from "../services/user.service";

import { UserRole } from "../generated/prisma/enums";

function getId(
  req: AuthRequest
): string {
  const id = req.params.id;

  return Array.isArray(id)
    ? id[0]
    : id;
}

function validRole(
  role: unknown
): role is UserRole {
  return (
    role === "OWNER" ||
    role === "ADMIN" ||
    role === "MANAGER" ||
    role === "CASHIER"
  );
}

export async function getUsersController(
  req: AuthRequest,
  res: Response
) {
  try {
    const users = await getUsers();

    return res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "Internal server error",
    });
  }
}

export async function getUserController(
  req: AuthRequest,
  res: Response
) {
  try {
    const user =
      await getUserById(
        getId(req)
      );

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(404).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "User not found",
    });
  }
}

export async function createUserController(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      name,
      email,
      password,
      role,
      branchId,
    } = req.body;

    if (
      role !== undefined &&
      !validRole(role)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role",
      });
    }

    const user =
      await createUser({
        name,
        email,
        password,
        role,
        branchId:
          branchId ?? null,
      });

    return res.status(201).json({
      success: true,
      message:
        "User created successfully",
      data: user,
    });
  } catch (error) {
    console.error(
      "Create user error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to create user",
    });
  }
}

export async function updateUserController(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      name,
      email,
      password,
      role,
      branchId,
    } = req.body;

    if (
      role !== undefined &&
      !validRole(role)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role",
      });
    }

    const user =
      await updateUser(
        getId(req),
        {
          name,
          email,
          password,
          role,
          branchId,
        }
      );

    return res.json({
      success: true,
      message:
        "User updated successfully",
      data: user,
    });
  } catch (error) {
    console.error(
      "Update user error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update user",
    });
  }
}

export async function updateUserStatusController(
  req: AuthRequest,
  res: Response
) {
  try {
    const {
      isActive,
    } = req.body;

    if (
      typeof isActive !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "isActive must be boolean",
      });
    }

    const user =
      await updateUserStatus(
        getId(req),
        isActive
      );

    return res.json({
      success: true,
      message:
        "User status updated successfully",
      data: user,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to update user",
    });
  }
}