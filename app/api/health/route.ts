import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getGCSClient } from '@/utils/gcs';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
      error?: string;
    };
    storage: {
      status: 'up' | 'down';
      bucket?: string;
      responseTime?: number;
      error?: string;
    };
    auth: {
      status: 'up' | 'down';
      responseTime?: number;
      error?: string;
    };
  };
  environment: {
    nodeVersion: string;
    environment: string;
  };
}

// Track server start time
const serverStartTime = Date.now();

/**
 * Health check endpoint
 * GET /api/health
 */
export async function GET(_req: NextRequest) {
  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    checks: {
      database: { status: 'down' },
      storage: { status: 'down' },
      auth: { status: 'down' }
    },
    environment: {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    }
  };

  // Check database connectivity
  try {
    const startTime = Date.now();
    const supabase = await createClient();
    
    // Simple query to test database connection
    const { error } = await supabase
      .from('tenants')
      .select('id')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (!error) {
      result.checks.database = {
        status: 'up',
        responseTime
      };
    } else {
      result.checks.database = {
        status: 'down',
        responseTime,
        error: error.message
      };
    }
  } catch (error) {
    result.checks.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
  }

  // Check Google Cloud Storage connectivity
  try {
    if (!process.env.GCS_BUCKET_NAME) {
      result.checks.storage = {
        status: 'down',
        error: 'GCS configuration missing'
      };
    } else {
      const startTime = Date.now();
      const storage = await getGCSClient();
      const bucketName = process.env.GCS_BUCKET_NAME;
      const bucket = storage.bucket(bucketName);
      
      // Check if bucket exists and is accessible
      const [exists] = await bucket.exists();
      const responseTime = Date.now() - startTime;
      
      if (exists) {
        result.checks.storage = {
          status: 'up',
          bucket: bucketName,
          responseTime
        };
      } else {
        result.checks.storage = {
          status: 'down',
          bucket: bucketName,
          responseTime,
          error: 'Bucket does not exist or is not accessible'
        };
      }
    }
  } catch (error) {
    result.checks.storage = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Storage check failed'
    };
  }

  // Check authentication service
  try {
    const startTime = Date.now();
    const supabase = await createClient();
    
    // For health check, we just verify the auth service is responding
    // We don't need to verify a user, just that the service is available
    // Using getUser() without a valid session will still test auth connectivity
    const { error } = await supabase.auth.getUser();
    const responseTime = Date.now() - startTime;
    
    // For health check, we expect an error (no user) but the service should respond
    // If we get a response (even an error), the auth service is up
    result.checks.auth = {
      status: 'up',
      responseTime
    };
  } catch (error) {
    result.checks.auth = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Auth service check failed'
    };
  }

  // Determine overall health status
  const checks = Object.values(result.checks);
  const downCount = checks.filter(c => c.status === 'down').length;
  
  if (downCount === 0) {
    result.status = 'healthy';
  } else if (downCount < checks.length) {
    result.status = 'degraded';
  } else {
    result.status = 'unhealthy';
  }

  // Return appropriate HTTP status code
  const httpStatus = result.status === 'healthy' ? 200 : 
                     result.status === 'degraded' ? 200 : 503;

  return NextResponse.json(result, { status: httpStatus });
}

/**
 * Liveness probe - simple check that the service is running
 * GET /api/health?probe=liveness
 */
export async function HEAD(_req: NextRequest) {
  return new NextResponse(null, { status: 200 });
}