import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { format } from 'date-fns';

// GET - Export invitation analytics in various formats
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Only CEOs and Admins can export analytics
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const exportFormat = searchParams.get('format') || 'json'; // json, csv, excel
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const includeDetails = searchParams.get('includeDetails') === 'true';

    // Build query
    let query = supabase
      .from('invitations')
      .select(`
        *,
        sent_by:user_profiles!invitations_sent_by_fkey(full_name, email),
        accepted_by:user_profiles!invitations_accepted_by_fkey(full_name, email),
        area:areas(name)
      `)
      
      .order('created_at', { ascending: false });

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data: invitations, error: invError } = await query;

    if (invError) {
      console.error('Failed to fetch invitations:', invError);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    // Calculate analytics
    const analytics = calculateAnalytics(invitations || []);

    // Format based on requested type
    switch (exportFormat) {
      case 'csv':
        return exportAsCSV(analytics, invitations || [], includeDetails);
      
      case 'excel':
        return exportAsExcel(analytics, invitations || [], includeDetails);
      
      case 'json':
      default:
        return NextResponse.json({
          success: true,
          exportDate: new Date().toISOString(),
          tenant: userProfile.tenant_id,
          period: {
            from: dateFrom || 'all-time',
            to: dateTo || 'current'
          },
          analytics,
          ...(includeDetails && { invitations })
        });
    }

  } catch (error: any) {
    console.error('Analytics export error:', error);
    return NextResponse.json(
      { error: 'Failed to export analytics', details: error.message },
      { status: 500 }
    );
  }
}

// Calculate comprehensive analytics
function calculateAnalytics(invitations: any[]) {
  const total = invitations.length;
  const accepted = invitations.filter(i => i.status === 'accepted').length;
  const pending = invitations.filter(i => i.status === 'sent' && new Date(i.expires_at) > new Date()).length;
  const expired = invitations.filter(i => new Date(i.expires_at) < new Date() && i.status !== 'accepted').length;
  const cancelled = invitations.filter(i => i.status === 'cancelled').length;

  // Email engagement metrics
  const delivered = invitations.filter(i => i.email_delivered_at).length;
  const opened = invitations.filter(i => i.email_opened_at).length;
  const clicked = invitations.filter(i => i.email_clicked_at).length;

  // Role distribution
  const roleDistribution: Record<string, number> = {};
  invitations.forEach(inv => {
    roleDistribution[inv.role] = (roleDistribution[inv.role] || 0) + 1;
  });

  // Area distribution
  const areaDistribution: Record<string, number> = {};
  invitations.forEach(inv => {
    const areaName = inv.area?.name || 'No Area';
    areaDistribution[areaName] = (areaDistribution[areaName] || 0) + 1;
  });

  // Time to acceptance (for accepted invitations)
  const acceptanceTimes = invitations
    .filter(i => i.accepted_at)
    .map(i => {
      const created = new Date(i.created_at);
      const accepted = new Date(i.accepted_at);
      return (accepted.getTime() - created.getTime()) / (1000 * 60 * 60); // in hours
    });

  const avgAcceptanceTime = acceptanceTimes.length > 0
    ? acceptanceTimes.reduce((a, b) => a + b, 0) / acceptanceTimes.length
    : 0;

  // Sender statistics
  const senderStats: Record<string, number> = {};
  invitations.forEach(inv => {
    const sender = inv.sent_by?.email || 'Unknown';
    senderStats[sender] = (senderStats[sender] || 0) + 1;
  });

  // Monthly trends
  const monthlyTrends: Record<string, { sent: number; accepted: number }> = {};
  invitations.forEach(inv => {
    const month = format(new Date(inv.created_at), 'yyyy-MM');
    if (!monthlyTrends[month]) {
      monthlyTrends[month] = { sent: 0, accepted: 0 };
    }
    monthlyTrends[month].sent++;
    if (inv.status === 'accepted') {
      monthlyTrends[month].accepted++;
    }
  });

  return {
    summary: {
      total,
      accepted,
      pending,
      expired,
      cancelled,
      acceptanceRate: total > 0 ? ((accepted / total) * 100).toFixed(2) + '%' : '0%'
    },
    engagement: {
      delivered,
      deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(2) + '%' : '0%',
      opened,
      openRate: delivered > 0 ? ((opened / delivered) * 100).toFixed(2) + '%' : '0%',
      clicked,
      clickRate: opened > 0 ? ((clicked / opened) * 100).toFixed(2) + '%' : '0%'
    },
    conversion: {
      sentToAccepted: total > 0 ? ((accepted / total) * 100).toFixed(2) + '%' : '0%',
      openedToAccepted: opened > 0 ? ((accepted / opened) * 100).toFixed(2) + '%' : '0%',
      clickedToAccepted: clicked > 0 ? ((accepted / clicked) * 100).toFixed(2) + '%' : '0%',
      avgAcceptanceTimeHours: avgAcceptanceTime.toFixed(2)
    },
    distribution: {
      byRole: roleDistribution,
      byArea: areaDistribution,
      topSenders: Object.entries(senderStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([email, count]) => ({ email, count }))
    },
    trends: {
      monthly: monthlyTrends
    }
  };
}

// Export as CSV
function exportAsCSV(analytics: any, invitations: any[], includeDetails: boolean) {
  let csv = 'Invitation Analytics Export\n';
  csv += `Export Date: ${format(new Date(), 'PPP')}\n\n`;

  // Summary section
  csv += 'SUMMARY\n';
  csv += 'Metric,Value\n';
  csv += `Total Invitations,${analytics.summary.total}\n`;
  csv += `Accepted,${analytics.summary.accepted}\n`;
  csv += `Pending,${analytics.summary.pending}\n`;
  csv += `Expired,${analytics.summary.expired}\n`;
  csv += `Cancelled,${analytics.summary.cancelled}\n`;
  csv += `Acceptance Rate,${analytics.summary.acceptanceRate}\n\n`;

  // Engagement section
  csv += 'EMAIL ENGAGEMENT\n';
  csv += 'Metric,Count,Rate\n';
  csv += `Delivered,${analytics.engagement.delivered},${analytics.engagement.deliveryRate}\n`;
  csv += `Opened,${analytics.engagement.opened},${analytics.engagement.openRate}\n`;
  csv += `Clicked,${analytics.engagement.clicked},${analytics.engagement.clickRate}\n\n`;

  // Conversion section
  csv += 'CONVERSION METRICS\n';
  csv += 'Metric,Value\n';
  csv += `Sent to Accepted,${analytics.conversion.sentToAccepted}\n`;
  csv += `Opened to Accepted,${analytics.conversion.openedToAccepted}\n`;
  csv += `Clicked to Accepted,${analytics.conversion.clickedToAccepted}\n`;
  csv += `Avg Acceptance Time (hours),${analytics.conversion.avgAcceptanceTimeHours}\n\n`;

  // Role distribution
  csv += 'ROLE DISTRIBUTION\n';
  csv += 'Role,Count\n';
  Object.entries(analytics.distribution.byRole).forEach(([role, count]) => {
    csv += `${role},${count}\n`;
  });
  csv += '\n';

  // Top senders
  csv += 'TOP SENDERS\n';
  csv += 'Email,Invitations Sent\n';
  analytics.distribution.topSenders.forEach((sender: any) => {
    csv += `${sender.email},${sender.count}\n`;
  });
  csv += '\n';

  // Detailed invitations list if requested
  if (includeDetails && invitations.length > 0) {
    csv += 'INVITATION DETAILS\n';
    csv += 'Email,Role,Area,Status,Sent By,Created At,Accepted At,Opened,Clicked\n';
    invitations.forEach(inv => {
      csv += `${inv.email},`;
      csv += `${inv.role},`;
      csv += `${inv.area?.name || 'N/A'},`;
      csv += `${inv.status},`;
      csv += `${inv.sent_by?.email || 'N/A'},`;
      csv += `${format(new Date(inv.created_at), 'yyyy-MM-dd HH:mm')},`;
      csv += `${inv.accepted_at ? format(new Date(inv.accepted_at), 'yyyy-MM-dd HH:mm') : 'N/A'},`;
      csv += `${inv.email_opened_at ? 'Yes' : 'No'},`;
      csv += `${inv.email_clicked_at ? 'Yes' : 'No'}\n`;
    });
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="invitation-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv"`
    }
  });
}

// Export as Excel (simplified - returns structured JSON for Excel conversion)
function exportAsExcel(analytics: any, invitations: any[], includeDetails: boolean) {
  const excelData = {
    sheets: [
      {
        name: 'Summary',
        data: [
          ['Invitation Analytics Export'],
          [`Export Date: ${format(new Date(), 'PPP')}`],
          [],
          ['Metric', 'Value'],
          ['Total Invitations', analytics.summary.total],
          ['Accepted', analytics.summary.accepted],
          ['Pending', analytics.summary.pending],
          ['Expired', analytics.summary.expired],
          ['Cancelled', analytics.summary.cancelled],
          ['Acceptance Rate', analytics.summary.acceptanceRate]
        ]
      },
      {
        name: 'Engagement',
        data: [
          ['Email Engagement Metrics'],
          [],
          ['Metric', 'Count', 'Rate'],
          ['Delivered', analytics.engagement.delivered, analytics.engagement.deliveryRate],
          ['Opened', analytics.engagement.opened, analytics.engagement.openRate],
          ['Clicked', analytics.engagement.clicked, analytics.engagement.clickRate]
        ]
      },
      {
        name: 'Distribution',
        data: [
          ['Role Distribution'],
          ['Role', 'Count'],
          ...Object.entries(analytics.distribution.byRole).map(([role, count]) => [role, count])
        ]
      }
    ]
  };

  if (includeDetails) {
    excelData.sheets.push({
      name: 'Details',
      data: [
        ['Email', 'Role', 'Area', 'Status', 'Sent By', 'Created At', 'Accepted At'],
        ...invitations.map(inv => [
          inv.email,
          inv.role,
          inv.area?.name || 'N/A',
          inv.status,
          inv.sent_by?.email || 'N/A',
          format(new Date(inv.created_at), 'yyyy-MM-dd HH:mm'),
          inv.accepted_at ? format(new Date(inv.accepted_at), 'yyyy-MM-dd HH:mm') : 'N/A'
        ])
      ]
    });
  }

  return NextResponse.json({
    success: true,
    format: 'excel-json',
    data: excelData,
    message: 'Excel data structure returned. Use a library like xlsx to convert to Excel file.'
  });
}