import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface PerformanceMetric {
  id: string
  name: string
  value: number
  rating: string
  delta: number
  navigationType: string
}

interface PerformanceData {
  url: string
  userAgent: string
  timestamp: number
  sessionId: string
  userId?: string
  tenant?: string
  metrics: PerformanceMetric[]
}

export async function POST(request: NextRequest) {
  try {
    const data: PerformanceData = await request.json()
    const supabase = await createClient()

    // Validate data
    if (!data.sessionId || !data.metrics || data.metrics.length === 0) {
      return NextResponse.json(
        { error: 'Invalid performance data' },
        { status: 400 }
      )
    }

    // Optional: Get user context if authenticated
    let userProfile = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, tenant_id, role, full_name')
          .eq('user_id', user.id)
          .single()
        userProfile = profile
      }
    } catch (error) {
      // Anonymous user - continue without user context
    }

    // Store performance metrics
    const metricsToStore = data.metrics.map(metric => ({
      session_id: data.sessionId,
      user_id: userProfile?.id || null,
      tenant_id: userProfile?.tenant_id || null,
      url: data.url,
      user_agent: data.userAgent,
      metric_name: metric.name,
      metric_value: metric.value,
      metric_rating: metric.rating,
      metric_delta: metric.delta,
      navigation_type: metric.navigationType,
      timestamp: new Date(data.timestamp).toISOString(),
      created_at: new Date().toISOString()
    }))

    // Insert into performance_metrics table (you'll need to create this)
    const { error: insertError } = await supabase
      .from('performance_metrics')
      .insert(metricsToStore)

    if (insertError) {
      console.error('Error storing performance metrics:', insertError)
      
      // Fallback: Store in audit log as performance event
      await supabase
        .from('audit_log')
        .insert({
          user_id: userProfile?.id || null,
          action: 'performance_metric',
          table_name: 'performance_metrics',
          new_data: { metrics: data.metrics, url: data.url },
          metadata: {
            session_id: data.sessionId,
            user_agent: data.userAgent,
            timestamp: data.timestamp
          }
        })
    }

    // Performance alerting for poor metrics
    const poorMetrics = data.metrics.filter(m => m.rating === 'poor')
    if (poorMetrics.length > 0) {
      // Log poor performance for monitoring
      console.warn('Poor performance detected:', {
        url: data.url,
        metrics: poorMetrics,
        user: userProfile?.full_name || 'Anonymous',
        tenant: userProfile?.tenant_id
      })

      // Optional: Send alert to monitoring service
      // await sendPerformanceAlert(poorMetrics, data.url, userProfile)
    }

    return NextResponse.json({ 
      success: true, 
      stored: metricsToStore.length 
    })

  } catch (error) {
    console.error('Performance metrics storage error:', error)
    return NextResponse.json(
      { error: 'Failed to store performance metrics' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  try {
    // Authentication check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile for tenant filtering
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Query parameters
    const metricName = searchParams.get('metric')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Build query
    let query = supabase
      .from('performance_metrics')
      .select('*')
      
      .order('created_at', { ascending: false })
      .limit(limit)

    if (metricName) {
      query = query.eq('metric_name', metricName)
    }

    if (startDate) {
      query = query.gte('timestamp', startDate)
    }

    if (endDate) {
      query = query.lte('timestamp', endDate)
    }

    const { data: metrics, error } = await query

    if (error) {
      throw error
    }

    // Calculate aggregations
    const aggregations = calculateMetricAggregations(metrics || [])

    return NextResponse.json({
      metrics: metrics || [],
      aggregations,
      total: metrics?.length || 0
    })

  } catch (error) {
    console.error('Performance metrics retrieval error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve performance metrics' },
      { status: 500 }
    )
  }
}

function calculateMetricAggregations(metrics: any[]) {
  const aggregations: Record<string, any> = {}

  // Group by metric name
  const groupedMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.metric_name]) {
      acc[metric.metric_name] = []
    }
    acc[metric.metric_name].push(metric.metric_value)
    return acc
  }, {} as Record<string, number[]>)

  // Calculate stats for each metric
  Object.entries(groupedMetrics).forEach(([metricName, values]) => {
    const sortedValues = values.sort((a, b) => a - b)
    aggregations[metricName] = {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      median: sortedValues[Math.floor(sortedValues.length / 2)],
      p75: sortedValues[Math.floor(sortedValues.length * 0.75)],
      p90: sortedValues[Math.floor(sortedValues.length * 0.9)],
      p95: sortedValues[Math.floor(sortedValues.length * 0.95)]
    }
  })

  return aggregations
}