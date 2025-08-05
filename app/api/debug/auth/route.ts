export const runtime = "nodejs"
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    
    // Create Supabase client
    const supabase = await createClient();

    console.log('🔍 Auth Debug - Headers received:', {
      'x-tenant-id': tenantId,
      'user-agent': request.headers.get('user-agent')?.substring(0, 50),
      'cookie': request.headers.get('cookie') ? 'Present' : 'Missing'
    });

    // Check if user is authenticated via session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('🔍 Auth Debug - User check:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message
    });

    if (authError || !user) {
      return NextResponse.json({ 
        debug: 'Authentication failed',
        hasUser: false,
        authError: authError?.message,
        tenantId,
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Try to get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('tenant_id, role, email, full_name')
      .eq('user_id', user.id)
      .single();

    console.log('🔍 Auth Debug - Profile check:', {
      hasProfile: !!userProfile,
      profileTenantId: userProfile?.tenant_id,
      requestedTenantId: tenantId,
      profileError: profileError?.message
    });

    return NextResponse.json({
      debug: 'Authentication successful',
      user: {
        id: user.id,
        email: user.email
      },
      profile: userProfile,
      tenantMatch: userProfile?.tenant_id === tenantId,
      headers: {
        'x-tenant-id': tenantId
      },
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