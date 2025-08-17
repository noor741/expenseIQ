import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, createErrorResponse, createResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create service client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔧 Manual receipt processing trigger...');

    // Get the stuck receipt
    const receiptId = '8d1a9090-597f-4dd3-b2df-577fe22b2cc3';

    // Reset the receipt status to "uploaded" to trigger reprocessing
    const { error: updateError } = await supabase
      .from('receipts')
      .update({ 
        status: 'uploaded',
        processed_at: null,
        raw_ocr_json: null 
      })
      .eq('id', receiptId);

    if (updateError) {
      console.error('❌ Failed to reset receipt status:', updateError);
      return createErrorResponse('Failed to reset receipt status');
    }

    console.log('✅ Receipt status reset to uploaded, processing should start automatically');

    // Get updated receipt info
    const { data: receipt, error: fetchError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (fetchError) {
      return createErrorResponse('Failed to fetch receipt info');
    }

    return createResponse({ 
      success: true, 
      message: 'Receipt reset for reprocessing',
      receipt: receipt
    });

  } catch (error) {
    console.error('💥 Manual processing error:', error);
    return createErrorResponse(error.message);
  }
});
