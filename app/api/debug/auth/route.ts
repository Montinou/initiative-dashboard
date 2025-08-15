export const runtime = "nodejs"
import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth-helper';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Auth Debug - Headers received:', {
      'user-agent': request.headers.get('user-agent')?.substring(0, 50),
      'cookie': request.headers.get('cookie') ? 'Present' : 'Missing'
    });

    // Authenticate user and get profile using the new pattern
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(request);
    
    console.log('🔍 Auth Debug - User check:', {
      hasUser: !!user,
      hasProfile: !!userProfile,
      hasSupabase: !!supabase,
      authError: authError || 'None',
      userId: user?.id,
      userEmail: user?.email,
      tenantId: userProfile?.tenant_id,
      role: userProfile?.role
    });

    if (authError || !user || !userProfile || !supabase) {
      return NextResponse.json({ 
        debug: 'Authentication failed',
        authError: authError || 'Missing user/profile/supabase',
        hasUser: !!user,
        hasProfile: !!userProfile,
        hasSupabase: !!supabase,
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