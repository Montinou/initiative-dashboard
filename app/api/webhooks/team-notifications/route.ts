/**
 * Team Notification Webhooks
 * Handles team-based notifications for assignments, mentions, and collaboration events
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

interface TeamNotificationPayload {
  type: 'team.assignment' | 'team.mention' | 'team.deadline' | 'team.achievement' | 'team.update'
  event: {
    id: string
    tenant_id: string
    area_id: string
    triggered_by: string
    targets: string[] // User IDs to notify
    priority: 'low' | 'medium' | 'high' | 'urgent'
    data: {
      entity_type: 'initiative' | 'objective' | 'activity' | 'area'
      entity_id: string
      entity_title: string
      message: string
      action_url?: string
      deadline?: string
      metadata?: Record<string, any>
    }
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
    const payload: TeamNotificationPayload = await request.json()
    
    if (!payload.type || !payload.event || !payload.event.targets?.length) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Process based on notification type
    switch (payload.type) {
      case 'team.assignment':
        await handleTeamAssignment(payload.event, supabase)
        break
      
      case 'team.mention':
        await handleTeamMention(payload.event, supabase)
        break
      
      case 'team.deadline':
        await handleTeamDeadline(payload.event, supabase)
        break
      
      case 'team.achievement':
        await handleTeamAchievement(payload.event, supabase)
        break
      
      case 'team.update':
        await handleTeamUpdate(payload.event, supabase)
        break
      
      default:
        return NextResponse.json(
          { error: 'Unknown notification type' },
          { status: 400 }
        )
    }

    // Broadcast to real-time channels
    await broadcastTeamNotification(payload, supabase)

    // Log notification event
    await logTeamNotificationEvent(payload, 'success', supabase)

    return NextResponse.json({ 
      success: true, 
      notifications_sent: payload.event.targets.length,
      processed_at: new Date().toISOString() 
    })

  } catch (error) {
    console.error('Team notification webhook error:', error)
    
    await logTeamNotificationEvent(
      { type: 'error', event: { id: 'unknown', targets: [] } } as any,
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

async function handleTeamAssignment(event: any, supabase: any) {
  console.log(`Processing team assignment notification for ${event.targets.length} users`)
  
  // Create notifications for each target user
  for (const userId of event.targets) {
    await createUserNotification(userId, {
      type: 'assignment',
      title: 'New Assignment',
      message: `You have been assigned to ${event.data.entity_title}`,
      priority: event.priority,
      metadata: {
        entity_type: event.data.entity_type,
        entity_id: event.data.entity_id,
        area_id: event.area_id,
        assigned_by: event.triggered_by,
        action_url: event.data.action_url
      }
    }, supabase)
  }

  // Update assignment tracking
  await trackAssignmentActivity(event, supabase)
  
  // Send email notifications for high priority assignments
  if (event.priority === 'high' || event.priority === 'urgent') {
    await sendAssignmentEmails(event, supabase)
  }
}

async function handleTeamMention(event: any, supabase: any) {
  console.log(`Processing team mention notification for ${event.targets.length} users`)
  
  for (const userId of event.targets) {
    await createUserNotification(userId, {
      type: 'mention',
      title: 'You were mentioned',
      message: event.data.message,
      priority: event.priority,
      metadata: {
        entity_type: event.data.entity_type,
        entity_id: event.data.entity_id,
        area_id: event.area_id,
        mentioned_by: event.triggered_by,
        action_url: event.data.action_url
      }
    }, supabase)
  }

  // Track mention activity for analytics
  await trackMentionActivity(event, supabase)
}

async function handleTeamDeadline(event: any, supabase: any) {
  console.log(`Processing team deadline notification for ${event.targets.length} users`)
  
  for (const userId of event.targets) {
    const daysUntilDeadline = event.data.deadline 
      ? Math.ceil((new Date(event.data.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null

    const urgencyLevel = daysUntilDeadline !== null && daysUntilDeadline <= 1 ? 'urgent' : event.priority

    await createUserNotification(userId, {
      type: 'deadline_alert',
      title: 'Deadline Approaching',
      message: `${event.data.entity_title} ${daysUntilDeadline !== null 
        ? `is due in ${daysUntilDeadline} day${daysUntilDeadline !== 1 ? 's' : ''}`
        : 'has an upcoming deadline'
      }`,
      priority: urgencyLevel,
      metadata: {
        entity_type: event.data.entity_type,
        entity_id: event.data.entity_id,
        area_id: event.area_id,
        deadline: event.data.deadline,
        days_until_deadline: daysUntilDeadline,
        action_url: event.data.action_url
      }
    }, supabase)
  }

  // Schedule follow-up reminders for critical deadlines
  if (event.priority === 'urgent') {
    await scheduleDeadlineReminders(event, supabase)
  }
}

async function handleTeamAchievement(event: any, supabase: any) {
  console.log(`Processing team achievement notification for ${event.targets.length} users`)
  
  for (const userId of event.targets) {
    await createUserNotification(userId, {
      type: 'achievement',
      title: 'Team Achievement!',
      message: event.data.message,
      priority: 'medium',
      metadata: {
        entity_type: event.data.entity_type,
        entity_id: event.data.entity_id,
        area_id: event.area_id,
        achievement_type: event.data.metadata?.achievement_type,
        action_url: event.data.action_url
      }
    }, supabase)
  }

  // Track team achievement for analytics
  await trackTeamAchievement(event, supabase)
  
  // Post to team feed if configured
  await postToTeamFeed(event, supabase)
}

async function handleTeamUpdate(event: any, supabase: any) {
  console.log(`Processing team update notification for ${event.targets.length} users`)
  
  for (const userId of event.targets) {
    await createUserNotification(userId, {
      type: 'team_update',
      title: 'Team Update',
      message: event.data.message,
      priority: event.priority,
      metadata: {
        entity_type: event.data.entity_type,
        entity_id: event.data.entity_id,
        area_id: event.area_id,
        update_type: event.data.metadata?.update_type,
        action_url: event.data.action_url
      }
    }, supabase)
  }

  // Update team activity feed
  await updateTeamActivityFeed(event, supabase)
}

async function createUserNotification(
  userId: string,
  notification: {
    type: string
    title: string
    message: string
    priority: string
    metadata: Record<string, any>
  },
  supabase: any
) {
  try {
    // Check user notification preferences
    const userPrefs = await getUserNotificationPreferences(userId, supabase)
    
    if (!shouldSendNotification(notification.type, userPrefs)) {
      console.log(`Skipping notification for user ${userId} due to preferences`)
      return
    }

    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        metadata: notification.metadata,
        is_read: false,
        created_at: new Date().toISOString()
      })

    // Send push notification if enabled
    if (userPrefs.push_notifications && notification.priority !== 'low') {
      await sendPushNotification(userId, notification, supabase)
    }

    // Send email for urgent notifications
    if (notification.priority === 'urgent' && userPrefs.email_notifications) {
      await sendEmailNotification(userId, notification, supabase)
    }

  } catch (error) {
    console.error(`Error creating notification for user ${userId}:`, error)
  }
}

async function getUserNotificationPreferences(userId: string, supabase: any) {
  try {
    const { data: preferences } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Default preferences if none exist
    return preferences || {
      email_notifications: true,
      push_notifications: true,
      assignments: true,
      mentions: true,
      deadlines: true,
      achievements: true,
      team_updates: true
    }
  } catch (error) {
    console.error('Error getting user notification preferences:', error)
    return {
      email_notifications: true,
      push_notifications: true,
      assignments: true,
      mentions: true,
      deadlines: true,
      achievements: true,
      team_updates: true
    }
  }
}

function shouldSendNotification(type: string, preferences: any): boolean {
  switch (type) {
    case 'assignment':
      return preferences.assignments
    case 'mention':
      return preferences.mentions
    case 'deadline_alert':
      return preferences.deadlines
    case 'achievement':
      return preferences.achievements
    case 'team_update':
      return preferences.team_updates
    default:
      return true
  }
}

async function trackAssignmentActivity(event: any, supabase: any) {
  try {
    await supabase
      .from('team_activity_log')
      .insert({
        area_id: event.area_id,
        activity_type: 'assignment',
        entity_type: event.data.entity_type,
        entity_id: event.data.entity_id,
        triggered_by: event.triggered_by,
        target_users: event.targets,
        metadata: {
          entity_title: event.data.entity_title,
          assignment_count: event.targets.length
        },
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error tracking assignment activity:', error)
  }
}

async function trackMentionActivity(event: any, supabase: any) {
  try {
    await supabase
      .from('team_activity_log')
      .insert({
        area_id: event.area_id,
        activity_type: 'mention',
        entity_type: event.data.entity_type,
        entity_id: event.data.entity_id,
        triggered_by: event.triggered_by,
        target_users: event.targets,
        metadata: {
          entity_title: event.data.entity_title,
          mention_count: event.targets.length
        },
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error tracking mention activity:', error)
  }
}

async function trackTeamAchievement(event: any, supabase: any) {
  try {
    await supabase
      .from('team_achievements')
      .insert({
        area_id: event.area_id,
        achievement_type: event.data.metadata?.achievement_type || 'general',
        entity_type: event.data.entity_type,
        entity_id: event.data.entity_id,
        description: event.data.message,
        team_members: event.targets,
        achieved_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error tracking team achievement:', error)
  }
}

async function scheduleDeadlineReminders(event: any, supabase: any) {
  try {
    // Schedule reminders for critical deadlines
    // This would typically integrate with a job scheduler
    console.log(`Scheduling deadline reminders for ${event.data.entity_title}`)
    
    // Could use a job queue like Bull/Redis or database-based scheduler
    // For now, just log the intent
  } catch (error) {
    console.error('Error scheduling deadline reminders:', error)
  }
}

async function sendAssignmentEmails(event: any, supabase: any) {
  try {
    // Get user emails
    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .in('id', event.targets)

    for (const user of users || []) {
      // This would integrate with your email service
      console.log(`Sending assignment email to ${user.email} for ${event.data.entity_title}`)
      
      // Email service integration would go here
      // e.g., SendGrid, AWS SES, etc.
    }
  } catch (error) {
    console.error('Error sending assignment emails:', error)
  }
}

async function sendPushNotification(userId: string, notification: any, supabase: any) {
  try {
    // This would integrate with push notification service
    console.log(`Sending push notification to user ${userId}: ${notification.title}`)
    
    // Push notification service integration would go here
    // e.g., Firebase Cloud Messaging, Apple Push Notifications, etc.
  } catch (error) {
    console.error('Error sending push notification:', error)
  }
}

async function sendEmailNotification(userId: string, notification: any, supabase: any) {
  try {
    // Get user email
    const { data: user } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    if (user?.email) {
      console.log(`Sending urgent email notification to ${user.email}`)
      
      // Email service integration would go here
    }
  } catch (error) {
    console.error('Error sending email notification:', error)
  }
}

async function postToTeamFeed(event: any, supabase: any) {
  try {
    await supabase
      .from('team_feed')
      .insert({
        area_id: event.area_id,
        post_type: 'achievement',
        title: 'Team Achievement!',
        content: event.data.message,
        author_id: event.triggered_by,
        metadata: {
          entity_type: event.data.entity_type,
          entity_id: event.data.entity_id,
          achievement_type: event.data.metadata?.achievement_type
        },
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error posting to team feed:', error)
  }
}

async function updateTeamActivityFeed(event: any, supabase: any) {
  try {
    await supabase
      .from('team_feed')
      .insert({
        area_id: event.area_id,
        post_type: 'update',
        title: 'Team Update',
        content: event.data.message,
        author_id: event.triggered_by,
        metadata: {
          entity_type: event.data.entity_type,
          entity_id: event.data.entity_id,
          update_type: event.data.metadata?.update_type
        },
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error updating team activity feed:', error)
  }
}

async function broadcastTeamNotification(payload: TeamNotificationPayload, supabase: any) {
  try {
    // Broadcast to area-specific channel
    const areaChannel = `team_${payload.event.area_id}`
    
    await supabase
      .channel(areaChannel)
      .send({
        type: 'broadcast',
        event: payload.type,
        payload: {
          ...payload.event,
          timestamp: payload.timestamp
        }
      })

    // Broadcast to individual user channels
    for (const userId of payload.event.targets) {
      const userChannel = `user_${userId}`
      
      await supabase
        .channel(userChannel)
        .send({
          type: 'broadcast',
          event: 'notification',
          payload: {
            type: payload.type,
            ...payload.event.data,
            priority: payload.event.priority,
            timestamp: payload.timestamp
          }
        })
    }

  } catch (error) {
    console.error('Error broadcasting team notification:', error)
  }
}

async function logTeamNotificationEvent(
  payload: any,
  status: 'success' | 'error',
  supabase: any,
  errorMessage?: string
) {
  try {
    await supabase
      .from('webhook_audit_log')
      .insert({
        table_name: 'team_notifications',
        operation: payload.type || 'unknown',
        record_id: payload.event?.id || 'unknown',
        webhook_url: '/api/webhooks/team-notifications',
        status,
        error_message: errorMessage,
        metadata: {
          target_count: payload.event?.targets?.length || 0,
          notification_type: payload.type
        },
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error logging team notification event:', error)
  }
}

export const runtime = 'nodejs'