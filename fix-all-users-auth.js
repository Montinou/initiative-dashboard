// Fix all existing users' authentication using Supabase Admin API
const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://zkkdnslupqnpioltjpeu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// List of all demo users to update
const demoUsers = [
  'ceo_siga@example.com',
  'admin_siga@example.com',
  'manager_adm@siga.com',
  'manager_ch@siga.com',
  'manager_com@siga.com',
  'manager_prod@siga.com',
  'ceo_fema@example.com',
  'admin_fema@example.com',
  'manager_adm@fema.com',
  'manager_ch@fema.com',
  'manager_com@fema.com',
  'manager_prod@fema.com'
];

async function fixAllUsersAuth() {
  console.log('Fixing authentication for all demo users...\n');
  
  // Get all existing users
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }
  
  console.log(`Found ${existingUsers.users?.length || 0} total users in the system\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const email of demoUsers) {
    console.log(`\nProcessing: ${email}`);
    
    // Find the user
    const user = existingUsers.users?.find(u => u.email === email);
    
    if (!user) {
      console.log(`  ⚠️  User not found, skipping`);
      continue;
    }
    
    console.log(`  Found user ID: ${user.id}`);
    
    // Update the user's password
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { 
        password: 'password123',
        email_confirm: true // Ensure email is confirmed
      }
    );
    
    if (error) {
      console.error(`  ❌ Error updating password:`, error.message);
      errorCount++;
    } else {
      console.log(`  ✅ Password updated successfully`);
      successCount++;
      
      // Test sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: 'password123'
      });
      
      if (signInError) {
        console.error(`  ⚠️  Sign in test failed:`, signInError.message);
      } else {
        console.log(`  ✅ Sign in test successful!`);
        // Sign out to test next user
        await supabase.auth.signOut();
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log(`  ✅ Successfully updated: ${successCount} users`);
  console.log(`  ❌ Failed to update: ${errorCount} users`);
  console.log('\nAll users should now be able to login with password: password123');
  console.log('='.repeat(60));
}

fixAllUsersAuth().catch(console.error);