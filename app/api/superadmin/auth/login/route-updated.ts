import { NextRequest, NextResponse } from 'next/server';
import { supabaseSuperadminAuth } from '@/lib/supabase-superadmin-auth';
import { withRateLimit, getClientIP } from '@/lib/superadmin-middleware';

interface LoginRequest {
  email: string;
  password: string;
}

export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get client info
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Authenticate using new Supabase-based auth
    const authResult = await supabaseSuperadminAuth.authenticate(
      email,
      password,
      ipAddress,
      userAgent
    );

    if (authResult.error || !authResult.session || !authResult.profile) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Create response with session data
    const response = NextResponse.json({
      success: true,
      superadmin: {
        id: authResult.profile.id,
        name: authResult.profile.full_name || authResult.profile.email,
        email: authResult.profile.email,
        role: 'superadmin'
      },
      session: {
        expires_at: authResult.session.expires_at
      }
    });

    // Set secure HTTP-only cookie with Supabase access token
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 30 * 60, // 30 minutes
      path: '/',
    };
    
    console.log('Setting superadmin session cookie with Supabase token');
    console.log('Session expires at:', new Date(authResult.session.expires_at * 1000));
    
    response.cookies.set('superadmin-session', authResult.session.access_token, cookieOptions);

    // Also set refresh token if needed
    if (authResult.session.refresh_token) {
      response.cookies.set('superadmin-refresh', authResult.session.refresh_token, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60, // 7 days for refresh token
      });
    }

    return response;

  } catch (error) {
    console.error('Superadmin login error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Authentication failed' },
      { status: 401 }
    );
  }
});

// Disable GET method
export const GET = () => {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
};