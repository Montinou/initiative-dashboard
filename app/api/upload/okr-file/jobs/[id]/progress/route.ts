/**
 * Server-Sent Events (SSE) endpoint for real-time import progress tracking
 * GET /api/upload/okr-file/jobs/[id]/progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/server-user-profile';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { optimizedImportService } from '@/services/okrImportOptimized';

// Keep track of active SSE connections
const activeConnections = new Map<string, Set<ReadableStreamDefaultController>>();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const { user, userProfile } = await getUserProfile(req);

    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const jobId = params.id;

    // Verify job access
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: job, error } = await serviceClient
      .from('okr_import_jobs')
      .select('id, status, tenant_id')
      .eq('id', jobId)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (error || !job) {
      return NextResponse.json({ 
        error: 'Job not found or access denied' 
      }, { status: 404 });
    }

    // Set up SSE headers
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'Access-Control-Allow-Origin': '*',
    });

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        // Add controller to active connections
        if (!activeConnections.has(jobId)) {
          activeConnections.set(jobId, new Set());
        }
        activeConnections.get(jobId)!.add(controller);

        // Send initial connection message
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(`event: connected\ndata: ${JSON.stringify({ jobId, status: job.status })}\n\n`)
        );

        // Subscribe to progress updates
        const unsubscribe = optimizedImportService.subscribeToProgress(jobId, (update) => {
          try {
            const data = JSON.stringify({
              jobId: update.jobId,
              status: update.status,
              progress: {
                percentage: update.percentage,
                processed: update.processed,
                total: update.total,
                succeeded: update.succeeded,
                failed: update.failed,
              },
              eta: update.eta,
              batch: {
                current: update.currentBatch,
                total: update.totalBatches,
              },
              message: update.message,
              timestamp: Date.now(),
            });

            controller.enqueue(
              encoder.encode(`event: progress\ndata: ${data}\n\n`)
            );

            // If job is completed, close the connection
            if (update.status === 'completed' || update.status === 'failed') {
              setTimeout(() => {
                controller.enqueue(
                  encoder.encode(`event: complete\ndata: ${data}\n\n`)
                );
                controller.close();
              }, 1000);
            }
          } catch (error) {
            console.error('Error sending SSE update:', error);
          }
        });

        // Set up periodic keep-alive ping
        const pingInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': ping\n\n'));
          } catch (error) {
            // Connection closed, clean up
            clearInterval(pingInterval);
          }
        }, 30000); // Send ping every 30 seconds

        // Poll database for updates if job is already processing
        let pollInterval: NodeJS.Timeout | null = null;
        
        if (job.status === 'processing') {
          pollInterval = setInterval(async () => {
            try {
              const { data: updatedJob } = await serviceClient
                .from('okr_import_jobs')
                .select(`
                  status,
                  total_rows,
                  processed_rows,
                  success_rows,
                  error_rows
                `)
                .eq('id', jobId)
                .single();

              if (updatedJob) {
                const percentage = updatedJob.total_rows > 0
                  ? Math.round((updatedJob.processed_rows / updatedJob.total_rows) * 100)
                  : 0;

                const data = JSON.stringify({
                  jobId,
                  status: updatedJob.status,
                  progress: {
                    percentage,
                    processed: updatedJob.processed_rows,
                    total: updatedJob.total_rows,
                    succeeded: updatedJob.success_rows,
                    failed: updatedJob.error_rows,
                  },
                  timestamp: Date.now(),
                });

                controller.enqueue(
                  encoder.encode(`event: progress\ndata: ${data}\n\n`)
                );

                // Stop polling if job is complete
                if (updatedJob.status !== 'processing' && updatedJob.status !== 'pending') {
                  clearInterval(pollInterval!);
                  controller.enqueue(
                    encoder.encode(`event: complete\ndata: ${data}\n\n`)
                  );
                  setTimeout(() => controller.close(), 1000);
                }
              }
            } catch (error) {
              console.error('Error polling job status:', error);
            }
          }, 2000); // Poll every 2 seconds
        }

        // Handle client disconnect
        req.signal.addEventListener('abort', () => {
          unsubscribe();
          clearInterval(pingInterval);
          if (pollInterval) clearInterval(pollInterval);
          
          // Remove from active connections
          const connections = activeConnections.get(jobId);
          if (connections) {
            connections.delete(controller);
            if (connections.size === 0) {
              activeConnections.delete(jobId);
            }
          }
        });
      },
    });

    return new Response(stream, { headers });

  } catch (error) {
    console.error('Error in progress SSE endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to establish progress stream',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Send progress update to all connected clients for a job
 * This can be called from other parts of the application
 */
export function broadcastProgress(jobId: string, update: any) {
  const connections = activeConnections.get(jobId);
  if (connections) {
    const encoder = new TextEncoder();
    const data = `event: progress\ndata: ${JSON.stringify(update)}\n\n`;
    
    connections.forEach(controller => {
      try {
        controller.enqueue(encoder.encode(data));
      } catch (error) {
        // Remove dead connections
        connections.delete(controller);
      }
    });
  }
}