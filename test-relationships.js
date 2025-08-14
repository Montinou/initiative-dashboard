require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testRelationships() {
  console.log('Testing objectives-initiatives relationships...\n');
  
  // First, let's check raw objective_initiatives table
  const { data: junctionData, error: junctionError } = await supabase
    .from('objective_initiatives')
    .select('*')
    .limit(5);
    
  if (junctionError) {
    console.error('Error fetching junction table:', junctionError);
  } else {
    console.log('Sample junction table entries:', JSON.stringify(junctionData, null, 2));
  }
  
  // Now test the actual query used by the API
  const { data: objectives, error: objError } = await supabase
    .from('objectives')
    .select(`
      id,
      title,
      initiatives:objective_initiatives(
        id,
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
    console.error('Error fetching objectives with initiatives:', objError);
  } else {
    console.log('\nObjectives with initiatives:');
    objectives.forEach(obj => {
      console.log(`\nObjective: ${obj.title} (${obj.id})`);
      console.log(`  Initiative count: ${obj.initiatives?.length || 0}`);
      if (obj.initiatives && obj.initiatives.length > 0) {
        obj.initiatives.forEach(init => {
          console.log(`  - Initiative: ${init.initiative?.title || 'NULL'} (${init.initiative_id})`);
        });
      }
    });
  }
  
  // Also check initiatives directly
  const { data: initiatives, error: initError } = await supabase
    .from('initiatives')
    .select('id, title, tenant_id')
    .eq('tenant_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    .limit(5);
    
  if (initError) {
    console.error('Error fetching initiatives:', initError);
  } else {
    console.log('\nSample initiatives in tenant:', JSON.stringify(initiatives, null, 2));
  }
}

testRelationships().catch(console.error);