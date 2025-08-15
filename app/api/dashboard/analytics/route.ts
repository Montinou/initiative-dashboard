import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth-helper'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user profile and supabase client
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(request)
    
    if (authError || !userProfile || !supabase) {
      return NextResponse.json(
        { error: authError || 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get initiatives (without progress history for now as it may not have data)
    let initiativesQuery = supabase
      .from('initiatives')
      .select(`
        id,
        title,
        progress,
        area_id,
        created_at,
        due_date
      `)
      .eq('tenant_id', userProfile.tenant_id)

    // If manager, filter by area
    if (userProfile.role === 'Manager' && userProfile.area_id) {
      initiativesQuery = initiativesQuery.eq('area_id', userProfile.area_id)
    }

    const { data: initiatives, error: initiativesError } = await initiativesQuery

    if (initiativesError) throw initiativesError

    // Calculate analytics
    const totalInitiatives = initiatives?.length || 0
    const completedInitiatives = initiatives?.filter(i => i.progress === 100).length || 0
    const inProgressInitiatives = initiatives?.filter(i => i.progress > 0 && i.progress < 100).length || 0
    const notStartedInitiatives = initiatives?.filter(i => i.progress === 0).length || 0
    
    // Calculate progress distribution
    const progressDistribution = {
      '0-25': initiatives?.filter(i => i.progress >= 0 && i.progress <= 25).length || 0,
      '26-50': initiatives?.filter(i => i.progress > 25 && i.progress <= 50).length || 0,
      '51-75': initiatives?.filter(i => i.progress > 50 && i.progress <= 75).length || 0,
      '76-100': initiatives?.filter(i => i.progress > 75 && i.progress <= 100).length || 0
    }

    // Calculate monthly trends (last 6 months)
    const monthlyTrends = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthName = monthDate.toLocaleDateString('es', { month: 'short' })
      
      const monthlyInitiatives = initiatives?.filter(i => {
        const createdDate = new Date(i.created_at)
        return createdDate.getMonth() === monthDate.getMonth() && 
               createdDate.getFullYear() === monthDate.getFullYear()
      }).length || 0

      monthlyTrends.push({
        month: monthName,
        initiatives: monthlyInitiatives
      })
    }

    // Calculate completion rate by area
    const { data: areas } = await supabase
      .from('areas')
      .select('id, name')
      .eq('tenant_id', userProfile.tenant_id)

    const completionByArea = areas?.map(area => {
      const areaInitiatives = initiatives?.filter(i => i.area_id === area.id) || []
      const completed = areaInitiatives.filter(i => i.progress === 100).length
      const total = areaInitiatives.length
      
      return {
        area: area.name,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        total,
        completed
      }
    }) || []

    return NextResponse.json({
      summary: {
        totalInitiatives,
        completedInitiatives,
        inProgressInitiatives,
        notStartedInitiatives,
        completionRate: totalInitiatives > 0 
          ? Math.round((completedInitiatives / totalInitiatives) * 100) 
          : 0
      },
      progressDistribution,
      monthlyTrends,
      completionByArea,
      initiatives: initiatives?.map(i => ({
        id: i.id,
        title: i.title,
        progress: i.progress,
        dueDate: i.due_date,
        progressHistory: [] // Empty for now as we're not fetching it
      })) || []
    })

  } catch (error) {
    console.error('Dashboard analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}