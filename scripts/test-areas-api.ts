import { createClient } from '@supabase/supabase-js'

const PROD_URL = 'https://siga-turismo.vercel.app'
const SUPABASE_URL = 'https://zkkdnslupqnpioltjpeu.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NzI4NDgsImV4cCI6MjA2NjU0ODg0OH0.GUqHaOFH7TVWmKQrGlk-zJ8Sr-uovOPU3fLEtIfbk1k'

async function testAreasAPI() {
  console.log('🧪 Testing Areas API...\n')
  
  // 1. Authenticate
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@siga.com',
    password: 'test1234'
  })
  
  if (authError) {
    console.error('❌ Auth failed:', authError)
    return
  }
  
  const token = authData.session?.access_token
  console.log('✅ Authenticated\n')
  
  // 2. Test areas API
  console.log('📊 Fetching areas with stats...\n')
  const response = await fetch(`${PROD_URL}/api/areas?includeStats=true`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  
  const data = await response.json()
  
  console.log('Response structure:')
  console.log('- Total areas:', data.areas?.length || 0)
  console.log('- Pagination:', data.pagination)
  
  if (data.areas && data.areas.length > 0) {
    console.log('\n📋 Areas Details:\n')
    data.areas.forEach((area: any, index: number) => {
      console.log(`Area ${index + 1}: ${area.name}`)
      console.log('  ID:', area.id)
      console.log('  Description:', area.description)
      console.log('  Manager:', area.manager?.full_name || 'Not assigned')
      console.log('  Stats:', JSON.stringify(area.stats, null, 2))
      console.log('  ---')
    })
  } else {
    console.log('\n⚠️ No areas found in response')
  }
  
  // 3. Check raw data structure
  console.log('\n📦 Raw Response (first area):')
  if (data.areas && data.areas[0]) {
    console.log(JSON.stringify(data.areas[0], null, 2))
  }
}

testAreasAPI().catch(console.error)