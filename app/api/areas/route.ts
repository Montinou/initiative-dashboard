import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getUserProfile } from '@/lib/server-user-profile'

export async function GET(request: NextRequest) {
  try {
    // getUserProfile now supports Authorization header if provided
    const { user, userProfile } = await getUserProfile(request)

    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabase = await createClient()

    // Parse query params
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('includeStats') === 'true'
    const page = Number(searchParams.get('page') || '1')
    const pageSize = Math.min(Number(searchParams.get('pageSize') || '50'), 200)

    // Base query scoped by tenant via RLS
    let query = supabase
      .from('areas')
      .select('*', { count: 'exact' })
      .eq('tenant_id', userProfile.tenant_id)
      .order('name', { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1)

    const { data: areas, error, count } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Optionally include stats from initiatives and objectives tables
    if (includeStats && areas && areas.length > 0) {
      const areaIds = areas.map(a => a.id)
      
      // Get initiatives stats
      const { data: initiativesData, error: initiativesError } = await supabase
        .from('initiatives')
        .select('area_id, status, progress')
        .in('area_id', areaIds)

      if (initiativesError) {
        return NextResponse.json({ error: initiativesError.message }, { status: 500 })
      }
      
      // Get objectives stats
      const { data: objectivesData, error: objectivesError } = await supabase
        .from('objectives')
        .select('area_id, title, progress, status')
        .in('area_id', areaIds)

      if (objectivesError) {
        console.error('Error fetching objectives:', objectivesError)
      }

      const statsMap: Record<string, { 
        total: number; 
        completed: number; 
        in_progress: number; 
        blocked: number;
        averageProgress: number;
        total_objectives: number;
        objectives: any[];
      }> = {}
      
      // Process initiatives
      for (const initiative of initiativesData || []) {
        const key = initiative.area_id as string
        if (!statsMap[key]) {
          statsMap[key] = { 
            total: 0, 
            completed: 0, 
            in_progress: 0, 
            blocked: 0,
            averageProgress: 0,
            total_objectives: 0,
            objectives: []
          }
        }
        statsMap[key].total += 1
        if (initiative.status === 'completed') statsMap[key].completed += 1
        else if (initiative.status === 'in_progress') statsMap[key].in_progress += 1
        else if (initiative.status === 'blocked' || initiative.status === 'on_hold') statsMap[key].blocked += 1
      }
      
      // Process objectives
      for (const objective of objectivesData || []) {
        const key = objective.area_id as string
        if (!statsMap[key]) {
          statsMap[key] = { 
            total: 0, 
            completed: 0, 
            in_progress: 0, 
            blocked: 0,
            averageProgress: 0,
            total_objectives: 0,
            objectives: []
          }
        }
        statsMap[key].total_objectives += 1
        statsMap[key].objectives.push({
          id: objective.area_id,
          name: objective.title,
          progress: objective.progress || 0,
          status: objective.status || 'planning'
        })
      }
      
      // Calculate average progress for each area
      for (const key in statsMap) {
        const initiatives = initiativesData?.filter(i => i.area_id === key) || []
        if (initiatives.length > 0) {
          const totalProgress = initiatives.reduce((sum, i) => sum + (i.progress || 0), 0)
          statsMap[key].averageProgress = Math.round(totalProgress / initiatives.length)
        }
      }

      const areasWithStats = areas.map(a => ({
        ...a,
        stats: statsMap[a.id] || { 
          total: 0, 
          completed: 0, 
          in_progress: 0, 
          blocked: 0,
          averageProgress: 0,
          total_objectives: 0,
          objectives: []
        }
      }))

      return NextResponse.json({ data: areasWithStats, count })
    }

    return NextResponse.json({ data: areas, count })
  } catch (err: any) {
    console.error('GET /api/areas error', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, userProfile } = await getUserProfile(request)
    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()

    const insert = {
      name: body.name,
      description: body.description || null,
      tenant_id: userProfile.tenant_id,
      created_by: user.id
    }

    const { data, error } = await supabase
      .from('areas')
      .insert(insert)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('POST /api/areas error', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
