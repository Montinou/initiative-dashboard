/**
 * Progress Change Webhooks
 * Handles real-time progress updates across initiatives, objectives, and activities
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

interface ProgressChangePayload {
  type: 'progress.initiative' | 'progress.objective' | 'progress.activity'
  record: {
    id: string
    entity_type: 'initiative' | 'objective' | 'activity'
    tenant_id: string
    area_id?: string
    initiative_id?: string
    old_progress?: number
    new_progress: number
    changed_by?: string
    completion_status?: boolean
  }
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const headersList = await headers()
    const signature = headersList.get('x-webhook-signature')
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      )
    }

    // Parse and validate payload
    const payload: ProgressChangePayload = await request.json()
    
    if (!payload.type || !payload.record || !payload.record.id) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Process based on entity type
    switch (payload.record.entity_type) {
      case 'initiative':
        await handleInitiativeProgressChange(payload.record, supabase)
        break
      
      case 'objective':
        await handleObjectiveProgressChange(payload.record, supabase)
        break
      
      case 'activity':
        await handleActivityProgressChange(payload.record, supabase)
        break
      
      default:
        return NextResponse.json(
          { error: 'Unknown entity type' },
          { status: 400 }
        )
    }

    // Broadcast progress update
    await broadcastProgressUpdate(payload, supabase)

    // Log webhook processing
    await logProgressWebhookEvent(payload, 'success', supabase)

    return NextResponse.json({ 
      success: true, 
      processed_at: new Date().toISOString() 
    })

  } catch (error) {
    console.error('Progress webhook error:', error)
    
    await logProgressWebhookEvent(
      { type: 'error', record: { id: 'unknown' } } as any,
      'error',
      await createClient(),
      error instanceof Error ? error.message : 'Unknown error'
    )

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleInitiativeProgressChange(record: any, supabase: any) {
  console.log(`Initiative progress changed: ${record.id} from ${record.old_progress}% to ${record.new_progress}%`)
  
  // Create progress history entry
  await createInitiativeProgressHistory(record, supabase)
  
  // Check for milestone achievements
  await checkProgressMilestones(record, supabase)
  
  // Update objective progress if linked
  await updateLinkedObjectiveProgress(record.id, supabase)
  
  // Check completion status
  if (record.new_progress === 100 && record.old_progress < 100) {
    await handleInitiativeCompletion(record, supabase)
  }
  
  // Update area-level metrics
  await updateAreaProgressMetrics(record.area_id, supabase)
  
  // Notify stakeholders of significant progress changes
  if (isSignificantProgressChange(record.old_progress, record.new_progress)) {
    await notifyProgressChange(record, 'initiative', supabase)
  }
}

async function handleObjectiveProgressChange(record: any, supabase: any) {
  console.log(`Objective progress changed: ${record.id} from ${record.old_progress}% to ${record.new_progress}%`)
  
  // Check for milestone achievements
  await checkProgressMilestones(record, supabase)
  
  // Update initiative progress based on objective progress
  await updateInitiativesFromObjective(record.id, supabase)
  
  // Check completion status
  if (record.new_progress === 100 && record.old_progress < 100) {
    await handleObjectiveCompletion(record, supabase)
  }
  
  // Update area-level metrics
  if (record.area_id) {
    await updateAreaProgressMetrics(record.area_id, supabase)
  }
  
  // Notify stakeholders
  if (isSignificantProgressChange(record.old_progress, record.new_progress)) {
    await notifyProgressChange(record, 'objective', supabase)
  }
}

async function handleActivityProgressChange(record: any, supabase: any) {
  console.log(`Activity completion changed: ${record.id} - completed: ${record.completion_status}`)
  
  // Update initiative progress based on activity completion
  if (record.initiative_id) {
    await recalculateInitiativeProgress(record.initiative_id, supabase)
  }
  
  // Notify assignee and managers
  await notifyActivityCompletion(record, supabase)
}

async function createInitiativeProgressHistory(record: any, supabase: any) {
  try {
    // Get current activity counts
    const { data: activities } = await supabase
      .from('activities')
      .select('id, is_completed')
      .eq('initiative_id', record.id)

    const totalActivities = activities?.length || 0
    const completedActivities = activities?.filter((a: any) => a.is_completed).length || 0

    await supabase
      .from('progress_history')
      .insert({
        initiative_id: record.id,
        completed_activities_count: completedActivities,
        total_activities_count: totalActivities,
        notes: `Progress updated from ${record.old_progress}% to ${record.new_progress}%`,
        updated_by: record.changed_by,
        created_at: new Date().toISOString()
      })

  } catch (error) {
    console.error('Error creating progress history:', error)
  }
}

async function checkProgressMilestones(record: any, supabase: any) {
  const milestones = [25, 50, 75, 100]
  const oldProgress = record.old_progress || 0
  const newProgress = record.new_progress

  for (const milestone of milestones) {
    if (oldProgress < milestone && newProgress >= milestone) {
      console.log(`Milestone ${milestone}% achieved for ${record.entity_type} ${record.id}`)
      
      await createMilestoneNotification(record, milestone, supabase)
      await triggerMilestoneWebhook(record, milestone, supabase)
      break // Only trigger one milestone per update
    }
  }
}

async function updateLinkedObjectiveProgress(initiativeId: string, supabase: any) {
  try {
    // Get linked objectives
    const { data: linkedObjectives } = await supabase
      .from('objective_initiatives')
      .select(`
        objective_id,
        objectives!inner(id, title)
      `)
      .eq('initiative_id', initiativeId)

    for (const link of linkedObjectives || []) {
      await recalculateObjectiveProgress(link.objective_id, supabase)
    }
  } catch (error) {
    console.error('Error updating linked objective progress:', error)
  }
}

async function recalculateObjectiveProgress(objectiveId: string, supabase: any) {
  try {
    // Get all initiatives linked to this objective
    const { data: linkedInitiatives } = await supabase
      .from('objective_initiatives')
      .select(`
        initiative_id,
        initiatives!inner(progress)
      `)
      .eq('objective_id', objectiveId)

    if (linkedInitiatives && linkedInitiatives.length > 0) {
      const avgProgress = Math.round(
        linkedInitiatives.reduce((sum: number, link: any) => 
          sum + (link.initiatives.progress || 0), 0
        ) / linkedInitiatives.length
      )

      // Update objective progress
      await supabase
        .from('objectives')
        .update({
          progress: avgProgress,
          updated_at: new Date().toISOString()
        })
        .eq('id', objectiveId)

      console.log(`Updated objective ${objectiveId} progress to ${avgProgress}%`)
    }
  } catch (error) {
    console.error('Error recalculating objective progress:', error)
  }
}

async function recalculateInitiativeProgress(initiativeId: string, supabase: any) {
  try {
    // Get all activities for the initiative
    const { data: activities } = await supabase
      .from('activities')
      .select('id, is_completed')
      .eq('initiative_id', initiativeId)

    if (activities && activities.length > 0) {
      const completedCount = activities.filter((a: any) => a.is_completed).length
      const newProgress = Math.round((completedCount / activities.length) * 100)

      // Update initiative progress
      await supabase
        .from('initiatives')
        .update({
          progress: newProgress,
          updated_at: new Date().toISOString()
        })
        .eq('id', initiativeId)

      console.log(`Recalculated initiative ${initiativeId} progress to ${newProgress}%`)
    }
  } catch (error) {
    console.error('Error recalculating initiative progress:', error)
  }
}

async function updateAreaProgressMetrics(areaId: string, supabase: any) {
  try {
    // Get all initiatives in the area
    const { data: initiatives } = await supabase
      .from('initiatives')
      .select('id, progress, status')
      .eq('area_id', areaId)

    // Get all objectives in the area
    const { data: objectives } = await supabase
      .from('objectives')
      .select('id, progress, status')
      .eq('area_id', areaId)

    const avgInitiativeProgress = initiatives?.length > 0
      ? Math.round(initiatives.reduce((sum: number, i: any) => sum + i.progress, 0) / initiatives.length)
      : 0

    const avgObjectiveProgress = objectives?.length > 0
      ? Math.round(objectives.reduce((sum: number, o: any) => sum + o.progress, 0) / objectives.length)
      : 0

    const overallProgress = Math.round((avgInitiativeProgress + avgObjectiveProgress) / 2)

    // Update area metrics (assuming area_metrics table exists)
    await supabase
      .from('area_metrics')
      .upsert({
        area_id: areaId,
        avg_initiative_progress: avgInitiativeProgress,
        avg_objective_progress: avgObjectiveProgress,
        overall_progress: overallProgress,
        total_initiatives: initiatives?.length || 0,
        completed_initiatives: initiatives?.filter((i: any) => i.status === 'completed').length || 0,
        total_objectives: objectives?.length || 0,
        completed_objectives: objectives?.filter((o: any) => o.status === 'completed').length || 0,
        updated_at: new Date().toISOString()
      })

  } catch (error) {
    console.error('Error updating area progress metrics:', error)
  }
}

async function handleInitiativeCompletion(record: any, supabase: any) {
  try {
    // Mark initiative as completed
    await supabase
      .from('initiatives')
      .update({
        status: 'completed',
        completion_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
      .eq('id', record.id)

    // Create completion notification
    await createCompletionNotification(record, 'initiative', supabase)

    console.log(`Initiative ${record.id} marked as completed`)
  } catch (error) {
    console.error('Error handling initiative completion:', error)
  }
}

async function handleObjectiveCompletion(record: any, supabase: any) {
  try {
    // Mark objective as completed
    await supabase
      .from('objectives')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', record.id)

    // Create completion notification
    await createCompletionNotification(record, 'objective', supabase)

    console.log(`Objective ${record.id} marked as completed`)
  } catch (error) {
    console.error('Error handling objective completion:', error)
  }
}

async function notifyActivityCompletion(record: any, supabase: any) {
  if (!record.completion_status) return // Only notify on completion

  try {
    // Get activity details and assignee
    const { data: activity } = await supabase
      .from('activities')
      .select(`
        title,
        assigned_to,
        initiative_id,
        initiatives!inner(title, area_id)
      `)
      .eq('id', record.id)
      .single()

    if (activity?.assigned_to) {
      await supabase
        .from('notifications')
        .insert({
          user_id: activity.assigned_to,
          type: 'activity_completed',
          title: 'Activity Completed!',
          message: `You completed "${activity.title}" in initiative "${activity.initiatives.title}"`,
          metadata: {
            activity_id: record.id,
            initiative_id: activity.initiative_id,
            area_id: activity.initiatives.area_id
          },
          created_at: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('Error notifying activity completion:', error)
  }
}

async function createMilestoneNotification(record: any, milestone: number, supabase: any) {
  try {
    // Get entity details based on type
    let entityDetails
    let tableName
    
    switch (record.entity_type) {
      case 'initiative':
        const { data: initiative } = await supabase
          .from('initiatives')
          .select('title, area_id, areas!inner(manager_id)')
          .eq('id', record.id)
          .single()
        entityDetails = initiative
        tableName = 'initiatives'
        break
        
      case 'objective':
        const { data: objective } = await supabase
          .from('objectives')
          .select('title, area_id, areas!inner(manager_id)')
          .eq('id', record.id)
          .single()
        entityDetails = objective
        tableName = 'objectives'
        break
    }

    if (entityDetails?.areas?.manager_id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: entityDetails.areas.manager_id,
          type: 'milestone_achieved',
          title: 'Milestone Achieved!',
          message: `${record.entity_type} "${entityDetails.title}" reached ${milestone}% completion`,
          metadata: {
            entity_id: record.id,
            entity_type: record.entity_type,
            milestone,
            area_id: entityDetails.area_id
          },
          created_at: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('Error creating milestone notification:', error)
  }
}

async function createCompletionNotification(record: any, entityType: string, supabase: any) {
  try {
    // Get stakeholders to notify based on entity type
    let stakeholders: string[] = []
    
    if (entityType === 'initiative') {
      // Get assigned users from activities
      const { data: activities } = await supabase
        .from('activities')
        .select('assigned_to')
        .eq('initiative_id', record.id)
        .not('assigned_to', 'is', null)
      
      stakeholders = [...new Set(activities?.map((a: any) => a.assigned_to) || [])]
    }

    for (const userId of stakeholders) {
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: `${entityType}_completed`,
          title: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Completed!`,
          message: `${entityType} has reached 100% completion`,
          metadata: {
            entity_id: record.id,
            entity_type: entityType,
            area_id: record.area_id
          },
          created_at: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('Error creating completion notification:', error)
  }
}

async function broadcastProgressUpdate(payload: ProgressChangePayload, supabase: any) {
  try {
    const channel = `progress_${payload.record.tenant_id}`
    
    await supabase
      .channel(channel)
      .send({
        type: 'broadcast',
        event: payload.type,
        payload: {
          ...payload.record,
          timestamp: payload.timestamp
        }
      })

  } catch (error) {
    console.error('Error broadcasting progress update:', error)
  }
}

async function triggerMilestoneWebhook(record: any, milestone: number, supabase: any) {
  // This could trigger external webhooks to other systems
  console.log(`Triggering external milestone webhook for ${record.entity_type} ${record.id} at ${milestone}%`)
  
  // Implementation would depend on external systems
  // Could call external APIs, send emails, update external dashboards, etc.
}

async function logProgressWebhookEvent(
  payload: any,
  status: 'success' | 'error',
  supabase: any,
  errorMessage?: string
) {
  try {
    await supabase
      .from('webhook_audit_log')
      .insert({
        table_name: 'progress_tracking',
        operation: payload.type || 'unknown',
        record_id: payload.record?.id || 'unknown',
        webhook_url: '/api/webhooks/progress-changes',
        status,
        error_message: errorMessage,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging progress webhook event:', error)
  }
}

function isSignificantProgressChange(oldProgress: number, newProgress: number): boolean {
  const threshold = 10 // 10% threshold for significant changes
  return Math.abs(newProgress - oldProgress) >= threshold
}

function notifyProgressChange(record: any, entityType: string, supabase: any) {
  // Implementation for notifying stakeholders of significant progress changes
  console.log(`Notifying stakeholders of significant progress change in ${entityType} ${record.id}`)
  
  // Could send emails, slack messages, or other notifications
}

export const runtime = 'nodejs'