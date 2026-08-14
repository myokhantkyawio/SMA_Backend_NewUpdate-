import prisma from "../config/prisma";

export async function getAllSettings() {
  return prisma.systemSetting.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      key: "asc",
    },
  });
}

export async function getSettingByKey(key: string) {
  return prisma.systemSetting.findUnique({
    where: {
      key,
    },
  });
}

export async function createSetting(data: {
  key: string;
  value?: string;
  type?: "TEXT" | "NUMBER" | "BOOLEAN" | "JSON";
  description?: string;
}) {
  return prisma.systemSetting.create({
    data: {
      key: data.key,
      value: data.value,
      type: data.type ?? "TEXT",
      description: data.description,
    },
  });
}

export async function updateSetting(
  id: string,
  data: {
    value?: string;
    type?: "TEXT" | "NUMBER" | "BOOLEAN" | "JSON";
    description?: string;
    isActive?: boolean;
  }
) {
  return prisma.systemSetting.update({
    where: {
      id,
    },
    data,
  });
}

export async function deleteSetting(id: string) {
  return prisma.systemSetting.update({
    where: {
      id,
    },
    data: {
      isActive: false,
    },
  });
}