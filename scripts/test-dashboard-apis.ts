import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function testDashboardAPIs() {
  console.log('Testing Dashboard APIs...\n')
  
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
  
  // Test KPI Analytics API
  console.log('\n📊 Testing KPI Analytics API...')
  const kpiResponse = await fetch('http://localhost:3002/api/analytics/kpi?time_range=month&include_insights=true', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (kpiResponse.ok) {
    const kpiData = await kpiResponse.json()
    console.log('KPI Summary:', {
      total_initiatives: kpiData.summary?.total_initiatives,
      completion_rate: kpiData.summary?.completion_rate,
      avg_progress: kpiData.summary?.avg_progress,
      active_areas: kpiData.summary?.active_areas
    })
  } else {
    console.error('KPI API failed:', kpiResponse.status, await kpiResponse.text())
  }
  
  // Test Dashboard Overview API
  console.log('\n📈 Testing Dashboard Overview API...')
  const overviewResponse = await fetch('http://localhost:3002/api/dashboard/overview', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (overviewResponse.ok) {
    const overviewData = await overviewResponse.json()
    console.log('Overview Data:', {
      initiatives_count: overviewData.initiatives?.length,
      areas_count: overviewData.areas?.length,
      activities_count: overviewData.activities?.length,
      stats: overviewData.stats
    })
    
    // Show first 3 initiatives if any
    if (overviewData.initiatives?.length > 0) {
      console.log('\nFirst 3 initiatives:')
      overviewData.initiatives.slice(0, 3).forEach((init: any) => {
        console.log(`- ${init.title}: ${init.progress}% progress`)
      })
    }
  } else {
    console.error('Overview API failed:', overviewResponse.status, await overviewResponse.text())
  }
  
  // Test Analytics API
  console.log('\n📊 Testing Analytics API...')
  const analyticsResponse = await fetch('http://localhost:3002/api/dashboard/analytics', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  
  if (analyticsResponse.ok) {
    const analyticsData = await analyticsResponse.json()
    console.log('Analytics Data:', {
      objectives_count: analyticsData.objectives?.length,
      objectives_progress: analyticsData.objectivesProgress,
      initiatives_count: analyticsData.initiatives?.length,
      initiatives_progress: analyticsData.initiativesProgress
    })
  } else {
    console.error('Analytics API failed:', analyticsResponse.status, await analyticsResponse.text())
  }
  
  // Query database directly to verify data exists
  console.log('\n🔍 Checking database directly...')
  const { data: initiatives, error: initError } = await supabase
    .from('initiatives')
    .select('id, title, progress, tenant_id')
    .eq('tenant_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11') // SIGA tenant
    .limit(5)
  
  if (initiatives) {
    console.log(`Found ${initiatives.length} initiatives in database for SIGA tenant`)
    initiatives.forEach(init => {
      console.log(`- ${init.title}: ${init.progress}%`)
    })
  } else {
    console.error('Database query error:', initError)
  }
  
  await supabase.auth.signOut()
}

testDashboardAPIs().catch(console.error)