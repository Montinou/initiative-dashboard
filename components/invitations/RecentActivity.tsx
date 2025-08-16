'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import {
  Mail,
  UserPlus,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  AlertCircle,
  Send,
  Eye,
  MousePointer,
  Users
} from 'lucide-react';

interface RecentActivityProps {
  userProfile: any;
  limit?: number;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  metadata?: any;
  icon: any;
  color: string;
}

export default function RecentActivity({ userProfile, limit = 20 }: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();
  
  // Add null check for userProfile
  if (!userProfile || !userProfile.tenant_id) {
    console.error('RecentActivity: Invalid userProfile', userProfile);
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Unable to load activity. Please refresh the page.
      </div>
    );
  }

  useEffect(() => {
    fetchActivities();
    subscribeToChanges();
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      // Fetch recent invitation events
      const { data: invitations, error: invError } = await supabase
        .from('invitations')
        .select(`
          *,
          sent_by:user_profiles!invitations_sent_by_fkey(id, full_name, email, avatar_url),
          accepted_by:user_profiles!invitations_accepted_by_fkey(id, full_name, email, avatar_url),
          area:areas(name)
        `)
        
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (invError) throw invError;

      // Fetch recent invitation batch operations
      // NOTE: invitation_batches table doesn't exist yet - commenting out for now
      // const { data: batches, error: batchError } = await supabase
      //   .from('invitation_batches')
      //   .select(`
      //     *,
      //     created_by:user_profiles(id, full_name, email, avatar_url)
      //   `)
      //   
      //   .order('created_at', { ascending: false })
      //   .limit(5);

      // if (batchError) console.error('Batch fetch error:', batchError);

      // Process activities - pass empty array for batches until table is created
      const processedActivities = processInvitationActivities(invitations || [], []);
      setActivities(processedActivities);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel('activity-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invitations',
          filter: `tenant_id=eq.${userProfile.tenant_id}`
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const processInvitationActivities = (invitations: any[], batches: any[]): ActivityItem[] => {
    const activities: ActivityItem[] = [];

    // Process invitation events
    invitations.forEach(inv => {
      // Invitation sent
      if (inv.created_at) {
        activities.push({
          id: `${inv.id}-sent`,
          type: 'invitation_sent',
          title: 'Invitation Sent',
          description: `Invitation sent to ${inv.email} as ${inv.role}${inv.area ? ` for ${inv.area.name}` : ''}`,
          timestamp: inv.created_at,
          user: {
            id: inv.sent_by?.id || '',
            name: inv.sent_by?.full_name || 'System',
            email: inv.sent_by?.email || '',
            avatar: inv.sent_by?.avatar_url
          },
          metadata: { role: inv.role, area: inv.area?.name },
          icon: Send,
          color: 'text-blue-600'
        });
      }

      // Email delivered
      if (inv.email_delivered_at) {
        activities.push({
          id: `${inv.id}-delivered`,
          type: 'email_delivered',
          title: 'Email Delivered',
          description: `Invitation email delivered to ${inv.email}`,
          timestamp: inv.email_delivered_at,
          user: {
            id: 'system',
            name: 'Email System',
            email: 'system'
          },
          icon: Mail,
          color: 'text-green-600'
        });
      }

      // Email opened
      if (inv.email_opened_at) {
        activities.push({
          id: `${inv.id}-opened`,
          type: 'email_opened',
          title: 'Email Opened',
          description: `${inv.email} opened the invitation email`,
          timestamp: inv.email_opened_at,
          user: {
            id: inv.id,
            name: inv.email,
            email: inv.email
          },
          icon: Eye,
          color: 'text-purple-600'
        });
      }

      // Link clicked
      if (inv.email_clicked_at) {
        activities.push({
          id: `${inv.id}-clicked`,
          type: 'link_clicked',
          title: 'Invitation Link Clicked',
          description: `${inv.email} clicked the invitation link`,
          timestamp: inv.email_clicked_at,
          user: {
            id: inv.id,
            name: inv.email,
            email: inv.email
          },
          icon: MousePointer,
          color: 'text-indigo-600'
        });
      }

      // Invitation accepted
      if (inv.accepted_at && inv.accepted_by) {
        activities.push({
          id: `${inv.id}-accepted`,
          type: 'invitation_accepted',
          title: 'Invitation Accepted',
          description: `${inv.accepted_by.full_name || inv.email} joined as ${inv.role}${inv.area ? ` in ${inv.area.name}` : ''}`,
          timestamp: inv.accepted_at,
          user: {
            id: inv.accepted_by.id,
            name: inv.accepted_by.full_name || inv.email,
            email: inv.accepted_by.email || inv.email,
            avatar: inv.accepted_by.avatar_url
          },
          metadata: { role: inv.role, area: inv.area?.name },
          icon: CheckCircle,
          color: 'text-green-600'
        });
      }

      // Invitation expired
      if (new Date(inv.expires_at) < new Date() && inv.status !== 'accepted' && inv.status !== 'cancelled') {
        activities.push({
          id: `${inv.id}-expired`,
          type: 'invitation_expired',
          title: 'Invitation Expired',
          description: `Invitation to ${inv.email} has expired`,
          timestamp: inv.expires_at,
          user: {
            id: 'system',
            name: 'System',
            email: 'system'
          },
          icon: Clock,
          color: 'text-orange-600'
        });
      }

      // Reminder sent
      if (inv.last_reminder_sent) {
        activities.push({
          id: `${inv.id}-reminder`,
          type: 'reminder_sent',
          title: 'Reminder Sent',
          description: `Reminder #${inv.reminder_count} sent to ${inv.email}`,
          timestamp: inv.last_reminder_sent,
          user: {
            id: 'system',
            name: 'System',
            email: 'system'
          },
          metadata: { reminderCount: inv.reminder_count },
          icon: RefreshCw,
          color: 'text-blue-600'
        });
      }
    });

    // Process batch operations
    batches.forEach(batch => {
      if (batch.created_at) {
        activities.push({
          id: `batch-${batch.id}`,
          type: 'batch_invitation',
          title: 'Bulk Invitations Sent',
          description: `${batch.total_count} invitations sent in batch "${batch.name}"`,
          timestamp: batch.created_at,
          user: {
            id: batch.created_by?.id || '',
            name: batch.created_by?.full_name || 'System',
            email: batch.created_by?.email || '',
            avatar: batch.created_by?.avatar_url
          },
          metadata: { 
            totalCount: batch.total_count,
            successCount: batch.success_count,
            failureCount: batch.failure_count
          },
          icon: Users,
          color: 'text-purple-600'
        });
      }
    });

    // Sort by timestamp (most recent first)
    return activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, limit);
  };

  const getActivityIcon = (activity: ActivityItem) => {
    const Icon = activity.icon;
    return (
      <div className={`p-2 rounded-full bg-muted/50 ${activity.color}`}>
        <Icon className="w-4 h-4" />
      </div>
    );
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Loading activity feed...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Latest invitation events and actions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex gap-4 pb-4 border-b last:border-0">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.description}
                        </p>
                        
                        {/* Metadata badges */}
                        {activity.metadata && (
                          <div className="flex gap-2 mt-2">
                            {activity.metadata.role && (
                              <Badge variant="outline" className="text-xs">
                                {activity.metadata.role}
                              </Badge>
                            )}
                            {activity.metadata.area && (
                              <Badge variant="outline" className="text-xs">
                                {activity.metadata.area}
                              </Badge>
                            )}
                            {activity.metadata.totalCount && (
                              <Badge variant="outline" className="text-xs">
                                {activity.metadata.totalCount} invitations
                              </Badge>
                            )}
                            {activity.metadata.reminderCount && (
                              <Badge variant="outline" className="text-xs">
                                Reminder #{activity.metadata.reminderCount}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Timestamp */}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    
                    {/* User info */}
                    {activity.user.id !== 'system' && (
                      <div className="flex items-center gap-2 mt-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={activity.user.avatar} />
                          <AvatarFallback className="text-xs">
                            {getUserInitials(activity.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {activity.user.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}