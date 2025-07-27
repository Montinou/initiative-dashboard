require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Demo accounts configuration
const demoAccounts = [
  // Stratix Platform
  {
    email: 'ceo@stratix-demo.com',
    full_name: 'CEO Stratix',
    role: 'CEO',
    tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e',
    tenant_name: 'Stratix Platform'
  },
  {
    email: 'admin@stratix-demo.com',
    full_name: 'Admin Stratix',
    role: 'Admin',
    tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e',
    tenant_name: 'Stratix Platform'
  },
  // FEMA Electricidad
  {
    email: 'ceo@fema-electricidad.com',
    full_name: 'CEO FEMA',
    role: 'CEO',
    tenant_id: 'c5a4dd96-6058-42b3-8268-997728a529bb',
    tenant_name: 'FEMA Electricidad'
  },
  {
    email: 'admin@fema-electricidad.com',
    full_name: 'Admin FEMA',
    role: 'Admin',
    tenant_id: 'c5a4dd96-6058-42b3-8268-997728a529bb',
    tenant_name: 'FEMA Electricidad'
  },
  // SIGA Turismo
  {
    email: 'ceo@siga-turismo.com',
    full_name: 'CEO SIGA',
    role: 'CEO',
    tenant_id: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2',
    tenant_name: 'SIGA Turismo'
  },
  {
    email: 'admin@siga-turismo.com',
    full_name: 'Admin SIGA',
    role: 'Admin',
    tenant_id: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2',
    tenant_name: 'SIGA Turismo'
  }
];

async function createProfilesOnly() {
  console.log('Creating user profiles directly (bypassing auth.users)...\n');
  
  for (const account of demoAccounts) {
    try {
      console.log(`Creating profile for: ${account.email} (${account.tenant_name})`);
      
      const userId = crypto.randomUUID();
      
      // Create user profile directly
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: userId,
          tenant_id: account.tenant_id,
          email: account.email,
          full_name: account.full_name,
          role: account.role,
          area: account.role === 'CEO' ? 'Executive' : 'Administration',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (profileError) {
        console.error(`✗ Error creating profile for ${account.email}:`, profileError.message);
      } else {
        console.log(`✓ Created user profile for ${account.email} with ID: ${userId}`);
      }
      
    } catch (error) {
      console.error(`✗ Error processing ${account.email}:`, error.message);
    }
  }
  
  // Verify creation
  console.log('\nVerifying profiles...');
  const { data: profiles, error: verifyError } = await supabaseAdmin
    .from('user_profiles')
    .select('email, full_name, role, tenants(name)')
    .in('email', demoAccounts.map(a => a.email));
  
  if (verifyError) {
    console.error('Error verifying profiles:', verifyError.message);
  } else {
    console.log(`\nProfiles created: ${profiles?.length || 0}/${demoAccounts.length}`);
    if (profiles && profiles.length > 0) {
      profiles.forEach(profile => {
        console.log(`  - ${profile.email} (${profile.role}) in ${profile.tenants?.name || 'Unknown'}`);
      });
    }
  }
  
  console.log('\n=== PROFILE CREATION COMPLETE ===');
  console.log('\nNote: These profiles exist but have no corresponding auth.users entries.');
  console.log('You would need to create auth.users manually or fix the auth trigger issue.');
}

createProfilesOnly();