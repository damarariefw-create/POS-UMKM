import { supabase } from './src/lib/supabase.js';

async function test() {
  // Try inserting with 'alamat'
  console.log('Trying insert with "alamat"...');
  const resAlamat = await supabase.from('customers').insert([
    { user_id: 'd9bfa3fc-22c6-43bf-9f1c-7cb0d268d011', name: 'Test Alamat', total_debt: 0, alamat: 'Test' }
  ]);
  console.log('Result for alamat:', resAlamat.error ? resAlamat.error.message : 'Success!');

  // Try inserting with 'route'
  console.log('Trying insert with "route"...');
  const resRoute = await supabase.from('customers').insert([
    { user_id: 'd9bfa3fc-22c6-43bf-9f1c-7cb0d268d011', name: 'Test Route', total_debt: 0, route: 'Test' }
  ]);
  console.log('Result for route:', resRoute.error ? resRoute.error.message : 'Success!');

  // Try inserting with 'address'
  console.log('Trying insert with "address"...');
  const resAddress = await supabase.from('customers').insert([
    { user_id: 'd9bfa3fc-22c6-43bf-9f1c-7cb0d268d011', name: 'Test Address', total_debt: 0, address: 'Test' }
  ]);
  console.log('Result for address:', resAddress.error ? resAddress.error.message : 'Success!');
}

test();
