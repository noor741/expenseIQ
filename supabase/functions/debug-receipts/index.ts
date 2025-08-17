import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log('🧪 Testing receipt reprocessing...');

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

try {
  // Get receipts that need processing
  const { data: receipts, error: fetchError } = await supabase
    .from('receipts')
    .select('id, status, user_id, file_url')
    .in('status', ['processing', 'uploaded'])
    .limit(5);

  if (fetchError) {
    console.error('❌ Error fetching receipts:', fetchError);
    Deno.exit(1);
  }

  console.log(`📋 Found ${receipts?.length || 0} receipts to process:`, receipts);

  if (receipts && receipts.length > 0) {
    // Try to manually process the first receipt
    const receipt = receipts[0];
    console.log(`🔄 Attempting to reprocess receipt: ${receipt.id}`);

    // Update status to processing
    const { error: updateError } = await supabase
      .from('receipts')
      .update({ status: 'processing' })
      .eq('id', receipt.id);

    if (updateError) {
      console.error('❌ Failed to update receipt status:', updateError);
    } else {
      console.log('✅ Updated receipt status to processing');
    }

    // Check user categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', receipt.user_id);

    console.log(`📁 User has ${categories?.length || 0} categories:`, categories?.map(c => c.name));

  }

} catch (error) {
  console.error('💥 Error:', error);
  return new Response(JSON.stringify({ error: error.message }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

return new Response(JSON.stringify({ message: 'Debug completed', receipts: receipts?.length || 0 }), {
  status: 200,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

});
