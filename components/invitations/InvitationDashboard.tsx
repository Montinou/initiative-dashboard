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
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('invitations');
  
  // Add null check for userProfile
  if (!userProfile || !userProfile.tenant_id) {
    console.error('InvitationDashboard: Invalid userProfile', userProfile);
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t('dashboard.unableToLoad')}</p>
      </div>
    );
  }
  
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
          filter: `tenant_id=eq.${userProfile?.tenant_id}`
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
          title: t('dashboard.realtime.newInvitation'),
          description: t('dashboard.realtime.invitationSentTo', { email: payload.new.email }),
        });
      } else if (payload.new.status === 'accepted' && payload.old?.status !== 'accepted') {
        toast({
          title: t('dashboard.realtime.invitationAccepted'),
          description: t('dashboard.realtime.acceptedBy', { email: payload.new.email }),
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
        title: t('export.success'),
        description: t('export.successDesc'),
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: t('export.failed'),
        description: t('export.failedDesc'),
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
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">
            {t('dashboard.description', { organization: userProfile.tenant?.organization?.name })}
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
            {t('dashboard.refresh')}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
          >
            <Download className="w-4 h-4 mr-2" />
            {t('dashboard.export')}
          </Button>
          
          <Button
            onClick={() => setShowBulkInvite(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('dashboard.inviteUsers')}
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
          <TabsTrigger value="overview">{t('dashboard.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="invitations">{t('dashboard.tabs.invitations')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('dashboard.tabs.analytics')}</TabsTrigger>
          <TabsTrigger value="activity">{t('dashboard.tabs.activity')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Invitations */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.recentInvitations.title')}</CardTitle>
                <CardDescription>{t('dashboard.recentInvitations.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <RecentActivity 
                  userProfile={userProfile}
                  limit={5}
                />
              </CardContent>
            </Card>

            {/* Top Inviters */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.topInviters.title')}</CardTitle>
                <CardDescription>{t('dashboard.topInviters.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topInviters.map((inviter: any, index: number) => (
                    <div key={inviter.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full 
                          ${index === 0 ? 'bg-accent text-accent-foreground' : 
                            index === 1 ? 'bg-secondary text-secondary-foreground' : 
                            'bg-muted text-muted-foreground'} 
                          flex items-center justify-center font-bold text-sm`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{inviter.full_name || inviter.email}</p>
                          <p className="text-sm text-muted-foreground">{inviter.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{inviter.invitation_count}</p>
                        <p className="text-xs text-muted-foreground">{t('dashboard.topInviters.invitations')}</p>
                      </div>
                    </div>
                  ))}
                  {topInviters.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t('dashboard.topInviters.noData')}
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
                <CardTitle>{t('dashboard.activeBatches.title')}</CardTitle>
                <CardDescription>{t('dashboard.activeBatches.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeBatches.map((batch: any) => (
                    <div key={batch.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{batch.batch_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('dashboard.activeBatches.by')} {batch.creator?.full_name || batch.creator?.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {batch.sent_count}/{batch.total_count} {t('dashboard.activeBatches.sent')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {batch.accepted_count} {t('dashboard.activeBatches.accepted')}
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
              <CardTitle>{t('dashboard.activityLog.title')}</CardTitle>
              <CardDescription>{t('dashboard.activityLog.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivity 
                userProfile={userProfile}
                limit={20}
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