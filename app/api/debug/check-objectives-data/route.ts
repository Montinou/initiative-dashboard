import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth-helper'

export async function GET(request: NextRequest) {
  try {
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(request)
    
    if (authError || !user || !userProfile || !supabase) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      )
    }

    // 1. Contar objetivos
    const { count: objectivesCount, error: objCountError } = await supabase
      .from('objectives')
      .select('*', { count: 'exact', head: true })
      

    // 2. Contar iniciativas
    const { count: initiativesCount, error: initCountError } = await supabase
      .from('initiatives')
      .select('*', { count: 'exact', head: true })
      

    // 3. Verificar enlaces objective_initiatives
    const { data: links, count: linksCount, error: linksError } = await supabase
      .from('objective_initiatives')
      .select(`
        id,
        objective_id,
        initiative_id,
        objectives!inner(id),
        initiatives!inner(id)
      `)
      // RLS automatically filters by tenant_id

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
      
      .limit(5)

    // 5. Obtener algunas iniciativas para ver si existen
    const { data: sampleInitiatives, error: sampleInitError } = await supabase
      .from('initiatives')
      .select('id, title, area_id, progress')
      
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