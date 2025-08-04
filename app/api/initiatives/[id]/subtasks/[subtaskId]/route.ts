/**
 * Individual Subtask Management API
 * 
 * Handles CRUD operations for individual subtasks with:
 * - Weight validation on updates
 * - Automatic parent initiative progress recalculation
 * - Role-based permissions
 * - Optimistic locking for concurrent updates
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getUserProfile } from '@/lib/server-user-profile';
import type { Subtask } from '@/types/database';

// ===================================================================================
// TYPES
// ===================================================================================

interface SubtaskUpdateResponse {
  success: boolean;
  subtask?: Subtask;
  initiative_progress_updated?: boolean;
  previous_progress?: number;
  new_progress?: number;
  weight_impact?: number;
  validation_warnings?: string[];
  metadata?: {
    user_role: string;
    can_edit: boolean;
    can_delete: boolean;
  };
}

// ===================================================================================
// GET: FETCH INDIVIDUAL SUBTASK
// ===================================================================================

/**
 * GET /api/initiatives/[id]/subtasks/[subtaskId]
 * 
 * Returns a specific subtask with validation status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; subtaskId: string } }
) {
  try {
    const { id: initiativeId, subtaskId } = params;
    const supabase = createClient(cookies());
    
    // Get authenticated user profile
    const userProfile = await getUserProfile(request);
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify initiative access
    const { data: initiative, error: initiativeError } = await supabase
      .from('initiatives')
      .select('*')
      .eq('id', initiativeId)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (initiativeError || !initiative) {
      return NextResponse.json(
        { error: 'Initiative not found or access denied' },
        { status: 404 }
      );
    }

    // Role-based access check
    const hasAccess = 
      ['CEO', 'Admin'].includes(userProfile.role) ||
      (userProfile.role === 'Manager' && initiative.area_id === userProfile.area_id) ||
      initiative.created_by === userProfile.id;

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view subtask' },
        { status: 403 }
      );
    }

    // Fetch the specific subtask
    const { data: subtask, error: subtaskError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', subtaskId)
      .eq('initiative_id', initiativeId)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (subtaskError || !subtask) {
      return NextResponse.json(
        { error: 'Subtask not found' },
        { status: 404 }
      );
    }

    // Prepare metadata
    const canEdit = 
      ['CEO', 'Admin'].includes(userProfile.role) ||
      (userProfile.role === 'Manager' && initiative.area_id === userProfile.area_id);

    const metadata = {
      user_role: userProfile.role,
      can_edit: canEdit,
      can_delete: canEdit,
      initiative_progress_method: initiative.progress_method,
      initiative_progress: initiative.progress
    };

    return NextResponse.json({
      success: true,
      subtask,
      metadata
    });

  } catch (error) {
    console.error('Error in subtask GET endpoint:', error);
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
// PUT: UPDATE INDIVIDUAL SUBTASK
// ===================================================================================

/**
 * PUT /api/initiatives/[id]/subtasks/[subtaskId]
 * 
 * Updates a specific subtask with weight validation and progress recalculation
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; subtaskId: string } }
) {
  try {
    const { id: initiativeId, subtaskId } = params;
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
    const { expected_version, ...updates } = body; // Optimistic locking support

    // Verify initiative access and get current data
    const { data: initiative, error: initiativeError } = await supabase
      .from('initiatives')
      .select('*')
      .eq('id', initiativeId)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (initiativeError || !initiative) {
      return NextResponse.json(
        { error: 'Initiative not found or access denied' },
        { status: 404 }
      );
    }

    // Permission check
    const canEdit = 
      ['CEO', 'Admin'].includes(userProfile.role) ||
      (userProfile.role === 'Manager' && initiative.area_id === userProfile.area_id);

    if (!canEdit) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update subtask' },
        { status: 403 }
      );
    }

    // Fetch current subtask data
    const { data: currentSubtask, error: subtaskError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', subtaskId)
      .eq('initiative_id', initiativeId)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (subtaskError || !currentSubtask) {
      return NextResponse.json(
        { error: 'Subtask not found' },
        { status: 404 }
      );
    }

    // Optimistic locking check (if version provided)
    if (expected_version && currentSubtask.updated_at !== expected_version) {
      return NextResponse.json(
        { 
          error: 'Concurrent modification detected',
          current_version: currentSubtask.updated_at,
          details: 'The subtask was modified by another user. Please refresh and try again.'
        },
        { status: 409 }
      );
    }

    // Weight validation if weight is being changed
    if (updates.weight_percentage !== undefined && updates.weight_percentage !== currentSubtask.weight_percentage) {
      const validationResult = await validateWeightChange(
        supabase,
        initiativeId,
        subtaskId,
        userProfile.tenant_id,
        currentSubtask.weight_percentage,
        updates.weight_percentage,
        initiative.progress_method
      );

      if (!validationResult.valid) {
        return NextResponse.json(
          { 
            error: 'Weight validation failed',
            details: validationResult.errors,
            current_total_weight: validationResult.currentTotalWeight,
            new_total_weight: validationResult.newTotalWeight
          },
          { status: 400 }
        );
      }
    }

    // Prepare clean updates
    const cleanUpdates = Object.entries(updates)
      .filter(([key, value]) => {
        // Remove system fields
        if (['id', 'initiative_id', 'tenant_id', 'created_at'].includes(key)) {
          return false;
        }
        return value !== null && value !== undefined;
      })
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    // Auto-set completion_date when status changes to completed
    if (cleanUpdates.status === 'Completado' && currentSubtask.status !== 'Completado') {
      cleanUpdates.completion_date = new Date().toISOString();
    } else if (cleanUpdates.status !== 'Completado' && currentSubtask.status === 'Completado') {
      cleanUpdates.completion_date = null;
    }

    // Add updated timestamp
    cleanUpdates.updated_at = new Date().toISOString();

    // Store previous values for progress calculation
    const previousProgress = initiative.progress;
    const statusChanged = cleanUpdates.status !== undefined && cleanUpdates.status !== currentSubtask.status;
    const weightChanged = cleanUpdates.weight_percentage !== undefined && cleanUpdates.weight_percentage !== currentSubtask.weight_percentage;

    // Update the subtask
    const { data: updatedSubtask, error: updateError } = await supabase
      .from('activities')
      .update(cleanUpdates)
      .eq('id', subtaskId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating subtask:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subtask' },
        { status: 500 }
      );
    }

    // Calculate weight impact and initiative progress update
    let initiativeProgressUpdated = false;
    let newInitiativeProgress = previousProgress;
    let weightImpact = 0;

    if (statusChanged || weightChanged) {
      // Get updated initiative progress (triggers will have recalculated it)
      const { data: updatedInitiative } = await supabase
        .from('initiatives')
        .select('progress')
        .eq('id', initiativeId)
        .single();

      if (updatedInitiative && updatedInitiative.progress !== previousProgress) {
        initiativeProgressUpdated = true;
        newInitiativeProgress = updatedInitiative.progress;
        
        // Calculate weight impact
        if (weightChanged) {
          const oldWeight = currentSubtask.weight_percentage || 0;
          const newWeight = updatedSubtask.weight_percentage || 0;
          weightImpact = newWeight - oldWeight;
        }
      }
    }

    // Log the update
    await supabase
      .from('audit_log')
      .insert({
        tenant_id: userProfile.tenant_id,
        user_id: userProfile.id,
        action: 'UPDATE',
        resource_type: 'subtask',
        resource_id: subtaskId,
        old_values: currentSubtask,
        new_values: updatedSubtask
      });

    // Generate validation warnings
    const validationWarnings = generateValidationWarnings(
      updatedSubtask,
      initiative.progress_method,
      weightImpact
    );

    const response: SubtaskUpdateResponse = {
      success: true,
      subtask: updatedSubtask,
      initiative_progress_updated: initiativeProgressUpdated,
      previous_progress: previousProgress,
      new_progress: newInitiativeProgress,
      weight_impact: weightImpact,
      validation_warnings: validationWarnings,
      metadata: {
        user_role: userProfile.role,
        can_edit: canEdit,
        can_delete: canEdit
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in subtask PUT endpoint:', error);
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
// DELETE: REMOVE SUBTASK
// ===================================================================================

/**
 * DELETE /api/initiatives/[id]/subtasks/[subtaskId]
 * 
 * Deletes a subtask and optionally redistributes remaining weights
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; subtaskId: string } }
) {
  try {
    const { id: initiativeId, subtaskId } = params;
    const supabase = createClient(cookies());
    const { searchParams } = new URL(request.url);
    const redistributeWeights = searchParams.get('redistribute_weights') === 'true';
    
    // Get authenticated user profile
    const userProfile = await getUserProfile(request);
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify initiative access
    const { data: initiative, error: initiativeError } = await supabase
      .from('initiatives')
      .select('*')
      .eq('id', initiativeId)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (initiativeError || !initiative) {
      return NextResponse.json(
        { error: 'Initiative not found or access denied' },
        { status: 404 }
      );
    }

    // Permission check
    const canDelete = 
      ['CEO', 'Admin'].includes(userProfile.role) ||
      (userProfile.role === 'Manager' && initiative.area_id === userProfile.area_id);

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Insufficient permissions to delete subtask' },
        { status: 403 }
      );
    }

    // Get subtask to delete
    const { data: subtaskToDelete, error: fetchError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', subtaskId)
      .eq('initiative_id', initiativeId)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (fetchError || !subtaskToDelete) {
      return NextResponse.json(
        { error: 'Subtask not found' },
        { status: 404 }
      );
    }

    // Delete the subtask
    const { error: deleteError } = await supabase
      .from('activities')
      .delete()
      .eq('id', subtaskId);

    if (deleteError) {
      console.error('Error deleting subtask:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete subtask' },
        { status: 500 }
      );
    }

    // Redistribute weights if requested
    let remainingSubtasks = [];
    if (redistributeWeights) {
      const { data: remaining } = await supabase
        .from('activities')
        .select('*')
        .eq('initiative_id', initiativeId)
        .eq('tenant_id', userProfile.tenant_id);

      if (remaining && remaining.length > 0) {
        const equalWeight = Math.round((100 / remaining.length) * 100) / 100;
        
        for (const subtask of remaining) {
          await supabase
            .from('activities')
            .update({ 
              weight_percentage: equalWeight,
              updated_at: new Date().toISOString()
            })
            .eq('id', subtask.id);
        }

        // Fetch updated subtasks
        const { data: updated } = await supabase
          .from('activities')
          .select('*')
          .eq('initiative_id', initiativeId)
          .eq('tenant_id', userProfile.tenant_id)
          .order('subtask_order');

        remainingSubtasks = updated || [];
      }
    }

    // Log the deletion
    await supabase
      .from('audit_log')
      .insert({
        tenant_id: userProfile.tenant_id,
        user_id: userProfile.id,
        action: 'DELETE',
        resource_type: 'subtask',
        resource_id: subtaskId,
        old_values: {
          ...subtaskToDelete,
          weights_redistributed: redistributeWeights
        }
      });

    return NextResponse.json({
      success: true,
      deleted_subtask_id: subtaskId,
      weights_redistributed: redistributeWeights,
      remaining_subtasks: redistributeWeights ? remainingSubtasks : undefined,
      metadata: {
        initiative_id: initiativeId,
        deleted_weight: subtaskToDelete.weight_percentage
      }
    });

  } catch (error) {
    console.error('Error in subtask DELETE endpoint:', error);
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
// HELPER FUNCTIONS
// ===================================================================================

async function validateWeightChange(
  supabase: any,
  initiativeId: string,
  subtaskId: string,
  tenantId: string,
  currentWeight: number,
  newWeight: number,
  progressMethod: string
) {
  // Get all other subtasks for this initiative
  const { data: otherSubtasks } = await supabase
    .from('activities')
    .select('weight_percentage')
    .eq('initiative_id', initiativeId)
    .eq('tenant_id', tenantId)
    .neq('id', subtaskId);

  const otherWeightsTotal = otherSubtasks?.reduce((sum, st) => sum + (st.weight_percentage || 0), 0) || 0;
  const currentTotalWeight = otherWeightsTotal + currentWeight;
  const newTotalWeight = otherWeightsTotal + newWeight;

  const errors: string[] = [];

  // Validation rules
  if (newWeight < 0) {
    errors.push('Weight percentage cannot be negative');
  }

  if (newWeight > 100) {
    errors.push('Weight percentage cannot exceed 100%');
  }

  if (newTotalWeight > 100) {
    errors.push(`Total weight would exceed 100% (current: ${currentTotalWeight}%, new: ${newTotalWeight}%)`);
  }

  if (progressMethod === 'subtask_based' && newWeight === 0) {
    errors.push('Weight percentage cannot be zero for subtask-based progress calculation');
  }

  return {
    valid: errors.length === 0,
    errors,
    currentTotalWeight,
    newTotalWeight
  };
}

function generateValidationWarnings(
  subtask: Subtask,
  progressMethod: string,
  weightImpact: number
): string[] {
  const warnings: string[] = [];

  if (progressMethod === 'subtask_based' || progressMethod === 'hybrid') {
    if (subtask.weight_percentage && subtask.weight_percentage < 5) {
      warnings.push('Very low weight percentage - consider if this subtask is significant enough');
    }

    if (subtask.weight_percentage && subtask.weight_percentage > 50) {
      warnings.push('High weight percentage - consider breaking this subtask into smaller parts');
    }

    if (Math.abs(weightImpact) > 10) {
      warnings.push(`Significant weight change (${weightImpact > 0 ? '+' : ''}${weightImpact}%) - this will impact initiative progress calculation`);
    }
  }

  if (subtask.estimated_hours && subtask.actual_hours > subtask.estimated_hours * 1.5) {
    warnings.push('Actual hours significantly exceed estimated hours - consider reviewing estimates');
  }

  if (subtask.due_date && new Date(subtask.due_date) < new Date() && subtask.status !== 'Completado') {
    warnings.push('Subtask is overdue');
  }

  return warnings;
}