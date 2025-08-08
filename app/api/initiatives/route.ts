/**
 * Initiatives API
 * 
 * Provides CRUD operations for initiatives with relationships to objectives and activities.
 * Initiatives are linked to objectives through the objective_initiatives junction table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserProfile } from '@/lib/server-user-profile';
import type { 
  Initiative, 
  InitiativeInsert, 
  InitiativeUpdate,
  InitiativeWithRelations,
  Activity
} from '@/lib/types/database';

/**
 * GET /api/initiatives
 * 
 * Fetches initiatives with their relationships
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
          assigned_to
        ),
        created_by_user:user_profiles!initiatives_created_by_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('tenant_id', userProfile.tenant_id);

    // Apply filters
    const area_id = searchParams.get('area_id');
    const objective_id = searchParams.get('objective_id');
    const created_by = searchParams.get('created_by');
    const min_progress = searchParams.get('min_progress');
    const max_progress = searchParams.get('max_progress');
    
    if (area_id) {
      query = query.eq('area_id', area_id);
    }
    
    // For managers, only show initiatives from their area
    if (userProfile.role === 'Manager' && userProfile.area_id) {
      query = query.eq('area_id', userProfile.area_id);
    }
    
    if (created_by) {
      query = query.eq('created_by', created_by);
    }

    if (min_progress) {
      query = query.gte('progress', parseInt(min_progress));
    }

    if (max_progress) {
      query = query.lte('progress', parseInt(max_progress));
    }

    // Execute query
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching initiatives:', error);
      return NextResponse.json(
        { error: 'Failed to fetch initiatives' },
        { status: 500 }
      );
    }

    // Filter by objective if specified (post-processing due to join table)
    let filteredData = data || [];
    if (objective_id) {
      filteredData = filteredData.filter(init => 
        init.objectives?.some(o => o.objective.id === objective_id)
      );
    }

    // Calculate progress based on activities
    const initiativesWithProgress = filteredData.map(initiative => {
      const totalActivities = initiative.activities?.length || 0;
      const completedActivities = initiative.activities?.filter(a => a.is_completed).length || 0;
      const calculatedProgress = totalActivities > 0 
        ? Math.round((completedActivities / totalActivities) * 100)
        : initiative.progress;

      return {
        ...initiative,
        objectives: initiative.objectives?.map(o => o.objective) || [],
        calculated_progress: calculatedProgress,
        activity_stats: {
          total: totalActivities,
          completed: completedActivities
        }
      };
    });

    return NextResponse.json({
      initiatives: initiativesWithProgress,
      total: initiativesWithProgress.length
    });

  } catch (error) {
    console.error('Unexpected error in GET initiatives:', error);
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

    // Parse request body
    const body = await request.json();
    const { 
      title, 
      description, 
      area_id, 
      objective_ids,
      due_date,
      start_date,
      activities 
    } = body;

    // Validate required fields
    if (!title || !area_id) {
      return NextResponse.json(
        { error: 'Title and area_id are required' },
        { status: 400 }
      );
    }

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
      console.error('Error creating initiative:', initiativeError);
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
        console.error('Error linking objectives:', linkError);
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
        console.error('Error creating activities:', activitiesError);
      }
    }

    return NextResponse.json({
      initiative,
      message: 'Initiative created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST initiatives:', error);
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

    // Parse request body
    const body = await request.json();
    const { 
      id, 
      title, 
      description, 
      progress,
      due_date,
      start_date,
      completion_date,
      objective_ids 
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Initiative ID is required' },
        { status: 400 }
      );
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
      console.error('Error updating initiative:', updateError);
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
    console.error('Unexpected error in PUT initiatives:', error);
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Initiative ID is required' },
        { status: 400 }
      );
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
      console.error('Error deleting initiative:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete initiative' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Initiative deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error in DELETE initiatives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}