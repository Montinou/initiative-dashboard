import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth-helper'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user and get profile
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(request)
    
    if (authError || !userProfile) {
      return NextResponse.json({ error: authError || 'Authentication required' }, { status: 401 })
    }

    // Only CEO and Admin can access org-admin endpoints
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Fetch all statistics in parallel for better performance
    const [
      usersResult,
      areasResult,
      objectivesResult,
      invitationsResult,
      unassignedUsersResult
    ] = await Promise.all([
      // Total and active users
      supabase
        .from('user_profiles')
        .select('id, is_active', { count: 'exact' })
        .eq('tenant_id', userProfile.tenant_id),
      
      // Total and active areas
      supabase
        .from('areas')
        .select('id, is_active', { count: 'exact' })
        .eq('tenant_id', userProfile.tenant_id),
      
      // Total, completed, and overdue objectives
      supabase
        .from('objectives')
        .select('id, status, target_date', { count: 'exact' })
        .eq('tenant_id', userProfile.tenant_id),
      
      // Pending invitations - check if table exists, otherwise return 0
      supabase
        .from('invitations')
        .select('id', { count: 'exact' })
        .eq('tenant_id', userProfile.tenant_id)
        .in('status', ['sent', 'pending'])
        .then(result => result)
        .catch((error) => {
          console.log('Invitations table not found or error:', error)
          return { count: 0, data: null, error: null }
        }),
      
      // Unassigned users (users without area_id)
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact' })
        .eq('tenant_id', userProfile.tenant_id)
        .is('area_id', null)
    ])

    // Process results
    const totalUsers = usersResult.count || 0
    const activeUsers = usersResult.data?.filter(u => u.is_active).length || 0
    
    const totalAreas = areasResult.count || 0
    const activeAreas = areasResult.data?.filter(a => a.is_active).length || 0
    
    const totalObjectives = objectivesResult.count || 0
    const completedObjectives = objectivesResult.data?.filter(o => o.status === 'completed').length || 0
    const now = new Date()
    const overdueObjectives = objectivesResult.data?.filter(o => {
      return o.status !== 'completed' && o.target_date && new Date(o.target_date) < now
    }).length || 0
    
    const pendingInvitations = invitationsResult.count || 0
    const unassignedUsers = unassignedUsersResult.count || 0

    const stats = {
      totalUsers,
      activeUsers,
      pendingInvitations,
      totalAreas,
      activeAreas,
      totalObjectives,
      completedObjectives,
      overdueObjectives,
      unassignedUsers
    }

    return NextResponse.json(stats)
    
  } catch (error) {
    console.error('Error fetching org admin stats:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}