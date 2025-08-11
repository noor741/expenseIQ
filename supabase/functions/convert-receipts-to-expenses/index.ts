// supabase/functions/convert-receipts-to-expenses/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function parseAzureReceipt(ocr: any) {
  const f = ocr?.documents?.[0]?.fields ?? {};
  const toNum = (n: any) => {
    const v = Number(n?.value ?? n);
    return Number.isFinite(v) ? v : null;
  };
  const dateVal = f.TransactionDate?.value ?? null;
  const transaction_date = dateVal ? new Date(dateVal).toISOString().slice(0, 10) : null;
  return {
    merchant_name: f.MerchantName?.value ?? null,
    transaction_date,
    subtotal: toNum(f.Subtotal),
    tax: toNum(f.Tax),
    total: toNum(f.Total),
    currency: f.Total?.currencyCode ?? null,
    payment_method: f.PaymentMethod?.value ?? null,
  };
}

async function processOne(receipt_id: string) {
  const { data: existing, error: xErr } = await supabase
    .from("expenses").select("id").eq("receipt_id", receipt_id).maybeSingle();
  if (xErr) throw xErr;
  if (existing) return { status: "skipped" };

  const { data: rec, error: rErr } = await supabase
    .from("receipts").select("id, raw_ocr_json").eq("id", receipt_id).single();
  if (rErr) throw rErr;
  if (!rec?.raw_ocr_json) return { status: "no_ocr" };

  const p = parseAzureReceipt(rec.raw_ocr_json);
  const { error: insErr } = await supabase.from("expenses").insert({
    receipt_id: rec.id,
    merchant_name: p.merchant_name,
    transaction_date: p.transaction_date,
    subtotal: p.subtotal,
    tax: p.tax,
    total: p.total,
    currency: p.currency,
    payment_method: p.payment_method,
  });
  if (insErr) throw insErr;
  return { status: "inserted" };
}

serve(async (req) => {
  const h = req.headers.get("x-wh-secret") ?? "";
  if (WEBHOOK_SECRET && h !== WEBHOOK_SECRET) {
    return new Response("unauthorized", { status: 401 });
  }

  if (req.method === "POST") {
    try {
      const body = await req.json().catch(() => ({}));
      const receipt_id =
        body?.record?.id ||
        body?.data?.record?.id ||
        body?.receipt_id;

      if (!receipt_id) {
        const { data: receipts, error } = await supabase
          .from("receipts")
          .select("id")
          .not("raw_ocr_json", "is", null)
          .order("upload_date", { ascending: false })
          .limit(50);
        if (error) throw error;

        let inserted = 0, skipped = 0, no_ocr = 0;
        for (const r of receipts ?? []) {
          const res = await processOne(r.id);
          if (res.status === "inserted") inserted++;
          else if (res.status === "skipped") skipped++;
          else if (res.status === "no_ocr") no_ocr++;
        }
        return Response.json({ ok: true, mode: "backlog", inserted, skipped, no_ocr });
      }

      const result = await processOne(receipt_id);
      return Response.json({ ok: true, mode: "single", receipt_id, ...result });
    } catch (e) {
      return new Response((e as Error).message, { status: 500 });
    }
  }

  return new Response("use POST", { status: 405 });
});