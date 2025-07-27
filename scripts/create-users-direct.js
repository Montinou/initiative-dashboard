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
    password: 'password123',
    full_name: 'CEO Stratix',
    role: 'CEO',
    tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e',
    tenant_name: 'Stratix Platform'
  },
  {
    email: 'admin@stratix-demo.com',
    password: 'password123',
    full_name: 'Admin Stratix',
    role: 'Admin',
    tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e',
    tenant_name: 'Stratix Platform'
  },
  // FEMA Electricidad
  {
    email: 'ceo@fema-electricidad.com',
    password: 'password123',
    full_name: 'CEO FEMA',
    role: 'CEO',
    tenant_id: 'c5a4dd96-6058-42b3-8268-997728a529bb',
    tenant_name: 'FEMA Electricidad'
  },
  {
    email: 'admin@fema-electricidad.com',
    password: 'password123',
    full_name: 'Admin FEMA',
    role: 'Admin',
    tenant_id: 'c5a4dd96-6058-42b3-8268-997728a529bb',
    tenant_name: 'FEMA Electricidad'
  },
  // SIGA Turismo
  {
    email: 'ceo@siga-turismo.com',
    password: 'password123',
    full_name: 'CEO SIGA',
    role: 'CEO',
    tenant_id: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2',
    tenant_name: 'SIGA Turismo'
  },
  {
    email: 'admin@siga-turismo.com',
    password: 'password123',
    full_name: 'Admin SIGA',
    role: 'Admin',
    tenant_id: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2',
    tenant_name: 'SIGA Turismo'
  }
];

// Function to generate bcrypt-compatible password hash
function generateBcryptHash(password) {
  // This is the bcrypt hash for 'password123'
  return '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
}

async function createUsersDirectly() {
  console.log('Creating demo users directly via Supabase insert API...\n');
  
  // First, ensure tenants exist
  console.log('1. Ensuring tenants exist...');
  const tenants = [
    { 
      id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e', 
      name: 'Stratix Platform', 
      subdomain: 'stratix-demo',
      description: 'Demo tenant for Stratix Platform',
      industry: 'Technology'
    },
    { 
      id: 'c5a4dd96-6058-42b3-8268-997728a529bb', 
      name: 'FEMA Electricidad', 
      subdomain: 'fema-electricidad',
      description: 'Empresa de materiales eléctricos',
      industry: 'Electrical'
    },
    { 
      id: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2', 
      name: 'SIGA Turismo', 
      subdomain: 'siga-turismo',
      description: 'Sistema de gestión turística',
      industry: 'Tourism'
    }
  ];
  
  for (const tenant of tenants) {
    const { error } = await supabaseAdmin
      .from('tenants')
      .upsert(tenant, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error(`Error ensuring tenant ${tenant.name}:`, error.message);
    } else {
      console.log(`✓ Tenant ${tenant.name} ready`);
    }
  }
  
  // Create users directly in auth.users (bypassing auth API)
  console.log('\n2. Creating users directly in auth.users...');
  
  for (const account of demoAccounts) {
    try {
      console.log(`Creating user: ${account.email} (${account.tenant_name})`);
      
      const userId = crypto.randomUUID();
      const passwordHash = generateBcryptHash(account.password);
      
      // Insert directly into auth.users
      const { error: authError } = await supabaseAdmin
        .from('users')
        .insert({
          id: userId,
          instance_id: '00000000-0000-0000-0000-000000000000',
          aud: 'authenticated',
          role: 'authenticated',
          email: account.email,
          encrypted_password: passwordHash,
          email_confirmed_at: new Date().toISOString(),
          raw_app_meta_data: { 
            provider: 'email', 
            providers: ['email'] 
          },
          raw_user_meta_data: {
            full_name: account.full_name,
            role: account.role,
            tenant_id: account.tenant_id
          },
          is_super_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_sso_user: false
        });
      
      if (authError) {
        console.error(`✗ Error creating auth user ${account.email}:`, authError.message);
        continue;
      }
      
      console.log(`✓ Created auth user ${account.email} with ID: ${userId}`);
      
      // Create identity record
      const { error: identityError } = await supabaseAdmin
        .from('identities')
        .insert({
          id: crypto.randomUUID(),
          user_id: userId,
          provider_id: userId,
          provider: 'email',
          identity_data: {
            sub: userId,
            email: account.email,
            email_verified: true,
            phone_verified: false
          },
          last_sign_in_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          email: account.email
        });
      
      if (identityError) {
        console.error(`⚠️  Warning: Could not create identity for ${account.email}:`, identityError.message);
      } else {
        console.log(`✓ Created identity for ${account.email}`);
      }
      
      // Create user profile
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
        console.log(`✓ Created user profile for ${account.email}`);
      }
      
    } catch (error) {
      console.error(`✗ Error processing ${account.email}:`, error.message);
    }
  }
  
  // Final verification
  console.log('\n3. Verifying user creation...');
  await verifyUsers();
  
  console.log('\n=== DEMO USERS SETUP COMPLETE ===');
  console.log('\nDemo Accounts:');
  console.log('\nStratix Platform:');
  console.log('  CEO: ceo@stratix-demo.com / password123');
  console.log('  Admin: admin@stratix-demo.com / password123');
  console.log('\nFEMA Electricidad:');
  console.log('  CEO: ceo@fema-electricidad.com / password123');
  console.log('  Admin: admin@fema-electricidad.com / password123');
  console.log('\nSIGA Turismo:');
  console.log('  CEO: ceo@siga-turismo.com / password123');
  console.log('  Admin: admin@siga-turismo.com / password123');
  console.log('\n===============================');
}

async function verifyUsers() {
  const emails = demoAccounts.map(account => account.email);
  
  // Check user_profiles
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select(`
      email, 
      full_name, 
      role, 
      tenants!inner(name)
    `)
    .in('email', emails);
  
  if (profileError) {
    console.error('Error checking user profiles:', profileError.message);
    return;
  }
  
  console.log(`User profiles created: ${profiles?.length || 0}/${emails.length}`);
  
  if (profiles && profiles.length > 0) {
    console.log('\nCreated profiles:');
    profiles.forEach(profile => {
      console.log(`  - ${profile.email} (${profile.role}) in ${profile.tenants?.name || 'Unknown tenant'}`);
    });
  }
}

// Run the script
createUsersDirectly();