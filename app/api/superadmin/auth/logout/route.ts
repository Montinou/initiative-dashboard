import { NextRequest, NextResponse } from 'next/server';
import { edgeCompatibleAuth } from '@/lib/edge-compatible-auth';
import { getClientIP } from '@/lib/superadmin-middleware';

export async function POST(request: NextRequest) {
  try {
    // Get session token from cookie
    const sessionToken = request.cookies.get('superadmin-session')?.value;
    
    if (sessionToken) {
      const ipAddress = getClientIP(request);
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      // Logout and invalidate session
      await edgeCompatibleAuth.logout(sessionToken, ipAddress, userAgent);
    }

    // Clear cookie and return success
    const response = NextResponse.json({ success: true });
    response.cookies.set('superadmin-session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/', // Match the login route path
    });
    
    return response;

  } catch (error) {
    console.error('Superadmin logout error:', error);
    
    // Still clear cookie even if logout fails
    const response = NextResponse.json({ success: true });
    response.cookies.set('superadmin-session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expire immediately
      path: '/', // Match the login route path
    });
    
    return response;
  }
}

// Disable other methods
export const GET = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
export const PUT = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
export const DELETE = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });