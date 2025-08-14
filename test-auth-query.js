require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testWithAuth() {
  // Create client with anon key (as the frontend does)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  // Sign in as CEO user
  console.log('Signing in as CEO user...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'ceo@siga.com',
    password: 'demo123456'
  });
  
  if (authError) {
    console.error('Auth error:', authError);
    return;
  }
  
  console.log('Authenticated as:', authData.user.email);
  console.log('Session token exists:', !!authData.session?.access_token);
  
  // Now test the query
  console.log('\nTesting objectives query with auth...');
  
  const { data: objectives, error: objError } = await supabase
    .from('objectives')
    .select(`
      id,
      title,
      tenant_id,
      initiatives:objective_initiatives(
        objective_id,
        initiative_id,
        initiative:initiatives!objective_initiatives_initiative_id_fkey(
          id,
          title,
          progress,
          status
        )
      )
    `)
    .eq('tenant_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    .limit(3);
    
  if (objError) {
    console.error('Error fetching objectives:', objError);
  } else {
    console.log('\nObjectives with initiatives:');
    objectives?.forEach(obj => {
      console.log(`\nObjective: ${obj.title?.substring(0, 40)}`);
      console.log(`  Initiatives linked: ${obj.initiatives?.length || 0}`);
      if (obj.initiatives?.length > 0) {
        obj.initiatives.slice(0, 2).forEach(rel => {
          console.log(`    - ${rel.initiative?.title?.substring(0, 30) || 'NOT FOUND'} (${rel.initiative?.status || 'N/A'})`);
        });
        if (obj.initiatives.length > 2) {
          console.log(`    ... and ${obj.initiatives.length - 2} more`);
        }
      }
    });
  }
  
  // Test direct initiatives query
  console.log('\n\nTesting direct initiatives query...');
  const { data: initiatives, error: initError } = await supabase
    .from('initiatives')
    .select('id, title, tenant_id')
    .eq('tenant_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    .limit(3);
    
  if (initError) {
    console.error('Error fetching initiatives:', initError);
  } else {
    console.log('Direct initiatives found:', initiatives?.length || 0);
    initiatives?.forEach(i => {
      console.log(`  - ${i.title?.substring(0, 40)}`);
    });
  }
  
  // Sign out
  await supabase.auth.signOut();
  console.log('\n\nSigned out.');
}

testWithAuth().catch(console.error);