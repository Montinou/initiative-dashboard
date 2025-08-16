/**
 * Activities API
 * 
 * Provides CRUD operations for activities (tasks within initiatives).
 * Activities track the granular work items that contribute to initiative progress.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth-helper';
import { 
  validateUuid,
  searchStringSchema,
  dateSchema,
  safeStringSchema
} from '@/lib/validation/api-validators';
import { z } from 'zod';
import { logger } from "@/lib/logger"
import type { 
  Activity,
  ActivityWithRelations
} from '@/lib/types/database';

/**
 * GET /api/activities
 * 
 * Fetches activities with optional filtering
 * 
 * Query Parameters:
 * - initiative_id: Filter by initiative
 * - assigned_to: Filter by assigned user
 * - is_completed: Filter by completion status
 * - start_date: Filter by creation date (activities created on or after this date)
 * - end_date: Filter by creation date (activities created on or before this date)
 * - search: Search in title and description
 * - page: Page number for pagination (default: 1)
 * - limit: Items per page (default: 50, max: 100)
 * - sort_by: Sort field (title, created_at, updated_at)
 * - sort_order: Sort order (asc, desc)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get authenticated user profile and supabase client
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(request);
    if (authError || !userProfile || !supabase) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    // Parse sorting parameters
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') === 'asc' ? 'asc' : 'desc';
    const ascending = sortOrder === 'asc';

    // Validate sort field
    const validSortFields = ['title', 'created_at', 'updated_at', 'is_completed'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';

    // Build base query with pagination
    let query = supabase
      .from('activities')
      .select(`
        *,
        initiative:initiatives!activities_initiative_id_fkey (
          id,
          title,
          area_id,
          tenant_id,
          area:areas!initiatives_area_id_fkey (
            id,
            name
          )
        ),
        assigned_to_user:user_profiles!activities_assigned_to_fkey (
          id,
          full_name,
          email
        )
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order(sortField, { ascending });

    // Apply entity filters with validation
    const initiative_id_param = searchParams.get('initiative_id');
    const assigned_to_param = searchParams.get('assigned_to');
    const is_completed = searchParams.get('is_completed');

    // Validate UUIDs
    if (initiative_id_param) {
      try {
        const initiative_id = validateUuid(initiative_id_param);
        if (initiative_id) {
          query = query.eq('initiative_id', initiative_id);
        }
      } catch (error: any) {
        return NextResponse.json({ error: `Invalid initiative_id: ${error.message}` }, { status: 400 });
      }
    }

    if (assigned_to_param) {
      try {
        const assigned_to = validateUuid(assigned_to_param);
        if (assigned_to) {
          query = query.eq('assigned_to', assigned_to);
        }
      } catch (error: any) {
        return NextResponse.json({ error: `Invalid assigned_to: ${error.message}` }, { status: 400 });
      }
    }

    if (is_completed !== null && is_completed !== '') {
      query = query.eq('is_completed', is_completed === 'true');
    }

    // Apply date range filters on created_at with validation
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');

    if (startDateParam) {
      try {
        const startDate = dateSchema.parse(startDateParam);
        query = query.gte('created_at', startDate);
      } catch (error) {
        return NextResponse.json({ error: 'Invalid start_date format. Use YYYY-MM-DD' }, { status: 400 });
      }
    }

    if (endDateParam) {
      try {
        const endDate = dateSchema.parse(endDateParam);
        // Set to end of day
        const date = new Date(endDate);
        date.setHours(23, 59, 59, 999);
        query = query.lte('created_at', date.toISOString());
      } catch (error) {
        return NextResponse.json({ error: 'Invalid end_date format. Use YYYY-MM-DD' }, { status: 400 });
      }
    }

    // Apply search filter with sanitization
    const searchParam = searchParams.get('search');
    if (searchParam) {
      try {
        const search = searchStringSchema.parse(searchParam);
        if (search) {
          // Search in title and description using ilike for case-insensitive search
          // The search string has already been sanitized by searchStringSchema
          query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
        }
      } catch (error) {
        return NextResponse.json({ error: 'Invalid search query' }, { status: 400 });
      }
    }

    // For managers, filter by their area's initiatives
    if (userProfile.role === 'Manager' && userProfile.area_id) {
      // First get initiatives for the manager's area
      // RLS automatically filters by tenant_id
      const { data: areaInitiatives } = await supabase
        .from('initiatives')
        .select('id')
        .eq('area_id', userProfile.area_id);

      if (areaInitiatives && areaInitiatives.length > 0) {
        const initiativeIds = areaInitiatives.map(i => i.id);
        query = query.in('initiative_id', initiativeIds);
      } else {
        // Manager has no initiatives in their area
        return NextResponse.json({
          activities: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasMore: false
        });
      }
    }

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      logger.error('Error fetching activities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    // RLS already filters by tenant - no need for additional filtering
    const filteredActivities = data || [];

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      activities: filteredActivities,
      total: totalCount,
      page,
      limit,
      totalPages,
      hasMore,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore,
        hasPrevious: page > 1
      }
    });

  } catch (error) {
    logger.error('Unexpected error in GET activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activities
 * 
 * Creates a new activity
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user profile and supabase client
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(request);
    if (authError || !userProfile || !supabase) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    
    // Create validation schema for POST
    const activityCreateSchema = z.object({
      initiative_id: z.string().uuid('Invalid initiative_id format'),
      title: safeStringSchema,
      description: safeStringSchema.optional(),
      assigned_to: z.string().uuid('Invalid assigned_to format').optional()
    });
    
    const validationResult = activityCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const { initiative_id, title, description, assigned_to } = validationResult.data;

    // Verify initiative exists and user has permission
    // RLS automatically filters by tenant_id
    const { data: initiative, error: initiativeError } = await supabase
      .from('initiatives')
      .select('*, area:areas!initiatives_area_id_fkey(id)')
      .eq('id', initiative_id)
      .single();

    if (initiativeError || !initiative) {
      return NextResponse.json(
        { error: 'Initiative not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (userProfile.role === 'Manager') {
      if (initiative.area_id !== userProfile.area_id) {
        return NextResponse.json(
          { error: 'Cannot create activities for initiatives in other areas' },
          { status: 403 }
        );
      }
    }

    // Create activity
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        initiative_id,
        title,
        description,
        assigned_to,
        is_completed: false
      })
      .select()
      .single();

    if (activityError) {
      logger.error('Error creating activity:', activityError);
      return NextResponse.json(
        { error: 'Failed to create activity' },
        { status: 500 }
      );
    }

    // Update initiative progress
    await updateInitiativeProgress(supabase, initiative_id, userProfile.id);

    return NextResponse.json({
      activity,
      message: 'Activity created successfully'
    }, { status: 201 });

  } catch (error) {
    logger.error('Unexpected error in POST activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/activities
 * 
 * Updates an activity
 */
export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user profile and supabase client
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(request);
    if (authError || !userProfile || !supabase) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    
    // Create validation schema for PUT
    const activityUpdateSchema = z.object({
      id: z.string().uuid('Invalid activity ID format'),
      title: safeStringSchema.optional(),
      description: safeStringSchema.optional(),
      is_completed: z.boolean().optional(),
      assigned_to: z.string().uuid('Invalid assigned_to format').optional()
    });
    
    const validationResult = activityUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const { id, title, description, is_completed, assigned_to } = validationResult.data;

    // Get existing activity with initiative details
    const { data: existingActivity, error: fetchError } = await supabase
      .from('activities')
      .select(`
        *,
        initiative:initiatives!activities_initiative_id_fkey (
          id,
          area_id,
          tenant_id
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !existingActivity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (userProfile.role === 'Manager') {
      if (existingActivity.initiative?.area_id !== userProfile.area_id) {
        return NextResponse.json(
          { error: 'Cannot update activities from other areas' },
          { status: 403 }
        );
      }
    }

    // Update activity
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (is_completed !== undefined) updateData.is_completed = is_completed;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;

    const { data: updatedActivity, error: updateError } = await supabase
      .from('activities')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating activity:', updateError);
      return NextResponse.json(
        { error: 'Failed to update activity' },
        { status: 500 }
      );
    }

    // Update initiative progress if completion status changed
    if (is_completed !== undefined && is_completed !== existingActivity.is_completed) {
      await updateInitiativeProgress(supabase, existingActivity.initiative_id, userProfile.id);
    }

    return NextResponse.json({
      activity: updatedActivity,
      message: 'Activity updated successfully'
    });

  } catch (error) {
    logger.error('Unexpected error in PUT activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/activities
 * 
 * Deletes an activity
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user profile and supabase client
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(request);
    if (authError || !userProfile || !supabase) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }
    
    // Validate ID
    let id: string;
    try {
      id = validateUuid(idParam)!;
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Get existing activity with initiative details
    const { data: existingActivity, error: fetchError } = await supabase
      .from('activities')
      .select(`
        *,
        initiative:initiatives!activities_initiative_id_fkey (
          id,
          area_id,
          tenant_id
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !existingActivity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (userProfile.role === 'Manager') {
      if (existingActivity.initiative?.area_id !== userProfile.area_id) {
        return NextResponse.json(
          { error: 'Cannot delete activities from other areas' },
          { status: 403 }
        );
      }
    }

    // Delete activity
    const { error: deleteError } = await supabase
      .from('activities')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Error deleting activity:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete activity' },
        { status: 500 }
      );
    }

    // Update initiative progress
    await updateInitiativeProgress(supabase, existingActivity.initiative_id, userProfile.id);

    return NextResponse.json({
      message: 'Activity deleted successfully'
    });

  } catch (error) {
    logger.error('Unexpected error in DELETE activities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to update initiative progress based on activities
 */
async function updateInitiativeProgress(
  supabase: any, 
  initiativeId: string, 
  userId: string
) {
  try {
    // Get all activities for this initiative
    const { data: activities } = await supabase
      .from('activities')
      .select('is_completed')
      .eq('initiative_id', initiativeId);

    if (!activities || activities.length === 0) {
      // No activities, set progress to 0
      await supabase
        .from('initiatives')
        .update({ progress: 0 })
        .eq('id', initiativeId);
      return;
    }

    // Calculate progress
    const totalActivities = activities.length;
    const completedActivities = activities.filter(a => a.is_completed).length;
    const progress = Math.round((completedActivities / totalActivities) * 100);

    // Update initiative progress
    await supabase
      .from('initiatives')
      .update({ 
        progress,
        completion_date: progress === 100 ? new Date().toISOString() : null
      })
      .eq('id', initiativeId);

    // Record in progress history
    await supabase
      .from('progress_history')
      .insert({
        initiative_id: initiativeId,
        completed_activities_count: completedActivities,
        total_activities_count: totalActivities,
        notes: `Progress automatically updated based on activity completion`,
        updated_by: userId
      });

  } catch (error) {
    logger.error('Error updating initiative progress:', error);
  }
}
