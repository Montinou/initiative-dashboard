import { NextRequest, NextResponse } from 'next/server';
import { edgeCompatibleAuth } from '@/lib/edge-compatible-auth';

export async function GET(request: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get('superadmin-session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    // Validate session
    const superadmin = await edgeCompatibleAuth.validateSession(sessionToken);
    
    if (!superadmin) {
      // Invalid session
      const response = NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
      response.cookies.delete('superadmin-session');
      return response;
    }

    // Return superadmin info
    return NextResponse.json({
      success: true,
      superadmin: {
        id: superadmin.id,
        email: superadmin.email,
        name: superadmin.name,
        last_login: superadmin.last_login,
      },
    });

  } catch (error) {
    console.error('Session validation error:', error);
    
    const response = NextResponse.json(
      { error: 'Session validation failed' },
      { status: 500 }
    );
    response.cookies.delete('superadmin-session');
    
    return response;
  }
}

// Disable other methods
export const POST = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
export const PUT = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
export const DELETE = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });