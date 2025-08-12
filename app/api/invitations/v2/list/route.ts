/**
 * List Invitations API
 * Provides filtered list of invitations with analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserProfile } from '@/lib/server-user-profile';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { user, userProfile } = await getUserProfile(request);
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;
    
    const status = searchParams.get('status'); // pending, sent, accepted, expired, cancelled
    const role = searchParams.get('role'); // CEO, Admin, Manager
    const areaId = searchParams.get('areaId');
    const search = searchParams.get('search'); // Email search
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true';

    // Build query based on user role
    let query = supabase
      .from('invitations')
      .select(`
        *,
        sender:user_profiles!invitations_sent_by_fkey(
          id,
          full_name,
          email,
          role
        ),
        area:areas!invitations_area_id_fkey(
          id,
          name
        ),
        acceptedBy:user_profiles!invitations_accepted_by_fkey(
          id,
          full_name,
          email
        )
      `, { count: 'exact' })
      .eq('tenant_id', userProfile.tenant_id);

    // Apply role-based filters
    if (userProfile.role === 'Manager') {
      // Managers can only see invitations for their area
      if (!userProfile.area_id) {
        return NextResponse.json({
          invitations: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        });
      }
      query = query.eq('area_id', userProfile.area_id);
    }

    // Apply filters
    if (status) {
      if (status === 'expired') {
        // Special handling for expired status
        query = query
          .in('status', ['sent', 'pending'])
          .lt('expires_at', new Date().toISOString());
      } else {
        query = query.eq('status', status);
      }
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (areaId) {
      query = query.eq('area_id', areaId);
    }

    if (search) {
      query = query.ilike('email', `%${search}%`);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Apply sorting
    const validSortColumns = ['created_at', 'updated_at', 'expires_at', 'email', 'status', 'role'];
    if (validSortColumns.includes(sortBy)) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: invitations, error, count } = await query;

    if (error) {
      console.error('Failed to fetch invitations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      );
    }

    // Enhance invitations with calculated fields
    const enhancedInvitations = invitations?.map(invitation => {
      const now = new Date();
      const expiresAt = new Date(invitation.expires_at);
      const isExpired = expiresAt < now && !['accepted', 'cancelled'].includes(invitation.status);
      
      return {
        ...invitation,
        is_expired: isExpired,
        days_until_expiry: isExpired ? 0 : Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        email_engagement: {
          sent: !!invitation.email_sent_at,
          delivered: !!invitation.email_delivered_at,
          opened: !!invitation.email_opened_at,
          clicked: !!invitation.email_clicked_at
        },
        time_to_accept: invitation.accepted_at && invitation.email_sent_at
          ? Math.ceil((new Date(invitation.accepted_at).getTime() - new Date(invitation.email_sent_at).getTime()) / (1000 * 60 * 60))
          : null
      };
    }) || [];

    // Fetch analytics if requested
    let analytics = null;
    if (includeAnalytics && ['CEO', 'Admin'].includes(userProfile.role)) {
      // Get overall statistics
      const [
        totalInvitations,
        pendingCount,
        acceptedCount,
        expiredCount,
        avgTimeToAccept
      ] = await Promise.all([
        // Total invitations
        supabase
          .from('invitations')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', userProfile.tenant_id),
        
        // Pending invitations
        supabase
          .from('invitations')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', userProfile.tenant_id)
          .in('status', ['sent', 'pending']),
        
        // Accepted invitations
        supabase
          .from('invitations')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', userProfile.tenant_id)
          .eq('status', 'accepted'),
        
        // Expired invitations
        supabase
          .from('invitations')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', userProfile.tenant_id)
          .in('status', ['sent', 'pending'])
          .lt('expires_at', new Date().toISOString()),
        
        // Average time to accept (in hours)
        supabase
          .rpc('get_avg_time_to_accept', { p_tenant_id: userProfile.tenant_id })
          .catch(() => ({ data: null }))
      ]);

      analytics = {
        total_invitations: totalInvitations.count || 0,
        pending_invitations: pendingCount.count || 0,
        accepted_invitations: acceptedCount.count || 0,
        expired_invitations: expiredCount.count || 0,
        acceptance_rate: totalInvitations.count 
          ? ((acceptedCount.count || 0) / totalInvitations.count * 100).toFixed(1) + '%'
          : '0%',
        avg_time_to_accept_hours: avgTimeToAccept.data || null,
        
        // Email engagement rates (if we have tracking data)
        email_metrics: await getEmailMetrics(supabase, userProfile.tenant_id)
      };
    }

    // Prepare response
    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      invitations: enhancedInvitations,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1
      },
      analytics: analytics,
      filters_applied: {
        status,
        role,
        areaId,
        search,
        dateFrom,
        dateTo
      }
    });

  } catch (error: any) {
    console.error('List invitations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get email engagement metrics
 */
async function getEmailMetrics(supabase: any, tenantId: string) {
  try {
    const { data: invitations } = await supabase
      .from('invitations')
      .select('email_sent_at, email_delivered_at, email_opened_at, email_clicked_at')
      .eq('tenant_id', tenantId)
      .not('email_sent_at', 'is', null);

    if (!invitations || invitations.length === 0) {
      return null;
    }

    const sent = invitations.length;
    const delivered = invitations.filter(i => i.email_delivered_at).length;
    const opened = invitations.filter(i => i.email_opened_at).length;
    const clicked = invitations.filter(i => i.email_clicked_at).length;

    return {
      delivery_rate: sent ? ((delivered / sent) * 100).toFixed(1) + '%' : '0%',
      open_rate: delivered ? ((opened / delivered) * 100).toFixed(1) + '%' : '0%',
      click_rate: opened ? ((clicked / opened) * 100).toFixed(1) + '%' : '0%'
    };
  } catch (error) {
    console.error('Failed to get email metrics:', error);
    return null;
  }
}