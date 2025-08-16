/**
 * Progress Real-time Subscriptions
 * Manages real-time updates for progress tracking across initiatives and objectives
 */

import { createClient } from '@/utils/supabase/client'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface ProgressUpdateEvent {
  type: 'initiative_progress' | 'objective_progress' | 'activity_completion'
  entityId: string
  entityType: 'initiative' | 'objective' | 'activity'
  oldProgress?: number
  newProgress: number
  changedBy: string
  changedAt: string
  notes?: string
  initiativeId?: string // For activity completions
  areaId?: string
  tenantId: string
}

export interface ProgressSubscriptionOptions {
  tenantId: string
  areaId?: string
  initiativeId?: string
  objectiveId?: string
  onProgressUpdate?: (event: ProgressUpdateEvent) => void
  onActivityCompletion?: (event: ProgressUpdateEvent) => void
  onMilestoneReached?: (event: ProgressMilestoneEvent) => void
  onError?: (error: Error) => void
}

export interface ProgressMilestoneEvent {
  entityId: string
  entityType: 'initiative' | 'objective'
  milestone: 25 | 50 | 75 | 100
  progress: number
  achievedAt: string
  tenantId: string
}

export class ProgressSubscriptions {
  private static channels: Map<string, RealtimeChannel> = new Map()
  private static supabase = createClient()
  private static progressThresholds = [25, 50, 75, 100]

  /**
   * Subscribe to initiative progress changes
   */
  static subscribeToInitiativeProgress(options: ProgressSubscriptionOptions): string {
    const channelName = `initiative_progress_${options.tenantId}_${options.initiativeId || 'all'}_${Date.now()}`
    
    let filter = `tenant_id=eq.${options.tenantId}`
    if (options.areaId) {
      filter += `,area_id=eq.${options.areaId}`
    }
    if (options.initiativeId) {
      filter += `,id=eq.${options.initiativeId}`
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'initiatives',
          filter
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          try {
            const oldProgress = payload.old?.progress
            const newProgress = payload.new?.progress

            // Only trigger if progress actually changed
            if (oldProgress !== newProgress) {
              const event: ProgressUpdateEvent = {
                type: 'initiative_progress',
                entityId: payload.new.id,
                entityType: 'initiative',
                oldProgress,
                newProgress,
                changedBy: payload.new.updated_by || 'system',
                changedAt: payload.new.updated_at,
                areaId: payload.new.area_id,
                tenantId: payload.new.tenant_id
              }

              options.onProgressUpdate?.(event)

              // Check for milestone achievements
              this.checkMilestoneAchievement(
                payload.new.id,
                'initiative',
                oldProgress || 0,
                newProgress,
                payload.new.tenant_id,
                options.onMilestoneReached
              )
            }
          } catch (error) {
            options.onError?.(error as Error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // console.log(`✅ Subscribed to initiative progress: ${channelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to initiative progress: ${channelName}`)
          options.onError?.(new Error(`Failed to subscribe to channel: ${channelName}`))
        }
      })

    this.channels.set(channelName, channel)
    return channelName
  }

  /**
   * Subscribe to objective progress changes
   */
  static subscribeToObjectiveProgress(options: ProgressSubscriptionOptions): string {
    const channelName = `objective_progress_${options.tenantId}_${options.objectiveId || 'all'}_${Date.now()}`
    
    let filter = `tenant_id=eq.${options.tenantId}`
    if (options.areaId) {
      filter += `,area_id=eq.${options.areaId}`
    }
    if (options.objectiveId) {
      filter += `,id=eq.${options.objectiveId}`
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'objectives',
          filter
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          try {
            const oldProgress = payload.old?.progress
            const newProgress = payload.new?.progress

            if (oldProgress !== newProgress) {
              const event: ProgressUpdateEvent = {
                type: 'objective_progress',
                entityId: payload.new.id,
                entityType: 'objective',
                oldProgress,
                newProgress,
                changedBy: payload.new.updated_by || 'system',
                changedAt: payload.new.updated_at,
                areaId: payload.new.area_id,
                tenantId: payload.new.tenant_id
              }

              options.onProgressUpdate?.(event)

              this.checkMilestoneAchievement(
                payload.new.id,
                'objective',
                oldProgress || 0,
                newProgress,
                payload.new.tenant_id,
                options.onMilestoneReached
              )
            }
          } catch (error) {
            options.onError?.(error as Error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // console.log(`✅ Subscribed to objective progress: ${channelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to objective progress: ${channelName}`)
          options.onError?.(new Error(`Failed to subscribe to channel: ${channelName}`))
        }
      })

    this.channels.set(channelName, channel)
    return channelName
  }

  /**
   * Subscribe to activity completion changes
   */
  static subscribeToActivityCompletions(options: ProgressSubscriptionOptions): string {
    const channelName = `activity_completions_${options.tenantId}_${Date.now()}`

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

            // Only trigger if completion status changed
            if (oldCompleted !== newCompleted) {
              // Verify tenant access through initiative
              const { data: initiative } = await this.supabase
                .from('initiatives')
                .select('tenant_id, area_id, progress')
                .eq('id', payload.new.initiative_id)
                .single()

              if (initiative?.tenant_id === options.tenantId &&
                  (!options.areaId || initiative.area_id === options.areaId) &&
                  (!options.initiativeId || payload.new.initiative_id === options.initiativeId)) {
                
                const event: ProgressUpdateEvent = {
                  type: 'activity_completion',
                  entityId: payload.new.id,
                  entityType: 'activity',
                  newProgress: newCompleted ? 100 : 0,
                  changedBy: payload.new.updated_by || 'system',
                  changedAt: payload.new.updated_at,
                  initiativeId: payload.new.initiative_id,
                  areaId: initiative.area_id,
                  tenantId: initiative.tenant_id
                }

                options.onActivityCompletion?.(event)
                options.onProgressUpdate?.(event)
              }
            }
          } catch (error) {
            options.onError?.(error as Error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // console.log(`✅ Subscribed to activity completions: ${channelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to activity completions: ${channelName}`)
          options.onError?.(new Error(`Failed to subscribe to channel: ${channelName}`))
        }
      })

    this.channels.set(channelName, channel)
    return channelName
  }

  /**
   * Subscribe to progress history for detailed tracking
   */
  static subscribeToProgressHistory(
    tenantId: string,
    initiativeId?: string,
    callbacks: {
      onProgressHistoryUpdate?: (event: any) => void
      onError?: (error: Error) => void
    }
  ): string {
    const channelName = `progress_history_${initiativeId || tenantId}_${Date.now()}`

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'progress_history',
          filter: initiativeId ? `initiative_id=eq.${initiativeId}` : undefined
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          try {
            // Verify tenant access
            if (payload.new?.initiative_id) {
              const { data: initiative } = await this.supabase
                .from('initiatives')
                .select('tenant_id, title, area_id')
                .eq('id', payload.new.initiative_id)
                .single()

              if (initiative?.tenant_id === tenantId) {
                const enrichedEvent = {
                  ...payload.new,
                  initiative_title: initiative.title,
                  area_id: initiative.area_id
                }
                callbacks.onProgressHistoryUpdate?.(enrichedEvent)
              }
            }
          } catch (error) {
            callbacks.onError?.(error as Error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // console.log(`✅ Subscribed to progress history: ${channelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to progress history: ${channelName}`)
          callbacks.onError?.(new Error(`Failed to subscribe to channel: ${channelName}`))
        }
      })

    this.channels.set(channelName, channel)
    return channelName
  }

  /**
   * Subscribe to comprehensive progress updates across an area
   */
  static subscribeToAreaProgress(
    tenantId: string,
    areaId: string,
    callbacks: {
      onInitiativeProgress?: (event: ProgressUpdateEvent) => void
      onObjectiveProgress?: (event: ProgressUpdateEvent) => void
      onActivityCompletion?: (event: ProgressUpdateEvent) => void
      onMilestone?: (event: ProgressMilestoneEvent) => void
      onError?: (error: Error) => void
    }
  ): string[] {
    const subscriptionIds: string[] = []

    // Subscribe to initiatives in the area
    const initiativeSubId = this.subscribeToInitiativeProgress({
      tenantId,
      areaId,
      onProgressUpdate: callbacks.onInitiativeProgress,
      onMilestoneReached: callbacks.onMilestone,
      onError: callbacks.onError
    })
    subscriptionIds.push(initiativeSubId)

    // Subscribe to objectives in the area
    const objectiveSubId = this.subscribeToObjectiveProgress({
      tenantId,
      areaId,
      onProgressUpdate: callbacks.onObjectiveProgress,
      onMilestoneReached: callbacks.onMilestone,
      onError: callbacks.onError
    })
    subscriptionIds.push(objectiveSubId)

    // Subscribe to activity completions in the area
    const activitySubId = this.subscribeToActivityCompletions({
      tenantId,
      areaId,
      onActivityCompletion: callbacks.onActivityCompletion,
      onError: callbacks.onError
    })
    subscriptionIds.push(activitySubId)

    return subscriptionIds
  }

  /**
   * Create aggregated progress metrics subscription
   */
  static subscribeToProgressMetrics(
    tenantId: string,
    areaId?: string,
    callback?: (metrics: ProgressMetrics) => void
  ): string[] {
    const metrics: ProgressMetrics = {
      totalInitiatives: 0,
      completedInitiatives: 0,
      totalObjectives: 0,
      completedObjectives: 0,
      totalActivities: 0,
      completedActivities: 0,
      avgInitiativeProgress: 0,
      avgObjectiveProgress: 0,
      lastUpdated: new Date()
    }

    let updateTimeout: NodeJS.Timeout

    const debouncedUpdate = () => {
      clearTimeout(updateTimeout)
      updateTimeout = setTimeout(() => {
        this.calculateCurrentMetrics(tenantId, areaId).then(newMetrics => {
          callback?.(newMetrics)
        })
      }, 1000) // Debounce updates by 1 second
    }

    return this.subscribeToAreaProgress(tenantId, areaId || '', {
      onInitiativeProgress: debouncedUpdate,
      onObjectiveProgress: debouncedUpdate,
      onActivityCompletion: debouncedUpdate,
      onError: (error) => console.error('Progress metrics subscription error:', error)
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
      // console.log(`🔌 Unsubscribed from progress channel: ${channelId}`)
    }
  }

  /**
   * Unsubscribe from multiple channels
   */
  static unsubscribeMultiple(channelIds: string[]): void {
    channelIds.forEach(id => this.unsubscribe(id))
  }

  /**
   * Unsubscribe from all progress channels
   */
  static unsubscribeAll(): void {
    this.channels.forEach((channel, channelId) => {
      channel.unsubscribe()
      // console.log(`🔌 Unsubscribed from progress channel: ${channelId}`)
    })
    this.channels.clear()
  }

  // Private helper methods
  private static checkMilestoneAchievement(
    entityId: string,
    entityType: 'initiative' | 'objective',
    oldProgress: number,
    newProgress: number,
    tenantId: string,
    onMilestone?: (event: ProgressMilestoneEvent) => void
  ): void {
    if (!onMilestone) return

    this.progressThresholds.forEach(threshold => {
      if (oldProgress < threshold && newProgress >= threshold) {
        const event: ProgressMilestoneEvent = {
          entityId,
          entityType,
          milestone: threshold as 25 | 50 | 75 | 100,
          progress: newProgress,
          achievedAt: new Date().toISOString(),
          tenantId
        }
        onMilestone(event)
      }
    })
  }

  private static async calculateCurrentMetrics(
    tenantId: string,
    areaId?: string
  ): Promise<ProgressMetrics> {
    try {
      // Get initiatives
      const initiativesQuery = this.supabase
        .from('initiatives')
        .select('progress, status')
        
      
      if (areaId) {
        initiativesQuery.eq('area_id', areaId)
      }

      const { data: initiatives } = await initiativesQuery

      // Get objectives
      const objectivesQuery = this.supabase
        .from('objectives')
        .select('progress, status')
        
      
      if (areaId) {
        objectivesQuery.eq('area_id', areaId)
      }

      const { data: objectives } = await objectivesQuery

      // Get activities (through initiatives)
      const activitiesQuery = this.supabase
        .from('activities')
        .select('is_completed, initiative_id, initiatives!inner(tenant_id)')
        .eq('initiatives.tenant_id', tenantId)

      if (areaId) {
        activitiesQuery.eq('initiatives.area_id', areaId)
      }

      const { data: activities } = await activitiesQuery

      const totalInitiatives = initiatives?.length || 0
      const completedInitiatives = initiatives?.filter(i => i.status === 'completed').length || 0
      const avgInitiativeProgress = totalInitiatives > 0 
        ? initiatives!.reduce((sum, i) => sum + i.progress, 0) / totalInitiatives 
        : 0

      const totalObjectives = objectives?.length || 0
      const completedObjectives = objectives?.filter(o => o.status === 'completed').length || 0
      const avgObjectiveProgress = totalObjectives > 0 
        ? objectives!.reduce((sum, o) => sum + o.progress, 0) / totalObjectives 
        : 0

      const totalActivities = activities?.length || 0
      const completedActivities = activities?.filter(a => a.is_completed).length || 0

      return {
        totalInitiatives,
        completedInitiatives,
        totalObjectives,
        completedObjectives,
        totalActivities,
        completedActivities,
        avgInitiativeProgress: Math.round(avgInitiativeProgress),
        avgObjectiveProgress: Math.round(avgObjectiveProgress),
        lastUpdated: new Date()
      }
    } catch (error) {
      console.error('Error calculating progress metrics:', error)
      return {
        totalInitiatives: 0,
        completedInitiatives: 0,
        totalObjectives: 0,
        completedObjectives: 0,
        totalActivities: 0,
        completedActivities: 0,
        avgInitiativeProgress: 0,
        avgObjectiveProgress: 0,
        lastUpdated: new Date()
      }
    }
  }
}

export interface ProgressMetrics {
  totalInitiatives: number
  completedInitiatives: number
  totalObjectives: number
  completedObjectives: number
  totalActivities: number
  completedActivities: number
  avgInitiativeProgress: number
  avgObjectiveProgress: number
  lastUpdated: Date
}

export default ProgressSubscriptions