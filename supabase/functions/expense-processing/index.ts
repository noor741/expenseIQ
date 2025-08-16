import { corsHeaders, createErrorResponse, createResponse } from '../_shared/cors.ts';
import { expenseService } from '../_shared/expenseService.ts';
import { createSupabaseClient, getUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Authorization header required', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const user = await getUser(token);
    const supabase = createSupabaseClient(token);

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const action = pathSegments[pathSegments.length - 1];

    switch (req.method) {
      case 'POST':
        if (action === 'create-from-receipt') {
          // Create expense from existing receipt
          const { receiptId, currency = 'USD' } = await req.json();
          
          if (!receiptId) {
            return createErrorResponse('receiptId is required');
          }

          // Get the receipt with OCR data
          const { data: receipt, error: receiptError } = await supabase
            .from('receipts')
            .select('*')
            .eq('id', receiptId)
            .eq('user_id', user.id)
            .single();

          if (receiptError || !receipt) {
            return createErrorResponse('Receipt not found', 404);
          }

          if (!receipt.raw_ocr_json) {
            return createErrorResponse('Receipt has no OCR data', 400);
          }

          // Check if expense already exists
          const { data: existingExpense } = await supabase
            .from('expenses')
            .select('id')
            .eq('receipt_id', receiptId)
            .single();

          if (existingExpense) {
            return createErrorResponse('Expense already exists for this receipt', 409);
          }

          // Create expense from OCR data
          const result = await expenseService.createFromOCR(
            receiptId,
            receipt.raw_ocr_json,
            user.id,
            currency
          );

          if (result.success) {
            // Update receipt status
            await supabase
              .from('receipts')
              .update({ status: 'expense_created' })
              .eq('id', receiptId);

            return createResponse({
              success: true,
              data: {
                expenseId: result.expenseId,
                itemsCreated: result.itemsCreated
              }
            }, 201);
          } else {
            return createErrorResponse(result.error || 'Failed to create expense');
          }
        }

        if (action === 'bulk-create') {
          // Bulk create expenses from multiple receipts
          const { receiptIds, currency = 'USD' } = await req.json();
          
          if (!Array.isArray(receiptIds) || receiptIds.length === 0) {
            return createErrorResponse('receiptIds array is required');
          }

          const results = [];
          let successCount = 0;
          let errorCount = 0;

          for (const receiptId of receiptIds) {
            try {
              // Get receipt
              const { data: receipt, error: receiptError } = await supabase
                .from('receipts')
                .select('*')
                .eq('id', receiptId)
                .eq('user_id', user.id)
                .single();

              if (receiptError || !receipt || !receipt.raw_ocr_json) {
                results.push({
                  receiptId,
                  success: false,
                  error: 'Receipt not found or no OCR data'
                });
                errorCount++;
                continue;
              }

              // Check if expense already exists
              const { data: existingExpense } = await supabase
                .from('expenses')
                .select('id')
                .eq('receipt_id', receiptId)
                .single();

              if (existingExpense) {
                results.push({
                  receiptId,
                  success: false,
                  error: 'Expense already exists'
                });
                errorCount++;
                continue;
              }

              // Create expense
              const result = await expenseService.createFromOCR(
                receiptId,
                receipt.raw_ocr_json,
                user.id,
                currency
              );

              if (result.success) {
                await supabase
                  .from('receipts')
                  .update({ status: 'expense_created' })
                  .eq('id', receiptId);

                results.push({
                  receiptId,
                  success: true,
                  expenseId: result.expenseId,
                  itemsCreated: result.itemsCreated
                });
                successCount++;
              } else {
                results.push({
                  receiptId,
                  success: false,
                  error: result.error
                });
                errorCount++;
              }
            } catch (error) {
              results.push({
                receiptId,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
              errorCount++;
            }
          }

          return createResponse({
            success: true,
            data: {
              results,
              summary: {
                total: receiptIds.length,
                successful: successCount,
                failed: errorCount
              }
            }
          });
        }

        return createErrorResponse('Unknown action', 400);

      case 'GET':
        if (action === 'stats') {
          // Get expense statistics
          const startDate = url.searchParams.get('start_date');
          const endDate = url.searchParams.get('end_date');

          const stats = await expenseService.getExpenseStats(user.id, startDate, endDate);
          
          return createResponse({
            success: true,
            data: stats
          });
        }

        if (action === 'ready-receipts') {
          // Get receipts that are ready for expense creation
          const { data: receipts, error } = await supabase
            .from('receipts')
            .select('id, file_url, upload_date, merchant_name, raw_ocr_json')
            .eq('user_id', user.id)
            .eq('status', 'processed')
            .not('raw_ocr_json', 'is', null);

          if (error) {
            return createErrorResponse(`Failed to fetch receipts: ${error.message}`);
          }

          // Filter out receipts that already have expenses
          const receiptIds = receipts.map(r => r.id);
          const { data: existingExpenses } = await supabase
            .from('expenses')
            .select('receipt_id')
            .in('receipt_id', receiptIds);

          const existingReceiptIds = new Set(existingExpenses?.map(e => e.receipt_id) || []);
          const readyReceipts = receipts.filter(r => !existingReceiptIds.has(r.id));

          return createResponse({
            success: true,
            data: {
              receipts: readyReceipts,
              count: readyReceipts.length
            }
          });
        }

        return createErrorResponse('Unknown action', 400);

      default:
        return createErrorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Expense processing API error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
});
