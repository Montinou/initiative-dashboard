import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth-helper'

export async function GET(request: NextRequest) {
  try {
    // Authentication required - only authenticated users can test DB
    const { user, userProfile, error: authError } = await authenticateRequest(request)
    
    if (authError || !user || !userProfile) {
      return NextResponse.json({ error: authError || 'Authentication required' }, { status: 401 })
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Test basic connection
    const { count: tenantCount, error: tenantError } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })

    if (tenantError) {
      return NextResponse.json(
        { error: 'Database connection failed', details: tenantError.message },
        { status: 500 }
      )
    }

    // Test multiple tables
    const tables = ['tenants', 'areas', 'initiatives', 'user_profiles']
    const tableCounts: Record<string, number> = {}

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        tableCounts[table] = -1 // Error indicator
      } else {
        tableCounts[table] = count || 0
      }
    }

    // Test view
    const { count: viewCount, error: viewError } = await supabase
      .from('initiatives_with_subtasks_summary')
      .select('*', { count: 'exact', head: true })

    const result = {
      status: 'success',
      timestamp: new Date().toISOString(),
      database_url: supabaseUrl,
      tables: tableCounts,
      view_initiatives_summary: viewError ? 'error' : viewCount || 0,
      connection_test: 'passed'
    }

    return NextResponse.json(result)

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Unexpected error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}