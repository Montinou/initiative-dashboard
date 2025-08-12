/**
 * Objectives API
 * 
 * Provides CRUD operations for objectives with role-based permissions.
 * Objectives are high-level goals that group multiple initiatives.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserProfile } from '@/lib/server-user-profile';
import type { 
  Objective, 
  ObjectiveInsert, 
  ObjectiveUpdate,
  ObjectiveWithRelations 
} from '@/lib/types/database';

/**
 * GET /api/dashboard/objectives
 * 
 * Fetches objectives with optional filtering
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

    // Build query - using the same pattern as initiatives API
    let query = supabase
      .from('objectives')
      .select(`
        *,
        area:areas!objectives_area_id_fkey (
          id,
          name
        ),
        quarters:objective_quarters(
          quarter:quarters!objective_quarters_quarter_id_fkey(
            id,
            quarter_name,
            start_date,
            end_date
          )
        ),
        initiatives:objective_initiatives(
          initiative:initiatives!objective_initiatives_initiative_id_fkey(
            id,
            title,
            progress,
            area_id,
            status,
            description
          )
        )
      `)
      .eq('tenant_id', userProfile.tenant_id);

    // Apply filters
    const area_id = searchParams.get('area_id');
    const quarter_id = searchParams.get('quarter_id');
    const created_by = searchParams.get('created_by');

    if (area_id) {
      query = query.eq('area_id', area_id);
    }

    // For managers, only show objectives from their area
    if (userProfile.role === 'Manager' && userProfile.area_id) {
      query = query.eq('area_id', userProfile.area_id);
    }

    if (created_by) {
      query = query.eq('created_by', created_by);
    }

    // Execute query
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching objectives:', error);
      return NextResponse.json(
        { error: 'Failed to fetch objectives' },
        { status: 500 }
      );
    }

    // Filter by quarter if specified (needs post-processing due to join table)
    let filteredData = data || [];
    if (quarter_id) {
      filteredData = filteredData.filter(obj => 
        obj.quarters?.some((q: any) => q.quarter?.id === quarter_id)
      );
    }

    // Format response and ensure initiatives are properly extracted - matching initiatives API pattern
    const objectives: ObjectiveWithRelations[] = filteredData.map(obj => {
      // Extract initiatives from junction table - matching initiatives API pattern
      let initiatives: any[] = []
      if (obj.initiatives && Array.isArray(obj.initiatives)) {
        initiatives = obj.initiatives
          .map((item: any) => item.initiative)
          .filter(Boolean)
      }
      
      // Extract quarters from junction table - matching initiatives API pattern
      let quarters: any[] = []
      if (obj.quarters && Array.isArray(obj.quarters)) {
        quarters = obj.quarters
          .map((item: any) => item.quarter)
          .filter(Boolean)
      }
      
      return {
        ...obj,
        quarters: quarters,
        initiatives: initiatives,
        initiatives_count: initiatives.length,
        overall_progress: initiatives.length > 0
          ? Math.round(initiatives.reduce((sum: number, init: any) => sum + (init.progress || 0), 0) / initiatives.length)
          : 0
      }
    });

    return NextResponse.json({
      objectives,
      total: objectives.length,
      data: objectives // Also include as 'data' for compatibility
    });

  } catch (error) {
    console.error('Unexpected error in GET objectives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/objectives
 * 
 * Creates a new objective
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
    const { title, description, area_id, quarter_ids } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Check permissions
    if (userProfile.role === 'Manager') {
      // Managers can only create objectives for their own area
      if (area_id && area_id !== userProfile.area_id) {
        return NextResponse.json(
          { error: 'Cannot create objectives for other areas' },
          { status: 403 }
        );
      }
    }

    // Create objective
    const objectiveData: ObjectiveInsert = {
      tenant_id: userProfile.tenant_id,
      area_id: area_id || userProfile.area_id,
      title,
      description,
      created_by: userProfile.id
    };

    const { data: objective, error: objectiveError } = await supabase
      .from('objectives')
      .insert(objectiveData)
      .select()
      .single();

    if (objectiveError) {
      console.error('Error creating objective:', objectiveError);
      return NextResponse.json(
        { error: 'Failed to create objective' },
        { status: 500 }
      );
    }

    // Link quarters if provided
    if (quarter_ids && quarter_ids.length > 0) {
      const quarterLinks = quarter_ids.map((quarter_id: string) => ({
        objective_id: objective.id,
        quarter_id
      }));

      const { error: quarterError } = await supabase
        .from('objective_quarters')
        .insert(quarterLinks);

      if (quarterError) {
        console.error('Error linking quarters:', quarterError);
      }
    }

    return NextResponse.json({
      objective,
      message: 'Objective created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in POST objectives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/dashboard/objectives
 * 
 * Updates an objective
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
    const { id, title, description, area_id, quarter_ids } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Objective ID is required' },
        { status: 400 }
      );
    }

    // Get existing objective to check permissions
    const { data: existingObjective, error: fetchError } = await supabase
      .from('objectives')
      .select('*, area:areas!objectives_area_id_fkey(id)')
      .eq('id', id)
      .single();

    if (fetchError || !existingObjective) {
      return NextResponse.json(
        { error: 'Objective not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (userProfile.role === 'Manager') {
      if (existingObjective.area_id !== userProfile.area_id) {
        return NextResponse.json(
          { error: 'Cannot update objectives from other areas' },
          { status: 403 }
        );
      }
      // Prevent changing area
      if (area_id && area_id !== existingObjective.area_id) {
        return NextResponse.json(
          { error: 'Cannot move objective to another area' },
          { status: 403 }
        );
      }
    }

    // Update objective
    const updateData: ObjectiveUpdate = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (area_id !== undefined && userProfile.role !== 'Manager') {
      updateData.area_id = area_id;
    }

    const { data: updatedObjective, error: updateError } = await supabase
      .from('objectives')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating objective:', updateError);
      return NextResponse.json(
        { error: 'Failed to update objective' },
        { status: 500 }
      );
    }

    // Update quarter associations if provided
    if (quarter_ids !== undefined) {
      // Remove existing associations
      await supabase
        .from('objective_quarters')
        .delete()
        .eq('objective_id', id);

      // Add new associations
      if (quarter_ids.length > 0) {
        const quarterLinks = quarter_ids.map((quarter_id: string) => ({
          objective_id: id,
          quarter_id
        }));

        await supabase
          .from('objective_quarters')
          .insert(quarterLinks);
      }
    }

    return NextResponse.json({
      objective: updatedObjective,
      message: 'Objective updated successfully'
    });

  } catch (error) {
    console.error('Unexpected error in PUT objectives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dashboard/objectives
 * 
 * Deletes an objective
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

    // Parse request body
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Objective ID is required' },
        { status: 400 }
      );
    }

    // Get existing objective to check permissions
    const { data: existingObjective, error: fetchError } = await supabase
      .from('objectives')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingObjective) {
      return NextResponse.json(
        { error: 'Objective not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (userProfile.role === 'Manager') {
      if (existingObjective.area_id !== userProfile.area_id) {
        return NextResponse.json(
          { error: 'Cannot delete objectives from other areas' },
          { status: 403 }
        );
      }
    }

    // Check if objective has initiatives
    const { data: initiatives } = await supabase
      .from('objective_initiatives')
      .select('id')
      .eq('objective_id', id)
      .limit(1);

    if (initiatives && initiatives.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete objective with associated initiatives' },
        { status: 400 }
      );
    }

    // Delete quarter associations first
    await supabase
      .from('objective_quarters')
      .delete()
      .eq('objective_id', id);

    // Delete objective
    const { error: deleteError } = await supabase
      .from('objectives')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting objective:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete objective' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Objective deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error in DELETE objectives:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}