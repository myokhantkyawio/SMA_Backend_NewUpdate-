import jwt, {
  SignOptions,
} from "jsonwebtoken";

export type UserRole =
  | "OWNER"
  | "ADMIN"
  | "MANAGER"
  | "CASHIER";

export interface JwtPayload {
  userId: string;
  role: UserRole;
  branchId: string | null;
}

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "development-secret-change-this";

if (
  process.env.NODE_ENV === "production" &&
  !process.env.JWT_SECRET
) {
  throw new Error(
    "JWT_SECRET is required in production"
  );
}

export function generateToken(
  payload: JwtPayload
): string {
  const options: SignOptions = {
    expiresIn: "7d",
  };

  return jwt.sign(
    {
      userId: payload.userId,
      role: payload.role,
      branchId: payload.branchId,
    },
    JWT_SECRET,
    options
  );
}

export function verifyToken(
  token: string
): JwtPayload {
  if (
    !token ||
    typeof token !== "string"
  ) {
    throw new Error("JWT token is missing");
  }

  const cleanToken = token.trim();

  if (!cleanToken) {
    throw new Error("JWT token is empty");
  }

  const decoded = jwt.verify(
    cleanToken,
    JWT_SECRET
  );

  if (
    typeof decoded !== "object" ||
    decoded === null
  ) {
    throw new Error(
      "Invalid JWT payload"
    );
  }

  if (
    typeof decoded.userId !== "string" ||
    !decoded.userId
  ) {
    throw new Error(
      "Invalid JWT userId"
    );
  }

  if (
    decoded.role !== "OWNER" &&
    decoded.role !== "ADMIN" &&
    decoded.role !== "MANAGER" &&
    decoded.role !== "CASHIER"
  ) {
    throw new Error(
      "Invalid JWT user role"
    );
  }

  return {
    userId: decoded.userId,
    role: decoded.role as UserRole,
    branchId:
      typeof decoded.branchId === "string"
        ? decoded.branchId
        : null,
  };
}