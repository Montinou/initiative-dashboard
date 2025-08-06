/**
 * Subtasks Progress API with Weighted Management
 * 
 * Provides comprehensive subtask management with:
 * - Weight-based progress calculations
 * - Automatic parent initiative progress updates
 * - Weight validation and redistribution
 * - Role-based permissions
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
// TYPES AND INTERFACES
// ===================================================================================

interface SubtaskWithValidation extends Subtask {
  weight_validation_status?: 'valid' | 'warning' | 'error';
  weight_validation_message?: string;
}

interface SubtaskResponse {
  success: boolean;
  subtasks?: SubtaskWithValidation[];
  subtask?: SubtaskWithValidation;
  weight_summary?: {
    total_weight: number;
    remaining_weight: number;
    subtask_count: number;
    validation_status: 'valid' | 'warning' | 'error';
    recommendations?: string[];
  };
  metadata?: {
    user_role: string;
    can_edit: boolean;
    can_reorder: boolean;
    progress_method: string;
    initiative_progress: number;
  };
}

// ===================================================================================
// GET: FETCH SUBTASKS FOR INITIATIVE
// ===================================================================================

/**
 * GET /api/initiatives/[id]/subtasks
 * 
 * Returns all subtasks for an initiative with weight validation status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const initiativeId = params.id;
    const supabase = await createClient();
    
    // Get authenticated user profile
    const userProfile = await getUserProfile(request);
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify initiative exists and user has access
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
        { error: 'Insufficient permissions to view subtasks' },
        { status: 403 }
      );
    }

    // Fetch subtasks (stored as activities with subtask functionality)
    const { data: subtasks, error: subtasksError } = await supabase
      .from('activities')
      .select('*')
      .eq('initiative_id', initiativeId)
      .eq('tenant_id', userProfile.tenant_id)
      .order('subtask_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (subtasksError) {
      console.error('Error fetching subtasks:', subtasksError);
      return NextResponse.json(
        { error: 'Failed to fetch subtasks' },
        { status: 500 }
      );
    }

    // Calculate weight validation for each subtask
    const totalWeight = subtasks?.reduce((sum, subtask) => sum + (subtask.weight_percentage || 0), 0) || 0;
    const subtasksWithValidation: SubtaskWithValidation[] = (subtasks || []).map(subtask => {
      let validationStatus: 'valid' | 'warning' | 'error' = 'valid';
      let validationMessage = '';

      if (initiative.progress_method === 'subtask_based' || initiative.progress_method === 'hybrid') {
        if (!subtask.weight_percentage || subtask.weight_percentage <= 0) {
          validationStatus = 'error';
          validationMessage = 'Weight percentage is required for subtask-based progress calculation';
        } else if (subtask.weight_percentage < 5) {
          validationStatus = 'warning';
          validationMessage = 'Very low weight percentage - consider if this subtask is significant enough';
        }
      }

      return {
        ...subtask,
        weight_validation_status: validationStatus,
        weight_validation_message: validationMessage
      };
    });

    // Generate weight summary
    const weightSummary = {
      total_weight: totalWeight,
      remaining_weight: 100 - totalWeight,
      subtask_count: subtasks?.length || 0,
      validation_status: getWeightValidationStatus(totalWeight, initiative.progress_method),
      recommendations: generateWeightRecommendations(totalWeight, subtasks?.length || 0, initiative.progress_method)
    };

    // Prepare metadata
    const canEdit = 
      ['CEO', 'Admin'].includes(userProfile.role) ||
      (userProfile.role === 'Manager' && initiative.area_id === userProfile.area_id);

    const metadata = {
      user_role: userProfile.role,
      can_edit: canEdit,
      can_reorder: canEdit,
      progress_method: initiative.progress_method,
      initiative_progress: initiative.progress
    };

    const response: SubtaskResponse = {
      success: true,
      subtasks: subtasksWithValidation,
      weight_summary: weightSummary,
      metadata
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in subtasks GET endpoint:', error);
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
// POST: CREATE NEW SUBTASK
// ===================================================================================

/**
 * POST /api/initiatives/[id]/subtasks
 * 
 * Creates a new subtask with automatic weight distribution
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const initiativeId = params.id;
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
    const {
      title,
      description,
      weight_percentage,
      estimated_hours,
      priority = 'medium',
      assigned_to,
      due_date,
      auto_distribute_weights = false
    } = body;

    // Validate required fields
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Verify initiative exists and user has access
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
        { error: 'Insufficient permissions to create subtasks' },
        { status: 403 }
      );
    }

    // Get existing subtasks for weight calculation
    const { data: existingSubtasks } = await supabase
      .from('activities')
      .select('id, weight_percentage')
      .eq('initiative_id', initiativeId)
      .eq('tenant_id', userProfile.tenant_id);

    const currentTotalWeight = existingSubtasks?.reduce((sum, st) => sum + (st.weight_percentage || 0), 0) || 0;
    const subtaskCount = (existingSubtasks?.length || 0) + 1; // Including the new one

    // Determine weight percentage
    let finalWeightPercentage = weight_percentage;

    if (auto_distribute_weights || !weight_percentage) {
      // Auto-distribute: give equal weight to all subtasks
      finalWeightPercentage = Math.round((100 / subtaskCount) * 100) / 100;
      
      // Update existing subtasks with new equal weight
      if (existingSubtasks && existingSubtasks.length > 0) {
        for (const existingSubtask of existingSubtasks) {
          await supabase
            .from('activities')
            .update({ weight_percentage: finalWeightPercentage })
            .eq('id', existingSubtask.id);
        }
      }
    } else {
      // Check if adding this weight would exceed 100%
      if (currentTotalWeight + finalWeightPercentage > 100) {
        return NextResponse.json(
          { 
            error: 'Weight validation failed',
            details: `Adding ${finalWeightPercentage}% would exceed 100% (current total: ${currentTotalWeight}%)` 
          },
          { status: 400 }
        );
      }
    }

    // Get next order number
    const maxOrder = existingSubtasks?.reduce((max, st) => Math.max(max, st.subtask_order || 0), 0) || 0;

    // Create subtask data
    const subtaskData = {
      title: title.trim(),
      description: description?.trim() || null,
      initiative_id: initiativeId,
      tenant_id: userProfile.tenant_id,
      status: 'Pendiente',
      progress: 0,
      weight_percentage: finalWeightPercentage,
      estimated_hours: estimated_hours || null,
      actual_hours: 0,
      subtask_order: maxOrder + 1,
      priority,
      assigned_to: assigned_to || null,
      due_date: due_date || null
    };

    // Create the subtask
    const { data: subtask, error: subtaskError } = await supabase
      .from('activities')
      .insert(subtaskData)
      .select()
      .single();

    if (subtaskError) {
      console.error('Error creating subtask:', subtaskError);
      return NextResponse.json(
        { error: 'Failed to create subtask' },
        { status: 500 }
      );
    }

    // Log the creation
    await supabase
      .from('audit_log')
      .insert({
        tenant_id: userProfile.tenant_id,
        user_id: userProfile.id,
        action: 'CREATE',
        resource_type: 'subtask',
        resource_id: subtask.id,
        new_values: {
          ...subtask,
          initiative_id: initiativeId,
          auto_distributed: auto_distribute_weights
        }
      });

    // Get updated weight summary
    const newTotalWeight = auto_distribute_weights ? 100 : currentTotalWeight + finalWeightPercentage;
    const weightSummary = {
      total_weight: newTotalWeight,
      remaining_weight: 100 - newTotalWeight,
      subtask_count: subtaskCount,
      validation_status: getWeightValidationStatus(newTotalWeight, initiative.progress_method),
      recommendations: generateWeightRecommendations(newTotalWeight, subtaskCount, initiative.progress_method)
    };

    const response: SubtaskResponse = {
      success: true,
      subtask: subtask as SubtaskWithValidation,
      weight_summary: weightSummary,
      metadata: {
        user_role: userProfile.role,
        can_edit: canEdit,
        can_reorder: canEdit,
        progress_method: initiative.progress_method,
        initiative_progress: initiative.progress
      }
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Error in subtasks POST endpoint:', error);
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
// PUT: BULK UPDATE SUBTASKS (REORDER, REDISTRIBUTE WEIGHTS)
// ===================================================================================

/**
 * PUT /api/initiatives/[id]/subtasks
 * 
 * Bulk update subtasks for reordering or weight redistribution
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const initiativeId = params.id;
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
    const { 
      operation, // 'reorder', 'redistribute_weights', 'bulk_update'
      subtasks,
      redistribute_method = 'equal' // 'equal', 'proportional', 'manual'
    } = body;

    // Verify initiative exists and user has access
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
        { error: 'Insufficient permissions to update subtasks' },
        { status: 403 }
      );
    }

    let updatedSubtasks = [];

    switch (operation) {
      case 'redistribute_weights':
        updatedSubtasks = await redistributeWeights(
          supabase,
          initiativeId,
          userProfile.tenant_id,
          redistribute_method
        );
        break;
        
      case 'reorder':
        updatedSubtasks = await reorderSubtasks(
          supabase,
          subtasks,
          userProfile.tenant_id
        );
        break;
        
      case 'bulk_update':
        updatedSubtasks = await bulkUpdateSubtasks(
          supabase,
          subtasks,
          userProfile.tenant_id
        );
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }

    // Log the bulk operation
    await supabase
      .from('audit_log')
      .insert({
        tenant_id: userProfile.tenant_id,
        user_id: userProfile.id,
        action: 'BULK_UPDATE',
        resource_type: 'subtasks',
        resource_id: initiativeId,
        new_values: {
          operation,
          subtasks_affected: updatedSubtasks.length,
          redistribute_method
        }
      });

    const response: SubtaskResponse = {
      success: true,
      subtasks: updatedSubtasks,
      metadata: {
        user_role: userProfile.role,
        can_edit: canEdit,
        can_reorder: canEdit,
        progress_method: initiative.progress_method,
        initiative_progress: initiative.progress
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in subtasks bulk PUT endpoint:', error);
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

function getWeightValidationStatus(
  totalWeight: number, 
  progressMethod: string
): 'valid' | 'warning' | 'error' {
  if (progressMethod === 'manual') return 'valid';
  
  if (totalWeight === 100) return 'valid';
  if (totalWeight > 95 && totalWeight < 100) return 'warning';
  if (totalWeight > 100) return 'error';
  if (totalWeight < 80) return 'warning';
  
  return 'valid';
}

function generateWeightRecommendations(
  totalWeight: number,
  subtaskCount: number,
  progressMethod: string
): string[] {
  const recommendations: string[] = [];
  
  if (progressMethod === 'manual') {
    recommendations.push('Using manual progress method - weights are optional');
    return recommendations;
  }
  
  if (totalWeight === 0 && subtaskCount > 0) {
    recommendations.push('No weights assigned - use auto-distribute to assign equal weights');
  } else if (totalWeight < 100 && totalWeight > 0) {
    recommendations.push(`${100 - totalWeight}% unassigned - consider adding more subtasks or redistributing`);
  } else if (totalWeight > 100) {
    recommendations.push('Total weight exceeds 100% - redistribute weights to fix this issue');
  }
  
  if (subtaskCount > 10) {
    recommendations.push('Many subtasks detected - consider grouping similar tasks for better management');
  }
  
  return recommendations;
}

async function redistributeWeights(
  supabase: any,
  initiativeId: string,
  tenantId: string,
  method: string
) {
  const { data: subtasks } = await supabase
    .from('activities')
    .select('*')
    .eq('initiative_id', initiativeId)
    .eq('tenant_id', tenantId)
    .order('subtask_order');

  if (!subtasks || subtasks.length === 0) return [];

  let newWeights: number[];
  
  switch (method) {
    case 'equal':
      const equalWeight = Math.round((100 / subtasks.length) * 100) / 100;
      newWeights = subtasks.map(() => equalWeight);
      break;
      
    case 'proportional':
      const totalCurrentWeight = subtasks.reduce((sum, st) => sum + (st.weight_percentage || 0), 0);
      if (totalCurrentWeight > 0) {
        newWeights = subtasks.map(st => 
          Math.round(((st.weight_percentage || 0) / totalCurrentWeight) * 100 * 100) / 100
        );
      } else {
        // Fallback to equal if no current weights
        const fallbackWeight = Math.round((100 / subtasks.length) * 100) / 100;
        newWeights = subtasks.map(() => fallbackWeight);
      }
      break;
      
    default:
      throw new Error('Invalid redistribution method');
  }

  // Update all subtasks with new weights
  const updatedSubtasks = [];
  for (let i = 0; i < subtasks.length; i++) {
    const { data: updated } = await supabase
      .from('activities')
      .update({ 
        weight_percentage: newWeights[i],
        updated_at: new Date().toISOString()
      })
      .eq('id', subtasks[i].id)
      .select()
      .single();
      
    if (updated) {
      updatedSubtasks.push(updated);
    }
  }

  return updatedSubtasks;
}

async function reorderSubtasks(
  supabase: any,
  subtasksData: any[],
  tenantId: string
) {
  const updatedSubtasks = [];
  
  for (let i = 0; i < subtasksData.length; i++) {
    const { data: updated } = await supabase
      .from('activities')
      .update({ 
        subtask_order: i + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', subtasksData[i].id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
      
    if (updated) {
      updatedSubtasks.push(updated);
    }
  }

  return updatedSubtasks;
}

async function bulkUpdateSubtasks(
  supabase: any,
  subtasksData: any[],
  tenantId: string
) {
  const updatedSubtasks = [];
  
  for (const subtaskData of subtasksData) {
    const { id, ...updates } = subtaskData;
    
    const { data: updated } = await supabase
      .from('activities')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();
      
    if (updated) {
      updatedSubtasks.push(updated);
    }
  }

  return updatedSubtasks;
}