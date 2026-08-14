import prisma from "../config/prisma";
import bcrypt from "bcryptjs";
import { UserRole } from "../generated/prisma/enums";

export async function getUsers() {
  return prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      branchId: true,
      createdAt: true,
      updatedAt: true,

      branch: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });
}

export async function getUserById(
  id: string
) {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      branchId: true,
      createdAt: true,
      updatedAt: true,

      branch: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  branchId?: string | null;
}) {
  if (!data.name?.trim()) {
    throw new Error("Name is required");
  }

  if (!data.email?.trim()) {
    throw new Error("Email is required");
  }

  if (!data.password || data.password.length < 6) {
    throw new Error(
      "Password must be at least 6 characters"
    );
  }

  const existing =
    await prisma.user.findUnique({
      where: {
        email: data.email.toLowerCase().trim(),
      },
    });

  if (existing) {
    throw new Error(
      "Email already exists"
    );
  }

  if (data.branchId) {
    const branch =
      await prisma.branch.findUnique({
        where: {
          id: data.branchId,
        },
      });

    if (!branch) {
      throw new Error(
        "Branch not found"
      );
    }

    if (!branch.isActive) {
      throw new Error(
        "Branch is inactive"
      );
    }
  }

  const passwordHash =
    await bcrypt.hash(
      data.password,
      12
    );

  return prisma.user.create({
    data: {
      name: data.name.trim(),

      email:
        data.email
          .toLowerCase()
          .trim(),

      passwordHash,

      role:
        data.role ?? "CASHIER",

      branchId:
        data.branchId ?? null,
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      branchId: true,
      createdAt: true,

      branch: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    email?: string;
    role?: UserRole;
    branchId?: string | null;
    password?: string;
  }
) {
  const user =
    await prisma.user.findUnique({
      where: {
        id,
      },
    });

  if (!user) {
    throw new Error(
      "User not found"
    );
  }

  if (data.email) {
    const existing =
      await prisma.user.findFirst({
        where: {
          email:
            data.email
              .toLowerCase()
              .trim(),

          NOT: {
            id,
          },
        },
      });

    if (existing) {
      throw new Error(
        "Email already exists"
      );
    }
  }

  if (data.branchId) {
    const branch =
      await prisma.branch.findUnique({
        where: {
          id: data.branchId,
        },
      });

    if (!branch) {
      throw new Error(
        "Branch not found"
      );
    }
  }

  let passwordHash:
    | string
    | undefined;

  if (data.password) {
    if (data.password.length < 6) {
      throw new Error(
        "Password must be at least 6 characters"
      );
    }

    passwordHash =
      await bcrypt.hash(
        data.password,
        12
      );
  }

  return prisma.user.update({
    where: {
      id,
    },

    data: {
      ...(data.name !== undefined
        ? {
            name:
              data.name.trim(),
          }
        : {}),

      ...(data.email !== undefined
        ? {
            email:
              data.email
                .toLowerCase()
                .trim(),
          }
        : {}),

      ...(data.role !== undefined
        ? {
            role: data.role,
          }
        : {}),

      ...(data.branchId !== undefined
        ? {
            branchId:
              data.branchId,
          }
        : {}),

      ...(passwordHash
        ? {
            passwordHash,
          }
        : {}),
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      branchId: true,
      createdAt: true,
      updatedAt: true,

      branch: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });
}

export async function updateUserStatus(
  id: string,
  isActive: boolean
) {
  const user =
    await prisma.user.findUnique({
      where: {
        id,
      },
    });

  if (!user) {
    throw new Error(
      "User not found"
    );
  }

  return prisma.user.update({
    where: {
      id,
    },

    data: {
      isActive,
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      branchId: true,
    },
  });
}