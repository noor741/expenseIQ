/**
 * parseAzureReceipt(ocr)
 * ------------------------------------------------------------
 * PURPOSE
 *   Normalize Azure Form Recognizer (prebuilt-receipt) JSON into
 *   our `expenses` column shape. Keeps all field mapping in one place.
 *
 * INPUT
 *   ocr: full JSON returned by Azure (we expect ocr.documents[0].fields).
 *
 * OUTPUT
 *   {
 *     merchant_name: string | null,
 *     transaction_date: 'YYYY-MM-DD' | null,
 *     subtotal: number | null,
 *     tax: number | null,
 *     total: number | null,
 *     currency: string | null,
 *     payment_method: string | null
 *   }
 *
 * NOTES
 *   - All fields are optional; return nulls when not present.
 *   - `transaction_date` is reduced to YYYY-MM-DD for consistency.
 *   - If you later detect refunds, you can make totals negative here.
 */

// Convert Azure "fields" into our normalized expense shape
module.exports = function parseAzureReceipt(ocr) {
  const fields = ocr?.documents?.[0]?.fields || {};
  return {
    merchant_name: fields?.MerchantName?.value || null,
    transaction_date: fields?.TransactionDate?.value
      ? fields.TransactionDate.value.split("T")[0]
      : null,
    subtotal: fields?.Subtotal?.value || null,
    tax: fields?.Tax?.value || null,
    total: fields?.Total?.value || null,
    currency: fields?.Currency?.value || null,
    payment_method: fields?.PaymentMethod?.value || null,
  };
};
