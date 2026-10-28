import { createClient } from '@supabase/supabase-js';

const url = 'https://deobjwbngwhipysjtief.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlb2Jqd2JuZ3doaXB5c2p0aWVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMjc0MTcsImV4cCI6MjEwODcwMzQxN30.ZHtL9eNGbDj_DLSwYNZDU9xGWTyjwGX5mjceMMZRfQM';

async function testConn() {
  console.log('Testing Supabase Connection with standard JWT Anon Key...');
  const client = createClient(url, key);
  
  const { data: factories, error: fErr } = await client.from('factories').select('*');
  console.log('Factories result:', { count: factories?.length, error: fErr });

  const { data: parties, error: pErr } = await client.from('parties').select('*');
  console.log('Parties result:', { count: parties?.length, error: pErr });

  const { data: bills, error: bErr } = await client.from('sales_bills').select('*');
  console.log('Sales Bills result:', { count: bills?.length, error: bErr });
}

testConn();
