import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function testGeminiAPI() {
  console.log('Testing Gemini Context API...\n')
  
  // Login as a test user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'ceo_siga@example.com',
    password: 'demo123456'
  })
  
  if (authError) {
    console.error('Auth error:', authError)
    return
  }
  
  console.log('✅ Logged in as:', authData.user?.email)
  console.log('Session token:', authData.session?.access_token?.substring(0, 20) + '...')
  
  // Test the API endpoint
  const response = await fetch('http://localhost:3000/api/gemini-context', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.session?.access_token}`
    },
    body: JSON.stringify({
      months: 3,
      includeActivities: true,
      useCache: false
    })
  })
  
  console.log('\nAPI Response Status:', response.status)
  
  const data = await response.json()
  
  if (response.ok) {
    console.log('✅ API call successful!')
    console.log('\nResponse structure:')
    console.log('- User:', data.user?.full_name, `(${data.user?.email})`)
    console.log('- Role:', data.user?.role)
    console.log('- Tenant:', data.tenant?.subdomain)
    console.log('- Organization:', data.tenant?.organization_name)
    console.log('\nContext data:')
    console.log('- Areas:', data.context?.areas?.length || 0)
    console.log('- Objectives:', data.context?.objectives?.length || 0)
    console.log('- Initiatives:', data.context?.initiatives?.length || 0)
    console.log('- Activities:', data.context?.activities?.length || 0)
    console.log('\nSummary:')
    console.log('- Avg Objective Progress:', data.summary?.avg_objective_progress + '%')
  } else {
    console.error('❌ API call failed!')
    console.error('Error:', data.error)
    console.error('Full response:', JSON.stringify(data, null, 2))
  }
  
  // Logout
  await supabase.auth.signOut()
}

testGeminiAPI().catch(console.error)