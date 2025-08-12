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

    // 1. Contar objetivos
    const { count: objectivesCount, error: objCountError } = await supabase
      .from('objectives')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', userProfile.tenant_id)

    // 2. Contar iniciativas
    const { count: initiativesCount, error: initCountError } = await supabase
      .from('initiatives')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', userProfile.tenant_id)

    // 3. Verificar enlaces objective_initiatives
    const { data: links, count: linksCount, error: linksError } = await supabase
      .from('objective_initiatives')
      .select(`
        id,
        objective_id,
        initiative_id,
        objectives!inner(tenant_id),
        initiatives!inner(tenant_id)
      `)
      .eq('objectives.tenant_id', userProfile.tenant_id)

    // 4. Obtener algunos ejemplos de objetivos con sus iniciativas
    const { data: objectivesWithInitiatives, error: objWithInitError } = await supabase
      .from('objectives')
      .select(`
        id,
        title,
        objective_initiatives(
          initiative_id,
          initiatives(
            id,
            title,
            progress
          )
        )
      `)
      .eq('tenant_id', userProfile.tenant_id)
      .limit(5)

    // 5. Obtener algunas iniciativas para ver si existen
    const { data: sampleInitiatives, error: sampleInitError } = await supabase
      .from('initiatives')
      .select('id, title, area_id, progress')
      .eq('tenant_id', userProfile.tenant_id)
      .limit(10)

    return NextResponse.json({
      summary: {
        tenant_id: userProfile.tenant_id,
        objectives_count: objectivesCount || 0,
        initiatives_count: initiativesCount || 0,
        objective_initiative_links_count: linksCount || 0
      },
      objective_initiative_links: links || [],
      sample_objectives_with_initiatives: objectivesWithInitiatives || [],
      sample_initiatives: sampleInitiatives || [],
      errors: {
        objectives_count: objCountError,
        initiatives_count: initCountError,
        links: linksError,
        objectives_with_initiatives: objWithInitError,
        sample_initiatives: sampleInitError
      }
    })

  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}