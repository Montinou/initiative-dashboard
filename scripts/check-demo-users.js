require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Demo accounts with correct tenant IDs
const demoAccounts = [
  // Stratix Platform
  { email: 'ceo@stratix-demo.com', tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e', tenant_name: 'Stratix Platform' },
  { email: 'admin@stratix-demo.com', tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e', tenant_name: 'Stratix Platform' },
  // FEMA Electricidad
  { email: 'ceo@fema-electricidad.com', tenant_id: 'c5a4dd96-6058-42b3-8268-997728a529bb', tenant_name: 'FEMA Electricidad' },
  { email: 'admin@fema-electricidad.com', tenant_id: 'c5a4dd96-6058-42b3-8268-997728a529bb', tenant_name: 'FEMA Electricidad' },
  // SIGA Turismo
  { email: 'ceo@siga-turismo.com', tenant_id: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', tenant_name: 'SIGA Turismo' },
  { email: 'admin@siga-turismo.com', tenant_id: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', tenant_name: 'SIGA Turismo' }
];

async function checkDemoUsers() {
  console.log('Checking demo users...\n');
  
  // Check each demo account
  for (const account of demoAccounts) {
    console.log(`Checking ${account.email} (${account.tenant_name}):`);
    
    // Check in user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', account.email)
      .single();
    
    if (profile) {
      console.log('✓ Found in user_profiles');
      console.log(`  - ID: ${profile.id}`);
      console.log(`  - Tenant ID: ${profile.tenant_id}`);
      console.log(`  - Role: ${profile.role}`);
      console.log(`  - Active: ${profile.is_active}`);
      
      // Verify tenant ID matches
      if (profile.tenant_id !== account.tenant_id) {
        console.log(`  ⚠️  WARNING: Tenant ID mismatch! Expected: ${account.tenant_id}, Got: ${profile.tenant_id}`);
      }
    } else {
      console.log('✗ NOT found in user_profiles');
    }
    
    console.log('');
  }
  
  // Check tenants
  console.log('\nChecking tenants:');
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, name, subdomain')
    .in('id', ['4f644c1f-0d57-4980-8eba-ecc9ed7b661e', 'c5a4dd96-6058-42b3-8268-997728a529bb', 'd1a3408c-a3d0-487e-a355-a321a07b5ae2']);
  
  if (tenants && tenants.length > 0) {
    tenants.forEach(tenant => {
      console.log(`✓ ${tenant.name} (${tenant.subdomain}): ${tenant.id}`);
    });
  } else {
    console.log('✗ No tenants found!');
  }
}

checkDemoUsers();