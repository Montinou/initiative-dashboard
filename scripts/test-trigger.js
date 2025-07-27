require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client 
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testTrigger() {
  console.log('Testing trigger with simple signup...\n');
  
  try {
    // Try a very simple signup
    const { data, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: {
          full_name: 'Test User',
          role: 'CEO',
          tenant_id: '4f644c1f-0d57-4980-8eba-ecc9ed7b661e'
        }
      }
    });
    
    if (error) {
      console.error('Signup error:', error.message);
      console.error('Error code:', error.status);
      console.error('Full error:', JSON.stringify(error, null, 2));
    } else {
      console.log('Signup successful!');
      console.log('User ID:', data.user?.id);
      console.log('Email confirmed:', !!data.user?.email_confirmed_at);
      
      // Clean up
      await supabase.auth.signOut();
    }
    
  } catch (error) {
    console.error('Caught error:', error.message);
  }
}

testTrigger();