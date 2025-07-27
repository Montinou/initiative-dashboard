require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const newSuperadminPassword = 'btcStn60';

async function updateSuperadminPassword() {
  console.log('🔐 Updating superadmin password to btcStn60...\n');

  try {
    // Get all users to find superadmin users
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Failed to list users:', listError.message);
      return;
    }

    console.log(`Found ${allUsers.users.length} total users in database`);

    // Look for superadmin users by email pattern or is_super_admin flag
    const superadminUsers = allUsers.users.filter(user => 
      user.email && (
        user.email.includes('superadmin') || 
        user.is_super_admin === true ||
        user.email.includes('admin@') ||
        user.user_metadata?.role === 'superadmin'
      )
    );

    console.log(`Found ${superadminUsers.length} potential superadmin users:\n`);
    
    superadminUsers.forEach(user => {
      console.log(`- ${user.email} (ID: ${user.id}, is_super_admin: ${user.is_super_admin})`);
    });

    if (superadminUsers.length === 0) {
      console.log('⚠️  No superadmin users found');
      return;
    }

    console.log('\n');

    // Update each superadmin user's password
    for (const user of superadminUsers) {
      console.log(`Updating password for superadmin: ${user.email}`);
      
      try {
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          { password: newSuperadminPassword }
        );

        if (updateError) {
          console.error(`  ❌ Failed to update ${user.email}: ${updateError.message}`);
        } else {
          console.log(`  ✅ Successfully updated password for ${user.email}`);
        }

      } catch (error) {
        console.error(`  💥 Unexpected error for ${user.email}: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }

  } catch (error) {
    console.error('❌ Failed to update superadmin passwords:', error);
  }
}

async function testSuperadminLogin() {
  console.log('\n🧪 Testing superadmin login...\n');
  
  // Try to find a superadmin email to test
  try {
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Failed to list users for testing:', listError.message);
      return;
    }

    const superadminUser = allUsers.users.find(user => 
      user.email && (user.email.includes('superadmin') || user.is_super_admin === true)
    );

    if (superadminUser) {
      console.log(`Testing login for: ${superadminUser.email}`);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: superadminUser.email,
        password: newSuperadminPassword
      });

      if (error) {
        console.error(`  ❌ Login failed: ${error.message}`);
      } else {
        console.log(`  ✅ Superadmin login successful!`);
        await supabase.auth.signOut();
      }
    } else {
      console.log('⚠️  No superadmin user found for testing');
    }

  } catch (error) {
    console.error(`  💥 Test error: ${error.message}`);
  }
}

async function main() {
  try {
    await updateSuperadminPassword();
    await testSuperadminLogin();
    
    console.log('\n🎉 Superadmin password update complete!\n');
    console.log(`📋 Superadmin users can now login with password: ${newSuperadminPassword}`);
    
  } catch (error) {
    console.error('💥 Update failed:', error);
    process.exit(1);
  }
}

main();