/**
 * Script: list-receipts.js
 * ------------------------------------------------------------
 * PURPOSE
 *   List recent receipt rows so testers can easily copy a UUID
 *   for running the converter script.
 *
 * USAGE
 *   node backend/scripts/list-receipts.js
 *
 * OUTPUT
 *   Prints: id, status, has_ocr (true/false), upload_date
 *
 * TIP
 *   Pick a receipt with status 'processed' and has_ocr=true for conversion tests.
 */

require("dotenv").config({ path: "backend/.env" });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

(async () => {
  const { data: receipts } = await supabase
    .from("receipts")
    .select("id, status, raw_ocr_json, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  receipts.forEach((r) => {
    console.log(
      `${r.id} | status=${r.status} | has_ocr=${!!r.raw_ocr_json} | uploaded=${r.created_at}`
    );
  });
})();
