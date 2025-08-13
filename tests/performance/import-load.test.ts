import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';
import { OKRImportProcessor } from '@/services/okrImportProcessor';
import { OKRBatchProcessor } from '@/services/okrBatchProcessor';
import { createClient } from '@/utils/supabase/server';
import fs from 'fs/promises';
import path from 'path';

// Mock dependencies
vi.mock('@/utils/supabase/server');
vi.mock('@google-cloud/storage');

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  smallFile: {
    maxTime: 1000, // 1 second for files < 100 rows
    maxMemory: 50 * 1024 * 1024, // 50MB
  },
  mediumFile: {
    maxTime: 5000, // 5 seconds for files < 1000 rows
    maxMemory: 100 * 1024 * 1024, // 100MB
  },
  largeFile: {
    maxTime: 30000, // 30 seconds for files < 10000 rows
    maxMemory: 200 * 1024 * 1024, // 200MB
  },
  xlFile: {
    maxTime: 120000, // 2 minutes for files > 10000 rows
    maxMemory: 500 * 1024 * 1024, // 500MB
  },
};

describe('OKR Import Performance Tests', () => {
  let mockSupabase: any;
  let testFiles: Map<string, Buffer>;

  beforeAll(async () => {
    // Generate test files of various sizes
    testFiles = new Map();
    
    // Small file (50 rows)
    const smallCsv = generateCsvData(50);
    testFiles.set('small', Buffer.from(smallCsv));
    
    // Medium file (500 rows)
    const mediumCsv = generateCsvData(500);
    testFiles.set('medium', Buffer.from(mediumCsv));
    
    // Large file (5000 rows)
    const largeCsv = generateCsvData(5000);
    testFiles.set('large', Buffer.from(largeCsv));
    
    // XL file (20000 rows)
    const xlCsv = generateCsvData(20000);
    testFiles.set('xl', Buffer.from(xlCsv));
    
    // Setup mock Supabase with realistic delays
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockImplementation(async () => {
        // Simulate database latency
        await new Promise(resolve => setTimeout(resolve, 5));
        return { data: { id: 'mock-id' }, error: null };
      }),
      update: vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return { data: {}, error: null };
      }),
      eq: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockImplementation(async () => {
        // Simulate batch operation latency
        await new Promise(resolve => setTimeout(resolve, 20));
        return { data: {}, error: null };
      }),
    };
    
    (createClient as any).mockResolvedValue(mockSupabase);
  });

  describe('Single File Processing Performance', () => {
    it('should process small file within threshold', async () => {
      const processor = new OKRImportProcessor({
        tenantId: 'test-tenant',
        userId: 'test-user',
        areaId: 'test-area',
      });
      
      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;
      
      const result = await processor.processFile(
        'small.csv',
        testFiles.get('small')!
      );
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      const processingTime = endTime - startTime;
      const memoryUsed = endMemory - startMemory;
      
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.smallFile.maxTime);
      expect(memoryUsed).toBeLessThan(PERFORMANCE_THRESHOLDS.smallFile.maxMemory);
      expect(result.totalRows).toBe(50);
      
      // Calculate processing speed
      const rowsPerSecond = (50 / processingTime) * 1000;
      console.log(`Small file: ${rowsPerSecond.toFixed(0)} rows/second`);
    });

    it('should process medium file within threshold', async () => {
      const processor = new OKRImportProcessor({
        tenantId: 'test-tenant',
        userId: 'test-user',
        areaId: 'test-area',
      });
      
      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;
      
      const result = await processor.processFile(
        'medium.csv',
        testFiles.get('medium')!
      );
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      const processingTime = endTime - startTime;
      const memoryUsed = endMemory - startMemory;
      
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.mediumFile.maxTime);
      expect(memoryUsed).toBeLessThan(PERFORMANCE_THRESHOLDS.mediumFile.maxMemory);
      expect(result.totalRows).toBe(500);
      
      const rowsPerSecond = (500 / processingTime) * 1000;
      console.log(`Medium file: ${rowsPerSecond.toFixed(0)} rows/second`);
    });

    it('should process large file within threshold', async () => {
      const processor = new OKRImportProcessor({
        tenantId: 'test-tenant',
        userId: 'test-user',
        areaId: 'test-area',
      });
      
      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;
      
      const result = await processor.processFile(
        'large.csv',
        testFiles.get('large')!
      );
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      const processingTime = endTime - startTime;
      const memoryUsed = endMemory - startMemory;
      
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.largeFile.maxTime);
      expect(memoryUsed).toBeLessThan(PERFORMANCE_THRESHOLDS.largeFile.maxMemory);
      expect(result.totalRows).toBe(5000);
      
      const rowsPerSecond = (5000 / processingTime) * 1000;
      console.log(`Large file: ${rowsPerSecond.toFixed(0)} rows/second`);
    });

    it('should handle XL file with streaming', async () => {
      const processor = new OKRImportProcessor({
        tenantId: 'test-tenant',
        userId: 'test-user',
        areaId: 'test-area',
        useStreaming: true,
      });
      
      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed;
      
      // Monitor memory during processing
      const memoryReadings: number[] = [];
      const memoryMonitor = setInterval(() => {
        memoryReadings.push(process.memoryUsage().heapUsed);
      }, 100);
      
      const result = await processor.processFile(
        'xl.csv',
        testFiles.get('xl')!
      );
      
      clearInterval(memoryMonitor);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      const peakMemory = Math.max(...memoryReadings) - startMemory;
      
      expect(processingTime).toBeLessThan(PERFORMANCE_THRESHOLDS.xlFile.maxTime);
      expect(peakMemory).toBeLessThan(PERFORMANCE_THRESHOLDS.xlFile.maxMemory);
      expect(result.totalRows).toBe(20000);
      
      const rowsPerSecond = (20000 / processingTime) * 1000;
      console.log(`XL file: ${rowsPerSecond.toFixed(0)} rows/second`);
      console.log(`Peak memory: ${(peakMemory / 1024 / 1024).toFixed(2)} MB`);
    });
  });

  describe('Batch Processing Performance', () => {
    it('should process batches efficiently', async () => {
      const batchProcessor = new OKRBatchProcessor(mockSupabase);
      
      // Create test data with 1000 rows
      const rows = Array(1000).fill(null).map((_, i) => ({
        entity_type: 'objective',
        title: `Objective ${i}`,
        priority: 'medium',
        status: 'planning',
        progress: i % 100,
      }));
      
      const startTime = performance.now();
      
      // Process in batches of 100
      const batchSize = 100;
      const results = [];
      
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const result = await batchProcessor.processBatch(batch, 'objectives');
        results.push(result);
      }
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Should be significantly faster than row-by-row
      const expectedRowByRowTime = rows.length * 10; // Assuming 10ms per row
      expect(processingTime).toBeLessThan(expectedRowByRowTime / 10); // At least 10x faster
      
      const rowsPerSecond = (1000 / processingTime) * 1000;
      console.log(`Batch processing: ${rowsPerSecond.toFixed(0)} rows/second`);
    });

    it('should optimize memory usage with batching', async () => {
      const batchProcessor = new OKRBatchProcessor(mockSupabase);
      
      // Create large dataset
      const rows = Array(10000).fill(null).map((_, i) => ({
        entity_type: 'initiative',
        title: `Initiative ${i}`,
        objective_title: `Objective ${i % 100}`,
        progress: i % 100,
      }));
      
      const memoryReadings: number[] = [];
      const startMemory = process.memoryUsage().heapUsed;
      
      // Monitor memory during batch processing
      const memoryMonitor = setInterval(() => {
        memoryReadings.push(process.memoryUsage().heapUsed);
      }, 50);
      
      // Process in optimized batches
      await batchProcessor.processLargeDataset(rows, {
        batchSize: 100,
        parallel: false,
      });
      
      clearInterval(memoryMonitor);
      
      const peakMemory = Math.max(...memoryReadings) - startMemory;
      
      // Memory should not scale linearly with data size
      expect(peakMemory).toBeLessThan(100 * 1024 * 1024); // Less than 100MB for 10k rows
      
      console.log(`Peak memory for 10k rows: ${(peakMemory / 1024 / 1024).toFixed(2)} MB`);
    });
  });

  describe('Concurrent Import Performance', () => {
    it('should handle 10 concurrent imports', async () => {
      const processors = Array(10).fill(null).map(() => 
        new OKRImportProcessor({
          tenantId: 'test-tenant',
          userId: 'test-user',
          areaId: 'test-area',
        })
      );
      
      const startTime = performance.now();
      
      // Process 10 small files concurrently
      const promises = processors.map((processor, i) =>
        processor.processFile(`concurrent-${i}.csv`, testFiles.get('small')!)
      );
      
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Concurrent processing should be faster than sequential
      const expectedSequentialTime = PERFORMANCE_THRESHOLDS.smallFile.maxTime * 10;
      expect(totalTime).toBeLessThan(expectedSequentialTime / 2); // At least 2x faster
      
      results.forEach(result => {
        expect(result.totalRows).toBe(50);
      });
      
      console.log(`10 concurrent imports: ${totalTime.toFixed(0)}ms total`);
    });

    it('should maintain performance under high concurrency', async () => {
      const concurrencyLevels = [1, 5, 10, 20, 50];
      const performanceMetrics: any[] = [];
      
      for (const level of concurrencyLevels) {
        const processors = Array(level).fill(null).map(() =>
          new OKRImportProcessor({
            tenantId: 'test-tenant',
            userId: 'test-user',
            areaId: 'test-area',
          })
        );
        
        const startTime = performance.now();
        const startMemory = process.memoryUsage().heapUsed;
        
        const promises = processors.map((processor, i) =>
          processor.processFile(`stress-${level}-${i}.csv`, testFiles.get('small')!)
        );
        
        await Promise.all(promises);
        
        const endTime = performance.now();
        const endMemory = process.memoryUsage().heapUsed;
        
        performanceMetrics.push({
          concurrency: level,
          totalTime: endTime - startTime,
          avgTimePerImport: (endTime - startTime) / level,
          memoryUsed: (endMemory - startMemory) / 1024 / 1024,
        });
      }
      
      // Performance should degrade gracefully
      performanceMetrics.forEach((metric, i) => {
        if (i > 0) {
          const previousMetric = performanceMetrics[i - 1];
          const degradation = metric.avgTimePerImport / previousMetric.avgTimePerImport;
          
          // Average time per import shouldn't degrade more than 50% per doubling
          expect(degradation).toBeLessThan(1.5);
        }
        
        console.log(
          `Concurrency ${metric.concurrency}: ` +
          `${metric.avgTimePerImport.toFixed(0)}ms avg, ` +
          `${metric.memoryUsed.toFixed(2)}MB memory`
        );
      });
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory over multiple imports', async () => {
      const processor = new OKRImportProcessor({
        tenantId: 'test-tenant',
        userId: 'test-user',
        areaId: 'test-area',
      });
      
      // Force garbage collection before test
      if (global.gc) {
        global.gc();
      }
      
      const initialMemory = process.memoryUsage().heapUsed;
      const memoryReadings: number[] = [];
      
      // Process same file 100 times
      for (let i = 0; i < 100; i++) {
        await processor.processFile(`iteration-${i}.csv`, testFiles.get('small')!);
        
        if (i % 10 === 0) {
          if (global.gc) {
            global.gc();
          }
          memoryReadings.push(process.memoryUsage().heapUsed);
        }
      }
      
      // Memory should stabilize, not grow linearly
      const memoryGrowth = memoryReadings[memoryReadings.length - 1] - memoryReadings[0];
      const avgMemoryPerIteration = memoryGrowth / 90; // 90 iterations between first and last reading
      
      // Should be less than 100KB per iteration (indicating no significant leak)
      expect(avgMemoryPerIteration).toBeLessThan(100 * 1024);
      
      console.log(`Memory growth over 100 imports: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Database Connection Pooling', () => {
    it('should efficiently use connection pool', async () => {
      // Mock connection pool metrics
      let activeConnections = 0;
      let totalConnections = 0;
      const maxConnections = 10;
      
      const pooledSupabase = {
        ...mockSupabase,
        from: vi.fn().mockImplementation(() => {
          if (activeConnections >= maxConnections) {
            throw new Error('Connection pool exhausted');
          }
          activeConnections++;
          totalConnections++;
          
          setTimeout(() => {
            activeConnections--;
          }, 50);
          
          return pooledSupabase;
        }),
      };
      
      (createClient as any).mockResolvedValue(pooledSupabase);
      
      // Create multiple processors
      const processors = Array(20).fill(null).map(() =>
        new OKRImportProcessor({
          tenantId: 'test-tenant',
          userId: 'test-user',
          areaId: 'test-area',
        })
      );
      
      // Process files concurrently
      const results = await Promise.allSettled(
        processors.map((processor, i) =>
          processor.processFile(`pooled-${i}.csv`, testFiles.get('small')!)
        )
      );
      
      // Should handle connection pooling without errors
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThan(0);
      
      console.log(`Connection pool: ${successful}/20 successful with max ${maxConnections} connections`);
      console.log(`Total connections created: ${totalConnections}`);
    });
  });
});

// Helper function to generate CSV data
function generateCsvData(rows: number): string {
  const headers = 'entity_type,title,description,priority,status,progress,start_date,end_date\n';
  const data = Array(rows).fill(null).map((_, i) => {
    const type = ['objective', 'initiative', 'activity'][i % 3];
    return `${type},Title ${i},Description ${i},${['high', 'medium', 'low'][i % 3]},planning,${i % 100},2025-01-01,2025-12-31`;
  }).join('\n');
  
  return headers + data;
}