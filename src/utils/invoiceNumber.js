async function generateReceiptNumber(tx) {
  const rows =
    await tx.$queryRaw`
      SELECT
        "id",
        "value"
      FROM "SystemSetting"
      WHERE "key" = 'SALE_RECEIPT_COUNTER'
      FOR UPDATE
    `;

  if (!rows || rows.length === 0) {
    throw new Error(
      "SALE_RECEIPT_COUNTER setting not found"
    );
  }

  const setting = rows[0];

  const currentValue =
    Number(setting.value || 0);

  if (
    !Number.isInteger(
      currentValue
    )
  ) {
    throw new Error(
      "Invalid SALE_RECEIPT_COUNTER value"
    );
  }

  if (
    currentValue >=
    99999999
  ) {
    throw new Error(
      "Invoice number limit reached"
    );
  }

  const nextValue =
    currentValue + 1;

  const receiptNumber =
    String(
      nextValue
    ).padStart(
      8,
      "0"
    );

  await tx.systemSetting.update({
    where: {
      id: setting.id,
    },

    data: {
      value: String(
        nextValue
      ),

      updatedAt:
        new Date(),
    },
  });

  return receiptNumber;
}

module.exports = {
  generateReceiptNumber,
};