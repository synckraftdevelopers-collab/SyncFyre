import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('invoices').select('*, members(full_name, member_code), payments(*)').limit(1);
  console.log('DATA:', JSON.stringify(data, null, 2));
  console.log('ERROR:', error);
}
test();
