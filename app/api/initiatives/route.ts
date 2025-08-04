/**
 * Enhanced Initiatives API with KPI Calculations and Role-Based Filtering
 * 
 * Provides comprehensive initiative management with:
 * - Real-time KPI calculations using materialized views
 * - Role-based data filtering and permissions
 * - Weighted progress tracking
 * - Strategic initiative management
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { 
  calculateKPISummary, 
  getInitiativesWithKPIs,
  getStrategicMetrics,
  validateKPIData,
  type KPIFilters
} from '@/lib/kpi/calculator';
import { getUserProfile } from '@/lib/server-user-profile';
import type { Initiative, ProgressMethod } from '@/types/database';

// ===================================================================================
// GET: FETCH INITIATIVES WITH KPI CALCULATIONS
// ===================================================================================

/**
 * GET /api/initiatives
 * 
 * Returns initiatives with KPI calculations, filtered by user role and permissions
 * Supports comprehensive filtering and real-time KPI summaries
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get authenticated user profile
    const userProfile = await getUserProfile(request);
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters with enhanced filtering
    const filters: KPIFilters = {
      area_id: searchParams.get('area_id') || undefined,
      status: searchParams.get('status') || undefined,
      is_strategic: searchParams.get('is_strategic') === 'true' ? true : 
                   searchParams.get('is_strategic') === 'false' ? false : undefined,
      kpi_category: searchParams.get('kpi_category') || undefined,
      progress_method: searchParams.get('progress_method') as ProgressMethod || undefined,
      date_range: searchParams.get('start_date') && searchParams.get('end_date') ? {
        start: searchParams.get('start_date')!,
        end: searchParams.get('end_date')!
      } : undefined
    };

    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeSubtasks = searchParams.get('include_subtasks') === 'true';
    const includeKPISummary = searchParams.get('include_kpi_summary') !== 'false'; // Default true

    // Apply role-based filtering
    let effectiveFilters = { ...filters };
    
    // Managers can only see their area initiatives
    if (userProfile.role === 'Manager' && userProfile.area_id) {
      effectiveFilters.area_id = userProfile.area_id;
    }
    
    // Only CEO/Admin can filter by strategic initiatives
    if (filters.is_strategic && !['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view strategic initiatives' },
        { status: 403 }
      );
    }

    // Fetch initiatives with KPI calculations
    const initiatives = await getInitiativesWithKPIs(
      userProfile.tenant_id,
      effectiveFilters,
      userProfile.role,
      userProfile.area_id
    );

    // Apply pagination
    const paginatedInitiatives = initiatives.slice(offset, offset + limit);

    // Enrich with subtasks if requested
    let enrichedInitiatives = paginatedInitiatives;
    if (includeSubtasks) {
      const supabase = createClient(cookies());
      
      for (let i = 0; i < enrichedInitiatives.length; i++) {
        const { data: subtasks } = await supabase
          .from('activities')
          .select('*')
          .eq('initiative_id', enrichedInitiatives[i].id)
          .eq('tenant_id', userProfile.tenant_id)
          .order('subtask_order', { ascending: true })
          .order('created_at', { ascending: true });

        enrichedInitiatives[i] = {
          ...enrichedInitiatives[i],
          subtasks: subtasks || []
        };
      }
    }

    // Calculate KPI summary if requested
    let kpiSummary = null;
    let strategicMetrics = null;
    
    if (includeKPISummary) {
      kpiSummary = await calculateKPISummary(
        userProfile.tenant_id,
        effectiveFilters,
        userProfile.role,
        userProfile.area_id
      );

      // Include strategic metrics for CEO/Admin
      if (['CEO', 'Admin'].includes(userProfile.role)) {
        strategicMetrics = await getStrategicMetrics(userProfile.tenant_id);
      }
    }

    // Prepare response metadata
    const metadata = {
      user_role: userProfile.role,
      user_area_id: userProfile.area_id,
      can_create_strategic: ['CEO', 'Admin'].includes(userProfile.role),
      can_view_all_areas: ['CEO', 'Admin'].includes(userProfile.role),
      applied_filters: effectiveFilters,
      pagination: {
        total: initiatives.length,
        limit,
        offset,
        hasMore: initiatives.length > offset + limit,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(initiatives.length / limit)
      }
    };

    return NextResponse.json({
      success: true,
      initiatives: enrichedInitiatives,
      kpi_summary: kpiSummary,
      strategic_metrics: strategicMetrics,
      metadata
    });

  } catch (error) {
    console.error('Error in enhanced initiatives GET endpoint:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// ===================================================================================
// POST: CREATE NEW INITIATIVE WITH KPI FIELDS
// ===================================================================================

/**
 * POST /api/initiatives
 * 
 * Creates a new initiative with KPI standardization fields
 * Validates role permissions and KPI data consistency
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(cookies());
    
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
    const {
      title,
      description,
      target_date,
      priority = 'medium',
      budget,
      subtasks = [],
      
      // New KPI fields
      progress_method = 'manual',
      weight_factor = 1.0,
      estimated_hours,
      is_strategic = false,
      kpi_category = 'operational',
      dependencies = [],
      success_criteria = {}
    } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Role-based validation
    let effectiveAreaId = userProfile.area_id;
    let effectiveIsStrategic = is_strategic;

    // Managers can only create initiatives in their area
    if (userProfile.role === 'Manager') {
      if (!userProfile.area_id) {
        return NextResponse.json(
          { error: 'Manager must be assigned to an area' },
          { status: 403 }
        );
      }
      effectiveIsStrategic = false; // Managers cannot create strategic initiatives
    }

    // Only CEO/Admin can create strategic initiatives
    if (is_strategic && !['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Only CEO and Admin can create strategic initiatives' },
        { status: 403 }
      );
    }

    // CEO/Admin can specify area_id in body (for cross-area initiatives)
    if (['CEO', 'Admin'].includes(userProfile.role) && body.area_id) {
      effectiveAreaId = body.area_id;
    }

    // Prepare initiative data
    const initiativeData = {
      title: title.trim(),
      description: description?.trim() || null,
      target_date: target_date || null,
      priority,
      budget: budget || null,
      tenant_id: userProfile.tenant_id,
      area_id: effectiveAreaId,
      created_by: userProfile.id,
      owner_id: userProfile.user_id,
      status: 'planning' as const,
      progress: 0,
      
      // KPI standardization fields
      progress_method: progress_method as ProgressMethod,
      weight_factor: Math.max(0.1, Math.min(3.0, weight_factor)),
      estimated_hours: estimated_hours || null,
      actual_hours: 0,
      is_strategic: effectiveIsStrategic,
      kpi_category,
      dependencies,
      success_criteria
    };

    // Validate KPI data consistency
    const kpiValidationErrors = validateKPIData(initiativeData as Initiative);
    if (kpiValidationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'KPI data validation failed',
          validation_errors: kpiValidationErrors
        },
        { status: 400 }
      );
    }

    // Create the initiative
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

    // Create subtasks if provided and progress method supports them
    let createdSubtasks = [];
    if (subtasks.length > 0 && ['subtask_based', 'hybrid'].includes(progress_method)) {
      // Calculate equal weight distribution if not provided
      const totalSubtasks = subtasks.length;
      const equalWeight = Math.round((100 / totalSubtasks) * 100) / 100; // Round to 2 decimals

      const subtasksToCreate = subtasks
        .filter((subtask: any) => subtask.title && subtask.title.trim())
        .map((subtask: any, index: number) => ({
          title: subtask.title.trim(),
          description: subtask.description?.trim() || null,
          initiative_id: initiative.id,
          tenant_id: userProfile.tenant_id,
          status: 'Pendiente',
          progress: 0,
          weight_percentage: subtask.weight_percentage || equalWeight,
          estimated_hours: subtask.estimated_hours || null,
          actual_hours: 0,
          subtask_order: index + 1,
          priority: subtask.priority || 'medium',
          assigned_to: subtask.assigned_to || null,
          due_date: subtask.due_date || null
        }));

      const { data: subtaskData, error: subtasksError } = await supabase
        .from('activities')
        .insert(subtasksToCreate)
        .select();

      if (subtasksError) {
        console.error('Error creating subtasks:', subtasksError);
        // Don't fail the entire operation, just log the error
      } else {
        createdSubtasks = subtaskData || [];
      }
    }

    // Log the creation in audit trail
    await supabase
      .from('audit_log')
      .insert({
        tenant_id: userProfile.tenant_id,
        user_id: userProfile.id,
        action: 'CREATE',
        resource_type: 'initiative',
        resource_id: initiative.id,
        new_values: {
          ...initiative,
          subtasks_created: createdSubtasks.length
        }
      });

    // Return the created initiative with subtasks and KPI metadata
    return NextResponse.json({
      success: true,
      initiative: {
        ...initiative,
        subtasks: createdSubtasks,
        subtask_count: createdSubtasks.length,
        completed_subtask_count: 0,
        subtask_completion_rate: 0,
        kpi_validation_status: 'valid'
      },
      metadata: {
        user_role: userProfile.role,
        can_edit: true,
        can_delete: ['CEO', 'Admin'].includes(userProfile.role) || initiative.created_by === userProfile.id
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error in enhanced initiatives POST endpoint:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// ===================================================================================
// PUT: UPDATE INITIATIVE WITH KPI VALIDATION
// ===================================================================================

/**
 * PUT /api/initiatives
 * 
 * Updates an existing initiative with KPI field validation
 * Handles role-based permissions and automatic progress recalculation
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient(cookies());
    
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
    const { id: initiativeId, ...updates } = body;

    if (!initiativeId) {
      return NextResponse.json(
        { error: 'Initiative ID is required' },
        { status: 400 }
      );
    }

    // Fetch existing initiative with permission check
    const { data: existingInitiative, error: fetchError } = await supabase
      .from('initiatives')
      .select('*')
      .eq('id', initiativeId)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (fetchError || !existingInitiative) {
      return NextResponse.json(
        { error: 'Initiative not found or access denied' },
        { status: 404 }
      );
    }

    // Role-based permission checks
    const canEdit = 
      ['CEO', 'Admin'].includes(userProfile.role) ||
      (userProfile.role === 'Manager' && existingInitiative.area_id === userProfile.area_id) ||
      existingInitiative.created_by === userProfile.id;

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Insufficient permissions to edit this initiative' },
        { status: 403 }
      );
    }

    // Validate strategic initiative permissions
    if (updates.is_strategic === true && !['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Only CEO and Admin can mark initiatives as strategic' },
        { status: 403 }
      );
    }

    // Clean up updates (remove system fields and invalid values)
    const cleanUpdates = Object.entries(updates)
      .filter(([key, value]) => {
        // Remove system fields and null/undefined values
        if (['id', 'tenant_id', 'created_by', 'created_at'].includes(key)) {
          return false;
        }
        return value !== null && value !== undefined;
      })
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    // Validate KPI fields if they're being updated
    if (Object.keys(cleanUpdates).some(key => 
      ['progress_method', 'weight_factor', 'is_strategic', 'estimated_hours'].includes(key)
    )) {
      const updatedInitiative = { ...existingInitiative, ...cleanUpdates };
      const kpiValidationErrors = validateKPIData(updatedInitiative as Initiative);
      
      if (kpiValidationErrors.length > 0) {
        return NextResponse.json(
          { 
            error: 'KPI data validation failed',
            validation_errors: kpiValidationErrors
          },
          { status: 400 }
        );
      }
    }

    // Add updated timestamp
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

    // Log the update in audit trail
    await supabase
      .from('audit_log')
      .insert({
        tenant_id: userProfile.tenant_id,
        user_id: userProfile.id,
        action: 'UPDATE',
        resource_type: 'initiative',
        resource_id: initiativeId,
        old_values: existingInitiative,
        new_values: updatedInitiative
      });

    // If progress method changed to subtask_based, trigger recalculation
    if (cleanUpdates.progress_method === 'subtask_based') {
      // The trigger function will automatically recalculate progress
      // We can optionally return the recalculated progress here
    }

    return NextResponse.json({
      success: true,
      initiative: updatedInitiative,
      metadata: {
        user_role: userProfile.role,
        can_edit: canEdit,
        can_delete: ['CEO', 'Admin'].includes(userProfile.role) || updatedInitiative.created_by === userProfile.id,
        kpi_validation_status: 'valid'
      }
    });

  } catch (error) {
    console.error('Error in enhanced initiatives PUT endpoint:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}