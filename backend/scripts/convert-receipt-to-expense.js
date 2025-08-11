// Usage:
//   node backend/scripts/convert-receipt-to-expense.js <RECEIPT_ID>

require('dotenv').config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');
const parseAzureReceipt = require('../utils/parseAzureReceipt');

(async () => {
  try {
    const receiptId = process.argv[2];
    if (!receiptId) {
      console.log('Usage: node backend/scripts/convert-receipt-to-expense.js <RECEIPT_ID>');
      process.exit(1);
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    // 1) fetch the receipt with raw OCR JSON
    const { data: receipt, error: rErr } = await supabase
      .from('receipts')
      .select('id, raw_ocr_json')
      .eq('id', receiptId)
      .single();

    if (rErr) throw rErr;
    if (!receipt?.raw_ocr_json) {
      console.log('Receipt found but raw_ocr_json is empty.');
      process.exit(1);
    }

    // 2) parse fields
    const p = parseAzureReceipt(receipt.raw_ocr_json);

    // (optional) prevent duplicates for same receipt_id
    const { data: existing, error: xErr } = await supabase
      .from('expenses')
      .select('id')
      .eq('receipt_id', receipt.id)
      .maybeSingle();
    if (xErr) throw xErr;
    if (existing) {
      console.log('Expense already exists for this receipt_id:', existing.id);
      process.exit(0);
    }

    // 3) insert into expenses
    const { data: exp, error: eErr } = await supabase
      .from('expenses')
      .insert({
        receipt_id: receipt.id,
        merchant_name: p.merchant_name,
        transaction_date: p.transaction_date,
        subtotal: p.subtotal,
        tax: p.tax,
        total: p.total,
        currency: p.currency,
        payment_method: p.payment_method
      })
      .select()
      .single();

    if (eErr) throw eErr;

    console.log('✅ Inserted expense:', exp);
  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  }
})();