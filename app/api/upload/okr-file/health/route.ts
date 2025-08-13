/**
 * Health check endpoint for OKR import service
 * GET /api/upload/okr-file/health
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/server-user-profile';
import { importMonitoring } from '@/services/importMonitoring';

export async function GET(req: NextRequest) {
  try {
    // Optional authentication - health checks can be public for monitoring tools
    const authHeader = req.headers.get('authorization');
    let authenticated = false;

    if (authHeader) {
      try {
        const { user, userProfile } = await getUserProfile(req);
        authenticated = !!(user && userProfile);
      } catch {
        // Auth failed, but we'll still return basic health info
      }
    }

    // Get health status
    const health = await importMonitoring.getHealth();

    // Prepare response based on authentication
    if (!authenticated) {
      // Return minimal health info for unauthenticated requests
      return NextResponse.json({
        status: health.status,
        timestamp: health.timestamp,
        checks: {
          database: { status: health.checks.database.status },
          storage: { status: health.checks.storage.status },
          processing: { status: health.checks.processing.status },
          memory: { status: health.checks.memory.status },
        },
      });
    }

    // Return full health info for authenticated requests
    return NextResponse.json(health);

  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 503 } // Service Unavailable
    );
  }
}

/**
 * Get import service metrics
 * Requires authentication
 */
export async function POST(req: NextRequest) {
  try {
    const { user, userProfile } = await getUserProfile(req);

    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only allow admin/CEO roles to view metrics
    if (userProfile.role !== 'CEO' && userProfile.role !== 'Admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { action, jobId } = await req.json();

    switch (action) {
      case 'start_monitoring':
        importMonitoring.startMonitoring();
        return NextResponse.json({ message: 'Monitoring started' });

      case 'stop_monitoring':
        importMonitoring.stopMonitoring();
        return NextResponse.json({ message: 'Monitoring stopped' });

      case 'get_job_metrics':
        if (!jobId) {
          return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
        }
        const jobMetrics = importMonitoring.getJobMetrics(jobId);
        return NextResponse.json({ metrics: jobMetrics || null });

      case 'get_all_metrics':
        const allMetrics = Array.from(importMonitoring.getAllMetrics().entries()).map(
          ([id, metrics]) => ({ jobId: id, ...metrics })
        );
        return NextResponse.json({ metrics: allMetrics });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Metrics request failed:', error);
    return NextResponse.json(
      { error: 'Failed to process metrics request' },
      { status: 500 }
    );
  }
}