export const runtime = "nodejs"
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserProfile } from '@/lib/server-user-profile';

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createClient();

    console.log('🔍 Auth Debug - Headers received:', {
      'user-agent': request.headers.get('user-agent')?.substring(0, 50),
      'cookie': request.headers.get('cookie') ? 'Present' : 'Missing'
    });

    // Authenticate user and get profile (secure pattern)
    const { user, userProfile } = await getUserProfile(request);
    
    console.log('🔍 Auth Debug - User check:', {
      hasUser: !!user,
      hasProfile: !!userProfile,
      userId: user?.id,
      userEmail: user?.email,
      tenantId: userProfile?.tenant_id,
      role: userProfile?.role
    });

    if (!user || !userProfile) {
      return NextResponse.json({ 
        debug: 'Authentication failed',
        hasUser: !!user,
        hasProfile: !!userProfile,
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    console.log('🔍 Auth Debug - Profile check:', {
      hasProfile: !!userProfile,
      profileTenantId: userProfile?.tenant_id,
      role: userProfile?.role
    });

    return NextResponse.json({
      debug: 'Authentication successful',
      user: {
        id: user.id,
        email: user.email
      },
      profile: {
        id: userProfile.id,
        tenant_id: userProfile.tenant_id,
        role: userProfile.role,
        full_name: userProfile.full_name,
        email: userProfile.email
      },
      authentication: 'secure-server-side',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🔍 Auth Debug - Error:', error);
    return NextResponse.json({
      debug: 'Unexpected error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}