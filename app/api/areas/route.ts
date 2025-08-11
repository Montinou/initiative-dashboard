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

    // Optionally include stats from initiatives table
    if (includeStats && areas && areas.length > 0) {
      const areaIds = areas.map(a => a.id)
      const { data: statsData, error: statsError } = await supabase
        .from('initiatives')
        .select('area_id, status')
        .in('area_id', areaIds)

      if (statsError) {
        return NextResponse.json({ error: statsError.message }, { status: 500 })
      }

      const statsMap: Record<string, { total: number; completed: number; in_progress: number; blocked: number }> = {}
      for (const s of statsData || []) {
        const key = s.area_id as string
        if (!statsMap[key]) {
          statsMap[key] = { total: 0, completed: 0, in_progress: 0, blocked: 0 }
        }
        statsMap[key].total += 1
        if (s.status === 'completed') statsMap[key].completed += 1
        else if (s.status === 'in_progress') statsMap[key].in_progress += 1
        else if (s.status === 'blocked') statsMap[key].blocked += 1
      }

      const areasWithStats = areas.map(a => ({
        ...a,
        stats: statsMap[a.id] || { total: 0, completed: 0, in_progress: 0, blocked: 0 }
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
