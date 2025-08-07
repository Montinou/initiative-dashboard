// Test Supabase authentication directly
const { createClient } = require('@supabase/supabase-js');

// Get these from your environment
const supabaseUrl = 'https://zkkdnslupqnpioltjpeu.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('Please set NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  console.log('Testing Supabase authentication...\n');
  
  // Test credentials
  const testUsers = [
    { email: 'ceo_siga@example.com', password: 'password123' },
    { email: 'ceo_siga@example.com', password: 'Password123!' },
  ];
  
  for (const user of testUsers) {
    console.log(`\nTesting: ${user.email} with password: ${user.password}`);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      });
      
      if (error) {
        console.error(`  ❌ Error: ${error.message}`);
        if (error.status) {
          console.error(`  Status: ${error.status}`);
        }
      } else {
        console.log(`  ✅ Success! User authenticated`);
        console.log(`  User ID: ${data.user?.id}`);
        console.log(`  Email: ${data.user?.email}`);
        console.log(`  Session: ${data.session ? 'Created' : 'Not created'}`);
        
        // Sign out to test next user
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error(`  ❌ Exception: ${err.message}`);
    }
  }
  
  // Also test if user exists
  console.log('\n\nChecking if users exist in database...');
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, email, full_name')
    .eq('email', 'ceo_siga@example.com');
    
  if (profileError) {
    console.error('Error fetching profiles:', profileError);
  } else {
    console.log('User profiles found:', profiles);
  }
}

testAuth().then(() => {
  console.log('\nTest complete');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});