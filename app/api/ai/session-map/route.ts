import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createHash } from 'crypto';
import Redis from 'ioredis';

// Redis client for session storage
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// TTL for session mapping (24 hours)
const SESSION_TTL = 60 * 60 * 24;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile with tenant and role
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        email,
        role,
        area_id,
        tenant_id,
        tenants (
          id,
          name,
          slug
        ),
        areas (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Generate stable session ID based on user ID
    const sessionId = createHash('sha256')
      .update(user.id)
      .digest('hex')
      .substring(0, 16);

    // Session data to store
    const sessionData = {
      sessionId,
      userId: user.id,
      userProfileId: userProfile.id,
      email: userProfile.email,
      tenantId: userProfile.tenant_id,
      tenantName: userProfile.tenants?.name,
      tenantSlug: userProfile.tenants?.slug,
      role: userProfile.role,
      areaId: userProfile.area_id,
      areaName: userProfile.areas?.name,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_TTL * 1000).toISOString()
    };

    // Store in Redis with TTL
    await redis.setex(
      `dialogflow:session:${sessionId}`,
      SESSION_TTL,
      JSON.stringify(sessionData)
    );

    // Also store reverse mapping for quick lookups
    await redis.setex(
      `dialogflow:user:${user.id}`,
      SESSION_TTL,
      sessionId
    );

    console.log(`[Session Map] Created session ${sessionId} for user ${user.id}`);

    return NextResponse.json({
      sessionId,
      expiresAt: sessionData.expiresAt,
      tenant: {
        id: userProfile.tenant_id,
        name: userProfile.tenants?.name,
        slug: userProfile.tenants?.slug
      },
      role: userProfile.role,
      area: userProfile.areas ? {
        id: userProfile.area_id,
        name: userProfile.areas.name
      } : null
    });

  } catch (error) {
    console.error('[Session Map] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Get session from Redis
    const sessionData = await redis.get(`dialogflow:session:${sessionId}`);
    
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Session not found or expired' },
        { status: 404 }
      );
    }

    const session = JSON.parse(sessionData);

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      // Clean up expired session
      await redis.del(`dialogflow:session:${sessionId}`);
      await redis.del(`dialogflow:user:${session.userId}`);
      
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }

    // Extend session TTL on access
    await redis.expire(`dialogflow:session:${sessionId}`, SESSION_TTL);

    return NextResponse.json(session);

  } catch (error) {
    console.error('[Session Map] Error retrieving session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get session ID for user
    const sessionId = await redis.get(`dialogflow:user:${user.id}`);
    
    if (sessionId) {
      // Delete both mappings
      await redis.del(`dialogflow:session:${sessionId}`);
      await redis.del(`dialogflow:user:${user.id}`);
      
      console.log(`[Session Map] Deleted session ${sessionId} for user ${user.id}`);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Session Map] Error deleting session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}