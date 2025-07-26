'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Users, 
  Activity, 
  AlertTriangle,
  TrendingUp,
  Shield,
  Clock,
  Database,
  RefreshCw
} from 'lucide-react';

interface DashboardStats {
  tenants: {
    total: number;
    active: number;
    inactive: number;
  };
  users: {
    total: number;
    by_role: Record<string, number>;
  };
  audit: {
    today: number;
    this_week: number;
    recent_actions: Array<{
      action: string;
      target_type: string;
      created_at: string;
      superadmin_name: string;
    }>;
  };
}

export default function SuperadminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [tenantsRes, usersRes, auditRes] = await Promise.all([
        fetch('/api/superadmin/tenants?limit=1000'),
        fetch('/api/superadmin/users?limit=1000'),
        fetch('/api/superadmin/audit?limit=50'),
      ]);

      const [tenantsData, usersData, auditData] = await Promise.all([
        tenantsRes.json(),
        usersRes.json(),
        auditRes.json(),
      ]);

      // Process tenant stats
      const tenantStats = {
        total: tenantsData.tenants?.length || 0,
        active: tenantsData.tenants?.filter((t: any) => t.is_active)?.length || 0,
        inactive: tenantsData.tenants?.filter((t: any) => !t.is_active)?.length || 0,
      };

      // Process user stats
      const userRoleCounts = (usersData.users || []).reduce((acc: Record<string, number>, user: any) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});

      const userStats = {
        total: usersData.users?.length || 0,
        by_role: userRoleCounts,
      };

      // Process audit stats
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const auditStats = {
        today: (auditData.audit_entries || []).filter((entry: any) => 
          entry.created_at.startsWith(today)
        ).length,
        this_week: (auditData.audit_entries || []).filter((entry: any) => 
          entry.created_at >= weekAgo
        ).length,
        recent_actions: (auditData.audit_entries || []).slice(0, 10).map((entry: any) => ({
          action: entry.action,
          target_type: entry.target_type,
          created_at: entry.created_at,
          superadmin_name: entry.superadmins?.name || 'Unknown',
        })),
      };

      setStats({
        tenants: tenantStats,
        users: userStats,
        audit: auditStats,
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInHours > 24) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours}h ago`;
    } else {
      return `${diffInMinutes}m ago`;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-green-500';
    if (action.includes('DELETE')) return 'bg-red-500';
    if (action.includes('UPDATE')) return 'bg-blue-500';
    if (action.includes('LOGIN')) return 'bg-purple-500';
    return 'bg-gray-500';
  };

  if (isLoading && !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-slate-600 rounded w-3/4"></div>
                  <div className="h-8 bg-slate-600 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Platform Overview</h2>
          <p className="text-slate-400">
            Monitor and manage all tenant organizations
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-slate-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            disabled={isLoading}
            className="border-slate-600"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Total Tenants</p>
                <p className="text-3xl font-bold text-white">{stats?.tenants.total || 0}</p>
                <div className="flex items-center mt-2 space-x-2">
                  <Badge variant="outline" className="text-green-400 border-green-400">
                    {stats?.tenants.active || 0} active
                  </Badge>
                  {(stats?.tenants.inactive || 0) > 0 && (
                    <Badge variant="outline" className="text-red-400 border-red-400">
                      {stats?.tenants.inactive} inactive
                    </Badge>
                  )}
                </div>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Total Users</p>
                <p className="text-3xl font-bold text-white">{stats?.users.total || 0}</p>
                <div className="flex items-center mt-2 space-x-1 text-xs">
                  {Object.entries(stats?.users.by_role || {}).map(([role, count]) => (
                    <Badge key={role} variant="secondary" className="text-xs">
                      {count} {role}
                    </Badge>
                  ))}
                </div>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Actions Today</p>
                <p className="text-3xl font-bold text-white">{stats?.audit.today || 0}</p>
                <p className="text-sm text-slate-400 mt-2">
                  {stats?.audit.this_week || 0} this week
                </p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">System Status</p>
                <div className="flex items-center mt-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <p className="text-sm text-green-400 font-medium">All Systems Operational</p>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Last check: {new Date().toLocaleTimeString()}
                </p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Clock className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.audit.recent_actions.map((action, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-slate-700/50">
                  <div className={`w-2 h-2 rounded-full ${getActionColor(action.action)}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {action.action.replace(/_/g, ' ').toLowerCase()}
                    </p>
                    <p className="text-xs text-slate-400">
                      by {action.superadmin_name} • {formatTimeAgo(action.created_at)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {action.target_type}
                  </Badge>
                </div>
              ))}
              {(!stats?.audit.recent_actions || stats.audit.recent_actions.length === 0) && (
                <p className="text-slate-400 text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <TrendingUp className="h-5 w-5 mr-2" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-slate-600 hover:bg-slate-700"
                onClick={() => window.location.href = '/superadmin/tenants'}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Manage Tenants
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-slate-600 hover:bg-slate-700"
                onClick={() => window.location.href = '/superadmin/users'}
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-slate-600 hover:bg-slate-700"
                onClick={() => window.location.href = '/superadmin/audit'}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                View Audit Log
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-slate-600 hover:bg-slate-700"
                onClick={() => window.location.href = '/superadmin/settings'}
              >
                <Database className="h-4 w-4 mr-2" />
                System Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}