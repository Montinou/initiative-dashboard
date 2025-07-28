"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Activity, 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  Clock,
  AlertCircle
} from 'lucide-react';
import { useRecentActivity, type AuditLogEntry } from '@/hooks/useAuditLog';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface RecentActivityFeedProps {
  limit?: number;
  className?: string;
}

export function RecentActivityFeed({ limit = 10, className }: RecentActivityFeedProps) {
  const { activities, loading, error } = useRecentActivity(limit);

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'insert':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'update':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'insert':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionText = (action: string, resourceType: string) => {
    const type = resourceType.toLowerCase();
    switch (action.toLowerCase()) {
      case 'create':
      case 'insert':
        return `creó ${type === 'initiative' ? 'una iniciativa' : 
                     type === 'area' ? 'un área' : 
                     type === 'subtask' ? 'una subtarea' : 
                     `un ${type}`}`;
      case 'update':
        return `actualizó ${type === 'initiative' ? 'una iniciativa' : 
                            type === 'area' ? 'un área' : 
                            type === 'subtask' ? 'una subtarea' : 
                            `un ${type}`}`;
      case 'delete':
        return `eliminó ${type === 'initiative' ? 'una iniciativa' : 
                          type === 'area' ? 'un área' : 
                          type === 'subtask' ? 'una subtarea' : 
                          `un ${type}`}`;
      default:
        return `realizó acción ${action} en ${type}`;
    }
  };

  const getResourceName = (entry: AuditLogEntry) => {
    if (entry.new_values?.title) return entry.new_values.title;
    if (entry.new_values?.name) return entry.new_values.name;
    if (entry.old_values?.title) return entry.old_values.title;
    if (entry.old_values?.name) return entry.old_values.name;
    return entry.resource_id.substring(0, 8) + '...';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No hay actividad reciente registrada.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              {/* User Avatar */}
              <Avatar className="w-8 h-8">
                <AvatarImage src={`https://avatar.vercel.sh/${activity.user_profiles?.email}`} />
                <AvatarFallback>
                  {activity.user_profiles?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              
              {/* Activity Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getActionIcon(activity.action)}
                  <Badge className={getActionColor(activity.action)}>
                    {activity.action}
                  </Badge>
                </div>
                
                <p className="text-sm">
                  <span className="font-medium">
                    {activity.user_profiles?.full_name || 'Usuario desconocido'}
                  </span>
                  {' '}
                  {getActionText(activity.action, activity.resource_type)}
                  {': '}
                  <span className="font-medium">
                    {getResourceName(activity)}
                  </span>
                </p>
                
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(new Date(activity.created_at), {
                      addSuffix: true,
                      locale: es
                    })}
                  </span>
                  {activity.ip_address && (
                    <>
                      <span>•</span>
                      <span>{activity.ip_address}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}