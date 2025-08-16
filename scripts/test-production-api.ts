import { createClient } from '@supabase/supabase-js'

const PROD_URL = 'https://siga-turismo.vercel.app'
const SUPABASE_URL = 'https://zkkdnslupqnpioltjpeu.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzI4NDgsImV4cCI6MjA2NjU0ODg0OH0.GUqHaOFH7TVWmKQrGlk-zJ8Sr-uovOPU3fLEtIfbk1k'

async function testProductionAPI() {
  console.log('🧪 Testing production API...\n')
  
  // 1. Create Supabase client and authenticate
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  console.log('1️⃣ Authenticating with Supabase...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@siga.com',
    password: 'test1234'
  })
  
  if (authError) {
    console.error('❌ Auth failed:', authError)
    return
  }
  
  console.log('✅ Authenticated successfully')
  console.log('   User ID:', authData.user?.id)
  console.log('   Email:', authData.user?.email)
  console.log('   Access Token:', authData.session?.access_token?.substring(0, 20) + '...')
  
  // 2. Test API endpoints with the access token
  const endpoints = [
    '/api/profile/user',
    '/api/dashboard/objectives',
    '/api/dashboard/status-distribution',
    '/api/dashboard/progress-distribution',
    '/api/dashboard/area-comparison'
  ]
  
  console.log('\n2️⃣ Testing API endpoints with Bearer token...\n')
  
  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint}...`)
    try {
      const response = await fetch(`${PROD_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${authData.session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const status = response.status
      const statusText = response.statusText
      
      if (status === 200) {
        const data = await response.json()
        console.log(`  ✅ ${status} - Success`)
        if (endpoint === '/api/profile/user' && data.profile) {
          console.log(`     Profile: ${data.profile.full_name} (${data.profile.role})`)
        }
      } else {
        const errorText = await response.text()
        console.log(`  ❌ ${status} ${statusText}`)
        if (errorText) {
          console.log(`     Error: ${errorText.substring(0, 100)}`)
        }
      }
    } catch (error) {
      console.log(`  ❌ Request failed:`, error)
    }
  }
  
  // 3. Test direct database access
  console.log('\n3️⃣ Testing direct database access...\n')
  
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', authData.user?.id)
    .single()
  
  if (profileError) {
    console.log('❌ Profile fetch error:', profileError)
  } else {
    console.log('✅ Profile found in database:')
    console.log('   ID:', profile.id)
    console.log('   Name:', profile.full_name)
    console.log('   Role:', profile.role)
    console.log('   Tenant:', profile.tenant_id)
  }
  
  console.log('\n✨ Test complete!')
}

testProductionAPI().catch(console.error)