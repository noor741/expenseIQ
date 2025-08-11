require('dotenv').config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');

(async () => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase
      .from('receipts')
      .select('id, upload_date')
      .order('upload_date', { ascending: false })
      .limit(10);

    if (error) throw error;

    console.table(data || []);
  } catch (e) {
    console.error('❌', e.message);
  }
})();