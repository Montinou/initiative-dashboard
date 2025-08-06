export const runtime = "nodejs"

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserProfile } from '@/lib/server-user-profile';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user and get profile (secure pattern)
    const userProfile = await getUserProfile(request);
    
    if (!userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Create Supabase client
    const supabase = createClient(cookies());

    // Fetch all initiatives for the tenant
    const { data: initiatives, error } = await supabase
      .from('initiatives')
      .select('progress')
      .eq('tenant_id', userProfile.tenant_id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch initiatives', details: error.message },
        { status: 500 }
      );
    }

    // Handle empty state
    if (!initiatives || initiatives.length === 0) {
      return NextResponse.json({
        data: [
          { range: '0-25%', count: 0, percentage: 0 },
          { range: '26-50%', count: 0, percentage: 0 },
          { range: '51-75%', count: 0, percentage: 0 },
          { range: '76-100%', count: 0, percentage: 0 }
        ],
        total_initiatives: 0,
        timestamp: new Date().toISOString()
      });
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