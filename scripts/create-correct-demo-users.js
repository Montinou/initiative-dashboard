require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Correct demo users with expected email formats
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

async function createCorrectDemoUsers() {
  console.log('🎯 Creating demo users with CORRECT emails...\n');

  for (const user of demoUsers) {
    console.log(`Creating user: ${user.email}`);
    
    try {
      // Try multiple approaches to create the user
      let authUser = null;
      let authError = null;

      // Approach 1: Direct admin.createUser
      console.log('  📧 Trying admin.createUser...');
      const result1 = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name,
          role: user.role
        }
      });

      if (result1.error) {
        console.log(`    ⚠️  Admin create failed: ${result1.error.message}`);
        
        // Approach 2: Try with different email validation
        console.log('  🔄 Trying with email_verify=false...');
        const result2 = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: false,
          user_metadata: {
            full_name: user.full_name,
            role: user.role
          }
        });

        if (result2.error) {
          console.log(`    ⚠️  Second attempt failed: ${result2.error.message}`);
          
          // Approach 3: Try signup then convert
          console.log('  🔄 Trying signup approach...');
          const result3 = await supabase.auth.signUp({
            email: user.email,
            password: user.password,
            options: {
              data: {
                full_name: user.full_name,
                role: user.role
              }
            }
          });

          if (result3.error) {
            console.error(`    ❌ All approaches failed: ${result3.error.message}`);
            continue;
          } else {
            authUser = result3.data.user;
            console.log('    ✅ Signup approach worked');
          }
        } else {
          authUser = result2.data.user;
          console.log('    ✅ Second attempt worked');
        }
      } else {
        authUser = result1.data.user;
        console.log('    ✅ Admin create worked');
      }

      if (!authUser) {
        console.error('  ❌ Failed to create auth user');
        continue;
      }

      console.log(`  ✅ Auth user created: ${authUser.id}`);

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authUser.id,
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
      console.log('  🧪 Testing login...');
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
    await createCorrectDemoUsers();
    
    console.log('🎉 Demo users with CORRECT emails created!\n');
    console.log('📋 Available demo accounts:');
    console.log('- ceo@stratix-demo.com / password123 (Stratix CEO)');
    console.log('- admin@stratix-demo.com / password123 (Stratix Admin)');
    console.log('- ceo@fema-electricidad.com / password123 (FEMA CEO)');
    console.log('- admin@fema-electricidad.com / password123 (FEMA Admin)');
    console.log('- ceo@siga-turismo.com / password123 (SIGA CEO)');
    console.log('- admin@siga-turismo.com / password123 (SIGA Admin)');
    
  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

main();