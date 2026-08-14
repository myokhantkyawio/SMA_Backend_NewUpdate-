import prisma from "../src/config/prisma";

const settings = [
  {
    key: "company_name",
    value: "SMA POS",
    type: "TEXT" as const,
    description: "Company name",
  },
  {
    key: "company_phone",
    value: "",
    type: "TEXT" as const,
    description: "Company phone",
  },
  {
    key: "company_address",
    value: "",
    type: "TEXT" as const,
    description: "Company address",
  },
  {
    key: "currency",
    value: "MMK",
    type: "TEXT" as const,
    description: "System currency",
  },
  {
    key: "tax_percent",
    value: "0",
    type: "NUMBER" as const,
    description: "Default tax percentage",
  },
  {
    key: "default_discount",
    value: "0",
    type: "NUMBER" as const,
    description: "Default discount",
  },
  {
    key: "low_stock_alert",
    value: "true",
    type: "BOOLEAN" as const,
    description: "Enable low stock alert",
  },
  {
    key: "receipt_prefix",
    value: "INV-",
    type: "TEXT" as const,
    description: "Receipt number prefix",
  },
  {
    key: "return_prefix",
    value: "RET-",
    type: "TEXT" as const,
    description: "Return number prefix",
  },
  {
    key: "receipt_footer",
    value: "Thank you for your purchase!",
    type: "TEXT" as const,
    description: "Receipt footer",
  },
];

async function main() {
  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: {
        key: setting.key,
      },
      update: {
        value: setting.value,
        type: setting.type,
        description: setting.description,
      },
      create: setting,
    });
  }

  console.log(
    "Default system settings created."
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });