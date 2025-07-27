require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Demo accounts configuration
const demoAccounts = [
  // Stratix Platform
  {
    id: 'e1111111-1111-1111-1111-111111111111',
    email: 'ceo@stratix-demo.com',
    full_name: 'CEO Stratix',
    role: 'CEO',
    area: 'Executive',
    tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e',
    tenant_name: 'Stratix Platform'
  },
  {
    id: 'e2222222-2222-2222-2222-222222222222',
    email: 'admin@stratix-demo.com',
    full_name: 'Admin Stratix',
    role: 'Admin',
    area: 'Administration',
    tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e',
    tenant_name: 'Stratix Platform'
  },
  // FEMA Electricidad
  {
    id: 'f1111111-1111-1111-1111-111111111111',
    email: 'ceo@fema-electricidad.com',
    full_name: 'CEO FEMA',
    role: 'CEO',
    area: 'Executive',
    tenant_id: 'c5a4dd96-6058-42b3-8268-997728a529bb',
    tenant_name: 'FEMA Electricidad'
  },
  {
    id: 'f2222222-2222-2222-2222-222222222222',
    email: 'admin@fema-electricidad.com',
    full_name: 'Admin FEMA',
    role: 'Admin',
    area: 'Administration',
    tenant_id: 'c5a4dd96-6058-42b3-8268-997728a529bb',
    tenant_name: 'FEMA Electricidad'
  },
  // SIGA Turismo
  {
    id: 'g1111111-1111-1111-1111-111111111111',
    email: 'ceo@siga-turismo.com',
    full_name: 'CEO SIGA',
    role: 'CEO',
    area: 'Executive',
    tenant_id: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2',
    tenant_name: 'SIGA Turismo'
  },
  {
    id: 'g2222222-2222-2222-2222-222222222222',
    email: 'admin@siga-turismo.com',
    full_name: 'Admin SIGA',
    role: 'Admin',
    area: 'Administration',
    tenant_id: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2',
    tenant_name: 'SIGA Turismo'
  }
];

async function createDemoUsers() {
  console.log('Creating demo users...\n');
  
  // First, ensure tenants exist
  console.log('1. Ensuring tenants exist...');
  const tenants = [
    { id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e', name: 'Stratix Platform', subdomain: 'stratix-demo' },
    { id: 'c5a4dd96-6058-42b3-8268-997728a529bb', name: 'FEMA Electricidad', subdomain: 'fema-electricidad' },
    { id: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', name: 'SIGA Turismo', subdomain: 'siga-turismo' }
  ];
  
  for (const tenant of tenants) {
    const { error } = await supabase
      .from('tenants')
      .upsert({
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (error && error.code !== '23505') {
      console.error(`Error creating tenant ${tenant.name}:`, error.message);
    } else {
      console.log(`✓ Tenant ${tenant.name} ready`);
    }
  }
  
  // Create user profiles
  console.log('\n2. Creating user profiles...');
  for (const account of demoAccounts) {
    try {
      // Create or update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: account.id,
          tenant_id: account.tenant_id,
          email: account.email,
          full_name: account.full_name,
          role: account.role,
          area: account.area,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (profileError) {
        console.error(`Error creating profile for ${account.email}:`, profileError.message);
        console.log('Note: auth.users entry may need to be created first via SQL');
      } else {
        console.log(`✓ Created profile for ${account.email} (${account.tenant_name})`);
      }
    } catch (error) {
      console.error(`Error processing ${account.email}:`, error.message);
    }
  }
  
  console.log('\n=== DEMO USERS SETUP COMPLETE ===');
  console.log('\nDemo Accounts:');
  console.log('\nStratix Platform:');
  console.log('  CEO: ceo@stratix-demo.com');
  console.log('  Admin: admin@stratix-demo.com');
  console.log('\nFEMA Electricidad:');
  console.log('  CEO: ceo@fema-electricidad.com');
  console.log('  Admin: admin@fema-electricidad.com');
  console.log('\nSIGA Turismo:');
  console.log('  CEO: ceo@siga-turismo.com');
  console.log('  Admin: admin@siga-turismo.com');
  console.log('\nPassword for all accounts: password123');
  console.log('\nNOTE: If you see foreign key errors, you need to run the SQL script');
  console.log('/database/create-demo-users.sql in Supabase Dashboard first to create auth.users entries.');
}

createDemoUsers();