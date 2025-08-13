/**
 * Initiatives API
 * 
 * Provides CRUD operations for initiatives with relationships to objectives and activities.
 * Initiatives are linked to objectives through the objective_initiatives junction table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserProfile } from '@/lib/server-user-profile';
import { logger } from '@/lib/logger';
import { 
  validateUuid,
  validateUuidArray,
  searchStringSchema,
  progressSchema,
  dateSchema,
  createEnumSchema,
  safeStringSchema
} from '@/lib/validation/api-validators';
import { z } from 'zod';
import type { 
  Initiative, 
  InitiativeInsert, 
  InitiativeUpdate,
  InitiativeWithRelations,
  Activity
} from '@/lib/types/database';

// Valid enum values for initiatives
const VALID_INITIATIVE_STATUSES = ['planning', 'in_progress', 'completed', 'on_hold'] as const
const VALID_PRIORITIES = ['high', 'medium', 'low'] as const
const VALID_SORT_FIELDS = ['created_at', 'updated_at', 'title', 'progress', 'status', 'start_date', 'due_date'] as const
const VALID_SORT_ORDERS = ['asc', 'desc'] as const

/**
 * GET /api/initiatives
 * 
 * Fetches initiatives with their relationships using StandardQueryParams
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supabase = await createClient();
    
    // Get authenticated user profile
    const { user, userProfile } = await getUserProfile(request);
    if (!user || !userProfile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate query parameters
    // Validate UUIDs
    let area_id: string | null = null;
    let objective_id: string | null = null;
    let initiative_id: string | null = null;
    let assigned_to: string | null = null;
    let created_by: string | null = null;
    
    try {
      area_id = validateUuid(searchParams.get('area_id'));
      objective_id = validateUuid(searchParams.get('objective_id'));
      initiative_id = validateUuid(searchParams.get('initiative_id'));
      assigned_to = validateUuid(searchParams.get('assigned_to'));
      created_by = validateUuid(searchParams.get('created_by'));
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    // Validate date filters
    let start_date: string | null = null;
    let end_date: string | null = null;
    
    try {
      const startDateParam = searchParams.get('start_date');
      const endDateParam = searchParams.get('end_date');
      
      if (startDateParam) {
        start_date = dateSchema.parse(startDateParam);
      }
      if (endDateParam) {
        end_date = dateSchema.parse(endDateParam);
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
    }
    
    // Status filters
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const is_completed = searchParams.get('is_completed');
    
    // Validate and parse progress range
    let min_progress: number | null = null;
    let max_progress: number | null = null;
    
    try {
      const minProgressParam = searchParams.get('min_progress');
      const maxProgressParam = searchParams.get('max_progress');
      
      if (minProgressParam) {
        min_progress = progressSchema.parse(minProgressParam);
      }
      if (maxProgressParam) {
        max_progress = progressSchema.parse(maxProgressParam);
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid progress value. Must be 0-100' }, { status: 400 });
    }
    
    // Validate pagination
    const page = Math.max(1, Math.min(10000, parseInt(searchParams.get('page') || '1')));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;
    
    // Validate sorting
    const sort_by = searchParams.get('sort_by') || 'created_at';
    const sort_order = searchParams.get('sort_order') || 'desc';
    
    // Validate and sanitize search
    let search: string | undefined;
    try {
      const searchParam = searchParams.get('search');
      if (searchParam) {
        search = searchStringSchema.parse(searchParam);
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid search query' }, { status: 400 });
    }

    // Validate enum values
    if (status && !VALID_INITIATIVE_STATUSES.includes(status as any)) {
      return NextResponse.json({ 
        error: 'Invalid status value',
        details: `Must be one of: ${VALID_INITIATIVE_STATUSES.join(', ')}`
      }, { status: 400 });
    }

    if (priority && !VALID_PRIORITIES.includes(priority as any)) {
      return NextResponse.json({ 
        error: 'Invalid priority value',
        details: `Must be one of: ${VALID_PRIORITIES.join(', ')}`
      }, { status: 400 });
    }

    if (!VALID_SORT_FIELDS.includes(sort_by as any)) {
      return NextResponse.json({ 
        error: 'Invalid sort field',
        details: `Must be one of: ${VALID_SORT_FIELDS.join(', ')}`
      }, { status: 400 });
    }

    if (!VALID_SORT_ORDERS.includes(sort_order as any)) {
      return NextResponse.json({ 
        error: 'Invalid sort order',
        details: `Must be one of: ${VALID_SORT_ORDERS.join(', ')}`
      }, { status: 400 });
    }

    // Build query with relationships
    let query = supabase
      .from('initiatives')
      .select(`
        *,
        area:areas!initiatives_area_id_fkey (
          id,
          name
        ),
        objectives:objective_initiatives (
          objective:objectives!objective_initiatives_objective_id_fkey (
            id,
            title,
            description
          )
        ),
        activities (
          id,
          title,
          description,
          is_completed,
          assigned_to,
          assigned_to_profile:user_profiles!activities_assigned_to_fkey (
            id,
            full_name,
            email
          )
        ),
        created_by_user:user_profiles!initiatives_created_by_fkey (
          id,
          full_name,
          email
        )
      `, { count: 'exact' })
      .eq('tenant_id', userProfile.tenant_id)
      .range(offset, offset + limit - 1)
      .order(sort_by, { ascending: sort_order === 'asc' });

    // Apply entity filters
    if (area_id) {
      query = query.eq('area_id', area_id);
    }
    
    // For managers, only show initiatives from their area
    if (userProfile.role === 'Manager' && userProfile.area_id) {
      query = query.eq('area_id', userProfile.area_id);
    }

    if (initiative_id) {
      query = query.eq('id', initiative_id);
    }
    
    if (created_by) {
      query = query.eq('created_by', created_by);
    }

    // Apply status filters
    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      // Note: initiatives table doesn't have priority field in current schema
      // Only objectives have priority. Return proper error for unsupported filter.
      return NextResponse.json({ 
        error: 'Priority filtering not supported for initiatives',
        details: 'Priority field is only available for objectives. Use /api/objectives for priority filtering.'
      }, { status: 400 });
    }

    if (is_completed === 'true') {
      query = query.eq('status', 'completed');
    } else if (is_completed === 'false') {
      query = query.neq('status', 'completed');
    }

    // Apply range filters (already validated)
    if (min_progress !== null) {
      query = query.gte('progress', min_progress);
    }

    if (max_progress !== null) {
      query = query.lte('progress', max_progress);
    }

    // Apply date range filters for initiatives
    if (start_date) {
      // Filter initiatives that start on or after the given start_date
      query = query.gte('start_date', start_date);
    }

    if (end_date) {
      // Filter initiatives that are due on or before the given end_date
      query = query.lte('due_date', end_date);
    }

    // Apply search filter (already sanitized)
    if (search) {
      // Search in title and description using ilike for case-insensitive search
      // The search string has already been sanitized by searchStringSchema
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      logger.error('Error fetching initiatives:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch initiatives',
          details: error.message 
        },
        { status: 500 }
      );
    }

    // Post-processing filters that require complex joins
    let filteredData = data || [];
    
    // Filter by objective if specified (post-processing due to join table)
    if (objective_id) {
      filteredData = filteredData.filter(init => 
        init.objectives?.some((o: any) => o.objective?.id === objective_id)
      );
    }

    // Filter by assigned_to if specified (check activities)
    if (assigned_to) {
      filteredData = filteredData.filter(init => 
        init.activities?.some((activity: any) => activity.assigned_to === assigned_to)
      );
    }

    // Calculate progress based on activities and add metadata
    const initiativesWithProgress = filteredData.map(initiative => {
      const totalActivities = initiative.activities?.length || 0;
      const completedActivities = initiative.activities?.filter((a: any) => a.is_completed).length || 0;
      const calculatedProgress = totalActivities > 0 
        ? Math.round((completedActivities / totalActivities) * 100)
        : initiative.progress;

      // Extract assigned users from activities
      const assignedUsers = initiative.activities
        ?.filter((a: any) => a.assigned_to)
        ?.map((a: any) => ({
          user_id: a.assigned_to,
          user_name: a.assigned_to_profile?.full_name,
          user_email: a.assigned_to_profile?.email
        })) || [];

      // Get unique assigned users
      const uniqueAssignedUsers = assignedUsers.reduce((unique: any[], user: any) => {
        if (!unique.find(u => u.user_id === user.user_id)) {
          unique.push(user);
        }
        return unique;
      }, []);

      return {
        ...initiative,
        objectives: initiative.objectives?.map((o: any) => o.objective) || [],
        calculated_progress: calculatedProgress,
        activity_stats: {
          total: totalActivities,
          completed: completedActivities,
          completion_rate: totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0
        },
        assigned_users: uniqueAssignedUsers,
        area_name: initiative.area?.name,
        created_by_name: initiative.created_by_user?.full_name
      };
    });

    // Calculate pagination metadata
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      data: initiativesWithProgress,
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
      },
      filters_applied: {
        area_id,
        objective_id,
        initiative_id,
        assigned_to,
        status,
        priority,
        is_completed,
        min_progress,
        max_progress,
        start_date,
        end_date,
        search,
        sort_by,
        sort_order,
        created_by
      }
    });

  } catch (error) {
    logger.error('Unexpected error in GET initiatives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/initiatives
 * 
 * Creates a new initiative
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user profile
    const { user, userProfile } = await getUserProfile(request);
    if (!user || !userProfile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    
    // Create validation schema for POST
    const initiativeCreateSchema = z.object({
      title: safeStringSchema,
      description: safeStringSchema.optional(),
      area_id: z.string().uuid('Invalid area_id format'),
      objective_ids: z.array(z.string().uuid()).optional(),
      due_date: dateSchema.optional(),
      start_date: dateSchema.optional(),
      activities: z.array(z.object({
        title: safeStringSchema,
        description: safeStringSchema.optional(),
        assigned_to: z.string().uuid().optional()
      })).optional()
    });
    
    const validationResult = initiativeCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const { 
      title, 
      description, 
      area_id, 
      objective_ids,
      due_date,
      start_date,
      activities 
    } = validationResult.data;

    // Check permissions
    if (userProfile.role === 'Manager') {
      if (area_id !== userProfile.area_id) {
        return NextResponse.json(
          { error: 'Cannot create initiatives for other areas' },
          { status: 403 }
        );
      }
    }

    // Create initiative
    const initiativeData: InitiativeInsert = {
      tenant_id: userProfile.tenant_id,
      area_id,
      title,
      description,
      created_by: userProfile.id,
      due_date,
      start_date,
      progress: 0
    };

    const { data: initiative, error: initiativeError } = await supabase
      .from('initiatives')
      .insert(initiativeData)
      .select()
      .single();

    if (initiativeError) {
      logger.error('Error creating initiative:', initiativeError);
      return NextResponse.json(
        { error: 'Failed to create initiative' },
        { status: 500 }
      );
    }

    // Link to objectives if provided
    if (objective_ids && objective_ids.length > 0) {
      const objectiveLinks = objective_ids.map((objective_id: string) => ({
        objective_id,
        initiative_id: initiative.id
      }));

      const { error: linkError } = await supabase
        .from('objective_initiatives')
        .insert(objectiveLinks);

      if (linkError) {
        logger.error('Error linking objectives:', linkError);
      }
    }

    // Create activities if provided
    if (activities && activities.length > 0) {
      const activitiesData = activities.map((activity: any) => ({
        initiative_id: initiative.id,
        title: activity.title,
        description: activity.description,
        assigned_to: activity.assigned_to
      }));

      const { error: activitiesError } = await supabase
        .from('activities')
        .insert(activitiesData);

      if (activitiesError) {
        logger.error('Error creating activities:', activitiesError);
      }
    }

    return NextResponse.json({
      initiative,
      message: 'Initiative created successfully'
    }, { status: 201 });

  } catch (error) {
    logger.error('Unexpected error in POST initiatives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/initiatives
 * 
 * Updates an initiative
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user profile
    const { user, userProfile } = await getUserProfile(request);
    if (!user || !userProfile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    
    // Create validation schema for PUT
    const initiativeUpdateSchema = z.object({
      id: z.string().uuid('Invalid initiative ID format'),
      title: safeStringSchema.optional(),
      description: safeStringSchema.optional(),
      progress: progressSchema.optional(),
      due_date: dateSchema.optional(),
      start_date: dateSchema.optional(),
      completion_date: z.string().datetime().optional(),
      objective_ids: z.array(z.string().uuid()).optional()
    });
    
    const validationResult = initiativeUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const { 
      id, 
      title, 
      description, 
      progress,
      due_date,
      start_date,
      completion_date,
      objective_ids 
    } = validationResult.data;

    // Get existing initiative to check permissions
    const { data: existingInitiative, error: fetchError } = await supabase
      .from('initiatives')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingInitiative) {
      return NextResponse.json(
        { error: 'Initiative not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (userProfile.role === 'Manager') {
      if (existingInitiative.area_id !== userProfile.area_id) {
        return NextResponse.json(
          { error: 'Cannot update initiatives from other areas' },
          { status: 403 }
        );
      }
    }

    // Update initiative
    const updateData: InitiativeUpdate = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (progress !== undefined) updateData.progress = progress;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (completion_date !== undefined) updateData.completion_date = completion_date;

    const { data: updatedInitiative, error: updateError } = await supabase
      .from('initiatives')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating initiative:', updateError);
      return NextResponse.json(
        { error: 'Failed to update initiative' },
        { status: 500 }
      );
    }

    // Update objective associations if provided
    if (objective_ids !== undefined) {
      // Remove existing associations
      await supabase
        .from('objective_initiatives')
        .delete()
        .eq('initiative_id', id);

      // Add new associations
      if (objective_ids.length > 0) {
        const objectiveLinks = objective_ids.map((objective_id: string) => ({
          objective_id,
          initiative_id: id
        }));

        await supabase
          .from('objective_initiatives')
          .insert(objectiveLinks);
      }
    }

    // Record progress history if progress changed
    if (progress !== undefined && progress !== existingInitiative.progress) {
      // Get activity stats
      const { data: activities } = await supabase
        .from('activities')
        .select('is_completed')
        .eq('initiative_id', id);

      const total = activities?.length || 0;
      const completed = activities?.filter(a => a.is_completed).length || 0;

      await supabase
        .from('progress_history')
        .insert({
          initiative_id: id,
          completed_activities_count: completed,
          total_activities_count: total,
          notes: `Progress updated to ${progress}%`,
          updated_by: userProfile.id
        });
    }

    return NextResponse.json({
      initiative: updatedInitiative,
      message: 'Initiative updated successfully'
    });

  } catch (error) {
    logger.error('Unexpected error in PUT initiatives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/initiatives
 * 
 * Deletes an initiative
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user profile
    const { user, userProfile } = await getUserProfile(request);
    if (!user || !userProfile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json(
        { error: 'Initiative ID is required' },
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

    // Get existing initiative to check permissions
    const { data: existingInitiative, error: fetchError } = await supabase
      .from('initiatives')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingInitiative) {
      return NextResponse.json(
        { error: 'Initiative not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (userProfile.role === 'Manager') {
      if (existingInitiative.area_id !== userProfile.area_id) {
        return NextResponse.json(
          { error: 'Cannot delete initiatives from other areas' },
          { status: 403 }
        );
      }
    }

    // Check if initiative has activities
    const { data: activities } = await supabase
      .from('activities')
      .select('id')
      .eq('initiative_id', id)
      .limit(1);

    if (activities && activities.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete initiative with associated activities. Delete activities first.' },
        { status: 400 }
      );
    }

    // Delete objective associations
    await supabase
      .from('objective_initiatives')
      .delete()
      .eq('initiative_id', id);

    // Delete progress history
    await supabase
      .from('progress_history')
      .delete()
      .eq('initiative_id', id);

    // Delete initiative
    const { error: deleteError } = await supabase
      .from('initiatives')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Error deleting initiative:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete initiative' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Initiative deleted successfully'
    });

  } catch (error) {
    logger.error('Unexpected error in DELETE initiatives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}