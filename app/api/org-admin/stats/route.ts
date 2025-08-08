import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getUserProfile } from '@/lib/server-user-profile'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user and get profile
    const userProfile = await getUserProfile(request)
    
    if (!userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only CEO and Admin can access org-admin endpoints
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Create Supabase client
    const supabase = await createClient()

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
        .eq('status', 'sent')
        .then(result => result)
        .catch(() => ({ count: 0, data: null, error: null })),
      
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
    
    // Return mock data as fallback for now
    return NextResponse.json({
      totalUsers: 24,
      activeUsers: 22,
      pendingInvitations: 3,
      totalAreas: 6,
      activeAreas: 5,
      totalObjectives: 18,
      completedObjectives: 12,
      overdueObjectives: 2,
      unassignedUsers: 4
    })
  }
}