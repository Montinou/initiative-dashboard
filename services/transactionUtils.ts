/**
 * Transaction utilities for database operations
 * Provides transaction support with retry logic and proper error handling
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

interface TransactionOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  isolationLevel?: 'read_committed' | 'repeatable_read' | 'serializable';
}

interface TransactionContext {
  client: SupabaseClient;
  transactionId: string;
  savepoints: string[];
}

export class TransactionManager {
  private client: SupabaseClient;
  private activeTransactions: Map<string, TransactionContext> = new Map();

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Execute operations within a database transaction
   * Automatically handles rollback on error
   */
  async executeInTransaction<T>(
    operations: (client: SupabaseClient) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const {
      retries = 3,
      retryDelay = 1000,
      timeout = 30000,
      isolationLevel = 'read_committed'
    } = options;

    let lastError: any;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Start transaction with RPC call
        const { data: txData, error: txError } = await this.client.rpc('begin_transaction', {
          isolation_level: isolationLevel,
          timeout_ms: timeout
        });

        if (txError) throw txError;

        const transactionId = txData?.transaction_id || `tx_${Date.now()}`;
        
        // Create transaction context
        const context: TransactionContext = {
          client: this.client,
          transactionId,
          savepoints: []
        };

        this.activeTransactions.set(transactionId, context);

        try {
          // Execute operations
          const result = await operations(this.client);

          // Commit transaction
          const { error: commitError } = await this.client.rpc('commit_transaction', {
            transaction_id: transactionId
          });

          if (commitError) throw commitError;

          return result;
        } catch (error) {
          // Rollback on error
          await this.client.rpc('rollback_transaction', {
            transaction_id: transactionId
          }).catch(err => logger.error('Rollback error:', err));

          throw error;
        } finally {
          this.activeTransactions.delete(transactionId);
        }
      } catch (error: any) {
        lastError = error;

        // Check if error is retryable
        if (this.isRetryableError(error) && attempt < retries) {
          await this.delay(retryDelay * attempt); // Exponential backoff
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Create a savepoint within a transaction
   */
  async createSavepoint(transactionId: string, name: string): Promise<void> {
    const context = this.activeTransactions.get(transactionId);
    if (!context) throw new Error('Transaction not found');

    const { error } = await context.client.rpc('create_savepoint', { name });
    if (error) throw error;

    context.savepoints.push(name);
  }

  /**
   * Rollback to a savepoint
   */
  async rollbackToSavepoint(transactionId: string, name: string): Promise<void> {
    const context = this.activeTransactions.get(transactionId);
    if (!context) throw new Error('Transaction not found');

    const { error } = await context.client.rpc('rollback_to_savepoint', { name });
    if (error) throw error;

    // Remove savepoints after the rollback point
    const index = context.savepoints.indexOf(name);
    if (index !== -1) {
      context.savepoints = context.savepoints.slice(0, index + 1);
    }
  }

  /**
   * Execute batch operations in transaction
   */
  async executeBatchInTransaction<T>(
    batches: Array<(client: SupabaseClient) => Promise<T>>,
    options: TransactionOptions = {}
  ): Promise<T[]> {
    return this.executeInTransaction(async (client) => {
      const results: T[] = [];
      
      for (let i = 0; i < batches.length; i++) {
        try {
          const result = await batches[i](client);
          results.push(result);
        } catch (error) {
          logger.error(`Batch ${i} failed:`, error);
          throw error; // Will trigger automatic rollback
        }
      }
      
      return results;
    }, options);
  }

  /**
   * Check if error is retryable (deadlock, connection issues)
   */
  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      '40001', // Serialization failure
      '40P01', // Deadlock detected
      '08006', // Connection failure
      '08003', // Connection does not exist
      '57P03', // Cannot connect now
    ];

    return retryableCodes.includes(error?.code) || 
           error?.message?.includes('deadlock') ||
           error?.message?.includes('connection');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Helper function to wrap operations in a transaction
 */
export async function withTransaction<T>(
  client: SupabaseClient,
  operations: (client: SupabaseClient) => Promise<T>,
  options?: TransactionOptions
): Promise<T> {
  const manager = new TransactionManager(client);
  return manager.executeInTransaction(operations, options);
}

/**
 * Batch insert with transaction support
 */
export async function batchInsertWithTransaction(
  client: SupabaseClient,
  table: string,
  records: any[],
  batchSize: number = 100
): Promise<void> {
  const manager = new TransactionManager(client);
  
  const batches = [];
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    batches.push(async (txClient: SupabaseClient) => {
      const { error } = await txClient.from(table).insert(batch);
      if (error) throw error;
      return batch.length;
    });
  }
  
  await manager.executeBatchInTransaction(batches);
}

/**
 * Multi-entity operation with transaction
 */
export async function createOKREntitiesInTransaction(
  client: SupabaseClient,
  objective: any,
  initiatives: any[],
  activities: any[]
): Promise<{ objectiveId: string; initiativeIds: string[]; activityIds: string[] }> {
  const manager = new TransactionManager(client);
  
  return manager.executeInTransaction(async (txClient) => {
    // Insert objective
    const { data: objData, error: objError } = await txClient
      .from('objectives')
      .insert(objective)
      .select('id')
      .single();
    
    if (objError) throw objError;
    const objectiveId = objData.id;
    
    // Insert initiatives with objective reference
    const initiativesWithObj = initiatives.map(init => ({
      ...init,
      objective_id: objectiveId
    }));
    
    const { data: initData, error: initError } = await txClient
      .from('initiatives')
      .insert(initiativesWithObj)
      .select('id');
    
    if (initError) throw initError;
    const initiativeIds = initData.map(d => d.id);
    
    // Insert activities with initiative references
    const activitiesWithInit = activities.map((act, idx) => ({
      ...act,
      initiative_id: initiativeIds[Math.floor(idx / activities.length * initiativeIds.length)]
    }));
    
    const { data: actData, error: actError } = await txClient
      .from('activities')
      .insert(activitiesWithInit)
      .select('id');
    
    if (actError) throw actError;
    const activityIds = actData.map(d => d.id);
    
    return { objectiveId, initiativeIds, activityIds };
  });
}