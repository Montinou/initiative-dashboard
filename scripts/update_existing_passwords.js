require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const demoEmails = [
  'ceo@stratix.com',
  'admin@stratix.com', 
  'ceo@fema.com',
  'admin@fema.com',
  'ceo@siga.com',
  'admin@siga.com'
];

const newPassword = 'Password123!';

async function updateExistingUserPasswords() {
  console.log('🔐 Updating existing demo user passwords...\n');

  for (const email of demoEmails) {
    console.log(`Processing: ${email}`);
    
    try {
      // Try to sign in first to see if user exists
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: 'password123' // try old password
      });

      if (signInData && signInData.user) {
        console.log(`  ✅ Found existing user: ${signInData.user.id}`);
        
        // Sign out first
        await supabase.auth.signOut();
        
        // Now update the password using admin API
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
          signInData.user.id,
          { password: newPassword }
        );

        if (updateError) {
          console.error(`  ❌ Failed to update password: ${updateError.message}`);
        } else {
          console.log(`  ✅ Password updated successfully`);
          
          // Test new password
          const { data: testData, error: testError } = await supabase.auth.signInWithPassword({
            email: email,
            password: newPassword
          });
          
          if (testError) {
            console.error(`  ❌ New password test failed: ${testError.message}`);
          } else {
            console.log(`  ✅ New password works!`);
            await supabase.auth.signOut();
          }
        }
      } else {
        console.log(`  ⚠️  Could not sign in with old password: ${signInError?.message}`);
      }

    } catch (error) {
      console.error(`  💥 Error: ${error.message}`);
    }
    
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

async function main() {
  try {
    await updateExistingUserPasswords();
    
    console.log('🎉 Password update process complete!\n');
    console.log(`📋 Demo users should now use password: ${newPassword}\n`);
    
  } catch (error) {
    console.error('💥 Update failed:', error);
    process.exit(1);
  }
}

main();