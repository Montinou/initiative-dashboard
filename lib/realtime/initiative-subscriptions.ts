/**
 * Initiative Real-time Subscriptions
 * Manages real-time updates for initiatives using Supabase subscriptions
 * Maintains tenant isolation and provides typed event handlers
 */

import { createClient } from '@/utils/supabase/client'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface InitiativeRealtimeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: any
  old: any
  table: string
  schema: string
  commit_timestamp: string
}

export interface InitiativeSubscriptionOptions {
  tenantId: string
  areaId?: string
  initiativeId?: string
  onInsert?: (payload: InitiativeRealtimeEvent) => void
  onUpdate?: (payload: InitiativeRealtimeEvent) => void
  onDelete?: (payload: InitiativeRealtimeEvent) => void
  onError?: (error: Error) => void
}

export interface ActivityRealtimeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: any
  old: any
  initiativeId: string
}

export class InitiativeSubscriptions {
  private static channels: Map<string, RealtimeChannel> = new Map()
  private static supabase = createClient()

  /**
   * Subscribe to initiative changes for a specific tenant
   */
  static subscribeToInitiatives(options: InitiativeSubscriptionOptions): string {
    const channelName = `initiatives_${options.tenantId}_${options.areaId || 'all'}_${Date.now()}`
    
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
          event: 'INSERT',
          schema: 'public',
          table: 'initiatives',
          filter
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          try {
            const event: InitiativeRealtimeEvent = {
              eventType: 'INSERT',
              new: payload.new,
              old: payload.old,
              table: payload.table,
              schema: payload.schema,
              commit_timestamp: payload.commit_timestamp
            }
            options.onInsert?.(event)
          } catch (error) {
            options.onError?.(error as Error)
          }
        }
      )
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
            const event: InitiativeRealtimeEvent = {
              eventType: 'UPDATE',
              new: payload.new,
              old: payload.old,
              table: payload.table,
              schema: payload.schema,
              commit_timestamp: payload.commit_timestamp
            }
            options.onUpdate?.(event)
          } catch (error) {
            options.onError?.(error as Error)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'initiatives',
          filter
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          try {
            const event: InitiativeRealtimeEvent = {
              eventType: 'DELETE',
              new: payload.new,
              old: payload.old,
              table: payload.table,
              schema: payload.schema,
              commit_timestamp: payload.commit_timestamp
            }
            options.onDelete?.(event)
          } catch (error) {
            options.onError?.(error as Error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // console.log(`✅ Subscribed to initiatives: ${channelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to initiatives: ${channelName}`)
          options.onError?.(new Error(`Failed to subscribe to channel: ${channelName}`))
        }
      })

    this.channels.set(channelName, channel)
    return channelName
  }

  /**
   * Subscribe to activity changes within initiatives
   */
  static subscribeToInitiativeActivities(
    tenantId: string,
    initiativeId: string,
    callbacks: {
      onActivityInsert?: (event: ActivityRealtimeEvent) => void
      onActivityUpdate?: (event: ActivityRealtimeEvent) => void
      onActivityDelete?: (event: ActivityRealtimeEvent) => void
      onError?: (error: Error) => void
    }
  ): string {
    const channelName = `initiative_activities_${initiativeId}_${Date.now()}`

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: `initiative_id=eq.${initiativeId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          try {
            const event: ActivityRealtimeEvent = {
              eventType: 'INSERT',
              new: payload.new,
              old: payload.old,
              initiativeId
            }
            callbacks.onActivityInsert?.(event)
          } catch (error) {
            callbacks.onError?.(error as Error)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'activities',
          filter: `initiative_id=eq.${initiativeId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          try {
            const event: ActivityRealtimeEvent = {
              eventType: 'UPDATE',
              new: payload.new,
              old: payload.old,
              initiativeId
            }
            callbacks.onActivityUpdate?.(event)
          } catch (error) {
            callbacks.onError?.(error as Error)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'activities',
          filter: `initiative_id=eq.${initiativeId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          try {
            const event: ActivityRealtimeEvent = {
              eventType: 'DELETE',
              new: payload.new,
              old: payload.old,
              initiativeId
            }
            callbacks.onActivityDelete?.(event)
          } catch (error) {
            callbacks.onError?.(error as Error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // console.log(`✅ Subscribed to initiative activities: ${channelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to initiative activities: ${channelName}`)
          callbacks.onError?.(new Error(`Failed to subscribe to channel: ${channelName}`))
        }
      })

    this.channels.set(channelName, channel)
    return channelName
  }

  /**
   * Subscribe to all initiative-related changes (initiatives + activities)
   */
  static subscribeToInitiativeEcosystem(
    tenantId: string,
    areaId: string | undefined,
    callbacks: {
      onInitiativeChange?: (event: InitiativeRealtimeEvent) => void
      onActivityChange?: (event: ActivityRealtimeEvent) => void
      onError?: (error: Error) => void
    }
  ): string[] {
    const subscriptionIds: string[] = []

    // Subscribe to initiatives
    const initiativeSubscriptionId = this.subscribeToInitiatives({
      tenantId,
      areaId,
      onInsert: callbacks.onInitiativeChange,
      onUpdate: callbacks.onInitiativeChange,
      onDelete: callbacks.onInitiativeChange,
      onError: callbacks.onError
    })
    subscriptionIds.push(initiativeSubscriptionId)

    // Subscribe to all activities (with tenant filtering through initiatives)
    const activityChannelName = `activities_ecosystem_${tenantId}_${areaId || 'all'}_${Date.now()}`
    
    // We need to join with initiatives to filter by tenant
    const activityChannel = this.supabase
      .channel(activityChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activities'
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          try {
            // Verify the activity belongs to an initiative in our tenant
            const activityData = payload.new || payload.old
            if (activityData?.initiative_id) {
              const { data: initiative } = await this.supabase
                .from('initiatives')
                .select('tenant_id, area_id')
                .eq('id', activityData.initiative_id)
                .single()

              if (initiative?.tenant_id === tenantId && 
                  (!areaId || initiative.area_id === areaId)) {
                const event: ActivityRealtimeEvent = {
                  eventType: payload.eventType as any,
                  new: payload.new,
                  old: payload.old,
                  initiativeId: activityData.initiative_id
                }
                callbacks.onActivityChange?.(event)
              }
            }
          } catch (error) {
            callbacks.onError?.(error as Error)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // console.log(`✅ Subscribed to activity ecosystem: ${activityChannelName}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ Error subscribing to activity ecosystem: ${activityChannelName}`)
          callbacks.onError?.(new Error(`Failed to subscribe to channel: ${activityChannelName}`))
        }
      })

    this.channels.set(activityChannelName, activityChannel)
    subscriptionIds.push(activityChannelName)

    return subscriptionIds
  }

  /**
   * Subscribe to progress history changes for real-time progress tracking
   */
  static subscribeToProgressHistory(
    tenantId: string,
    initiativeId?: string,
    callbacks: {
      onProgressUpdate?: (event: any) => void
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
            // Verify tenant access through initiative
            if (payload.new?.initiative_id) {
              const { data: initiative } = await this.supabase
                .from('initiatives')
                .select('tenant_id')
                .eq('id', payload.new.initiative_id)
                .single()

              if (initiative?.tenant_id === tenantId) {
                callbacks.onProgressUpdate?.(payload.new)
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
   * Unsubscribe from a specific channel
   */
  static unsubscribe(channelId: string): void {
    const channel = this.channels.get(channelId)
    if (channel) {
      channel.unsubscribe()
      this.channels.delete(channelId)
      // console.log(`🔌 Unsubscribed from channel: ${channelId}`)
    }
  }

  /**
   * Unsubscribe from multiple channels
   */
  static unsubscribeMultiple(channelIds: string[]): void {
    channelIds.forEach(id => this.unsubscribe(id))
  }

  /**
   * Unsubscribe from all active channels
   */
  static unsubscribeAll(): void {
    this.channels.forEach((channel, channelId) => {
      channel.unsubscribe()
      // console.log(`🔌 Unsubscribed from channel: ${channelId}`)
    })
    this.channels.clear()
  }

  /**
   * Get status of all active subscriptions
   */
  static getActiveSubscriptions(): Array<{ channelId: string; status: string }> {
    const subscriptions: Array<{ channelId: string; status: string }> = []
    
    this.channels.forEach((channel, channelId) => {
      subscriptions.push({
        channelId,
        status: channel.state
      })
    })

    return subscriptions
  }

  /**
   * Check if realtime is connected
   */
  static isConnected(): boolean {
    return this.supabase.realtime.isConnected()
  }

  /**
   * Reconnect all subscriptions (useful after network issues)
   */
  static async reconnectAll(): Promise<void> {
    const channelEntries = Array.from(this.channels.entries())
    
    // Unsubscribe all
    this.unsubscribeAll()

    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Reconnect (Note: This is a simplified reconnection - in practice,
    // you'd need to store the original subscription options to recreate them)
    console.log('🔄 Reconnection would need original subscription options to recreate channels')
  }

  /**
   * Create a debounced event handler to prevent excessive updates
   */
  static createDebouncedHandler<T>(
    handler: (event: T) => void,
    delay: number = 500
  ): (event: T) => void {
    let timeoutId: NodeJS.Timeout

    return (event: T) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => handler(event), delay)
    }
  }

  /**
   * Create a batched event handler to group multiple events
   */
  static createBatchedHandler<T>(
    handler: (events: T[]) => void,
    batchSize: number = 10,
    maxWaitTime: number = 1000
  ): (event: T) => void {
    let events: T[] = []
    let timeoutId: NodeJS.Timeout

    const flush = () => {
      if (events.length > 0) {
        handler([...events])
        events = []
      }
      clearTimeout(timeoutId)
    }

    return (event: T) => {
      events.push(event)

      if (events.length >= batchSize) {
        flush()
      } else {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(flush, maxWaitTime)
      }
    }
  }
}

export default InitiativeSubscriptions