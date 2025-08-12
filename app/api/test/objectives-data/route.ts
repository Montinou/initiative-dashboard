import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getUserProfile } from '@/lib/server-user-profile'

export async function GET(request: NextRequest) {
  try {
    const { user, userProfile } = await getUserProfile(request)
    
    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // First, check if objectives exist
    const { data: objectives, error: objError } = await supabase
      .from('objectives')
      .select('*')
      .eq('tenant_id', userProfile.tenant_id)

    if (objError) {
      return NextResponse.json({ error: 'Failed to fetch objectives', details: objError }, { status: 500 })
    }

    // Check if initiatives exist
    const { data: initiatives, error: initError } = await supabase
      .from('initiatives')
      .select('*')
      .eq('tenant_id', userProfile.tenant_id)

    if (initError) {
      return NextResponse.json({ error: 'Failed to fetch initiatives', details: initError }, { status: 500 })
    }

    // Check if objective_initiatives links exist
    const { data: links, error: linkError } = await supabase
      .from('objective_initiatives')
      .select('*')

    if (linkError) {
      return NextResponse.json({ error: 'Failed to fetch links', details: linkError }, { status: 500 })
    }

    // Now fetch objectives with all relations
    const { data: fullObjectives, error: fullError } = await supabase
      .from('objectives')
      .select(`
        *,
        area:areas!objectives_area_id_fkey(id, name),
        objective_initiatives(
          id,
          initiative_id,
          initiatives!objective_initiatives_initiative_id_fkey(
            id,
            title,
            progress,
            area_id
          )
        )
      `)
      .eq('tenant_id', userProfile.tenant_id)

    if (fullError) {
      return NextResponse.json({ error: 'Failed to fetch full objectives', details: fullError }, { status: 500 })
    }

    return NextResponse.json({
      summary: {
        objectives_count: objectives?.length || 0,
        initiatives_count: initiatives?.length || 0,
        links_count: links?.length || 0,
        tenant_id: userProfile.tenant_id
      },
      objectives: objectives,
      initiatives: initiatives,
      objective_initiative_links: links,
      full_objectives: fullObjectives
    })

  } catch (error) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}