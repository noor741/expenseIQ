/**
 * Edge Function: convert-receipts-to-expenses
 * ------------------------------------------------------------
 * PURPOSE
 *   - Converts OCR output in `receipts.raw_ocr_json` (Azure Form Recognizer)
 *     into a normalized row in `public.expenses`.
 *   - Safe to call multiple times for the same receipt (idempotent).
 *
 * TRIGGERS / MODES
 *   - Webhook (POST) with body containing a `receipt_id`:
 *        { record: { id } }            // Supabase DB webhook payload
 *        { receipt_id: "uuid" }        // manual POST/test
 *   - Backlog mode (no id in payload): processes the latest receipts that
 *     already have `raw_ocr_json` but no `expenses` row yet.
 *
 * AUTH
 *   - Reads secrets from Edge Function Secrets:
 *       SUPABASE_URL
 *       SUPABASE_SERVICE_ROLE_KEY
 *       (optional) WEBHOOK_SECRET  → if set, require `x-wh-secret` header.
 *   - Uses service-role to bypass RLS for server-side inserts.
 *
 * NOTES
 *   - Idempotency: if an `expenses.receipt_id` already exists, the insert is skipped.
 *   - Parsing centralized in `parseAzureReceipt()` so we keep field mapping in one place.
 *   - Keep function side-effect free beyond the insert (no schema changes).
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET"); // Optional for securing webhook

// Create service-role client (server-side, no persisted session)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

/** Map Azure Form Recognizer "fields" into our expenses columns. */
function parseAzureReceipt(ocr: any) {
  // `documents[0].fields` is the common location for prebuilt receipt model output
  // All fields are optional; we coerce to null when missing so inserts succeed.
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
}

/** Insert one expense for a given receipt id, if it doesn't exist yet. */
async function processOne(receipt_id: string) {
  // 1) Idempotency guard — skip if expenses.receipt_id already exists.
  const { data: exists } = await supabase
    .from("expenses")
    .select("id")
    .eq("receipt_id", receipt_id)
    .maybeSingle();
  if (exists) {
    console.log(`Expense already exists for receipt_id: ${receipt_id}`);
    return;
  }

  // 2) Fetch raw OCR JSON from receipts table.
  const { data: receipt } = await supabase
    .from("receipts")
    .select("raw_ocr_json")
    .eq("id", receipt_id)
    .single();

  if (!receipt?.raw_ocr_json) {
    console.log(`No OCR JSON found for receipt_id: ${receipt_id}`);
    return;
  }

  // 3) Parse into normalized shape.
  const expenseData = parseAzureReceipt(receipt.raw_ocr_json);

  // 4) Insert into expenses.
  await supabase.from("expenses").insert({ receipt_id, ...expenseData });
  console.log(`Inserted expense for receipt_id: ${receipt_id}`);
}

serve(async (req) => {
  // Optional shared secret check (if WEBHOOK_SECRET is configured)
  if (WEBHOOK_SECRET) {
    const incomingSecret = req.headers.get("x-wh-secret");
    if (incomingSecret !== WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const payload = await req.json().catch(() => ({}));
  const receipt_id =
    payload?.record?.id || payload?.receipt_id || null;

  if (receipt_id) {
    // Process a single receipt from webhook or manual POST
    await processOne(receipt_id);
    return new Response("Processed single receipt", { status: 200 });
  }

  // Backlog mode — process receipts with OCR JSON but no expense
  const { data: backlog } = await supabase
    .from("receipts")
    .select("id")
    .not("raw_ocr_json", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);

  for (const r of backlog || []) {
    await processOne(r.id);
  }

  return new Response("Processed backlog", { status: 200 });
});
