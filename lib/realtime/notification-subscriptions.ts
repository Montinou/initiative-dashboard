/**
 * Notification Real-time Subscriptions
 * Manages real-time notifications for user actions and system events
 */

import { createClient } from '@/utils/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface NotificationEvent {
  id: string
  type: 'activity_assigned' | 'activity_completed' | 'initiative_updated' | 'deadline_approaching' | 'milestone_achieved' | 'team_mentioned'
  title: string
  message: string
  userId: string
  tenantId: string
  metadata: {
    entityType: 'initiative' | 'objective' | 'activity' | 'area'
    entityId: string
    entityTitle?: string
    areaId?: string
    initiativeId?: string
    priority?: 'low' | 'medium' | 'high'
    actionUrl?: string
  }
  isRead: boolean
  createdAt: string
}

export interface NotificationSubscriptionOptions {
  userId: string
  tenantId: string
  onNotification?: (notification: NotificationEvent) => void
  onActivityAssignment?: (notification: NotificationEvent) => void
  onDeadlineAlert?: (notification: NotificationEvent) => void
  onMilestoneAlert?: (notification: NotificationEvent) => void
  onError?: (error: Error) => void
}

export class NotificationSubscriptions {
  private static channels: Map<string, RealtimeChannel> = new Map()
  private static supabase = createClient()
  private static notificationQueue: NotificationEvent[] = []

  /**
   * Subscribe to user notifications
   */
  static subscribeToUserNotifications(options: NotificationSubscriptionOptions): string {
    const channelName = `user_notifications_${options.userId}_${Date.now()}`

    // Listen for direct notification events (if you have a notifications table)
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications', // Assuming you have a notifications table
          filter: `user_id=eq.${options.userId}`
        },
        (payload) => {
          try {
            const notification = this.transformNotification(payload.new)
            this.handleNotification(notification, options)
          } catch (error) {
            options.onError?.(error as Error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to user notifications: ${channelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to user notifications: ${channelName}`)
          options.onError?.(new Error(`Failed to subscribe to channel: ${channelName}`))
        }
      })

    this.channels.set(channelName, channel)
    return channelName
  }

  /**
   * Subscribe to activity assignment notifications
   */
  static subscribeToActivityAssignments(
    userId: string,
    tenantId: string,
    callback?: (notification: NotificationEvent) => void,
    onError?: (error: Error) => void
  ): string {
    const channelName = `activity_assignments_${userId}_${Date.now()}`

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'activities'
        },
        async (payload) => {
          try {
            const oldAssignedTo = payload.old?.assigned_to
            const newAssignedTo = payload.new?.assigned_to

            // Check if user was assigned to this activity
            if (newAssignedTo === userId && oldAssignedTo !== userId) {
              // Verify tenant and get initiative info
              const { data: activity } = await this.supabase
                .from('activities')
                .select(`
                  title,
                  initiative_id,
                  initiatives!inner(
                    title,
                    tenant_id,
                    area_id,
                    due_date
                  )
                `)
                .eq('id', payload.new.id)
                .single()

              if (activity?.initiatives.tenant_id === tenantId) {
                const notification: NotificationEvent = {
                  id: `activity_assigned_${payload.new.id}_${Date.now()}`,
                  type: 'activity_assigned',
                  title: 'New Activity Assigned',
                  message: `You have been assigned to "${activity.title}" in ${activity.initiatives.title}`,
                  userId,
                  tenantId,
                  metadata: {
                    entityType: 'activity',
                    entityId: payload.new.id,
                    entityTitle: activity.title,
                    initiativeId: activity.initiative_id,
                    areaId: activity.initiatives.area_id,
                    priority: this.calculatePriority(activity.initiatives.due_date),
                    actionUrl: `/dashboard/activities?activity=${payload.new.id}`
                  },
                  isRead: false,
                  createdAt: new Date().toISOString()
                }

                callback?.(notification)
              }
            }
          } catch (error) {
            onError?.(error as Error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to activity assignments: ${channelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to activity assignments: ${channelName}`)
          onError?.(new Error(`Failed to subscribe to channel: ${channelName}`))
        }
      })

    this.channels.set(channelName, channel)
    return channelName
  }

  /**
   * Subscribe to deadline approaching notifications
   */
  static subscribeToDeadlineAlerts(
    userId: string,
    tenantId: string,
    callback?: (notification: NotificationEvent) => void,
    onError?: (error: Error) => void
  ): string {
    const channelName = `deadline_alerts_${userId}_${Date.now()}`

    // This would typically be triggered by a scheduled function
    // For now, we'll monitor initiative updates that might affect deadlines
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'initiatives',
          filter: `tenant_id=eq.${tenantId}`
        },
        async (payload) => {
          try {
            const dueDate = payload.new?.due_date
            if (dueDate) {
              const daysToDue = this.calculateDaysUntilDue(dueDate)
              
              // Alert if due within 3 days and user has activities in this initiative
              if (daysToDue <= 3 && daysToDue >= 0) {
                const { data: userActivities } = await this.supabase
                  .from('activities')
                  .select('id, title')
                  .eq('initiative_id', payload.new.id)
                  .eq('assigned_to', userId)
                  .eq('is_completed', false)

                if (userActivities && userActivities.length > 0) {
                  const notification: NotificationEvent = {
                    id: `deadline_alert_${payload.new.id}_${Date.now()}`,
                    type: 'deadline_approaching',
                    title: 'Deadline Approaching',
                    message: `Initiative "${payload.new.title}" is due in ${daysToDue} day${daysToDue !== 1 ? 's' : ''}`,
                    userId,
                    tenantId,
                    metadata: {
                      entityType: 'initiative',
                      entityId: payload.new.id,
                      entityTitle: payload.new.title,
                      areaId: payload.new.area_id,
                      priority: 'high',
                      actionUrl: `/dashboard/initiatives?initiative=${payload.new.id}`
                    },
                    isRead: false,
                    createdAt: new Date().toISOString()
                  }

                  callback?.(notification)
                }
              }
            }
          } catch (error) {
            onError?.(error as Error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to deadline alerts: ${channelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to deadline alerts: ${channelName}`)
          onError?.(new Error(`Failed to subscribe to channel: ${channelName}`))
        }
      })

    this.channels.set(channelName, channel)
    return channelName
  }

  /**
   * Subscribe to milestone achievement notifications
   */
  static subscribeToMilestoneAlerts(
    userId: string,
    tenantId: string,
    callback?: (notification: NotificationEvent) => void,
    onError?: (error: Error) => void
  ): string {
    const channelName = `milestone_alerts_${userId}_${Date.now()}`
    const milestones = [25, 50, 75, 100]

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'initiatives',
          filter: `tenant_id=eq.${tenantId}`
        },
        async (payload) => {
          try {
            const oldProgress = payload.old?.progress || 0
            const newProgress = payload.new?.progress || 0

            // Check if a milestone was crossed
            for (const milestone of milestones) {
              if (oldProgress < milestone && newProgress >= milestone) {
                // Check if user has activities in this initiative
                const { data: userActivities } = await this.supabase
                  .from('activities')
                  .select('id')
                  .eq('initiative_id', payload.new.id)
                  .eq('assigned_to', userId)

                if (userActivities && userActivities.length > 0) {
                  const notification: NotificationEvent = {
                    id: `milestone_${milestone}_${payload.new.id}_${Date.now()}`,
                    type: 'milestone_achieved',
                    title: 'Milestone Achieved!',
                    message: `Initiative "${payload.new.title}" reached ${milestone}% completion`,
                    userId,
                    tenantId,
                    metadata: {
                      entityType: 'initiative',
                      entityId: payload.new.id,
                      entityTitle: payload.new.title,
                      areaId: payload.new.area_id,
                      priority: 'medium',
                      actionUrl: `/dashboard/initiatives?initiative=${payload.new.id}`
                    },
                    isRead: false,
                    createdAt: new Date().toISOString()
                  }

                  callback?.(notification)
                }
                break // Only trigger one milestone per update
              }
            }
          } catch (error) {
            onError?.(error as Error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to milestone alerts: ${channelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to milestone alerts: ${channelName}`)
          onError?.(new Error(`Failed to subscribe to channel: ${channelName}`))
        }
      })

    this.channels.set(channelName, channel)
    return channelName
  }

  /**
   * Subscribe to comprehensive user notifications (all types)
   */
  static subscribeToAllUserNotifications(options: NotificationSubscriptionOptions): string[] {
    const subscriptionIds: string[] = []

    // Activity assignments
    const assignmentSubId = this.subscribeToActivityAssignments(
      options.userId,
      options.tenantId,
      options.onActivityAssignment || options.onNotification,
      options.onError
    )
    subscriptionIds.push(assignmentSubId)

    // Deadline alerts
    const deadlineSubId = this.subscribeToDeadlineAlerts(
      options.userId,
      options.tenantId,
      options.onDeadlineAlert || options.onNotification,
      options.onError
    )
    subscriptionIds.push(deadlineSubId)

    // Milestone alerts
    const milestoneSubId = this.subscribeToMilestoneAlerts(
      options.userId,
      options.tenantId,
      options.onMilestoneAlert || options.onNotification,
      options.onError
    )
    subscriptionIds.push(milestoneSubId)

    return subscriptionIds
  }

  /**
   * Queue notifications for batch processing
   */
  static queueNotification(notification: NotificationEvent): void {
    this.notificationQueue.push(notification)
    
    // Auto-process queue if it gets too large
    if (this.notificationQueue.length >= 10) {
      this.processNotificationQueue()
    }
  }

  /**
   * Process queued notifications
   */
  static processNotificationQueue(): NotificationEvent[] {
    const notifications = [...this.notificationQueue]
    this.notificationQueue = []
    
    // Here you could save to database, send push notifications, etc.
    console.log(`📬 Processing ${notifications.length} queued notifications`)
    
    return notifications
  }

  /**
   * Create browser notification (if permission granted)
   */
  static async createBrowserNotification(notification: NotificationEvent): Promise<void> {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        data: notification.metadata
      })
    } else if ('Notification' in window && Notification.permission === 'default') {
      // Request permission
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        this.createBrowserNotification(notification)
      }
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    // This would update a notifications table if you have one
    console.log(`📖 Marking notification ${notificationId} as read`)
  }

  /**
   * Get notification history for user
   */
  static async getNotificationHistory(
    userId: string,
    tenantId: string,
    limit: number = 50
  ): Promise<NotificationEvent[]> {
    // This would query a notifications table if you have one
    // For now, return empty array
    return []
  }

  /**
   * Unsubscribe from specific channel
   */
  static unsubscribe(channelId: string): void {
    const channel = this.channels.get(channelId)
    if (channel) {
      channel.unsubscribe()
      this.channels.delete(channelId)
      console.log(`🔌 Unsubscribed from notification channel: ${channelId}`)
    }
  }

  /**
   * Unsubscribe from multiple channels
   */
  static unsubscribeMultiple(channelIds: string[]): void {
    channelIds.forEach(id => this.unsubscribe(id))
  }

  /**
   * Unsubscribe from all notification channels
   */
  static unsubscribeAll(): void {
    this.channels.forEach((channel, channelId) => {
      channel.unsubscribe()
      console.log(`🔌 Unsubscribed from notification channel: ${channelId}`)
    })
    this.channels.clear()
  }

  // Private helper methods
  private static transformNotification(data: any): NotificationEvent {
    return {
      id: data.id,
      type: data.type,
      title: data.title,
      message: data.message,
      userId: data.user_id,
      tenantId: data.tenant_id,
      metadata: data.metadata || {},
      isRead: data.is_read || false,
      createdAt: data.created_at
    }
  }

  private static handleNotification(
    notification: NotificationEvent,
    options: NotificationSubscriptionOptions
  ): void {
    // Route to specific handler based on type
    switch (notification.type) {
      case 'activity_assigned':
        options.onActivityAssignment?.(notification)
        break
      case 'deadline_approaching':
        options.onDeadlineAlert?.(notification)
        break
      case 'milestone_achieved':
        options.onMilestoneAlert?.(notification)
        break
      default:
        break
    }

    // Always call general handler
    options.onNotification?.(notification)

    // Create browser notification if enabled
    this.createBrowserNotification(notification)
  }

  private static calculateDaysUntilDue(dueDate: string): number {
    const due = new Date(dueDate)
    const now = new Date()
    const diffTime = due.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  private static calculatePriority(dueDate?: string): 'low' | 'medium' | 'high' {
    if (!dueDate) return 'low'
    
    const daysUntilDue = this.calculateDaysUntilDue(dueDate)
    if (daysUntilDue <= 3) return 'high'
    if (daysUntilDue <= 7) return 'medium'
    return 'low'
  }
}

export default NotificationSubscriptions