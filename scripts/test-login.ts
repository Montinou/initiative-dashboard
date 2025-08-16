import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function testLogin() {
  // Login with test user
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@siga.com',
    password: 'test1234'
  })

  if (error) {
    console.error('Login error:', error)
  } else {
    console.log('✅ Login successful')
    console.log('User ID:', data.user?.id)
    console.log('Session:', data.session ? 'Active' : 'None')
    console.log('Access Token (first 50 chars):', data.session?.access_token?.substring(0, 50))
  }
}

testLogin()