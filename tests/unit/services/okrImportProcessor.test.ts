import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OKRImportProcessor } from '@/services/okrImportProcessor';
import { createClient } from '@/utils/supabase/server';
import { parseCSV, parseExcel } from '@/utils/fileParser';
import type { Database } from '@/types/database.types';

// Mock dependencies
vi.mock('@/utils/supabase/server');
vi.mock('@/utils/fileParser');
vi.mock('@google-cloud/storage');

describe('OKRImportProcessor', () => {
  let processor: OKRImportProcessor;
  let mockSupabase: any;

  beforeEach(() => {
    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockReturnThis(),
    };

    (createClient as any).mockResolvedValue(mockSupabase);
    
    processor = new OKRImportProcessor({
      tenantId: 'test-tenant-id',
      userId: 'test-user-id',
      areaId: 'test-area-id',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('processFile', () => {
    it('should process CSV file successfully', async () => {
      const mockRows = [
        {
          entity_type: 'objective',
          title: 'Test Objective',
          description: 'Test Description',
          priority: 'high',
          status: 'in_progress',
          progress: '50',
          start_date: '2025-01-01',
          end_date: '2025-12-31',
        },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);
      mockSupabase.data = { id: 'job-id' };

      const result = await processor.processFile('test.csv', Buffer.from('test'));

      expect(result.jobId).toBe('job-id');
      expect(result.totalRows).toBe(1);
      expect(parseCSV).toHaveBeenCalled();
    });

    it('should process Excel file with multiple sheets', async () => {
      const mockData = {
        objectives: [
          { title: 'Objective 1', priority: 'high', status: 'planning' },
        ],
        initiatives: [
          { title: 'Initiative 1', objective_title: 'Objective 1', progress: '25' },
        ],
        activities: [
          { title: 'Activity 1', initiative_title: 'Initiative 1', is_completed: 'false' },
        ],
      };

      (parseExcel as any).mockResolvedValue(mockData);
      mockSupabase.data = { id: 'job-id' };

      const result = await processor.processFile('test.xlsx', Buffer.from('test'));

      expect(result.jobId).toBe('job-id');
      expect(result.totalRows).toBe(3);
      expect(parseExcel).toHaveBeenCalled();
    });

    it('should handle invalid file format', async () => {
      await expect(
        processor.processFile('test.pdf', Buffer.from('test'))
      ).rejects.toThrow('Unsupported file format');
    });

    it('should handle empty file', async () => {
      (parseCSV as any).mockResolvedValue([]);

      await expect(
        processor.processFile('test.csv', Buffer.from(''))
      ).rejects.toThrow('File is empty or contains no valid data');
    });
  });

  describe('validateRow', () => {
    it('should validate objective row successfully', () => {
      const row = {
        entity_type: 'objective',
        title: 'Valid Objective',
        priority: 'high',
        status: 'planning',
        progress: '50',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
      };

      const result = processor['validateRow'](row, 'objective');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should catch missing required fields', () => {
      const row = {
        entity_type: 'objective',
        // Missing title
        priority: 'high',
      };

      const result = processor['validateRow'](row, 'objective');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'title',
          message: expect.stringContaining('required'),
        })
      );
    });

    it('should validate progress range (0-100)', () => {
      const row = {
        entity_type: 'initiative',
        title: 'Test',
        progress: '150',
      };

      const result = processor['validateRow'](row, 'initiative');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'progress',
          message: expect.stringContaining('0 and 100'),
        })
      );
    });

    it('should validate date format and range', () => {
      const row = {
        entity_type: 'objective',
        title: 'Test',
        start_date: '2025-12-31',
        end_date: '2025-01-01', // End before start
      };

      const result = processor['validateRow'](row, 'objective');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'date_range',
          message: expect.stringContaining('end date must be after start date'),
        })
      );
    });

    it('should validate enum values', () => {
      const row = {
        entity_type: 'objective',
        title: 'Test',
        priority: 'invalid',
        status: 'unknown',
      };

      const result = processor['validateRow'](row, 'objective');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'priority',
          message: expect.stringContaining('high, medium, low'),
        })
      );
    });

    it('should validate email format', () => {
      const row = {
        entity_type: 'activity',
        title: 'Test Activity',
        assigned_to: 'invalid-email',
      };

      const result = processor['validateRow'](row, 'activity');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'assigned_to',
          message: expect.stringContaining('valid email'),
        })
      );
    });

    it('should parse JSON metrics field', () => {
      const row = {
        entity_type: 'objective',
        title: 'Test',
        metrics: '[{"name": "KPI", "target": 100}]',
      };

      const result = processor['validateRow'](row, 'objective');

      expect(result.isValid).toBe(true);
      expect(result.processedData.metrics).toEqual([
        { name: 'KPI', target: 100 },
      ]);
    });
  });

  describe('processObjective', () => {
    it('should create new objective', async () => {
      mockSupabase.data = null; // No existing objective
      mockSupabase.error = null;

      const row = {
        title: 'New Objective',
        description: 'Description',
        priority: 'high',
        status: 'planning',
        progress: '0',
      };

      await processor['processObjective'](row, 'job-id', 1);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Objective',
          tenant_id: 'test-tenant-id',
          created_by: 'test-user-id',
          priority: 'high',
          status: 'planning',
          progress: 0,
        })
      );
    });

    it('should update existing objective', async () => {
      mockSupabase.data = { id: 'existing-id' }; // Existing objective

      const row = {
        title: 'Existing Objective',
        progress: '75',
      };

      await processor['processObjective'](row, 'job-id', 1);

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: 75,
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.error = { message: 'Database error' };

      const row = { title: 'Test' };

      await expect(
        processor['processObjective'](row, 'job-id', 1)
      ).rejects.toThrow('Failed to process objective');
    });
  });

  describe('processInitiative', () => {
    it('should link initiative to objective by title', async () => {
      // Mock objective lookup
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'objective-id' },
        error: null,
      });

      // Mock initiative creation
      mockSupabase.data = null;
      mockSupabase.error = null;

      const row = {
        title: 'New Initiative',
        objective_title: 'Linked Objective',
        progress: '25',
        start_date: '2025-01-01',
        due_date: '2025-03-31',
      };

      await processor['processInitiative'](row, 'job-id', 1);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Initiative',
          area_id: 'test-area-id',
          progress: 25,
        })
      );
    });

    it('should handle missing objective gracefully', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const row = {
        title: 'Initiative',
        objective_title: 'Non-existent Objective',
      };

      const result = await processor['processInitiative'](row, 'job-id', 1);

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Objective not found')
      );
    });
  });

  describe('processActivity', () => {
    it('should assign activity to user by email', async () => {
      // Mock user lookup
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'user-profile-id' },
        error: null,
      });

      // Mock initiative lookup
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'initiative-id' },
        error: null,
      });

      const row = {
        title: 'New Activity',
        initiative_title: 'Linked Initiative',
        assigned_to: 'user@example.com',
        is_completed: 'false',
      };

      await processor['processActivity'](row, 'job-id', 1);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Activity',
          initiative_id: 'initiative-id',
          assigned_to: 'user-profile-id',
          is_completed: false,
        })
      );
    });

    it('should handle missing assignee gracefully', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null, // No user found
        error: null,
      });

      const row = {
        title: 'Activity',
        assigned_to: 'nonexistent@example.com',
      };

      const result = await processor['processActivity'](row, 'job-id', 1);

      expect(result.warnings).toContainEqual(
        expect.stringContaining('User not found')
      );
    });
  });

  describe('batch processing', () => {
    it('should process large files in batches', async () => {
      const mockRows = Array(150).fill(null).map((_, i) => ({
        entity_type: 'objective',
        title: `Objective ${i}`,
        priority: 'medium',
      }));

      (parseCSV as any).mockResolvedValue(mockRows);
      mockSupabase.data = { id: 'job-id' };

      const result = await processor.processFile('large.csv', Buffer.from('test'));

      expect(result.totalRows).toBe(150);
      expect(result.batchCount).toBeGreaterThan(1);
    });

    it('should handle batch failures gracefully', async () => {
      const mockRows = Array(10).fill(null).map((_, i) => ({
        entity_type: 'objective',
        title: `Objective ${i}`,
      }));

      (parseCSV as any).mockResolvedValue(mockRows);
      
      // Simulate failure on third batch
      mockSupabase.insert
        .mockResolvedValueOnce({ data: {}, error: null })
        .mockResolvedValueOnce({ data: {}, error: null })
        .mockRejectedValueOnce(new Error('Batch failed'));

      const result = await processor.processFile('test.csv', Buffer.from('test'));

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('Batch failed'),
        })
      );
    });
  });

  describe('error recovery', () => {
    it('should continue processing after individual row failure', async () => {
      const mockRows = [
        { entity_type: 'objective', title: 'Valid 1' },
        { entity_type: 'objective' }, // Missing title - will fail
        { entity_type: 'objective', title: 'Valid 2' },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);
      mockSupabase.data = { id: 'job-id' };

      const result = await processor.processFile('test.csv', Buffer.from('test'));

      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(1);
    });

    it('should track all errors and warnings', async () => {
      const mockRows = [
        { entity_type: 'invalid_type', title: 'Test' },
        { entity_type: 'objective', progress: '200' }, // Invalid progress
        { entity_type: 'initiative', start_date: 'invalid-date' },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);
      mockSupabase.data = { id: 'job-id' };

      const result = await processor.processFile('test.csv', Buffer.from('test'));

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errorCount).toBe(3);
    });
  });

  describe('performance optimizations', () => {
    it('should use bulk operations when available', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      const mockRows = Array(100).fill(null).map((_, i) => ({
        entity_type: 'objective',
        title: `Objective ${i}`,
      }));

      (parseCSV as any).mockResolvedValue(mockRows);

      await processor.processFile('bulk.csv', Buffer.from('test'));

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'bulk_upsert_objectives',
        expect.any(Object)
      );
    });

    it('should cache lookups to reduce database queries', async () => {
      const mockRows = [
        { entity_type: 'initiative', objective_title: 'Same Objective' },
        { entity_type: 'initiative', objective_title: 'Same Objective' },
        { entity_type: 'initiative', objective_title: 'Same Objective' },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);
      mockSupabase.maybeSingle.mockResolvedValue({
        data: { id: 'objective-id' },
        error: null,
      });

      await processor.processFile('test.csv', Buffer.from('test'));

      // Should only look up the objective once
      expect(mockSupabase.maybeSingle).toHaveBeenCalledTimes(1);
    });
  });
});