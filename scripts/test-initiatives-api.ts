import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function testInitiativesAPI() {
  console.log('Testing Initiatives API...\n')
  
  // Login as test user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@siga.com',
    password: 'test1234'
  })
  
  if (authError) {
    console.error('Auth error:', authError)
    return
  }
  
  console.log('✅ Logged in as:', authData.user?.email)
  const token = authData.session?.access_token
  
  // Test GET initiatives
  console.log('\n📋 Testing GET /api/initiatives...')
  const response = await fetch('http://localhost:3002/api/initiatives?limit=5', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (response.ok) {
    const data = await response.json()
    console.log('Success! Found initiatives:', data.initiatives?.length || 0)
    console.log('Total count:', data.count)
    
    if (data.initiatives?.length > 0) {
      console.log('\nFirst 3 initiatives:')
      data.initiatives.slice(0, 3).forEach((init: any) => {
        console.log(`- ${init.title}: ${init.progress}% (Area: ${init.area?.name || 'N/A'})`)
      })
    }
  } else {
    console.error('Failed:', response.status)
    const text = await response.text()
    console.error('Response:', text.substring(0, 200))
  }
  
  await supabase.auth.signOut()
}

testInitiativesAPI().catch(console.error)