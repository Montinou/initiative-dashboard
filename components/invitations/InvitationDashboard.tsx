'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import InvitationStats from './InvitationStats';
import InvitationTable from './InvitationTable';
import QuickInviteCards from './QuickInviteCards';
import BulkInviteModal from './BulkInviteModal';
import InvitationAnalytics from './InvitationAnalytics';
import RecentActivity from './RecentActivity';
import { createClient } from '@/utils/supabase/client';
import { Plus, Download, RefreshCw, Users } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface InvitationDashboardProps {
  userProfile: any;
  stats: {
    total: number;
    pending: number;
    accepted: number;
    expired: number;
    acceptanceRate: number;
  };
  recentInvitations: any[];
  topInviters: any[];
  areas: any[];
  activeBatches: any[];
}

export default function InvitationDashboard({
  userProfile,
  stats: initialStats,
  recentInvitations: initialRecent,
  topInviters,
  areas,
  activeBatches: initialBatches
}: InvitationDashboardProps) {
  const [stats, setStats] = useState(initialStats);
  const [recentInvitations, setRecentInvitations] = useState(initialRecent);
  const [activeBatches, setActiveBatches] = useState(initialBatches);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  
  const supabase = createClient();
  const isCEO = userProfile.role === 'CEO';

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('invitations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invitations',
          filter: `tenant_id=eq.${userProfile.tenant_id}`
        },
        (payload) => {
          handleRealtimeUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.tenant_id]);

  const handleRealtimeUpdate = async (payload: any) => {
    // Refresh stats when invitation changes
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      await refreshStats();
      
      // Show toast notification
      if (payload.eventType === 'INSERT') {
        toast({
          title: 'New Invitation Sent',
          description: `Invitation sent to ${payload.new.email}`,
        });
      } else if (payload.new.status === 'accepted' && payload.old?.status !== 'accepted') {
        toast({
          title: 'Invitation Accepted',
          description: `${payload.new.email} has accepted their invitation`,
          variant: 'success',
        });
      }
    }
  };

  const refreshStats = async () => {
    setIsRefreshing(true);
    try {
      // Fetch updated statistics
      const [
        totalRes,
        pendingRes,
        acceptedRes,
        expiredRes,
        recentRes
      ] = await Promise.all([
        supabase
          .from('invitations')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', userProfile.tenant_id),
        
        supabase
          .from('invitations')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', userProfile.tenant_id)
          .in('status', ['sent', 'pending']),
        
        supabase
          .from('invitations')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', userProfile.tenant_id)
          .eq('status', 'accepted'),
        
        supabase
          .from('invitations')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', userProfile.tenant_id)
          .in('status', ['sent', 'pending'])
          .lt('expires_at', new Date().toISOString()),
        
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
          .eq('tenant_id', userProfile.tenant_id)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const newStats = {
        total: totalRes.count || 0,
        pending: pendingRes.count || 0,
        accepted: acceptedRes.count || 0,
        expired: expiredRes.count || 0,
        acceptanceRate: totalRes.count 
          ? Math.round(((acceptedRes.count || 0) / totalRes.count) * 100)
          : 0
      };

      setStats(newStats);
      setRecentInvitations(recentRes.data || []);
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleExportData = async () => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          email,
          role,
          status,
          created_at,
          accepted_at,
          expires_at,
          sender:user_profiles!invitations_sent_by_fkey(
            full_name,
            email
          ),
          area:areas!invitations_area_id_fkey(
            name
          )
        `)
        .eq('tenant_id', userProfile.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const csv = convertToCSV(data);
      
      // Download file
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invitations-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: 'Invitations data has been exported to CSV',
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export invitations data',
        variant: 'destructive',
      });
    }
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = ['Email', 'Role', 'Status', 'Area', 'Invited By', 'Invited By Email', 'Created At', 'Accepted At', 'Expires At'];
    const rows = data.map(item => [
      item.email,
      item.role,
      item.status,
      item.area?.name || '',
      item.sender?.full_name || '',
      item.sender?.email || '',
      item.created_at,
      item.accepted_at || '',
      item.expires_at
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invitation Management</h1>
          <p className="text-muted-foreground">
            Manage and track invitations for {userProfile.tenant?.organization?.name}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStats}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <Button
            onClick={() => setShowBulkInvite(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Invite Users
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <InvitationStats stats={stats} />

      {/* Quick Invite Cards (CEO only gets all roles, Admin gets limited) */}
      {isCEO ? (
        <QuickInviteCards 
          userProfile={userProfile}
          areas={areas}
          allowedRoles={['CEO', 'Admin', 'Manager']}
          onInviteSent={refreshStats}
        />
      ) : (
        <QuickInviteCards 
          userProfile={userProfile}
          areas={areas}
          allowedRoles={['Admin', 'Manager']}
          onInviteSent={refreshStats}
        />
      )}

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invitations">All Invitations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Invitations */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Invitations</CardTitle>
                <CardDescription>Latest invitations sent</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentActivity 
                  activities={recentInvitations}
                  type="invitations"
                />
              </CardContent>
            </Card>

            {/* Top Inviters */}
            <Card>
              <CardHeader>
                <CardTitle>Top Inviters</CardTitle>
                <CardDescription>Most active invitation senders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topInviters.map((inviter: any, index: number) => (
                    <div key={inviter.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br 
                          ${index === 0 ? 'from-yellow-400 to-yellow-600' : 
                            index === 1 ? 'from-gray-300 to-gray-500' : 
                            'from-orange-400 to-orange-600'} 
                          flex items-center justify-center text-white font-bold text-sm`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{inviter.full_name || inviter.email}</p>
                          <p className="text-sm text-muted-foreground">{inviter.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{inviter.invitation_count}</p>
                        <p className="text-xs text-muted-foreground">invitations</p>
                      </div>
                    </div>
                  ))}
                  {topInviters.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No invitation data yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Batches */}
          {activeBatches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Active Bulk Invitations</CardTitle>
                <CardDescription>Ongoing bulk invitation batches</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeBatches.map((batch: any) => (
                    <div key={batch.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{batch.batch_name}</p>
                        <p className="text-sm text-muted-foreground">
                          By {batch.creator?.full_name || batch.creator?.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {batch.sent_count}/{batch.total_count} sent
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {batch.accepted_count} accepted
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="invitations">
          <InvitationTable 
            userProfile={userProfile}
            areas={areas}
            onRefresh={refreshStats}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <InvitationAnalytics 
            userProfile={userProfile}
          />
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Invitation Activity Log</CardTitle>
              <CardDescription>Complete history of invitation events</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivity 
                activities={[]}
                type="all"
                showFullHistory
                tenantId={userProfile.tenant_id}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Invite Modal */}
      <BulkInviteModal
        open={showBulkInvite}
        onClose={() => setShowBulkInvite(false)}
        userProfile={userProfile}
        areas={areas}
        maxInvites={isCEO ? 100 : 50}
        onSuccess={refreshStats}
      />
    </div>
  );
}