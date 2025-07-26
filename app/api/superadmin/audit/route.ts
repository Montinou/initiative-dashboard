import { NextRequest, NextResponse } from 'next/server';
import { withSuperadminAuth } from '@/lib/superadmin-middleware';
import { edgeCompatibleAuth } from '@/lib/edge-compatible-auth';

// GET /api/superadmin/audit - Get audit log entries
export const GET = withSuperadminAuth(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const action = searchParams.get('action') || '';
    const target_type = searchParams.get('target_type') || '';
    const superadmin_id = searchParams.get('superadmin_id') || '';

    const offset = (page - 1) * limit;

    // Get audit log entries
    const auditEntries = await edgeCompatibleAuth.getAuditLog(
      superadmin_id || undefined,
      limit,
      offset
    );

    // Apply client-side filtering if needed
    let filteredEntries = auditEntries;
    
    if (action) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.action.toLowerCase().includes(action.toLowerCase())
      );
    }

    if (target_type) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.target_type === target_type
      );
    }

    // Calculate total for pagination
    const total = filteredEntries.length;

    return NextResponse.json({
      audit_entries: filteredEntries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        action,
        target_type,
        superadmin_id,
      },
    });

  } catch (error) {
    console.error('Get audit log error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch audit log' },
      { status: 500 }
    );
  }
});

// Disable other methods
export const POST = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
export const PUT = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
export const DELETE = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });