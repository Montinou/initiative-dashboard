require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin operations
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

// Demo accounts configuration with correct tenant IDs
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

async function createUsersViaSupabaseAuth() {
  console.log('Creating demo users via Supabase Auth API...\n');
  
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
      .upsert({
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        description: tenant.description,
        industry: tenant.industry,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (error && error.code !== '23505') {
      console.error(`Error ensuring tenant ${tenant.name}:`, error.message);
    } else {
      console.log(`✓ Tenant ${tenant.name} ready`);
    }
  }
  
  // Create users via Supabase Auth Admin API
  console.log('\n2. Creating users via Supabase Auth Admin API...');
  
  for (const account of demoAccounts) {
    try {
      console.log(`\nCreating user: ${account.email} (${account.tenant_name})`);
      
      // Check if user already exists
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error(`Error listing users:`, listError.message);
        continue;
      }
      
      const existingUser = existingUsers.users.find(u => u.email === account.email);
      
      if (existingUser) {
        console.log(`⚠️  User ${account.email} already exists with ID: ${existingUser.id}`);
        
        // Ensure user profile exists for existing user
        await ensureUserProfile(existingUser, account);
        continue;
      }
      
      // Create new user via Admin API
      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        user_metadata: account.user_metadata,
        email_confirm: true // Auto-confirm email
      });
      
      if (createError) {
        console.error(`✗ Error creating user ${account.email}:`, createError.message);
        continue;
      }
      
      console.log(`✓ Created auth user ${account.email} with ID: ${authUser.user.id}`);
      
      // Wait a moment for any triggers to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Ensure user profile exists
      await ensureUserProfile(authUser.user, account);
      
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

async function ensureUserProfile(user, account) {
  try {
    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (existingProfile) {
      console.log(`  ✓ User profile already exists for ${account.email}`);
      return;
    }
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error(`  Error checking profile for ${account.email}:`, checkError.message);
    }
    
    // Create user profile
    console.log(`  Creating user profile for ${account.email}...`);
    
    const { error: profileError } = await supabaseAdmin
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
      console.error(`  ✗ Error creating profile for ${account.email}:`, profileError.message);
    } else {
      console.log(`  ✓ Created user profile for ${account.email}`);
    }
    
  } catch (error) {
    console.error(`  ✗ Error ensuring profile for ${account.email}:`, error.message);
  }
}

async function verifyUsers() {
  const emails = demoAccounts.map(account => account.email);
  
  // Check auth.users
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
  if (authError) {
    console.error('Error listing auth users:', authError.message);
    return;
  }
  
  const createdAuthUsers = authUsers.users.filter(u => emails.includes(u.email));
  console.log(`Auth users created: ${createdAuthUsers.length}/${emails.length}`);
  
  // Check user_profiles
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('email, full_name, role, tenants(name)')
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
createUsersViaSupabaseAuth();