import { createClient } from '@supabase/supabase-js';

const url = 'https://deobjwbngwhipysjtief.supabase.co';
const key = 'sb_publishable_s1u1q5LawJmBwl2VioslFQ_X6SNhFT1';

async function testConn() {
  console.log('Testing Supabase Connection...');
  console.log('URL:', url);
  console.log('Key prefix:', key.substring(0, 15) + '...');
  
  const client = createClient(url, key);
  
  try {
    const { data, error, status, statusText } = await client
      .from('factories')
      .select('*')
      .limit(5);
      
    console.log('HTTP Status:', status, statusText);
    if (error) {
      console.log('Supabase returned error / notice:', error.message, error.code, error.details);
    } else {
      console.log('Successfully connected! Factories found:', data?.length ?? 0);
      console.log('Data:', data);
    }
  } catch (err: any) {
    console.error('Network / fetch exception:', err?.message || err);
  }
}

testConn();
