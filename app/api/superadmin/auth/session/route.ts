import { NextRequest, NextResponse } from 'next/server';
import { supabaseSuperadminAuth } from '@/lib/supabase-superadmin-auth';

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

    // Validate session using new Supabase-based auth
    const profile = await supabaseSuperadminAuth.validateSession(sessionToken);
    
    if (!profile) {
      // Invalid session, clear cookie and return error
      const response = NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
      
      response.cookies.delete('superadmin-session');
      response.cookies.delete('superadmin-refresh');
      
      return response;
    }

    // Return session information
    return NextResponse.json({
      success: true,
      superadmin: {
        id: profile.id,
        name: profile.full_name || profile.email,
        email: profile.email,
        role: 'superadmin',
        is_active: profile.is_active,
        last_login: profile.last_login
      },
      authenticated: true
    });

  } catch (error) {
    console.error('Session validation error:', error);
    
    // Clear cookies on error
    const response = NextResponse.json(
      { error: 'Session validation failed' },
      { status: 500 }
    );
    
    response.cookies.delete('superadmin-session');
    response.cookies.delete('superadmin-refresh');
    
    return response;
  }
}

// Handle logout
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('superadmin-session')?.value;
    
    if (sessionToken) {
      // Get client info for logging
      const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      // Logout using new Supabase-based auth
      await supabaseSuperadminAuth.logout(sessionToken, ipAddress, userAgent);
    }

    // Clear cookies
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response.cookies.delete('superadmin-session');
    response.cookies.delete('superadmin-refresh');
    
    return response;

  } catch (error) {
    console.error('Logout error:', error);
    
    // Still clear cookies even if logout fails
    const response = NextResponse.json(
      { success: true, message: 'Logged out (with errors)' },
      { status: 200 }
    );
    
    response.cookies.delete('superadmin-session');
    response.cookies.delete('superadmin-refresh');
    
    return response;
  }
}