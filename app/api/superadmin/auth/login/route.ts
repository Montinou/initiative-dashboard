import { NextRequest, NextResponse } from 'next/server';
import { edgeCompatibleAuth } from '@/lib/edge-compatible-auth';
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

    // Authenticate
    const session = await edgeCompatibleAuth.authenticate(
      email,
      password,
      ipAddress,
      userAgent
    );

    // Set secure HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      superadmin: {
        id: session.superadmin_id,
        name: session.name,
        email: session.email,
      },
    });

    // Set session cookie (HTTP-only, secure, same-site)
    response.cookies.set('superadmin-session', session.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 60, // 30 minutes
      path: '/superadmin',
    });

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