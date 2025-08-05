import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getUserProfile } from '@/lib/server-user-profile'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user and get profile
    const { user, userProfile } = await getUserProfile()
    
    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Create Supabase client
    const supabase = await createClient()

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30' // days
    const metric = searchParams.get('metric') || 'overview'

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(timeframe))

    // Get overall statistics
    const [
      initiativesResult,
      areasResult,
      usersResult,
      activitiesResult
    ] = await Promise.all([
      // Initiatives data
      supabase
        .from('initiatives')
        .select('id, status, progress, created_at, area_id, target_date, completion_date')
        .eq('tenant_id', userProfile.tenant_id),
      
      // Areas data
      supabase
        .from('areas')
        .select('id, name, created_at')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('is_active', true),
      
      // Users data
      supabase
        .from('user_profiles')
        .select('id, role, created_at, last_login, is_active')
        .eq('tenant_id', userProfile.tenant_id),
      
      // Activities data
      supabase
        .from('activities')
        .select(`
          id, 
          status, 
          progress, 
          created_at, 
          due_date,
          initiatives!inner(tenant_id)
        `)
        .eq('initiatives.tenant_id', currentUser.tenant_id)
    ])

    if (initiativesResult.error) {
      console.error('Initiatives query error:', initiativesResult.error)
      return NextResponse.json({ error: 'Failed to fetch initiatives data' }, { status: 500 })
    }

    if (areasResult.error) {
      console.error('Areas query error:', areasResult.error)
      return NextResponse.json({ error: 'Failed to fetch areas data' }, { status: 500 })
    }

    if (usersResult.error) {
      console.error('Users query error:', usersResult.error)
      return NextResponse.json({ error: 'Failed to fetch users data' }, { status: 500 })
    }

    const initiatives = initiativesResult.data || []
    const areas = areasResult.data || []
    const users = usersResult.data || []
    const activities = activitiesResult.data || []

    // Calculate analytics
    const analytics = {
      overview: {
        totalInitiatives: initiatives.length,
        totalAreas: areas.length,
        totalUsers: users.filter(u => u.is_active).length,
        totalActivities: activities.length,
        
        // Initiative status distribution
        initiativesByStatus: {
          planning: initiatives.filter(i => i.status === 'planning').length,
          in_progress: initiatives.filter(i => i.status === 'in_progress').length,
          completed: initiatives.filter(i => i.status === 'completed').length,
          on_hold: initiatives.filter(i => i.status === 'on_hold').length
        },
        
        // Average progress
        averageProgress: initiatives.length > 0 
          ? Math.round(initiatives.reduce((sum, i) => sum + (i.progress || 0), 0) / initiatives.length)
          : 0,
        
        // User role distribution
        usersByRole: {
          CEO: users.filter(u => u.role === 'CEO' && u.is_active).length,
          Admin: users.filter(u => u.role === 'Admin' && u.is_active).length,
          Manager: users.filter(u => u.role === 'Manager' && u.is_active).length,
          Analyst: users.filter(u => u.role === 'Analyst' && u.is_active).length
        }
      },
      
      // Time-based data for charts
      trends: {
        // Initiatives created over time (last 12 months)
        initiativeCreationTrend: generateTrendData(initiatives, 'created_at', 12),
        
        // Progress trend (average progress over time)
        progressTrend: generateProgressTrend(initiatives, 12),
        
        // User activity (last login data)
        userActivityTrend: generateUserActivityTrend(users, 30)
      },
      
      // Performance metrics
      performance: {
        completionRate: initiatives.length > 0 
          ? Math.round((initiatives.filter(i => i.status === 'completed').length / initiatives.length) * 100)
          : 0,
        
        onTimeCompletionRate: calculateOnTimeCompletionRate(initiatives),
        
        averageTimeToCompletion: calculateAverageTimeToCompletion(initiatives),
        
        // Most productive areas
        areaPerformance: calculateAreaPerformance(initiatives, areas)
      }
    }

    // Return specific metric if requested
    if (metric !== 'overview' && analytics[metric as keyof typeof analytics]) {
      return NextResponse.json({
        [metric]: analytics[metric as keyof typeof analytics]
      })
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper functions
function generateTrendData(items: any[], dateField: string, months: number) {
  const result = []
  const now = new Date()
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = date.toISOString().slice(0, 7) // YYYY-MM format
    
    const count = items.filter(item => 
      item[dateField] && item[dateField].startsWith(monthKey)
    ).length
    
    result.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      count
    })
  }
  
  return result
}

function generateProgressTrend(initiatives: any[], months: number) {
  const result = []
  const now = new Date()
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = date.toISOString().slice(0, 7)
    
    const monthInitiatives = initiatives.filter(item => 
      item.created_at && item.created_at.startsWith(monthKey)
    )
    
    const avgProgress = monthInitiatives.length > 0
      ? Math.round(monthInitiatives.reduce((sum, i) => sum + (i.progress || 0), 0) / monthInitiatives.length)
      : 0
    
    result.push({
      month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      progress: avgProgress
    })
  }
  
  return result
}

function generateUserActivityTrend(users: any[], days: number) {
  const result = []
  const now = new Date()
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateKey = date.toISOString().slice(0, 10) // YYYY-MM-DD format
    
    const activeUsers = users.filter(user => 
      user.last_login && user.last_login.startsWith(dateKey)
    ).length
    
    result.push({
      date: dateKey,
      activeUsers
    })
  }
  
  return result
}

function calculateOnTimeCompletionRate(initiatives: any[]) {
  const completed = initiatives.filter(i => i.status === 'completed')
  if (completed.length === 0) return 0
  
  const onTime = completed.filter(i => 
    i.completion_date && i.target_date && 
    new Date(i.completion_date) <= new Date(i.target_date)
  ).length
  
  return Math.round((onTime / completed.length) * 100)
}

function calculateAverageTimeToCompletion(initiatives: any[]) {
  const completed = initiatives.filter(i => 
    i.status === 'completed' && i.created_at && i.completion_date
  )
  
  if (completed.length === 0) return 0
  
  const totalDays = completed.reduce((sum, i) => {
    const start = new Date(i.created_at)
    const end = new Date(i.completion_date)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return sum + days
  }, 0)
  
  return Math.round(totalDays / completed.length)
}

function calculateAreaPerformance(initiatives: any[], areas: any[]) {
  return areas.map(area => {
    const areaInitiatives = initiatives.filter(i => i.area_id === area.id)
    const completed = areaInitiatives.filter(i => i.status === 'completed').length
    const total = areaInitiatives.length
    const avgProgress = total > 0 
      ? Math.round(areaInitiatives.reduce((sum, i) => sum + (i.progress || 0), 0) / total)
      : 0
    
    return {
      areaId: area.id,
      areaName: area.name,
      totalInitiatives: total,
      completedInitiatives: completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      averageProgress: avgProgress
    }
  }).sort((a, b) => b.completionRate - a.completionRate)
}