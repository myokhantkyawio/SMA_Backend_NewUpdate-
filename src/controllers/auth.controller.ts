import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma";
import { generateToken } from "../utils/jwt";
import { AuthRequest } from "../middleware/auth";

export async function register(
  req: Request,
  res: Response
) {
  try {
    const {
      name,
      email,
      password,
      branchId,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    if (branchId) {
      const branch = await prisma.branch.findUnique({
        where: {
          id: branchId,
        },
      });

      if (!branch) {
        return res.status(400).json({
          success: false,
          message: "Branch not found",
        });
      }

      if (!branch.isActive) {
        return res.status(400).json({
          success: false,
          message: "Branch is inactive",
        });
      }
    }

    const userCount = await prisma.user.count();

    const role =
      userCount === 0
        ? "OWNER"
        : "CASHIER";

    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    const user = await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: normalizedEmail,
        passwordHash,
        role,
        branchId: branchId || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true,
      },
    });

    const token = generateToken({
      userId: user.id,
      role: user.role,
      branchId: user.branchId,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function login(
  req: Request,
  res: Response
) {
  try {
    const {
      email,
      password,
    } = req.body;

    console.log("========== LOGIN START ==========");

    if (!email || !password) {
      console.log("LOGIN ERROR: Missing email or password");
      console.log("================================");

      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    console.log(
      "LOGIN EMAIL:",
      normalizedEmail
    );

    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    console.log(
      "USER FOUND:",
      !!user
    );

    if (!user) {
      console.log(
        "RESULT: USER NOT FOUND"
      );
      console.log(
        "================================"
      );

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.log(
      "USER EMAIL:",
      user.email
    );

    console.log(
      "USER ACTIVE:",
      user.isActive
    );

    console.log(
      "USER ROLE:",
      user.role
    );

    console.log(
      "HASH EXISTS:",
      !!user.passwordHash
    );

    if (!user.isActive) {
      console.log(
        "RESULT: USER INACTIVE"
      );
      console.log(
        "================================"
      );

      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    const passwordValid =
      await bcrypt.compare(
        password,
        user.passwordHash
      );

    console.log(
      "PASSWORD VALID:",
      passwordValid
    );

    if (!passwordValid) {
      console.log(
        "RESULT: PASSWORD INVALID"
      );
      console.log(
        "================================"
      );

      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken({
      userId: user.id,
      role: user.role,
      branchId: user.branchId,
    });

    console.log(
      "RESULT: LOGIN SUCCESS"
    );

    console.log(
      "================================"
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          branchId: user.branchId,
          isActive: user.isActive,
        },
        token,
      },
    });
  } catch (error) {
    console.error(
      "================================"
    );

    console.error(
      "LOGIN ERROR:",
      error
    );

    console.error(
      "================================"
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Internal server error",
    });
  }
}

export async function me(
  req: AuthRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    console.error(
      "ME ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}