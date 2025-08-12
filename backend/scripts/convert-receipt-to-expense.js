/**
 * Script: convert-receipt-to-expense.js
 * ------------------------------------------------------------
 * PURPOSE
 *   Convert a single receipt (by UUID) into an expense row by reading
 *   `receipts.raw_ocr_json` and inserting into `public.expenses`.
 *
 * USAGE
 *   node backend/scripts/convert-receipt-to-expense.js <RECEIPT_UUID>
 *
 * ENV
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   Values are loaded from backend/.env via dotenv.
 *
 * BEHAVIOR
 *   - Idempotent: if an expense already exists for this receipt_id, the script logs and exits.
 *   - Useful for manual testing without going through the webhook.
 */

require("dotenv").config({ path: "backend/.env" });
const { createClient } = require("@supabase/supabase-js");
const parseAzureReceipt = require("../utils/parseAzureReceipt");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

(async () => {
  const receipt_id = process.argv[2];
  if (!receipt_id) {
    console.error("Usage: node convert-receipt-to-expense.js <RECEIPT_UUID>");
    process.exit(1);
  }

  // Idempotency check
  const { data: exists } = await supabase
    .from("expenses")
    .select("id")
    .eq("receipt_id", receipt_id)
    .maybeSingle();

  if (exists) {
    console.log(`Expense already exists for this receipt_id: ${receipt_id}`);
    return;
  }

  // Fetch receipt OCR JSON
  const { data: receipt } = await supabase
    .from("receipts")
    .select("raw_ocr_json")
    .eq("id", receipt_id)
    .single();

  if (!receipt?.raw_ocr_json) {
    console.error(`No OCR JSON found for receipt_id: ${receipt_id}`);
    return;
  }

  // Parse and insert
  const expenseData = parseAzureReceipt(receipt.raw_ocr_json);
  await supabase.from("expenses").insert({ receipt_id, ...expenseData });
  console.log(`Inserted expense for receipt_id: ${receipt_id}`);
})();