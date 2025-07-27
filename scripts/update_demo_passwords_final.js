require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Demo users with emails that need password update
const demoEmails = [
  'ceo@stratix.com',
  'admin@stratix.com', 
  'ceo@fema.com',
  'admin@fema.com',
  'ceo@siga.com',
  'admin@siga.com'
];

const newPassword = 'Password123!';

async function updateDemoPasswords() {
  console.log('🔐 Updating demo user passwords to Password123!...\n');

  // Get all users to find the ones we need to update
  const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Failed to list users:', listError.message);
    return;
  }

  console.log(`Found ${allUsers.users.length} total users in database`);

  // Filter to demo users only
  const demoUsers = allUsers.users.filter(user => demoEmails.includes(user.email));
  console.log(`Found ${demoUsers.length} demo users to update\n`);

  for (const user of demoUsers) {
    console.log(`Updating password for: ${user.email}`);
    
    try {
      // Update the user's password using admin API
      const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      );

      if (updateError) {
        console.error(`  ❌ Failed to update ${user.email}: ${updateError.message}`);
      } else {
        console.log(`  ✅ Successfully updated password for ${user.email}`);
      }

    } catch (error) {
      console.error(`  💥 Unexpected error for ${user.email}: ${error.message}`);
    }
    
    // Small delay to avoid potential rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

async function testUpdatedPasswords() {
  console.log('\n🧪 Testing updated passwords...\n');
  
  // Test one user from each tenant to verify the password change worked
  const testEmails = ['ceo@siga.com', 'ceo@fema.com', 'ceo@stratix.com'];
  
  for (const email of testEmails) {
    console.log(`Testing login for: ${email}`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: newPassword
      });

      if (error) {
        console.error(`  ❌ Login failed: ${error.message}`);
      } else {
        console.log(`  ✅ Login successful with new password!`);
        
        // Sign out immediately
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
    await updateDemoPasswords();
    await testUpdatedPasswords();
    
    console.log('🎉 Password update complete!\n');
    console.log(`📋 Demo users can now login with password: ${newPassword}\n`);
    console.log('Updated accounts:');
    demoEmails.forEach(email => {
      console.log(`- ${email}`);
    });
    console.log('\n🌐 Use these on the respective domains:');
    console.log('- fema-electricidad.vercel.app → ceo@fema.com / Password123!');
    console.log('- siga-turismo.vercel.app → ceo@siga.com / Password123!');
    console.log('- stratix-platform.vercel.app → ceo@stratix.com / Password123!');
    
  } catch (error) {
    console.error('💥 Update failed:', error);
    process.exit(1);
  }
}

main();