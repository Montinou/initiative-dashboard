require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Demo users with working email formats that are still meaningful
const demoUsers = [
  {
    email: 'ceo@stratix.com',
    password: 'password123',
    full_name: 'CEO Stratix',
    role: 'CEO',
    area: 'Executive',
    tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e'
  },
  {
    email: 'admin@stratix.com',
    password: 'password123',
    full_name: 'Admin Stratix',
    role: 'Admin',
    area: 'Administration',
    tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e'
  },
  {
    email: 'ceo@fema.com',
    password: 'password123',
    full_name: 'CEO FEMA',
    role: 'CEO',
    area: 'Executive',
    tenant_id: 'c5a4dd96-6058-42b3-8268-997728a529bb'
  },
  {
    email: 'admin@fema.com',
    password: 'password123',
    full_name: 'Admin FEMA',
    role: 'Admin',
    area: 'Administration',
    tenant_id: 'c5a4dd96-6058-42b3-8268-997728a529bb'
  },
  {
    email: 'ceo@siga.com',
    password: 'password123',
    full_name: 'CEO SIGA',
    role: 'CEO',
    area: 'Executive',
    tenant_id: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'
  },
  {
    email: 'admin@siga.com',
    password: 'password123',
    full_name: 'Admin SIGA',
    role: 'Admin',
    area: 'Administration',
    tenant_id: 'd1a3408c-a3d0-487e-a355-a321a07b5ae2'
  }
];

async function createFinalDemoUsers() {
  console.log('🎯 Creating demo users with proper, working emails...\n');

  for (const user of demoUsers) {
    console.log(`Creating user: ${user.email}`);
    
    try {
      // Create auth user
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
        console.error(`  ❌ Auth error: ${authError.message}`);
        continue;
      }

      console.log(`  ✅ Auth user created: ${authUser.user.id}`);

      // Create user profile
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

      // Test login
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });

      if (loginError) {
        console.error(`  ❌ Login test failed: ${loginError.message}`);
      } else {
        console.log(`  ✅ Login test successful!`);
        await supabase.auth.signOut();
      }

    } catch (error) {
      console.error(`  💥 Unexpected error: ${error.message}`);
    }
    
    console.log('');
  }
}

async function main() {
  try {
    await createFinalDemoUsers();
    
    console.log('🎉 Demo users with proper emails created!\n');
    console.log('📋 Available demo accounts:');
    console.log('- ceo@stratix.com / password123 (Stratix CEO)');
    console.log('- admin@stratix.com / password123 (Stratix Admin)');
    console.log('- ceo@fema.com / password123 (FEMA CEO)');
    console.log('- admin@fema.com / password123 (FEMA Admin)');
    console.log('- ceo@siga.com / password123 (SIGA CEO)');
    console.log('- admin@siga.com / password123 (SIGA Admin)');
    console.log('\n🌐 Use these on the respective domains:');
    console.log('- fema-electricidad.vercel.app → ceo@fema.com');
    console.log('- siga-turismo.vercel.app → ceo@siga.com');
    console.log('- stratix-platform.vercel.app → ceo@stratix.com');
    
  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

main();