import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function linkObjectivesAndInitiatives() {
  try {
    console.log('Fetching objectives and initiatives...')
    
    // Get all objectives for SIGA tenant
    const { data: objectives, error: objError } = await supabase
      .from('objectives')
      .select('id, title, area_id')
      .eq('tenant_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    
    if (objError) throw objError
    
    // Get all initiatives for SIGA tenant
    const { data: initiatives, error: initError } = await supabase
      .from('initiatives')
      .select('id, title, area_id')
      .eq('tenant_id', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    
    if (initError) throw initError
    
    console.log(`Found ${objectives?.length || 0} objectives and ${initiatives?.length || 0} initiatives`)
    
    // Clear existing links
    const { error: deleteError } = await supabase
      .from('objective_initiatives')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000') // Delete all
    
    if (deleteError) console.warn('Error clearing existing links:', deleteError)
    
    // Create links between objectives and initiatives in the same area
    const links: any[] = []
    
    objectives?.forEach(objective => {
      // Find initiatives in the same area
      const areaInitiatives = initiatives?.filter(init => init.area_id === objective.area_id) || []
      
      areaInitiatives.forEach(initiative => {
        links.push({
          objective_id: objective.id,
          initiative_id: initiative.id
        })
      })
    })
    
    console.log(`Creating ${links.length} links between objectives and initiatives...`)
    
    if (links.length > 0) {
      const { error: insertError } = await supabase
        .from('objective_initiatives')
        .insert(links)
      
      if (insertError) throw insertError
      
      console.log('✅ Successfully linked objectives and initiatives!')
    } else {
      console.log('⚠️ No links to create - objectives and initiatives may be in different areas')
    }
    
    // Verify the links
    const { data: verifyData, error: verifyError } = await supabase
      .from('objective_initiatives')
      .select('*')
    
    console.log(`\nVerification: ${verifyData?.length || 0} links created`)
    
    // Show summary by objective
    const summary: Record<string, number> = {}
    verifyData?.forEach(link => {
      summary[link.objective_id] = (summary[link.objective_id] || 0) + 1
    })
    
    console.log('\nObjectives with linked initiatives:')
    for (const [objId, count] of Object.entries(summary)) {
      const obj = objectives?.find(o => o.id === objId)
      console.log(`- ${obj?.title}: ${count} initiatives`)
    }
    
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

linkObjectivesAndInitiatives()