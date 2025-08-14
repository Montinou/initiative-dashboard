/**
 * Initiative Update Webhooks
 * Handles real-time initiative updates and propagates changes
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

interface InitiativeUpdatePayload {
  type: 'initiative.created' | 'initiative.updated' | 'initiative.deleted'
  record: {
    id: string
    tenant_id: string
    area_id: string
    title: string
    progress: number
    status: string
    old_record?: any
  }
  timestamp: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (security)
    const headersList = await headers()
    const signature = headersList.get('x-webhook-signature')
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      )
    }

    // Parse payload
    const payload: InitiativeUpdatePayload = await request.json()
    
    // Validate payload structure
    if (!payload.type || !payload.record || !payload.record.id) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Process based on event type
    switch (payload.type) {
      case 'initiative.created':
        await handleInitiativeCreated(payload.record, supabase)
        break
      
      case 'initiative.updated':
        await handleInitiativeUpdated(payload.record, supabase)
        break
      
      case 'initiative.deleted':
        await handleInitiativeDeleted(payload.record, supabase)
        break
      
      default:
        return NextResponse.json(
          { error: 'Unknown event type' },
          { status: 400 }
        )
    }

    // Trigger real-time notifications
    await broadcastInitiativeUpdate(payload, supabase)

    // Log webhook processing
    await logWebhookEvent(payload, 'success', supabase)

    return NextResponse.json({ 
      success: true, 
      processed_at: new Date().toISOString() 
    })

  } catch (error) {
    console.error('Initiative webhook error:', error)
    
    // Log error
    if (error instanceof Error) {
      await logWebhookEvent(
        { type: 'error', record: { id: 'unknown' } } as any,
        'error',
        await createClient(),
        error.message
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleInitiativeCreated(record: any, supabase: any) {
  console.log(`Initiative created: ${record.id} in tenant ${record.tenant_id}`)
  
  // Update area statistics
  await updateAreaStatistics(record.area_id, supabase)
  
  // Create initial progress history entry
  await createProgressHistoryEntry(record.id, 0, 0, 'Initiative created', supabase)
  
  // Notify area manager
  await notifyAreaManager(record.area_id, 'initiative_created', {
    initiativeId: record.id,
    initiativeTitle: record.title
  }, supabase)
}

async function handleInitiativeUpdated(record: any, supabase: any) {
  console.log(`Initiative updated: ${record.id}`)
  
  // Check if progress changed
  if (record.old_record && record.old_record.progress !== record.progress) {
    await createProgressHistoryEntry(
      record.id,
      record.old_record.progress,
      record.progress,
      'Progress updated via webhook',
      supabase
    )
    
    // Check for milestone achievements
    await checkMilestoneAchievements(record, supabase)
  }
  
  // Update area statistics
  await updateAreaStatistics(record.area_id, supabase)
  
  // Check if status changed to completed
  if (record.status === 'completed' && record.old_record?.status !== 'completed') {
    await handleInitiativeCompleted(record, supabase)
  }
}

async function handleInitiativeDeleted(record: any, supabase: any) {
  console.log(`Initiative deleted: ${record.id}`)
  
  // Clean up related data
  await cleanupInitiativeData(record.id, supabase)
  
  // Update area statistics
  await updateAreaStatistics(record.area_id, supabase)
  
  // Notify stakeholders
  await notifyAreaManager(record.area_id, 'initiative_deleted', {
    initiativeId: record.id,
    initiativeTitle: record.title
  }, supabase)
}

async function updateAreaStatistics(areaId: string, supabase: any) {
  try {
    // Recalculate area metrics
    const { data: initiatives } = await supabase
      .from('initiatives')
      .select('id, progress, status')
      .eq('area_id', areaId)

    const stats = {
      total_initiatives: initiatives?.length || 0,
      completed_initiatives: initiatives?.filter((i: any) => i.status === 'completed').length || 0,
      avg_progress: initiatives?.length > 0 
        ? Math.round(initiatives.reduce((sum: number, i: any) => sum + i.progress, 0) / initiatives.length)
        : 0
    }

    // Update area statistics (assuming there's an area_statistics table)
    await supabase
      .from('area_statistics')
      .upsert({
        area_id: areaId,
        ...stats,
        updated_at: new Date().toISOString()
      })

  } catch (error) {
    console.error('Error updating area statistics:', error)
  }
}

async function createProgressHistoryEntry(
  initiativeId: string,
  oldProgress: number,
  newProgress: number,
  notes: string,
  supabase: any
) {
  try {
    // Get total activities for the initiative
    const { data: activities } = await supabase
      .from('activities')
      .select('id, is_completed')
      .eq('initiative_id', initiativeId)

    const totalActivities = activities?.length || 0
    const completedActivities = activities?.filter((a: any) => a.is_completed).length || 0

    await supabase
      .from('progress_history')
      .insert({
        initiative_id: initiativeId,
        completed_activities_count: completedActivities,
        total_activities_count: totalActivities,
        notes,
        updated_by: null, // System update
        created_at: new Date().toISOString()
      })

  } catch (error) {
    console.error('Error creating progress history entry:', error)
  }
}

async function checkMilestoneAchievements(record: any, supabase: any) {
  const milestones = [25, 50, 75, 100]
  const oldProgress = record.old_record?.progress || 0
  const newProgress = record.progress

  for (const milestone of milestones) {
    if (oldProgress < milestone && newProgress >= milestone) {
      console.log(`Milestone achieved: ${milestone}% for initiative ${record.id}`)
      
      // Create milestone notification
      await createMilestoneNotification(record.id, milestone, supabase)
      break
    }
  }
}

async function handleInitiativeCompleted(record: any, supabase: any) {
  try {
    // Update completion date
    await supabase
      .from('initiatives')
      .update({
        completion_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', record.id)

    // Notify stakeholders
    await notifyInitiativeCompletion(record, supabase)

  } catch (error) {
    console.error('Error handling initiative completion:', error)
  }
}

async function cleanupInitiativeData(initiativeId: string, supabase: any) {
  try {
    // Note: In a real app, you might want to soft delete or archive
    // For now, just clean up dependent data
    
    await supabase
      .from('activities')
      .delete()
      .eq('initiative_id', initiativeId)

    await supabase
      .from('progress_history')
      .delete()
      .eq('initiative_id', initiativeId)

    await supabase
      .from('objective_initiatives')
      .delete()
      .eq('initiative_id', initiativeId)

  } catch (error) {
    console.error('Error cleaning up initiative data:', error)
  }
}

async function notifyAreaManager(
  areaId: string,
  eventType: string,
  metadata: any,
  supabase: any
) {
  try {
    // Get area manager
    const { data: area } = await supabase
      .from('areas')
      .select('manager_id, name')
      .eq('id', areaId)
      .single()

    if (area?.manager_id) {
      // Create notification (assuming notifications table exists)
      await supabase
        .from('notifications')
        .insert({
          user_id: area.manager_id,
          type: eventType,
          title: getNotificationTitle(eventType, metadata),
          message: getNotificationMessage(eventType, metadata, area.name),
          metadata: {
            area_id: areaId,
            ...metadata
          },
          created_at: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('Error notifying area manager:', error)
  }
}

async function createMilestoneNotification(
  initiativeId: string,
  milestone: number,
  supabase: any
) {
  try {
    // Get initiative details
    const { data: initiative } = await supabase
      .from('initiatives')
      .select(`
        title,
        area_id,
        areas!inner(manager_id)
      `)
      .eq('id', initiativeId)
      .single()

    if (initiative?.areas?.manager_id) {
      await supabase
        .from('notifications')
        .insert({
          user_id: initiative.areas.manager_id,
          type: 'milestone_achieved',
          title: 'Milestone Achieved!',
          message: `Initiative "${initiative.title}" reached ${milestone}% completion`,
          metadata: {
            initiative_id: initiativeId,
            milestone,
            area_id: initiative.area_id
          },
          created_at: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('Error creating milestone notification:', error)
  }
}

async function notifyInitiativeCompletion(record: any, supabase: any) {
  try {
    // Get all users assigned to activities in this initiative
    const { data: assignedUsers } = await supabase
      .from('activities')
      .select('assigned_to')
      .eq('initiative_id', record.id)
      .not('assigned_to', 'is', null)

    const uniqueUsers = [...new Set(assignedUsers?.map((a: any) => a.assigned_to) || [])]

    for (const userId of uniqueUsers) {
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'initiative_completed',
          title: 'Initiative Completed!',
          message: `Initiative "${record.title}" has been completed`,
          metadata: {
            initiative_id: record.id,
            area_id: record.area_id
          },
          created_at: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error('Error notifying initiative completion:', error)
  }
}

async function broadcastInitiativeUpdate(payload: InitiativeUpdatePayload, supabase: any) {
  try {
    // Broadcast to real-time channels
    const channel = `initiatives_${payload.record.tenant_id}`
    
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
    console.error('Error broadcasting initiative update:', error)
  }
}

async function logWebhookEvent(
  payload: any,
  status: 'success' | 'error',
  supabase: any,
  errorMessage?: string
) {
  try {
    await supabase
      .from('webhook_audit_log')
      .insert({
        table_name: 'initiatives',
        operation: payload.type || 'unknown',
        record_id: payload.record?.id || 'unknown',
        webhook_url: '/api/webhooks/initiative-updates',
        status,
        error_message: errorMessage,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging webhook event:', error)
  }
}

function getNotificationTitle(eventType: string, metadata: any): string {
  switch (eventType) {
    case 'initiative_created':
      return 'New Initiative Created'
    case 'initiative_deleted':
      return 'Initiative Deleted'
    default:
      return 'Initiative Update'
  }
}

function getNotificationMessage(eventType: string, metadata: any, areaName: string): string {
  switch (eventType) {
    case 'initiative_created':
      return `A new initiative "${metadata.initiativeTitle}" has been created in ${areaName}`
    case 'initiative_deleted':
      return `Initiative "${metadata.initiativeTitle}" has been deleted from ${areaName}`
    default:
      return `Initiative update in ${areaName}`
  }
}

// Allow only POST method
export const runtime = 'nodejs'