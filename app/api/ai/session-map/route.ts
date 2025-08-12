import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createHash } from 'crypto';
import Redis from 'ioredis';

// TTL for session mapping (24 hours)
const SESSION_TTL = 60 * 60 * 24;

// In-memory fallback storage
const memoryStorage = new Map<string, { data: string; expiresAt: number }>();

// Redis client for session storage (with error handling)
let redis: Redis | null = null;
let redisError = false;

try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      retryStrategy: () => null // Don't retry on failure
    });
    
    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
      redisError = true;
    });
  }
} catch (error) {
  console.error('[Redis] Failed to initialize:', error);
  redis = null;
}

// Storage abstraction layer
const storage = {
  async set(key: string, value: string, ttl: number): Promise<void> {
    if (redis && !redisError) {
      try {
        await redis.setex(key, ttl, value);
        return;
      } catch (error) {
        console.error('[Storage] Redis set failed, falling back to memory:', error);
        redisError = true;
      }
    }
    
    // Fallback to memory
    const expiresAt = Date.now() + (ttl * 1000);
    memoryStorage.set(key, { data: value, expiresAt });
    
    // Clean up expired entries periodically
    if (memoryStorage.size > 100) {
      const now = Date.now();
      for (const [k, v] of memoryStorage.entries()) {
        if (v.expiresAt < now) {
          memoryStorage.delete(k);
        }
      }
    }
  },
  
  async get(key: string): Promise<string | null> {
    if (redis && !redisError) {
      try {
        return await redis.get(key);
      } catch (error) {
        console.error('[Storage] Redis get failed, falling back to memory:', error);
        redisError = true;
      }
    }
    
    // Fallback to memory
    const entry = memoryStorage.get(key);
    if (!entry) return null;
    
    if (entry.expiresAt < Date.now()) {
      memoryStorage.delete(key);
      return null;
    }
    
    return entry.data;
  },
  
  async del(key: string): Promise<void> {
    if (redis && !redisError) {
      try {
        await redis.del(key);
      } catch (error) {
        console.error('[Storage] Redis del failed:', error);
        redisError = true;
      }
    }
    memoryStorage.delete(key);
  },
  
  async expire(key: string, ttl: number): Promise<void> {
    if (redis && !redisError) {
      try {
        await redis.expire(key, ttl);
        return;
      } catch (error) {
        console.error('[Storage] Redis expire failed:', error);
        redisError = true;
      }
    }
    
    // For memory storage, update expiry
    const entry = memoryStorage.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + (ttl * 1000);
    }
  }
};

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
        full_name,
        role,
        area_id,
        tenant_id,
        tenants:tenant_id (
          id,
          subdomain,
          organizations:organization_id (
            id,
            name
          )
        ),
        areas:area_id (
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
      fullName: userProfile.full_name,
      tenantId: userProfile.tenant_id,
      tenantName: userProfile.tenants?.organizations?.name || userProfile.tenants?.subdomain,
      tenantSubdomain: userProfile.tenants?.subdomain,
      role: userProfile.role,
      areaId: userProfile.area_id,
      areaName: userProfile.areas?.name,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_TTL * 1000).toISOString()
    };

    // Store in storage with TTL
    await storage.set(
      `dialogflow:session:${sessionId}`,
      JSON.stringify(sessionData),
      SESSION_TTL
    );

    // Also store reverse mapping for quick lookups
    await storage.set(
      `dialogflow:user:${user.id}`,
      sessionId,
      SESSION_TTL
    );

    console.log(`[Session Map] Created session ${sessionId} for user ${user.id}`);

    return NextResponse.json({
      sessionId,
      expiresAt: sessionData.expiresAt,
      tenant: {
        id: userProfile.tenant_id,
        name: userProfile.tenants?.organizations?.name || userProfile.tenants?.subdomain,
        subdomain: userProfile.tenants?.subdomain
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

    // Get session from storage
    const sessionData = await storage.get(`dialogflow:session:${sessionId}`);
    
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
      await storage.del(`dialogflow:session:${sessionId}`);
      await storage.del(`dialogflow:user:${session.userId}`);
      
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }

    // Extend session TTL on access
    await storage.expire(`dialogflow:session:${sessionId}`, SESSION_TTL);

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
    const sessionId = await storage.get(`dialogflow:user:${user.id}`);
    
    if (sessionId) {
      // Delete both mappings
      await storage.del(`dialogflow:session:${sessionId}`);
      await storage.del(`dialogflow:user:${user.id}`);
      
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