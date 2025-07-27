require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
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
    password: 'password123',
    user_metadata: {
      full_name: 'CEO Stratix',
      role: 'CEO',
      tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e'
    },
    tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e',
    tenant_name: 'Stratix Platform'
  },
  {
    email: 'admin@stratix-demo.com',
    password: 'password123',
    user_metadata: {
      full_name: 'Admin Stratix',
      role: 'Admin',
      tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e'
    },
    tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e',
    tenant_name: 'Stratix Platform'
  },
  // FEMA Electricidad
  {
    email: 'ceo@fema-electricidad.com',
    password: 'password123',
    user_metadata: {
      full_name: 'CEO FEMA',
      role: 'CEO',
      tenant_id: 'c5a4dd96-6058-42b3-8268-997728a529bb'
    },
    tenant_id: 'c5a4dd96-6058-42b3-8268-997728a529bb',
    tenant_name: 'FEMA Electricidad'
  },
  {
    email: 'admin@fema-electricidad.com',
    password: 'password123',
    user_metadata: {
      full_name: 'Admin FEMA',
      role: 'Admin',
      tenant_id: 'c5a4dd96-6058-42b3-8268-997728a529bb'
    },
    tenant_id: 'c5a4dd96-6058-42b3-8268-997728a529bb',
    tenant_name: 'FEMA Electricidad'
  },
  // SIGA Turismo
  {
    email: 'ceo@siga-turismo.com',
    password: 'password123',
    user_metadata: {
      full_name: 'CEO SIGA',
      role: 'CEO',
      tenant_id: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'
    },
    tenant_id: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2',
    tenant_name: 'SIGA Turismo'
  },
  {
    email: 'admin@siga-turismo.com',
    password: 'password123',
    user_metadata: {
      full_name: 'Admin SIGA',
      role: 'Admin',
      tenant_id: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'
    },
    tenant_id: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2',
    tenant_name: 'SIGA Turismo'
  }
];

async function createDemoUsersViaAPI() {
  console.log('Creating demo users via Supabase Admin API...\n');
  
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
  
  // Create users via Admin API
  console.log('\n2. Creating users via Admin API...');
  for (const account of demoAccounts) {
    try {
      // Try to create user with Admin API
      const { data: user, error: userError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        user_metadata: account.user_metadata,
        email_confirm: true
      });
      
      if (userError) {
        if (userError.message.includes('already registered')) {
          console.log(`⚠️  User ${account.email} already exists`);
          
          // Get existing user and update profile if needed
          const { data: existingUser } = await supabase.auth.admin.getUserById(user?.id);
          if (existingUser) {
            await ensureUserProfile(existingUser.user, account);
          }
        } else {
          console.error(`Error creating user ${account.email}:`, userError.message);
        }
        continue;
      }
      
      console.log(`✓ Created user ${account.email} (${account.tenant_name})`);
      
      // Ensure user profile exists
      await ensureUserProfile(user.user, account);
      
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
}

async function ensureUserProfile(user, account) {
  try {
    // Check if profile exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (existingProfile) {
      console.log(`  ✓ Profile exists for ${account.email}`);
      return;
    }
    
    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        tenant_id: account.tenant_id,
        email: account.email,
        full_name: account.user_metadata.full_name,
        role: account.user_metadata.role,
        area: account.user_metadata.role === 'CEO' ? 'Executive' : 'Administration',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (profileError) {
      console.error(`  Error creating profile for ${account.email}:`, profileError.message);
    } else {
      console.log(`  ✓ Created profile for ${account.email}`);
    }
  } catch (error) {
    console.error(`  Error ensuring profile for ${account.email}:`, error.message);
  }
}

// Run the script
createDemoUsersViaAPI();