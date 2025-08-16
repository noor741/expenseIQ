import { azureOCR } from '../_shared/azureOCR.ts';
import { corsHeaders, createErrorResponse, createResponse } from '../_shared/cors.ts';
import { expenseService } from '../_shared/expenseService.ts';
import { createServiceSupabaseClient, createSupabaseClient, getUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const apiKey = req.headers.get('apikey');
    
    // For GET requests, allow access with just the anon key
    const isGetRequest = req.method === 'GET';
    
    if (!authHeader && !isGetRequest) {
      return createErrorResponse('Authorization header required', 401);
    }

    let user = null;
    let supabase;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      try {
        user = await getUser(token);
        supabase = createSupabaseClient(token);
      } catch (error) {
        if (!isGetRequest) {
          return createErrorResponse('Invalid authentication token', 401);
        }
        // For GET requests, fall back to anon access
        supabase = createSupabaseClient();
      }
    } else {
      // Use anon client for GET requests
      supabase = createSupabaseClient();
    }

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const receiptId = pathSegments[pathSegments.length - 1];
    const isReprocessRequest = pathSegments[pathSegments.length - 1] === 'reprocess';
    const actualReceiptId = isReprocessRequest ? pathSegments[pathSegments.length - 2] : receiptId;

    // Handle reprocess requests
    if (isReprocessRequest && req.method === 'POST') {
      
      if (!actualReceiptId || actualReceiptId === 'receipts') {
        return createErrorResponse('Receipt ID required for reprocessing');
      }

      if (!user) {
        return createErrorResponse('Authentication required for reprocessing', 401);
      }

      try {
        // Get the receipt to verify ownership and get file_url
        const { data: receiptData, error: fetchError } = await supabase
          .from('receipts')
          .select('file_url, user_id, status')
          .eq('id', actualReceiptId)
          .single();

        if (fetchError || !receiptData) {
          return createErrorResponse('Receipt not found', 404);
        }

        if (receiptData.user_id !== user.id) {
          return createErrorResponse('Unauthorized access to receipt', 403);
        }

        // Update status to processing
        const { error: updateError } = await supabase
          .from('receipts')
          .update({ 
            status: 'processing',
            raw_ocr_json: null, // Clear previous OCR data
            processed_at: null
          })
          .eq('id', actualReceiptId);

        if (updateError) {
          return createErrorResponse('Failed to update receipt status');
        }

        // Get user's preferred currency
        const { data: userPrefs } = await supabase
          .from('users')
          .select('preferences')
          .eq('id', user.id)
          .single();

        const preferred_currency = userPrefs?.preferences?.currency || 'USD';

        // Trigger OCR processing asynchronously
        if (receiptData.file_url) {
          processReceiptOCR(actualReceiptId, receiptData.file_url, supabase, user.id, preferred_currency).catch(error => {
            console.error(`❌ Reprocess OCR failed for receipt ${actualReceiptId}:`, error);
          });
        }

        return createResponse({ 
          success: true, 
          message: 'Receipt reprocessing started',
          receiptId: actualReceiptId 
        });

      } catch (error) {
        console.error('Reprocess error:', error);
        return createErrorResponse('Failed to reprocess receipt');
      }
    }

    switch (req.method) {
      case 'GET':
        if (actualReceiptId && actualReceiptId !== 'receipts') {
          // Get single receipt
          const { data, error } = await supabase
            .from('receipts')
            .select('*')
            .eq('id', actualReceiptId)
            .eq('user_id', user.id)
            .single();

          if (error) {
            return createErrorResponse(`Receipt not found: ${error.message}`, 404);
          }

          return createResponse({ success: true, data });
        } else {
          // Get all receipts for user with pagination
          const page = parseInt(url.searchParams.get('page') || '1');
          const limit = parseInt(url.searchParams.get('limit') || '20');
          const status = url.searchParams.get('status');
          const offset = (page - 1) * limit;

          let query = supabase
            .from('receipts')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('upload_date', { ascending: false })
            .range(offset, offset + limit - 1);

          if (status) {
            query = query.eq('status', status);
          }

          const { data, error, count } = await query;

          if (error) {
            return createErrorResponse(`Failed to fetch receipts: ${error.message}`);
          }

          return createResponse({
            success: true,
            data: {
              receipts: data,
              pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
              }
            }
          });
        }

      case 'POST':
        // Create new receipt - requires authentication
        if (!user) {
          return createErrorResponse('Authentication required for creating receipts', 401);
        }
        
        const { file_url, status = 'uploaded', raw_ocr_json, preferred_currency } = await req.json();

        if (!file_url) {
          return createErrorResponse('file_url is required');
        }

        const { data, error } = await supabase
          .from('receipts')
          .insert({
            user_id: user.id,
            file_url,
            upload_date: new Date().toISOString(),
            status,
            raw_ocr_json
          })
          .select()
          .single();

        if (error) {
          return createErrorResponse(`Failed to create receipt: ${error.message}`);
        }

        // 🤖 Trigger OCR processing asynchronously (don't wait for it)
        if (file_url && status === 'uploaded') {
          processReceiptOCR(data.id, file_url, supabase, user.id, preferred_currency || 'USD').catch(error => {
            console.error(`❌ OCR processing failed for receipt ${data.id}:`, error);
          });
        }

        return createResponse({ success: true, data }, 201);

      case 'PUT':
        // Update receipt
        if (!actualReceiptId || actualReceiptId === 'receipts') {
          return createErrorResponse('Receipt ID required for update');
        }

        const updateData = await req.json();
        const allowedFields = ['status', 'raw_ocr_json', 'processed_at'];
        const filteredData = Object.keys(updateData)
          .filter(key => allowedFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = updateData[key];
            return obj;
          }, {} as any);

        const { data: updatedData, error: updateError } = await supabase
          .from('receipts')
          .update(filteredData)
          .eq('id', actualReceiptId)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) {
          return createErrorResponse(`Failed to update receipt: ${updateError.message}`);
        }

        return createResponse({ success: true, data: updatedData });

      case 'DELETE':
        // Delete receipt
        if (!actualReceiptId || actualReceiptId === 'receipts') {
          return createErrorResponse('Receipt ID required for deletion');
        }

        // First get the receipt to find the file
        const { data: receipt, error: fetchError } = await supabase
          .from('receipts')
          .select('file_url')
          .eq('id', actualReceiptId)
          .eq('user_id', user.id)
          .single();

        if (fetchError) {
          return createErrorResponse(`Receipt not found: ${fetchError.message}`, 404);
        }

        // Delete the file from storage
        if (receipt.file_url) {
          await supabase.storage
            .from('receipts')
            .remove([receipt.file_url]);
        }

        // Delete the database record
        const { error: deleteError } = await supabase
          .from('receipts')
          .delete()
          .eq('id', actualReceiptId)
          .eq('user_id', user.id);

        if (deleteError) {
          return createErrorResponse(`Failed to delete receipt: ${deleteError.message}`);
        }

        return createResponse({ success: true, message: 'Receipt deleted successfully' });

      default:
        return createErrorResponse('Method not allowed', 405);
    }
  } catch (error) {
    console.error('Receipts API error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error', 
      500
    );
  }
});

/**
 * Process OCR for a receipt asynchronously and create expense records
 */
async function processReceiptOCR(receiptId: string, fileUrl: string, supabase: any, userId: string, currency: string = 'USD') {
  try {
    // Process the receipt with Azure Document Intelligence
    const ocrResult = await azureOCR.processReceipt(fileUrl);
    
    if (ocrResult.success && ocrResult.data) {
      
      // Create service role client to bypass RLS for system updates
      const serviceSupabase = createServiceSupabaseClient();
      
      // Update the receipt with OCR results using service role
      const { error: updateError } = await serviceSupabase
        .from('receipts')
        .update({
          status: 'processed',
          raw_ocr_json: ocrResult.rawData,
          processed_at: new Date().toISOString()
        })
        .eq('id', receiptId);
      
      if (updateError) {
        console.error(`❌ Failed to update receipt ${receiptId} with OCR results:`, updateError);
        return;
      }
      
      console.log(`💾 Receipt ${receiptId} updated with OCR results`);

      // 🎯 Automatically create expense and expense items from OCR data
      console.log(`🏗️ Creating expense from OCR data for receipt ${receiptId}`);
      
      // Create expense and expense items using the enhanced service
      const expenseResult = await expenseService.createFromOCR(receiptId, ocrResult.rawData, userId, currency);
      
      if (expenseResult.success) {
        // Update receipt status to indicate successful expense creation
        await serviceSupabase
          .from('receipts')
          .update({ 
            status: 'expense_created'
          })
          .eq('id', receiptId);
          
      } else {
        console.error(`❌ Failed to create expense from OCR data:`, expenseResult.error);
        
        // Update status to indicate expense creation failure but keep the OCR data
        await serviceSupabase
          .from('receipts')
          .update({ 
            status: 'expense_creation_failed'
          })
          .eq('id', receiptId);
      }
      
    } else {
      console.error(`❌ OCR failed for receipt ${receiptId}:`, ocrResult.error);
      
      // Create service role client for error status update
      const serviceSupabase = createServiceSupabaseClient();
      
      // Update status to indicate OCR failure
      await serviceSupabase
        .from('receipts')
        .update({
          status: 'ocr_failed'
        })
        .eq('id', receiptId);
    }
  } catch (error) {
    console.error(`💥 OCR processing error for receipt ${receiptId}:`, error);
    
    // Create service role client for error status update
    const serviceSupabase = createServiceSupabaseClient();
    
    // Update status to indicate processing error
    await serviceSupabase
      .from('receipts')
      .update({
        status: 'processing_failed'
      })
      .eq('id', receiptId);
  }
}
