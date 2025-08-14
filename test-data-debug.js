require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugData() {
  console.log('Debugging data relationships with service role...\n');
  
  // Check all objectives
  const { data: objectives, error: objError } = await supabase
    .from('objectives')
    .select('id, title, tenant_id')
    .limit(5);
    
  if (objError) {
    console.error('Error fetching objectives:', objError);
  } else {
    console.log('Sample objectives:', objectives?.map(o => ({
      id: o.id.substring(0, 8),
      title: o.title.substring(0, 30),
      tenant: o.tenant_id?.substring(0, 8)
    })));
  }
  
  // Check all initiatives
  const { data: initiatives, error: initError } = await supabase
    .from('initiatives')
    .select('id, title, tenant_id')
    .limit(5);
    
  if (initError) {
    console.error('Error fetching initiatives:', initError);
  } else {
    console.log('\nSample initiatives:', initiatives?.map(i => ({
      id: i.id.substring(0, 8),
      title: i.title?.substring(0, 30),
      tenant: i.tenant_id?.substring(0, 8)
    })));
  }
  
  // Check junction table
  const { data: junctionData, error: junctionError } = await supabase
    .from('objective_initiatives')
    .select('id, objective_id, initiative_id')
    .limit(5);
    
  if (junctionError) {
    console.error('Error fetching junction table:', junctionError);
  } else {
    console.log('\nSample junction entries:', junctionData?.map(j => ({
      id: j.id.substring(0, 8),
      obj: j.objective_id?.substring(0, 8),
      init: j.initiative_id?.substring(0, 8)
    })));
  }
  
  // Now try the full join query
  const { data: fullQuery, error: fullError } = await supabase
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
          tenant_id
        )
      )
    `)
    .limit(2);
    
  if (fullError) {
    console.error('\nError with full query:', fullError);
  } else {
    console.log('\nFull query result:');
    fullQuery?.forEach(obj => {
      console.log(`\nObjective: ${obj.title?.substring(0, 40)}`);
      console.log(`  Tenant: ${obj.tenant_id?.substring(0, 8)}`);
      console.log(`  Initiatives linked: ${obj.initiatives?.length || 0}`);
      if (obj.initiatives?.length > 0) {
        obj.initiatives.forEach(rel => {
          console.log(`    - Initiative: ${rel.initiative?.title?.substring(0, 30) || 'NOT FOUND'}`);
          console.log(`      Initiative tenant: ${rel.initiative?.tenant_id?.substring(0, 8) || 'N/A'}`);
        });
      }
    });
  }
  
  // Check if there's a tenant mismatch
  const { data: objTenants } = await supabase
    .from('objectives')
    .select('tenant_id')
    .limit(100);
    
  const { data: initTenants } = await supabase
    .from('initiatives')
    .select('tenant_id')
    .limit(100);
    
  const uniqueObjTenants = [...new Set(objTenants?.map(o => o.tenant_id))];
  const uniqueInitTenants = [...new Set(initTenants?.map(i => i.tenant_id))];
  
  console.log('\nUnique tenants in objectives:', uniqueObjTenants);
  console.log('Unique tenants in initiatives:', uniqueInitTenants);
}

debugData().catch(console.error);