require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestUser() {
  console.log('🧪 Creating test user...');
  
  try {
    // Try to create a simple test user using the admin API
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'test@test.com',
      password: 'test123456',
      email_confirm: true
    });

    if (authError) {
      console.error('❌ Auth creation failed:', authError);
      return;
    }

    console.log('✅ Auth user created:', authUser.user.id);

    // Now try to login with this user
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'test@test.com',
      password: 'test123456'
    });

    if (loginError) {
      console.error('❌ Login failed:', loginError);
    } else {
      console.log('✅ Login successful!', loginData.user.email);
      await supabase.auth.signOut();
    }

    // Clean up test user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(authUser.user.id);
    if (!deleteError) {
      console.log('✅ Test user cleaned up');
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

createTestUser();