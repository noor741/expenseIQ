// backend/utils/parseAzureReceipt.js
module.exports = function parseAzureReceipt(ocr) {
  const f = ocr?.documents?.[0]?.fields || {};
  const toNum = (n) => {
    const v = Number(n?.value ?? n);
    return Number.isFinite(v) ? v : null;
  };

  const dateVal = f.TransactionDate?.value ?? null;
  const transactionDate = dateVal ? new Date(dateVal).toISOString().slice(0,10) : null;

  return {
    merchant_name: f.MerchantName?.value ?? null,
    transaction_date: transactionDate,
    subtotal: toNum(f.Subtotal),
    tax: toNum(f.Tax),
    total: toNum(f.Total),
    currency: f.Total?.currencyCode ?? null,
    payment_method: f.PaymentMethod?.value ?? null
  };
};