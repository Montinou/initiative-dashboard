// Create a test user using Supabase Admin API
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

async function createTestUser() {
  console.log('Creating test user via Supabase Admin API...\n');
  
  // First, try to delete the user if it exists
  const { data: existingUser } = await supabase.auth.admin.listUsers();
  const testUser = existingUser?.users?.find(u => u.email === 'test@siga.com');
  
  if (testUser) {
    console.log('Deleting existing test user...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(testUser.id);
    if (deleteError) {
      console.error('Delete error:', deleteError);
    } else {
      console.log('Existing user deleted');
    }
  }
  
  // Create new user
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'test@siga.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: {
      full_name: 'Test User'
    }
  });
  
  if (error) {
    console.error('❌ Error creating user:', error);
  } else {
    console.log('✅ User created successfully!');
    console.log('  Email:', data.user?.email);
    console.log('  ID:', data.user?.id);
    console.log('  Confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No');
  }
  
  // Now try to sign in with the new user
  console.log('\nTesting sign in with new user...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'test@siga.com',
    password: 'password123'
  });
  
  if (signInError) {
    console.error('❌ Sign in failed:', signInError.message);
  } else {
    console.log('✅ Sign in successful!');
    console.log('  User ID:', signInData.user?.id);
    console.log('  Session:', signInData.session ? 'Created' : 'Not created');
  }
}

createTestUser().catch(console.error);