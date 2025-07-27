require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Demo users configuration with correct tenant UUIDs
const demoUsers = [
  {
    email: 'ceo@stratix-demo.com',
    password: 'password123',
    full_name: 'CEO Stratix',
    role: 'CEO',
    area: 'Executive',
    tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e'
  },
  {
    email: 'admin@stratix-demo.com',
    password: 'password123',
    full_name: 'Admin Stratix',
    role: 'Admin',
    area: 'Administration',
    tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e'
  },
  {
    email: 'ceo@fema-electricidad.com',
    password: 'password123',
    full_name: 'CEO FEMA',
    role: 'CEO',
    area: 'Executive',
    tenant_id: 'c5a4dd96-6058-42b3-8268-997728a529bb'
  },
  {
    email: 'admin@fema-electricidad.com',
    password: 'password123',
    full_name: 'Admin FEMA',
    role: 'Admin',
    area: 'Administration',
    tenant_id: 'c5a4dd96-6058-42b3-8268-997728a529bb'
  },
  {
    email: 'ceo@siga-turismo.com',
    password: 'password123',
    full_name: 'CEO SIGA',
    role: 'CEO',
    area: 'Executive',
    tenant_id: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'
  },
  {
    email: 'admin@siga-turismo.com',
    password: 'password123',
    full_name: 'Admin SIGA',
    role: 'Admin',
    area: 'Administration',
    tenant_id: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'
  }
];

async function createDemoUsers() {
  console.log('🚀 Creating demo users with authentication...\n');

  for (const user of demoUsers) {
    console.log(`Creating user: ${user.email}`);
    
    try {
      // Step 1: Create auth.users record
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name,
          role: user.role
        }
      });

      if (authError) {
        if (authError.message.includes('User already registered')) {
          console.log(`  ⚠️  Auth user already exists for ${user.email}`);
          
          // Get existing user ID
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existingUser = existingUsers.users.find(u => u.email === user.email);
          
          if (existingUser) {
            console.log(`  ℹ️  Using existing auth user ID: ${existingUser.id}`);
            
            // Check if profile exists
            const { data: existingProfile } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('id', existingUser.id)
              .single();
              
            if (!existingProfile) {
              // Create profile for existing auth user
              const { error: profileError } = await supabase
                .from('user_profiles')
                .insert({
                  id: existingUser.id,
                  tenant_id: user.tenant_id,
                  email: user.email,
                  full_name: user.full_name,
                  role: user.role,
                  area: user.area,
                  is_active: true
                });
                
              if (profileError) {
                console.error(`  ❌ Error creating profile: ${profileError.message}`);
              } else {
                console.log(`  ✅ Profile created for existing auth user`);
              }
            } else {
              console.log(`  ✅ Profile already exists`);
            }
          }
        } else {
          console.error(`  ❌ Auth error: ${authError.message}`);
        }
        continue;
      }

      console.log(`  ✅ Auth user created with ID: ${authUser.user.id}`);

      // Step 2: Create user_profiles record
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authUser.user.id,
          tenant_id: user.tenant_id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          area: user.area,
          is_active: true
        });

      if (profileError) {
        console.error(`  ❌ Profile error: ${profileError.message}`);
      } else {
        console.log(`  ✅ Profile created successfully`);
      }

    } catch (error) {
      console.error(`  💥 Unexpected error: ${error.message}`);
    }
    
    console.log(''); // Space between users
  }
}

async function testLogins() {
  console.log('🧪 Testing demo user logins...\n');
  
  const testUsers = [
    demoUsers[2], // FEMA CEO
    demoUsers[4]  // SIGA CEO
  ];
  
  for (const user of testUsers) {
    console.log(`Testing login for: ${user.email}`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });

      if (error) {
        console.error(`  ❌ Login failed: ${error.message}`);
      } else {
        console.log(`  ✅ Login successful! User ID: ${data.user.id}`);
        
        // Test profile fetch
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('full_name, role, tenant_id')
          .eq('id', data.user.id)
          .single();
          
        if (profileError) {
          console.error(`  ❌ Profile fetch failed: ${profileError.message}`);
        } else {
          console.log(`  ✅ Profile: ${profile.full_name} (${profile.role})`);
        }
        
        // Sign out
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error(`  💥 Test error: ${error.message}`);
    }
    
    console.log('');
  }
}

async function main() {
  try {
    await createDemoUsers();
    await testLogins();
    
    console.log('🎉 Demo users setup complete!\n');
    console.log('📋 Available demo accounts:');
    demoUsers.forEach(user => {
      console.log(`- ${user.email} / password123 (${user.role})`);
    });
    
  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

main();