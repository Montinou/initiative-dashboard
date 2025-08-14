'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/utils/supabase/client';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { TrendingUp, Calendar, Users, Mail } from 'lucide-react';

interface InvitationAnalyticsProps {
  userProfile: any;
}

export default function InvitationAnalytics({ userProfile }: InvitationAnalyticsProps) {
  const [timeRange, setTimeRange] = useState('7days');
  const [analyticsData, setAnalyticsData] = useState<any>({
    timeline: [],
    roleDistribution: [],
    statusBreakdown: [],
    conversionFunnel: [],
    acceptanceRate: [],
    emailEngagement: []
  });
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '7days':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      // Fetch invitations data
      const { data: invitations, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // Process data for charts
      const processedData = processInvitationData(invitations || [], startDate, endDate);
      setAnalyticsData(processedData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processInvitationData = (invitations: any[], startDate: Date, endDate: Date) => {
    // Timeline data (invitations per day)
    const timeline: any[] = [];
    const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i <= dayCount; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const sent = invitations.filter(inv => 
        inv.created_at.startsWith(dateStr)
      ).length;
      
      const accepted = invitations.filter(inv => 
        inv.accepted_at && inv.accepted_at.startsWith(dateStr)
      ).length;
      
      timeline.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sent,
        accepted
      });
    }

    // Role distribution
    const roleCount: any = {};
    invitations.forEach(inv => {
      roleCount[inv.role] = (roleCount[inv.role] || 0) + 1;
    });
    
    const roleDistribution = Object.entries(roleCount).map(([role, count]) => ({
      name: role,
      value: count as number,
      percentage: Math.round(((count as number) / invitations.length) * 100)
    }));

    // Status breakdown
    const statusCount: any = {};
    invitations.forEach(inv => {
      const status = new Date(inv.expires_at) < new Date() && inv.status !== 'accepted' 
        ? 'expired' 
        : inv.status;
      statusCount[status] = (statusCount[status] || 0) + 1;
    });
    
    const statusBreakdown = Object.entries(statusCount).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count as number
    }));

    // Conversion funnel
    const sent = invitations.length;
    const delivered = invitations.filter(inv => inv.email_delivered_at).length;
    const opened = invitations.filter(inv => inv.email_opened_at).length;
    const clicked = invitations.filter(inv => inv.email_clicked_at).length;
    const accepted = invitations.filter(inv => inv.status === 'accepted').length;
    
    const conversionFunnel = [
      { stage: 'Sent', count: sent, percentage: 100 },
      { stage: 'Delivered', count: delivered, percentage: sent ? Math.round((delivered / sent) * 100) : 0 },
      { stage: 'Opened', count: opened, percentage: sent ? Math.round((opened / sent) * 100) : 0 },
      { stage: 'Clicked', count: clicked, percentage: sent ? Math.round((clicked / sent) * 100) : 0 },
      { stage: 'Accepted', count: accepted, percentage: sent ? Math.round((accepted / sent) * 100) : 0 }
    ];

    // Acceptance rate over time
    const acceptanceRate = timeline.map(day => ({
      date: day.date,
      rate: day.sent > 0 ? Math.round((day.accepted / day.sent) * 100) : 0
    }));

    // Email engagement metrics
    const emailEngagement = [
      { metric: 'Delivery Rate', value: sent ? Math.round((delivered / sent) * 100) : 0 },
      { metric: 'Open Rate', value: delivered ? Math.round((opened / delivered) * 100) : 0 },
      { metric: 'Click Rate', value: opened ? Math.round((clicked / opened) * 100) : 0 },
      { metric: 'Acceptance Rate', value: sent ? Math.round((accepted / sent) * 100) : 0 }
    ];

    return {
      timeline,
      roleDistribution,
      statusBreakdown,
      conversionFunnel,
      acceptanceRate,
      emailEngagement
    };
  };

  const COLORS = [
    'hsl(var(--primary))',     // Verde corporativo Siga
    'hsl(var(--accent))',      // Amarillo corporativo Siga
    'hsl(var(--secondary))',   // Color secundario
    'hsl(var(--muted))',       // Color muted
    'hsl(var(--destructive))'  // Color destructivo
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <Tabs value={timeRange} onValueChange={setTimeRange}>
          <TabsList>
            <TabsTrigger value="7days">Last 7 Days</TabsTrigger>
            <TabsTrigger value="30days">Last 30 Days</TabsTrigger>
            <TabsTrigger value="90days">Last 90 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Invitation Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Invitation Timeline
            </CardTitle>
            <CardDescription>Invitations sent and accepted over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analyticsData.timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="sent" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                <Area type="monotone" dataKey="accepted" stackId="2" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Role Distribution
            </CardTitle>
            <CardDescription>Breakdown of invitations by role</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.roleDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.percentage}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {analyticsData.roleDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Conversion Funnel
            </CardTitle>
            <CardDescription>Email engagement to acceptance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.conversionFunnel} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))">
                  {analyticsData.conversionFunnel.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Email Engagement Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Email Engagement
            </CardTitle>
            <CardDescription>Performance metrics for invitation emails</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.emailEngagement.map((metric: any) => (
                <div key={metric.metric} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{metric.metric}</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-muted rounded-full h-2 mr-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${metric.value}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-12 text-right">
                      {metric.value}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Status Overview</CardTitle>
          <CardDescription>Current status of all invitations</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analyticsData.statusBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))">
                {analyticsData.statusBreakdown.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}