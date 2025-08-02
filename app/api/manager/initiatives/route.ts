import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getManagerDataScope, canManagerCreateInitiative, canManagerEditInitiative } from '@/lib/manager-permissions';
import { withPermissionValidation, logPermissionValidation, createValidationContext } from '@/lib/permission-middleware';

/**
 * GET /api/manager/initiatives
 * 
 * Returns area-filtered initiatives for the authenticated manager
 */
export const GET = withPermissionValidation({
  requiredRole: 'Manager',
  areaRestricted: true,
  validateOperation: 'viewDashboards'
})(async (request: NextRequest, user) => {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    // User is already authenticated and validated by middleware
    const dataScope = getManagerDataScope(user.role, user.tenantId, user.areaId);
    
    if (!dataScope) {
      return NextResponse.json(
        { error: 'Data access not available' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeSubtasks = searchParams.get('include_subtasks') === 'true';

    // Build query
    let query = supabase
      .from('initiatives_with_subtasks_summary')
      .select('*')
      .eq('tenant_id', dataScope.tenantId)
      .eq('area_id', dataScope.areaId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    
    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data: initiatives, error: initiativesError } = await query;

    if (initiativesError) {
      console.error('Error fetching initiatives:', initiativesError);
      return NextResponse.json(
        { error: 'Failed to fetch initiatives' },
        { status: 500 }
      );
    }

    // Fetch subtasks if requested
    let enrichedInitiatives = initiatives;
    
    if (includeSubtasks && initiatives && initiatives.length > 0) {
      const initiativeIds = initiatives.map(i => i.id);
      
      const { data: subtasks, error: subtasksError } = await supabase
        .from('subtasks')
        .select('*')
        .in('initiative_id', initiativeIds)
        .eq('tenant_id', dataScope.tenantId)
        .order('created_at', { ascending: true });

      if (!subtasksError && subtasks) {
        // Group subtasks by initiative
        const subtasksByInitiative = subtasks.reduce((acc, subtask) => {
          if (!acc[subtask.initiative_id]) {
            acc[subtask.initiative_id] = [];
          }
          acc[subtask.initiative_id].push(subtask);
          return acc;
        }, {} as Record<string, any[]>);

        // Add subtasks to initiatives
        enrichedInitiatives = initiatives.map(initiative => ({
          ...initiative,
          subtasks: subtasksByInitiative[initiative.id] || []
        }));
      }
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('initiatives')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', dataScope.tenantId)
      .eq('area_id', dataScope.areaId);

    return NextResponse.json({
      initiatives: enrichedInitiatives,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      },
      filters: {
        status,
        priority,
        includeSubtasks
      }
    });

  } catch (error) {
    console.error('Error in initiatives GET endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/manager/initiatives
 * 
 * Creates a new initiative in the manager's area
 */
export const POST = withPermissionValidation({
  requiredRole: 'Manager',
  areaRestricted: true,
  validateOperation: 'createInitiative'
})(async (request: NextRequest, user) => {
  try {
    const supabase = createClient();
    
    // User is already authenticated and validated by middleware

    // Parse request body
    const body = await request.json();
    const {
      title,
      description,
      target_date,
      priority = 'medium',
      budget,
      subtasks = []
    } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Create the initiative
    const { data: initiative, error: initiativeError } = await supabase
      .from('initiatives')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        target_date: target_date || null,
        priority,
        budget: budget || null,
        tenant_id: user.tenantId,
        area_id: user.areaId,
        created_by: user.id,
        owner_id: user.id,
        status: 'planning',
        progress: 0
      })
      .select()
      .single();

    if (initiativeError) {
      console.error('Error creating initiative:', initiativeError);
      return NextResponse.json(
        { error: 'Failed to create initiative' },
        { status: 500 }
      );
    }

    // Create subtasks if provided
    let createdSubtasks = [];
    if (subtasks.length > 0) {
      const subtasksToCreate = subtasks
        .filter((subtask: any) => subtask.title && subtask.title.trim())
        .map((subtask: any) => ({
          title: subtask.title.trim(),
          description: subtask.description?.trim() || null,
          initiative_id: initiative.id,
          tenant_id: user.tenantId,
          completed: false
        }));

      if (subtasksToCreate.length > 0) {
        const { data: subtaskData, error: subtasksError } = await supabase
          .from('subtasks')
          .insert(subtasksToCreate)
          .select();

        if (subtasksError) {
          console.error('Error creating subtasks:', subtasksError);
          // Don't fail the entire operation, just log the error
        } else {
          createdSubtasks = subtaskData || [];
        }
      }
    }

    // Log the creation
    await supabase
      .from('audit_log')
      .insert({
        tenant_id: user.tenantId,
        user_id: user.id,
        action: 'CREATE',
        resource_type: 'initiative',
        resource_id: initiative.id,
        new_values: initiative
      });

    // Return the created initiative with subtasks
    return NextResponse.json({
      initiative: {
        ...initiative,
        subtasks: createdSubtasks,
        subtask_count: createdSubtasks.length,
        completed_subtask_count: 0,
        subtask_completion_rate: 0
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error in initiatives POST endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/manager/initiatives
 * 
 * Updates an existing initiative (requires initiative ID in body)
 */
export const PUT = withPermissionValidation({
  requiredRole: 'Manager',
  areaRestricted: true,
  validateOperation: 'editInitiative'
})(async (request: NextRequest, user) => {
  try {
    const supabase = createClient();
    
    // User is already authenticated and validated by middleware

    // Parse request body
    const body = await request.json();
    const { id: initiativeId, ...updates } = body;

    if (!initiativeId) {
      return NextResponse.json(
        { error: 'Initiative ID is required' },
        { status: 400 }
      );
    }

    // Verify the initiative exists and belongs to manager's area
    const { data: existingInitiative, error: fetchError } = await supabase
      .from('initiatives')
      .select('*')
      .eq('id', initiativeId)
      .eq('tenant_id', user.tenantId)
      .eq('area_id', user.areaId)
      .single();

    if (fetchError || !existingInitiative) {
      return NextResponse.json(
        { error: 'Initiative not found or access denied' },
        { status: 404 }
      );
    }

    // Additional validation (middleware already validates, but double-check area match)
    if (existingInitiative.area_id !== user.areaId) {
      return NextResponse.json(
        { error: 'Initiative not found or access denied' },
        { status: 404 }
      );
    }

    // Clean up updates (remove null/undefined values and invalid fields)
    const cleanUpdates = Object.entries(updates)
      .filter(([key, value]) => {
        // Remove system fields and null/undefined values
        if (['id', 'tenant_id', 'area_id', 'created_by', 'created_at'].includes(key)) {
          return false;
        }
        return value !== null && value !== undefined;
      })
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    // Add updated_at timestamp
    cleanUpdates.updated_at = new Date().toISOString();

    // Update the initiative
    const { data: updatedInitiative, error: updateError } = await supabase
      .from('initiatives')
      .update(cleanUpdates)
      .eq('id', initiativeId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating initiative:', updateError);
      return NextResponse.json(
        { error: 'Failed to update initiative' },
        { status: 500 }
      );
    }

    // Log the update
    await supabase
      .from('audit_log')
      .insert({
        tenant_id: user.tenantId,
        user_id: user.id,
        action: 'UPDATE',
        resource_type: 'initiative',
        resource_id: initiativeId,
        old_values: existingInitiative,
        new_values: updatedInitiative
      });

    return NextResponse.json({ initiative: updatedInitiative });

  } catch (error) {
    console.error('Error in initiatives PUT endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});