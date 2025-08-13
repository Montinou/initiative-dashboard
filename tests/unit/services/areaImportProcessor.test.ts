import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AreaImportProcessor } from '@/services/areaImportProcessor';
import { createClient } from '@/utils/supabase/server';
import { parseCSV, parseExcel } from '@/utils/fileParser';

vi.mock('@/utils/supabase/server');
vi.mock('@/utils/fileParser');

describe('AreaImportProcessor', () => {
  let processor: AreaImportProcessor;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockReturnThis(),
    };

    (createClient as any).mockResolvedValue(mockSupabase);
    
    processor = new AreaImportProcessor({
      tenantId: 'test-tenant-id',
      userId: 'test-user-id',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('processFile', () => {
    it('should process CSV file with areas successfully', async () => {
      const mockRows = [
        {
          name: 'Sales',
          description: 'Sales department',
          manager_email: 'sales.manager@example.com',
        },
        {
          name: 'Marketing',
          description: 'Marketing department',
          manager_email: 'marketing.manager@example.com',
        },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);
      mockSupabase.data = { id: 'job-id' };
      
      // Mock manager lookups
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: { id: 'manager-1' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'manager-2' }, error: null });
      
      mockSupabase.rpc.mockResolvedValue({ data: { processed: 2 }, error: null });

      const result = await processor.processFile('areas.csv', Buffer.from('test'));

      expect(result.jobId).toBe('job-id');
      expect(result.totalRows).toBe(2);
      expect(result.successCount).toBe(2);
    });

    it('should validate area name is required', async () => {
      const mockRows = [
        {
          name: '', // Empty name
          description: 'Description',
        },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);

      const result = await processor.processFile('areas.csv', Buffer.from('test'));

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'name',
          message: expect.stringContaining('Area name is required'),
        })
      );
    });

    it('should validate description length', async () => {
      const mockRows = [
        {
          name: 'Test Area',
          description: 'a'.repeat(1001), // Too long
        },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);

      const result = await processor.processFile('areas.csv', Buffer.from('test'));

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'description',
          message: expect.stringContaining('Description too long'),
        })
      );
    });

    it('should create placeholder manager if not found', async () => {
      const mockRows = [
        {
          name: 'New Area',
          manager_email: 'new.manager@example.com',
        },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);
      
      // Manager not found
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      
      // Create placeholder
      mockSupabase.insert.mockResolvedValueOnce({
        data: { id: 'new-manager-id' },
        error: null,
      });
      
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      await processor.processFile('areas.csv', Buffer.from('test'));

      // Should create placeholder user profile
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new.manager@example.com',
          role: 'Manager',
          tenant_id: 'test-tenant-id',
        })
      );

      // Should use the new manager ID for area
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'bulk_upsert_areas',
        expect.objectContaining({
          areas: expect.arrayContaining([
            expect.objectContaining({
              manager_id: 'new-manager-id',
            }),
          ]),
        })
      );
    });

    it('should handle manager email validation', async () => {
      const mockRows = [
        {
          name: 'Test Area',
          manager_email: 'invalid-email',
        },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);

      const result = await processor.processFile('areas.csv', Buffer.from('test'));

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'manager_email',
          message: expect.stringContaining('Invalid email format'),
        })
      );
    });

    it('should process areas without manager', async () => {
      const mockRows = [
        {
          name: 'Independent Area',
          description: 'No manager assigned',
          manager_email: '',
        },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      const result = await processor.processFile('areas.csv', Buffer.from('test'));

      expect(result.successCount).toBe(1);
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'bulk_upsert_areas',
        expect.objectContaining({
          areas: expect.arrayContaining([
            expect.objectContaining({
              manager_id: null,
            }),
          ]),
        })
      );
    });
  });

  describe('batch processing', () => {
    it('should process areas in batches of 100', async () => {
      const mockRows = Array(250).fill(null).map((_, i) => ({
        name: `Area ${i}`,
        description: `Description ${i}`,
      }));

      (parseCSV as any).mockResolvedValue(mockRows);
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      await processor.processFile('large-areas.csv', Buffer.from('test'));

      // Should call bulk_upsert_areas 3 times (100 + 100 + 50)
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(3);
    });

    it('should handle batch failures with recovery', async () => {
      const mockRows = Array(150).fill(null).map((_, i) => ({
        name: `Area ${i}`,
      }));

      (parseCSV as any).mockResolvedValue(mockRows);
      
      // First batch succeeds, second fails
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: { processed: 100 }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });

      const result = await processor.processFile('areas.csv', Buffer.from('test'));

      expect(result.successCount).toBe(100);
      expect(result.errorCount).toBe(50);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('Database error'),
        })
      );
    });
  });

  describe('duplicate detection', () => {
    it('should detect duplicate area names within file', async () => {
      const mockRows = [
        { name: 'Sales', description: 'First' },
        { name: 'Marketing', description: 'Second' },
        { name: 'Sales', description: 'Duplicate' },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);

      const result = await processor.processFile('areas.csv', Buffer.from('test'));

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Duplicate area name: Sales')
      );
    });

    it('should handle case-insensitive duplicate detection', async () => {
      const mockRows = [
        { name: 'Sales', description: 'First' },
        { name: 'SALES', description: 'Same name, different case' },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);

      const result = await processor.processFile('areas.csv', Buffer.from('test'));

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Duplicate area name')
      );
    });
  });

  describe('preview functionality', () => {
    it('should preview first 10 rows with validation', async () => {
      const mockRows = Array(20).fill(null).map((_, i) => ({
        name: `Area ${i}`,
        description: `Description ${i}`,
        manager_email: `manager${i}@example.com`,
      }));

      (parseCSV as any).mockResolvedValue(mockRows);

      const preview = await processor.previewFile('areas.csv', Buffer.from('test'));

      expect(preview.rows).toHaveLength(10);
      expect(preview.totalRows).toBe(20);
      expect(preview.hasMore).toBe(true);
      expect(preview.headers).toEqual(['name', 'description', 'manager_email']);
    });

    it('should show validation errors in preview', async () => {
      const mockRows = [
        { name: 'Valid Area', description: 'Valid' },
        { name: '', description: 'Invalid - no name' },
        { name: 'Another', manager_email: 'invalid-email' },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);

      const preview = await processor.previewFile('areas.csv', Buffer.from('test'));

      expect(preview.validRows).toBe(1);
      expect(preview.errorRows).toBe(2);
      expect(preview.errors).toHaveLength(2);
    });

    it('should provide statistics in preview', async () => {
      const mockRows = [
        { name: 'Area 1', manager_email: 'manager1@example.com' },
        { name: 'Area 2', manager_email: 'manager2@example.com' },
        { name: 'Area 3' }, // No manager
      ];

      (parseCSV as any).mockResolvedValue(mockRows);

      const preview = await processor.previewFile('areas.csv', Buffer.from('test'));

      expect(preview.statistics).toEqual(
        expect.objectContaining({
          totalAreas: 3,
          areasWithManagers: 2,
          areasWithoutManagers: 1,
        })
      );
    });
  });

  describe('Excel file support', () => {
    it('should process Excel file with areas sheet', async () => {
      const mockData = {
        areas: [
          { name: 'Sales', description: 'Sales dept' },
          { name: 'Marketing', description: 'Marketing dept' },
        ],
      };

      (parseExcel as any).mockResolvedValue(mockData);
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      const result = await processor.processFile('areas.xlsx', Buffer.from('test'));

      expect(result.totalRows).toBe(2);
      expect(parseExcel).toHaveBeenCalled();
    });

    it('should handle Excel files without areas sheet', async () => {
      const mockData = {
        users: [{ email: 'user@example.com' }],
        // No areas sheet
      };

      (parseExcel as any).mockResolvedValue(mockData);

      await expect(
        processor.processFile('wrong.xlsx', Buffer.from('test'))
      ).rejects.toThrow('No areas data found in Excel file');
    });
  });

  describe('permissions and security', () => {
    it('should check user permissions before processing', async () => {
      processor = new AreaImportProcessor({
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        userRole: 'Manager', // Managers can't import areas
      });

      await expect(
        processor.processFile('areas.csv', Buffer.from('test'))
      ).rejects.toThrow('Insufficient permissions to import areas');
    });

    it('should only allow CEO and Admin to import areas', async () => {
      const ceoProcessor = new AreaImportProcessor({
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        userRole: 'CEO',
      });

      const adminProcessor = new AreaImportProcessor({
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        userRole: 'Admin',
      });

      (parseCSV as any).mockResolvedValue([
        { name: 'Test Area' },
      ]);
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      // Both should succeed
      await expect(ceoProcessor.processFile('areas.csv', Buffer.from('test'))).resolves.toBeDefined();
      await expect(adminProcessor.processFile('areas.csv', Buffer.from('test'))).resolves.toBeDefined();
    });
  });

  describe('job tracking', () => {
    it('should create and update job status', async () => {
      const mockRows = [
        { name: 'Test Area', description: 'Test' },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);
      mockSupabase.data = { id: 'job-id' };
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      await processor.processFile('areas.csv', Buffer.from('test'));

      // Should create job
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: 'test-tenant-id',
          user_id: 'test-user-id',
          status: 'processing',
        })
      );

      // Should update job status
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          processed_rows: 1,
          success_rows: 1,
        })
      );
    });

    it('should track job failure status', async () => {
      const mockRows = [
        { name: '', description: 'Invalid' }, // Will fail validation
      ];

      (parseCSV as any).mockResolvedValue(mockRows);
      mockSupabase.data = { id: 'job-id' };

      await processor.processFile('areas.csv', Buffer.from('test'));

      // Should update job with failed status
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error_rows: 1,
        })
      );
    });
  });

  describe('relationship handling', () => {
    it('should link areas to existing managers', async () => {
      const mockRows = [
        {
          name: 'Sales',
          manager_email: 'existing.manager@example.com',
        },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);
      
      // Manager exists
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'existing-manager-id', role: 'Manager' },
        error: null,
      });
      
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      await processor.processFile('areas.csv', Buffer.from('test'));

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'bulk_upsert_areas',
        expect.objectContaining({
          areas: expect.arrayContaining([
            expect.objectContaining({
              manager_id: 'existing-manager-id',
            }),
          ]),
        })
      );
    });

    it('should warn if manager is not in Manager role', async () => {
      const mockRows = [
        {
          name: 'Sales',
          manager_email: 'ceo@example.com',
        },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);
      
      // User exists but is CEO, not Manager
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'ceo-id', role: 'CEO' },
        error: null,
      });

      const result = await processor.processFile('areas.csv', Buffer.from('test'));

      expect(result.warnings).toContainEqual(
        expect.stringContaining('User ceo@example.com is not in Manager role')
      );
    });
  });
});