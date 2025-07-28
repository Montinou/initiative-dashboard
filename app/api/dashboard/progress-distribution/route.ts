import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { authenticateUser } from '@/lib/auth-utils';
import { getThemeFromDomain } from '@/lib/theme-config';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode });
    }

    const currentUser = authResult.user!;

    // Create Supabase client
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Get domain-based tenant ID
    const host = request.headers.get('host') || '';
    const domainTheme = await getThemeFromDomain(host);
    const tenantId = domainTheme.tenantId;

    // Fetch all initiatives for the tenant
    const { data: initiatives, error } = await supabase
      .from('initiatives')
      .select('progress')
      .eq('tenant_id', tenantId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch initiatives', details: error.message },
        { status: 500 }
      );
    }

    // Calculate progress distribution
    const ranges = [
      { min: 0, max: 25, label: '0-25%' },
      { min: 26, max: 50, label: '26-50%' },
      { min: 51, max: 75, label: '51-75%' },
      { min: 76, max: 100, label: '76-100%' }
    ];

    const distribution = ranges.map(range => {
      const count = initiatives.filter(initiative => 
        initiative.progress >= range.min && initiative.progress <= range.max
      ).length;
      
      const percentage = initiatives.length > 0 
        ? Math.round((count / initiatives.length) * 100) 
        : 0;

      return {
        range: range.label,
        count,
        percentage
      };
    });

    return NextResponse.json({
      data: distribution,
      total_initiatives: initiatives.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Progress distribution API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}