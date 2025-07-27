require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Demo accounts that need auth.users records
const demoAccounts = [
  {
    id: 'c6f80430-5123-465f-a052-0a724e7ed84d', // Existing profile ID
    email: 'ceo@stratix-demo.com',
    password: 'password123',
    full_name: 'CEO Stratix',
    role: 'CEO',
    tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e'
  },
  {
    id: '600a0a3f-5f20-472e-98e4-d01516275e45', // Existing profile ID
    email: 'admin@stratix-demo.com',
    password: 'password123',
    full_name: 'Admin Stratix',
    role: 'Admin',
    tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e'
  },
  {
    id: '9f207023-1151-449c-98bc-e57048333ed5', // Existing profile ID
    email: 'ceo@fema-electricidad.com',
    password: 'password123',
    full_name: 'CEO FEMA',
    role: 'CEO',
    tenant_id: 'c5a4dd96-6058-42b3-8268-997728a529bb'
  },
  {
    id: 'ad8ec157-4f88-4291-a1b1-173a31ba7f42', // Existing profile ID
    email: 'admin@fema-electricidad.com',
    password: 'password123',
    full_name: 'Admin FEMA',
    role: 'Admin',
    tenant_id: 'c5a4dd96-6058-42b3-8268-997728a529bb'
  }
];

async function createAuthUsers() {
  console.log('🔧 Fixing demo users authentication...\n');
  
  for (const account of demoAccounts) {
    console.log(`Creating auth user for: ${account.email}`);
    
    try {
      // Create auth.users record with specific ID to match existing profile
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        user_id: account.id, // Use existing profile ID
        email: account.email,
        password: account.password,
        email_confirm: true, // Skip email confirmation
        user_metadata: {
          full_name: account.full_name,
          role: account.role
        }
      });

      if (authError) {
        if (authError.message.includes('User already registered')) {
          console.log(`  ℹ️  User ${account.email} already exists in auth.users`);
        } else {
          console.error(`  ❌ Error creating auth user for ${account.email}:`, authError.message);
          continue;
        }
      } else {
        console.log(`  ✅ Auth user created for ${account.email}`);
      }

      // Verify the user profile exists and update if needed
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .eq('id', account.id)
        .single();

      if (profileError) {
        console.log(`  ⚠️  Profile not found for ${account.email}, creating...`);
        
        const { error: createProfileError } = await supabase
          .from('user_profiles')
          .insert({
            id: account.id,
            tenant_id: account.tenant_id,
            email: account.email,
            full_name: account.full_name,
            role: account.role,
            is_active: true
          });

        if (createProfileError) {
          console.error(`  ❌ Error creating profile for ${account.email}:`, createProfileError.message);
        } else {
          console.log(`  ✅ Profile created for ${account.email}`);
        }
      } else {
        console.log(`  ✅ Profile already exists for ${account.email}`);
      }

    } catch (error) {
      console.error(`❌ Unexpected error for ${account.email}:`, error.message);
    }
    
    console.log(''); // Empty line for readability
  }
}

async function testAuthentication() {
  console.log('🧪 Testing authentication...\n');
  
  // Test one user
  const testUser = demoAccounts[2]; // FEMA CEO
  console.log(`Testing login for: ${testUser.email}`);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });

    if (error) {
      console.error('❌ Authentication test failed:', error.message);
    } else {
      console.log('✅ Authentication test successful!');
      console.log('User ID:', data.user.id);
      console.log('Email:', data.user.email);
      
      // Sign out after test
      await supabase.auth.signOut();
    }
  } catch (error) {
    console.error('❌ Authentication test error:', error.message);
  }
}

async function main() {
  try {
    await createAuthUsers();
    await testAuthentication();
    console.log('🎉 Demo users authentication setup complete!');
    console.log('\n📋 Available demo accounts:');
    demoAccounts.forEach(account => {
      console.log(`- ${account.email} / password123 (${account.role})`);
    });
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

main();