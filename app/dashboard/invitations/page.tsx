/**
 * Invitation Management Dashboard
 * Role-specific dashboard for managing invitations (CEO/Admin only)
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getUserProfile } from '@/lib/server-user-profile';
import InvitationDashboard from '@/components/invitations/InvitationDashboard';

export default async function InvitationsPage() {
  const supabase = await createClient();
  
  // Get authenticated user and profile
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    redirect('/login');
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select(`
      *,
      tenant:tenants!user_profiles_tenant_id_fkey(
        id,
        subdomain,
        organization:organizations!tenants_organization_id_fkey(
          id,
          name,
          logo_url,
          primary_color,
          secondary_color
        )
      ),
      area:areas!user_profiles_area_id_fkey(
        id,
        name
      )
    `)
    .eq('user_id', user.id)
    .single();

  if (profileError || !userProfile) {
    redirect('/dashboard');
  }

  // Check permissions - only CEO and Admin can access
  if (!['CEO', 'Admin'].includes(userProfile.role)) {
    redirect('/dashboard');
  }

  // Fetch invitation statistics
  const [
    totalInvitations,
    pendingInvitations,
    acceptedInvitations,
    expiredInvitations,
    recentInvitations,
    topInviters
  ] = await Promise.all([
    // Total invitations
    supabase
      .from('invitations')
      .select('id', { count: 'exact', head: true }),
    
    // Pending invitations
    supabase
      .from('invitations')
      .select('id', { count: 'exact', head: true })
      .in('status', ['sent', 'pending']),
    
    // Accepted invitations
    supabase
      .from('invitations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'accepted'),
    
    // Expired invitations
    supabase
      .from('invitations')
      .select('id', { count: 'exact', head: true })
      .in('status', ['sent', 'pending'])
      .lt('expires_at', new Date().toISOString()),
    
    // Recent invitations (last 5)
    supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        status,
        created_at,
        accepted_at,
        sender:user_profiles!invitations_sent_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5),
    
    // Top inviters
    supabase
      .from('invitations')
      .select('sent_by')
      .then(async (result) => {
        if (!result.data) return [];
        
        // Count invitations per user
        const counts = result.data.reduce((acc: any, inv: any) => {
          acc[inv.sent_by] = (acc[inv.sent_by] || 0) + 1;
          return acc;
        }, {});
        
        // Get top 3 inviters
        const topIds = Object.entries(counts)
          .sort(([, a]: any, [, b]: any) => b - a)
          .slice(0, 3)
          .map(([id]) => id);
        
        if (topIds.length === 0) return [];
        
        // Fetch user details
        const { data: users } = await supabase
          .from('user_profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', topIds);
        
        return users?.map(user => ({
          ...user,
          invitation_count: counts[user.id]
        })) || [];
      })
  ]);

  // Calculate statistics
  const stats = {
    total: totalInvitations.count || 0,
    pending: pendingInvitations.count || 0,
    accepted: acceptedInvitations.count || 0,
    expired: expiredInvitations.count || 0,
    acceptanceRate: totalInvitations.count 
      ? Math.round(((acceptedInvitations.count || 0) / totalInvitations.count) * 100)
      : 0
  };

  // Fetch areas for filtering
  const { data: areas } = await supabase
    .from('areas')
    .select('id, name')
    
    .eq('is_active', true)
    .order('name');

  return (
    <InvitationDashboard
      userProfile={userProfile}
      stats={stats}
      recentInvitations={recentInvitations.data || []}
      topInviters={topInviters || []}
      areas={areas || []}
      activeBatches={[]}
    />
  );
}