import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zkkdnslupqnpioltjpeu.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw'

async function checkAreasData() {
  console.log('🔍 Checking areas data...\n')
  
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
  
  // 1. Get all areas
  const { data: areas, error: areasError } = await supabase
    .from('areas')
    .select('*')
  
  if (areasError) {
    console.error('Error fetching areas:', areasError)
    return
  }
  
  console.log(`Found ${areas?.length || 0} areas total\n`)
  
  if (areas && areas.length > 0) {
    console.log('Areas by tenant:')
    const byTenant = areas.reduce((acc: any, area: any) => {
      if (!acc[area.tenant_id]) acc[area.tenant_id] = []
      acc[area.tenant_id].push(area)
      return acc
    }, {})
    
    for (const [tenantId, tenantAreas] of Object.entries(byTenant)) {
      console.log(`\nTenant ${tenantId}:`)
      for (const area of tenantAreas as any[]) {
        console.log(`  - ${area.name} (ID: ${area.id})`)
        console.log(`    Active: ${area.is_active}`)
        console.log(`    Manager: ${area.manager_id || 'None'}`)
      }
    }
  }
  
  // 2. Check SIGA tenant specifically
  const SIGA_TENANT = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  console.log(`\n📊 SIGA Tenant (${SIGA_TENANT}) areas:`)
  
  const { data: sigaAreas, error: sigaError } = await supabase
    .from('areas')
    .select('*')
    .eq('tenant_id', SIGA_TENANT)
  
  if (sigaError) {
    console.error('Error fetching SIGA areas:', sigaError)
  } else {
    console.log(`Found ${sigaAreas?.length || 0} areas for SIGA tenant`)
    if (sigaAreas && sigaAreas.length > 0) {
      sigaAreas.forEach(area => {
        console.log(`  - ${area.name}`)
      })
    }
  }
  
  // 3. Check initiatives for those areas
  if (sigaAreas && sigaAreas.length > 0) {
    const areaIds = sigaAreas.map(a => a.id)
    const { data: initiatives } = await supabase
      .from('initiatives')
      .select('area_id, status, progress')
      .in('area_id', areaIds)
    
    console.log(`\n📈 Initiatives stats:`)
    console.log(`  Total initiatives: ${initiatives?.length || 0}`)
    
    if (initiatives && initiatives.length > 0) {
      const byArea = initiatives.reduce((acc: any, init: any) => {
        if (!acc[init.area_id]) acc[init.area_id] = []
        acc[init.area_id].push(init)
        return acc
      }, {})
      
      for (const [areaId, areaInits] of Object.entries(byArea)) {
        const area = sigaAreas.find(a => a.id === areaId)
        console.log(`  ${area?.name}: ${(areaInits as any[]).length} initiatives`)
      }
    }
  }
}

checkAreasData().catch(console.error)