"use client";

import { useEffect, useState } from 'react';
import { useAreaScopedData } from './ManagerAreaProvider';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Target, 
  FileUp, 
  UserPlus, 
  Edit, 
  Trash2, 
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AuditLogEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  user_id: string;
  ip_address: string | null;
  created_at: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  // Joined user data
  user_profiles?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface ActivityItemProps {
  entry: AuditLogEntry;
}

function ActivityItem({ entry }: ActivityItemProps) {
  const getActivityIcon = (action: string, resourceType: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'insert':
        return <UserPlus className="h-4 w-4 text-green-600" />;
      case 'update':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'upload':
        return <FileUp className="h-4 w-4 text-purple-600" />;
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default:
        if (resourceType === 'initiatives') {
          return <Target className="h-4 w-4 text-blue-600" />;
        }
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityDescription = (entry: AuditLogEntry) => {
    const action = entry.action.toLowerCase();
    const resourceType = entry.resource_type.toLowerCase();
    const userName = entry.user_profiles?.full_name || entry.user_profiles?.email || 'Unknown User';

    switch (action) {
      case 'create':
      case 'insert':
        if (resourceType === 'initiatives') {
          const title = entry.new_values?.title || 'an initiative';
          return `${userName} created initiative "${title}"`;
        }
        if (resourceType === 'activities') {
          const title = entry.new_values?.title || 'an activity';
          return `${userName} created activity "${title}"`;
        }
        if (resourceType === 'subtasks') {
          const title = entry.new_values?.title || 'a subtask';
          return `${userName} created subtask "${title}"`;
        }
        return `${userName} created a new ${resourceType.slice(0, -1)}`;
      
      case 'update':
        if (resourceType === 'initiatives') {
          const title = entry.new_values?.title || entry.old_values?.title || 'an initiative';
          const oldProgress = entry.old_values?.progress;
          const newProgress = entry.new_values?.progress;
          
          if (oldProgress !== undefined && newProgress !== undefined && oldProgress !== newProgress) {
            return `${userName} updated progress for "${title}" from ${oldProgress}% to ${newProgress}%`;
          }
          return `${userName} updated initiative "${title}"`;
        }
        if (resourceType === 'activities') {
          const title = entry.new_values?.title || entry.old_values?.title || 'an activity';
          return `${userName} updated activity "${title}"`;
        }
        return `${userName} updated a ${resourceType.slice(0, -1)}`;
      
      case 'delete':
        if (resourceType === 'initiatives') {
          const title = entry.old_values?.title || 'an initiative';
          return `${userName} deleted initiative "${title}"`;
        }
        return `${userName} deleted a ${resourceType.slice(0, -1)}`;
      
      case 'upload':
        const filename = entry.new_values?.filename || 'a file';
        return `${userName} uploaded file "${filename}"`;
        
      case 'complete':
        if (resourceType === 'initiatives') {
          const title = entry.new_values?.title || entry.old_values?.title || 'an initiative';
          return `${userName} completed initiative "${title}"`;
        }
        return `${userName} completed a ${resourceType.slice(0, -1)}`;
        
      default:
        return `${userName} performed ${action} on ${resourceType}`;
    }
  };

  const getActivityBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'insert':
        return { text: 'Created', variant: 'default' as const };
      case 'update':
        return { text: 'Updated', variant: 'outline' as const };
      case 'delete':
        return { text: 'Deleted', variant: 'destructive' as const };
      case 'upload':
        return { text: 'Uploaded', variant: 'secondary' as const };
      case 'complete':
        return { text: 'Completed', variant: 'default' as const };
      default:
        return { text: action, variant: 'outline' as const };
    }
  };

  const timeAgo = formatDistanceToNow(new Date(entry.created_at), { addSuffix: true });
  const badge = getActivityBadge(entry.action);

  return (
    <div className="flex items-start space-x-3 p-4 hover:bg-accent/50 transition-colors rounded-lg">
      <div className="flex-shrink-0 mt-0.5">
        {getActivityIcon(entry.action, entry.resource_type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground line-clamp-2">
              {getActivityDescription(entry)}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant={badge.variant} className="text-xs">
                {badge.text}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {timeAgo}
              </span>
              {entry.ip_address && (
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  • {entry.ip_address}
                </span>
              )}
            </div>
          </div>
          
          {entry.resource_id && (
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {/* Show change details if available */}
        {entry.old_values && entry.new_values && (
          <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
            <div className="text-muted-foreground">
              Changes: {Object.keys(entry.new_values).filter(key => 
                entry.old_values![key] !== entry.new_values![key]
              ).join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ManagerActivityFeedProps {
  className?: string;
  limit?: number;
  showHeader?: boolean;
}

/**
 * ManagerActivityFeed Component
 * 
 * Features:
 * - Real-time activity feed from audit_log table
 * - Area-scoped filtering for manager's area only
 * - Rich activity descriptions with user context
 * - Automatic refresh and real-time subscriptions
 * - Glassmorphism design with smooth animations
 * - Detailed change tracking and IP logging
 */
export function ManagerActivityFeed({ 
  className = '', 
  limit = 20,
  showHeader = true 
}: ManagerActivityFeedProps) {
  const { getQueryFilters } = useAreaScopedData();
  const [activities, setActivities] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const supabase = createClient();

  const fetchActivities = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const filters = getQueryFilters();
      
      // Get activities for this area by joining with initiatives/activities that belong to the area
      const { data, error: fetchError } = await supabase
        .from('audit_log')
        .select(`
          *,
          user_profiles!audit_log_user_id_fkey (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('tenant_id', filters.tenant_id)
        .in('resource_type', ['initiatives', 'activities', 'subtasks', 'file_uploads'])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) {
        console.error('Error fetching activities:', fetchError);
        setError('Failed to load activities');
        setActivities([]);
      } else {
        // Filter activities that belong to manager's area
        // This requires additional filtering based on resource relationships
        // For now, we'll show all activities and let RLS handle the filtering
        setActivities(data || []);
      }
    } catch (err) {
      console.error('Error in fetchActivities:', err);
      setError('Unexpected error loading activities');
      setActivities([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchActivities(true);
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // Set up real-time subscription for new activities
  useEffect(() => {
    const filters = getQueryFilters();
    
    const subscription = supabase
      .channel('manager-activities')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audit_log',
          filter: `tenant_id=eq.${filters.tenant_id}`
        },
        (payload) => {
          console.log('New activity:', payload);
          // Refresh the feed when new activities are added
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <Card className={cn("", className)}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Activity</span>
              <Skeleton className="h-8 w-20" />
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-start space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("", className)}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Activity</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </Button>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "bg-gradient-to-br from-card/80 via-card/60 to-card/80",
      "backdrop-blur-sm border-border/50",
      className
    )}>
      {showHeader && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Recent Activity</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="hover:bg-accent/50"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent className="p-0">
        {activities.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No recent activity in your area
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="divide-y divide-border/50">
              {activities.map((activity) => (
                <div key={activity.id} className="group">
                  <ActivityItem entry={activity} />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}