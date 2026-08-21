import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const passwordHash = await bcrypt.hash(
    "Owner@123456",
    12
  );

  const user = await prisma.user.update({
    where: {
      email: "owner@smapos.com",
    },
    data: {
      passwordHash,
    },
  });

  console.log("================================");
  console.log("PASSWORD UPDATED");
  console.log("Email:", user.email);
  console.log("New password: Owner@123456");
  console.log("================================");
}

main()
  .catch((error) => {
    console.error("UPDATE ERROR:", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
