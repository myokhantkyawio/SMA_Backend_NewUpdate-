const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: {
      email: "owner@smapos.com",
    },
    data: {
      passwordHash: "$2b$12$BMa7.WTTUiQqugYRABvh9.BFt1lmhSICNdkkqseSRhiO9FN7l/O9W",
    },
  });

  console.log("Password updated:", user.email);
}

main()
  .catch((error) => {
    console.error("Update failed:", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
