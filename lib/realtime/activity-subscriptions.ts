/**
 * Activity Real-time Subscriptions
 * Manages real-time updates for activity assignments, completions, and status changes
 */

import { createClient } from '@/utils/supabase/client'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface ActivityRealtimeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  activityId: string
  initiativeId: string
  title: string
  isCompleted: boolean
  assignedTo: string | null
  previousAssignedTo?: string | null
  completionChanged?: boolean
  assignmentChanged?: boolean
  areaId?: string
  tenantId: string
  timestamp: string
}

export interface ActivityAssignmentEvent {
  activityId: string
  activityTitle: string
  initiativeId: string
  initiativeTitle: string
  previousAssignee: string | null
  newAssignee: string | null
  assignedBy: string
  assignedAt: string
  tenantId: string
  areaId: string
}

export interface ActivityCompletionEvent {
  activityId: string
  activityTitle: string
  initiativeId: string
  initiativeTitle: string
  completedBy: string
  completedAt: string
  previousStatus: boolean
  newStatus: boolean
  tenantId: string
  areaId: string
}

export interface ActivitySubscriptionOptions {
  tenantId: string
  areaId?: string
  initiativeId?: string
  assigneeId?: string
  onActivityInsert?: (event: ActivityRealtimeEvent) => void
  onActivityUpdate?: (event: ActivityRealtimeEvent) => void
  onActivityDelete?: (event: ActivityRealtimeEvent) => void
  onActivityAssignment?: (event: ActivityAssignmentEvent) => void
  onActivityCompletion?: (event: ActivityCompletionEvent) => void
  onError?: (error: Error) => void
}

export class ActivitySubscriptions {
  private static channels: Map<string, RealtimeChannel> = new Map()
  private static supabase = createClient()

  /**
   * Subscribe to activity changes with comprehensive event handling
   */
  static subscribeToActivities(options: ActivitySubscriptionOptions): string {
    const channelName = `activities_${options.tenantId}_${options.areaId || 'all'}_${Date.now()}`

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activities'
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          try {
            await this.handleActivityChange(payload, options)
          } catch (error) {
            options.onError?.(error as Error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to activities: ${channelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to activities: ${channelName}`)
          options.onError?.(new Error(`Failed to subscribe to channel: ${channelName}`))
        }
      })

    this.channels.set(channelName, channel)
    return channelName
  }

  /**
   * Subscribe specifically to activity assignments for a user or team
   */
  static subscribeToActivityAssignments(
    tenantId: string,
    options: {
      areaId?: string
      assigneeId?: string
      onAssignment?: (event: ActivityAssignmentEvent) => void
      onUnassignment?: (event: ActivityAssignmentEvent) => void
      onReassignment?: (event: ActivityAssignmentEvent) => void
      onError?: (error: Error) => void
    }
  ): string {
    const channelName = `activity_assignments_${tenantId}_${options.assigneeId || 'all'}_${Date.now()}`

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'activities'
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          try {
            const oldAssignedTo = payload.old?.assigned_to
            const newAssignedTo = payload.new?.assigned_to

            // Only process if assignment changed
            if (oldAssignedTo !== newAssignedTo) {
              // Verify tenant access through initiative
              const { data: initiative } = await this.supabase
                .from('initiatives')
                .select('tenant_id, area_id, title')
                .eq('id', payload.new.initiative_id)
                .single()

              if (initiative?.tenant_id === tenantId &&
                  (!options.areaId || initiative.area_id === options.areaId)) {
                
                // Filter by assignee if specified
                if (!options.assigneeId || 
                    oldAssignedTo === options.assigneeId || 
                    newAssignedTo === options.assigneeId) {

                  const event: ActivityAssignmentEvent = {
                    activityId: payload.new.id,
                    activityTitle: payload.new.title,
                    initiativeId: payload.new.initiative_id,
                    initiativeTitle: initiative.title,
                    previousAssignee: oldAssignedTo,
                    newAssignee: newAssignedTo,
                    assignedBy: payload.new.updated_by || 'system',
                    assignedAt: payload.new.updated_at,
                    tenantId: initiative.tenant_id,
                    areaId: initiative.area_id
                  }

                  // Determine assignment type
                  if (!oldAssignedTo && newAssignedTo) {
                    options.onAssignment?.(event)
                  } else if (oldAssignedTo && !newAssignedTo) {
                    options.onUnassignment?.(event)
                  } else if (oldAssignedTo && newAssignedTo) {
                    options.onReassignment?.(event)
                  }
                }
              }
            }
          } catch (error) {
            options.onError?.(error as Error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to activity assignments: ${channelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to activity assignments: ${channelName}`)
          options.onError?.(new Error(`Failed to subscribe to channel: ${channelName}`))
        }
      })

    this.channels.set(channelName, channel)
    return channelName
  }

  /**
   * Subscribe to activity completions for progress tracking
   */
  static subscribeToActivityCompletions(
    tenantId: string,
    options: {
      areaId?: string
      initiativeId?: string
      onCompletion?: (event: ActivityCompletionEvent) => void
      onUncomplete?: (event: ActivityCompletionEvent) => void
      onError?: (error: Error) => void
    }
  ): string {
    const channelName = `activity_completions_${tenantId}_${options.initiativeId || 'all'}_${Date.now()}`

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'activities'
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          try {
            const oldCompleted = payload.old?.is_completed
            const newCompleted = payload.new?.is_completed

            // Only process if completion status changed
            if (oldCompleted !== newCompleted) {
              // Verify tenant access through initiative
              const { data: initiative } = await this.supabase
                .from('initiatives')
                .select('tenant_id, area_id, title')
                .eq('id', payload.new.initiative_id)
                .single()

              if (initiative?.tenant_id === tenantId &&
                  (!options.areaId || initiative.area_id === options.areaId) &&
                  (!options.initiativeId || payload.new.initiative_id === options.initiativeId)) {

                const event: ActivityCompletionEvent = {
                  activityId: payload.new.id,
                  activityTitle: payload.new.title,
                  initiativeId: payload.new.initiative_id,
                  initiativeTitle: initiative.title,
                  completedBy: payload.new.updated_by || 'system',
                  completedAt: payload.new.updated_at,
                  previousStatus: oldCompleted,
                  newStatus: newCompleted,
                  tenantId: initiative.tenant_id,
                  areaId: initiative.area_id
                }

                if (newCompleted) {
                  options.onCompletion?.(event)
                } else {
                  options.onUncomplete?.(event)
                }
              }
            }
          } catch (error) {
            options.onError?.(error as Error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Subscribed to activity completions: ${channelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to activity completions: ${channelName}`)
          options.onError?.(new Error(`Failed to subscribe to channel: ${channelName}`))
        }
      })

    this.channels.set(channelName, channel)
    return channelName
  }

  /**
   * Subscribe to user's personal activity feed
   */
  static subscribeToUserActivities(
    tenantId: string,
    userId: string,
    callbacks: {
      onNewAssignment?: (event: ActivityAssignmentEvent) => void
      onDueActivity?: (event: ActivityRealtimeEvent) => void
      onCompletedActivity?: (event: ActivityCompletionEvent) => void
      onError?: (error: Error) => void
    }
  ): string[] {
    const subscriptionIds: string[] = []

    // Subscribe to assignments for this user
    const assignmentSubId = this.subscribeToActivityAssignments(tenantId, {
      assigneeId: userId,
      onAssignment: callbacks.onNewAssignment,
      onReassignment: callbacks.onNewAssignment,
      onError: callbacks.onError
    })
    subscriptionIds.push(assignmentSubId)

    // Subscribe to completions for activities assigned to this user
    const completionSubId = this.subscribeToActivityCompletions(tenantId, {
      onCompletion: callbacks.onCompletedActivity,
      onUncomplete: callbacks.onCompletedActivity,
      onError: callbacks.onError
    })
    subscriptionIds.push(completionSubId)

    return subscriptionIds
  }

  /**
   * Subscribe to initiative activity ecosystem (all activities within an initiative)
   */
  static subscribeToInitiativeActivities(
    tenantId: string,
    initiativeId: string,
    callbacks: {
      onActivityAdded?: (event: ActivityRealtimeEvent) => void
      onActivityUpdated?: (event: ActivityRealtimeEvent) => void
      onActivityRemoved?: (event: ActivityRealtimeEvent) => void
      onActivityAssigned?: (event: ActivityAssignmentEvent) => void
      onActivityCompleted?: (event: ActivityCompletionEvent) => void
      onError?: (error: Error) => void
    }
  ): string[] {
    const subscriptionIds: string[] = []

    // Main activity subscription for the initiative
    const mainSubId = this.subscribeToActivities({
      tenantId,
      initiativeId,
      onActivityInsert: callbacks.onActivityAdded,
      onActivityUpdate: callbacks.onActivityUpdated,
      onActivityDelete: callbacks.onActivityRemoved,
      onError: callbacks.onError
    })
    subscriptionIds.push(mainSubId)

    // Assignment subscription for the initiative
    const assignmentSubId = this.subscribeToActivityAssignments(tenantId, {
      onAssignment: callbacks.onActivityAssigned,
      onReassignment: callbacks.onActivityAssigned,
      onUnassignment: callbacks.onActivityAssigned,
      onError: callbacks.onError
    })
    subscriptionIds.push(assignmentSubId)

    // Completion subscription for the initiative
    const completionSubId = this.subscribeToActivityCompletions(tenantId, {
      initiativeId,
      onCompletion: callbacks.onActivityCompleted,
      onUncomplete: callbacks.onActivityCompleted,
      onError: callbacks.onError
    })
    subscriptionIds.push(completionSubId)

    return subscriptionIds
  }

  /**
   * Create activity metrics subscription with real-time updates
   */
  static subscribeToActivityMetrics(
    tenantId: string,
    options: {
      areaId?: string
      initiativeId?: string
      assigneeId?: string
      onMetricsUpdate?: (metrics: ActivityMetrics) => void
      onError?: (error: Error) => void
    }
  ): string {
    let updateTimeout: NodeJS.Timeout

    const debouncedMetricsUpdate = () => {
      clearTimeout(updateTimeout)
      updateTimeout = setTimeout(() => {
        this.calculateActivityMetrics(tenantId, options).then(metrics => {
          options.onMetricsUpdate?.(metrics)
        })
      }, 1000)
    }

    return this.subscribeToActivities({
      tenantId,
      areaId: options.areaId,
      initiativeId: options.initiativeId,
      onActivityInsert: debouncedMetricsUpdate,
      onActivityUpdate: debouncedMetricsUpdate,
      onActivityDelete: debouncedMetricsUpdate,
      onError: options.onError
    })
  }

  /**
   * Unsubscribe from specific channel
   */
  static unsubscribe(channelId: string): void {
    const channel = this.channels.get(channelId)
    if (channel) {
      channel.unsubscribe()
      this.channels.delete(channelId)
      console.log(`🔌 Unsubscribed from activity channel: ${channelId}`)
    }
  }

  /**
   * Unsubscribe from multiple channels
   */
  static unsubscribeMultiple(channelIds: string[]): void {
    channelIds.forEach(id => this.unsubscribe(id))
  }

  /**
   * Unsubscribe from all activity channels
   */
  static unsubscribeAll(): void {
    this.channels.forEach((channel, channelId) => {
      channel.unsubscribe()
      console.log(`🔌 Unsubscribed from activity channel: ${channelId}`)
    })
    this.channels.clear()
  }

  // Private helper methods
  private static async handleActivityChange(
    payload: RealtimePostgresChangesPayload<any>,
    options: ActivitySubscriptionOptions
  ): Promise<void> {
    // Verify tenant access through initiative
    const activityData = payload.new || payload.old
    if (!activityData?.initiative_id) return

    const { data: initiative } = await this.supabase
      .from('initiatives')
      .select('tenant_id, area_id')
      .eq('id', activityData.initiative_id)
      .single()

    if (initiative?.tenant_id !== options.tenantId ||
        (options.areaId && initiative.area_id !== options.areaId) ||
        (options.initiativeId && activityData.initiative_id !== options.initiativeId) ||
        (options.assigneeId && activityData.assigned_to !== options.assigneeId)) {
      return
    }

    const event: ActivityRealtimeEvent = {
      eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
      activityId: activityData.id,
      initiativeId: activityData.initiative_id,
      title: activityData.title,
      isCompleted: activityData.is_completed,
      assignedTo: activityData.assigned_to,
      areaId: initiative.area_id,
      tenantId: initiative.tenant_id,
      timestamp: activityData.updated_at || activityData.created_at
    }

    // Add change flags for updates
    if (payload.eventType === 'UPDATE' && payload.old) {
      event.previousAssignedTo = payload.old.assigned_to
      event.assignmentChanged = payload.old.assigned_to !== payload.new.assigned_to
      event.completionChanged = payload.old.is_completed !== payload.new.is_completed
    }

    // Route to appropriate handler
    switch (payload.eventType) {
      case 'INSERT':
        options.onActivityInsert?.(event)
        break
      case 'UPDATE':
        options.onActivityUpdate?.(event)
        
        // Trigger specific handlers for assignments and completions
        if (event.assignmentChanged) {
          const assignmentEvent: ActivityAssignmentEvent = {
            activityId: event.activityId,
            activityTitle: event.title,
            initiativeId: event.initiativeId,
            initiativeTitle: '', // Would need additional query to get this
            previousAssignee: event.previousAssignedTo,
            newAssignee: event.assignedTo,
            assignedBy: 'system', // Would need additional context
            assignedAt: event.timestamp,
            tenantId: event.tenantId,
            areaId: event.areaId || ''
          }
          options.onActivityAssignment?.(assignmentEvent)
        }

        if (event.completionChanged) {
          const completionEvent: ActivityCompletionEvent = {
            activityId: event.activityId,
            activityTitle: event.title,
            initiativeId: event.initiativeId,
            initiativeTitle: '', // Would need additional query
            completedBy: 'system', // Would need additional context
            completedAt: event.timestamp,
            previousStatus: !event.isCompleted,
            newStatus: event.isCompleted,
            tenantId: event.tenantId,
            areaId: event.areaId || ''
          }
          options.onActivityCompletion?.(completionEvent)
        }
        break
      case 'DELETE':
        options.onActivityDelete?.(event)
        break
    }
  }

  private static async calculateActivityMetrics(
    tenantId: string,
    options: {
      areaId?: string
      initiativeId?: string
      assigneeId?: string
    }
  ): Promise<ActivityMetrics> {
    try {
      let query = this.supabase
        .from('activities')
        .select(`
          id,
          is_completed,
          assigned_to,
          initiative_id,
          initiatives!inner(tenant_id, area_id)
        `)
        .eq('initiatives.tenant_id', tenantId)

      if (options.areaId) {
        query = query.eq('initiatives.area_id', options.areaId)
      }

      if (options.initiativeId) {
        query = query.eq('initiative_id', options.initiativeId)
      }

      if (options.assigneeId) {
        query = query.eq('assigned_to', options.assigneeId)
      }

      const { data: activities } = await query

      const total = activities?.length || 0
      const completed = activities?.filter(a => a.is_completed).length || 0
      const assigned = activities?.filter(a => a.assigned_to).length || 0
      const unassigned = total - assigned

      return {
        total,
        completed,
        pending: total - completed,
        assigned,
        unassigned,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        assignmentRate: total > 0 ? Math.round((assigned / total) * 100) : 0,
        lastUpdated: new Date()
      }
    } catch (error) {
      console.error('Error calculating activity metrics:', error)
      return {
        total: 0,
        completed: 0,
        pending: 0,
        assigned: 0,
        unassigned: 0,
        completionRate: 0,
        assignmentRate: 0,
        lastUpdated: new Date()
      }
    }
  }
}

export interface ActivityMetrics {
  total: number
  completed: number
  pending: number
  assigned: number
  unassigned: number
  completionRate: number
  assignmentRate: number
  lastUpdated: Date
}

export default ActivitySubscriptions