/**
 * Activities API
 * 
 * Provides CRUD operations for activities (tasks within initiatives).
 * Activities track the granular work items that contribute to initiative progress.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserProfile } from '@/lib/server-user-profile';
import type { 
  Activity,
  ActivityWithRelations
} from '@/lib/types/database';

/**
 * GET /api/activities
 * 
 * Fetches activities with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supabase = await createClient();
    
    // Get authenticated user profile
    const userProfile = await getUserProfile(request);
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Build query
    let query = supabase
      .from('activities')
      .select(`
        *,
        initiative:initiatives!activities_initiative_id_fkey (
          id,
          title,
          area_id,
          tenant_id
        ),
        assigned_to_user:user_profiles!activities_assigned_to_fkey (
          id,
          full_name,
          email
        )
      `);

    // Apply filters
    const initiative_id = searchParams.get('initiative_id');
    const assigned_to = searchParams.get('assigned_to');
    const is_completed = searchParams.get('is_completed');

    if (initiative_id) {
      query = query.eq('initiative_id', initiative_id);
    }

    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to);
    }

    if (is_completed !== null) {
      query = query.eq('is_completed', is_completed === 'true');
    }

    // For managers, filter by their area's initiatives
    if (userProfile.role === 'Manager' && userProfile.area_id) {
      // First get initiatives for the manager's area
      const { data: areaInitiatives } = await supabase
        .from('initiatives')
        .select('id')
        .eq('area_id', userProfile.area_id)
        .eq('tenant_id', userProfile.tenant_id);

      if (areaInitiatives) {
        const initiativeIds = areaInitiatives.map(i => i.id);
        query = query.in('initiative_id', initiativeIds);
      }
    }

    // Execute query
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching activities:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    // Filter out activities from other tenants (extra security layer)
    const filteredActivities = (data || []).filter(activity => 
      activity.initiative?.tenant_id === userProfile.tenant_id
    );

    return NextResponse.json({
      activities: filteredActivities,
      total: filteredActivities.length
    });

  } catch (error) {
    console.error('Unexpected error in GET activities:', error);
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
    const supabase = await createClient();
    
    // Get authenticated user profile
    const userProfile = await getUserProfile(request);
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { initiative_id, title, description, assigned_to } = body;

    // Validate required fields
    if (!initiative_id || !title) {
      return NextResponse.json(
        { error: 'Initiative ID and title are required' },
        { status: 400 }
      );
    }

    // Verify initiative exists and user has permission
    const { data: initiative, error: initiativeError } = await supabase
      .from('initiatives')
      .select('*, area:areas!initiatives_area_id_fkey(id)')
      .eq('id', initiative_id)
      .eq('tenant_id', userProfile.tenant_id)
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
      console.error('Error creating activity:', activityError);
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
    console.error('Unexpected error in POST activities:', error);
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
    const supabase = await createClient();
    
    // Get authenticated user profile
    const userProfile = await getUserProfile(request);
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { id, title, description, is_completed, assigned_to } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
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
      console.error('Error updating activity:', updateError);
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
    console.error('Unexpected error in PUT activities:', error);
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
    const supabase = await createClient();
    
    // Get authenticated user profile
    const userProfile = await getUserProfile(request);
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
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
      console.error('Error deleting activity:', deleteError);
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
    console.error('Unexpected error in DELETE activities:', error);
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
    console.error('Error updating initiative progress:', error);
  }
}