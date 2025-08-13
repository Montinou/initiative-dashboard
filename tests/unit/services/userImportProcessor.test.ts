import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserImportProcessor } from '@/services/userImportProcessor';
import { createClient } from '@/utils/supabase/server';
import { parseCSV, parseExcel } from '@/utils/fileParser';

vi.mock('@/utils/supabase/server');
vi.mock('@/utils/fileParser');

describe('UserImportProcessor', () => {
  let processor: UserImportProcessor;
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
    
    processor = new UserImportProcessor({
      tenantId: 'test-tenant-id',
      userId: 'test-user-id',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('processFile', () => {
    it('should process CSV file with users successfully', async () => {
      const mockRows = [
        {
          email: 'john@example.com',
          full_name: 'John Doe',
          role: 'CEO',
          area: '',
        },
        {
          email: 'jane@example.com',
          full_name: 'Jane Smith',
          role: 'Manager',
          area: 'Sales',
        },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);
      mockSupabase.data = { id: 'job-id' };
      mockSupabase.rpc.mockResolvedValue({ data: { processed: 2 }, error: null });

      const result = await processor.processFile('users.csv', Buffer.from('test'));

      expect(result.jobId).toBe('job-id');
      expect(result.totalRows).toBe(2);
      expect(result.successCount).toBe(2);
    });

    it('should validate email format', async () => {
      const mockRows = [
        {
          email: 'invalid-email',
          full_name: 'Invalid User',
          role: 'Manager',
        },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);

      const result = await processor.processFile('users.csv', Buffer.from('test'));

      expect(result.errorCount).toBe(1);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          row: 1,
          field: 'email',
          message: expect.stringContaining('Invalid email format'),
        })
      );
    });

    it('should normalize role values', async () => {
      const mockRows = [
        { email: 'test1@example.com', role: 'ceo' },
        { email: 'test2@example.com', role: 'ADMIN' },
        { email: 'test3@example.com', role: 'manager' },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      await processor.processFile('users.csv', Buffer.from('test'));

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'bulk_upsert_users',
        expect.objectContaining({
          users: expect.arrayContaining([
            expect.objectContaining({ role: 'CEO' }),
            expect.objectContaining({ role: 'Admin' }),
            expect.objectContaining({ role: 'Manager' }),
          ]),
        })
      );
    });

    it('should validate role enum values', async () => {
      const mockRows = [
        { email: 'test@example.com', role: 'InvalidRole' },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);

      const result = await processor.processFile('users.csv', Buffer.from('test'));

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'role',
          message: expect.stringContaining('must be CEO, Admin, or Manager'),
        })
      );
    });

    it('should handle area assignment for managers', async () => {
      const mockRows = [
        {
          email: 'manager@example.com',
          full_name: 'Manager User',
          role: 'Manager',
          area: 'Sales',
        },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);
      
      // Mock area lookup
      mockSupabase.maybeSingle.mockResolvedValue({
        data: { id: 'area-id' },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      await processor.processFile('users.csv', Buffer.from('test'));

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'bulk_upsert_users',
        expect.objectContaining({
          users: expect.arrayContaining([
            expect.objectContaining({
              area_id: 'area-id',
            }),
          ]),
        })
      );
    });

    it('should warn when area not found for manager', async () => {
      const mockRows = [
        {
          email: 'manager@example.com',
          role: 'Manager',
          area: 'NonExistentArea',
        },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);
      
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await processor.processFile('users.csv', Buffer.from('test'));

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Area "NonExistentArea" not found')
      );
    });

    it('should require area for manager role', async () => {
      const mockRows = [
        {
          email: 'manager@example.com',
          role: 'Manager',
          area: '', // Missing area
        },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);

      const result = await processor.processFile('users.csv', Buffer.from('test'));

      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'area',
          message: expect.stringContaining('Area is required for Manager role'),
        })
      );
    });
  });

  describe('batch processing', () => {
    it('should process users in batches of 100', async () => {
      const mockRows = Array(250).fill(null).map((_, i) => ({
        email: `user${i}@example.com`,
        full_name: `User ${i}`,
        role: 'Admin',
      }));

      (parseCSV as any).mockResolvedValue(mockRows);
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      await processor.processFile('large-users.csv', Buffer.from('test'));

      // Should call bulk_upsert_users 3 times (100 + 100 + 50)
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(3);
    });

    it('should handle batch failures gracefully', async () => {
      const mockRows = Array(150).fill(null).map((_, i) => ({
        email: `user${i}@example.com`,
        role: 'Admin',
      }));

      (parseCSV as any).mockResolvedValue(mockRows);
      
      // First batch succeeds, second fails
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: { processed: 100 }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Batch failed' } });

      const result = await processor.processFile('users.csv', Buffer.from('test'));

      expect(result.successCount).toBe(100);
      expect(result.errorCount).toBe(50);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('Batch failed'),
        })
      );
    });
  });

  describe('duplicate detection', () => {
    it('should detect duplicate emails within file', async () => {
      const mockRows = [
        { email: 'duplicate@example.com', role: 'Admin' },
        { email: 'unique@example.com', role: 'Manager' },
        { email: 'duplicate@example.com', role: 'CEO' }, // Duplicate
      ];

      (parseCSV as any).mockResolvedValue(mockRows);

      const result = await processor.processFile('users.csv', Buffer.from('test'));

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Duplicate email: duplicate@example.com')
      );
    });

    it('should handle case-insensitive duplicate detection', async () => {
      const mockRows = [
        { email: 'Test@Example.com', role: 'Admin' },
        { email: 'test@example.com', role: 'Manager' }, // Same email, different case
      ];

      (parseCSV as any).mockResolvedValue(mockRows);

      const result = await processor.processFile('users.csv', Buffer.from('test'));

      expect(result.warnings).toContainEqual(
        expect.stringContaining('Duplicate email')
      );
    });
  });

  describe('preview functionality', () => {
    it('should preview first 10 rows', async () => {
      const mockRows = Array(20).fill(null).map((_, i) => ({
        email: `user${i}@example.com`,
        full_name: `User ${i}`,
        role: 'Admin',
      }));

      (parseCSV as any).mockResolvedValue(mockRows);

      const preview = await processor.previewFile('users.csv', Buffer.from('test'));

      expect(preview.rows).toHaveLength(10);
      expect(preview.totalRows).toBe(20);
      expect(preview.hasMore).toBe(true);
    });

    it('should validate preview rows without processing', async () => {
      const mockRows = [
        { email: 'valid@example.com', role: 'CEO' },
        { email: 'invalid-email', role: 'Admin' },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);

      const preview = await processor.previewFile('users.csv', Buffer.from('test'));

      expect(preview.validRows).toBe(1);
      expect(preview.errorRows).toBe(1);
      expect(preview.errors).toContainEqual(
        expect.objectContaining({
          row: 2,
          field: 'email',
        })
      );
    });
  });

  describe('Excel file support', () => {
    it('should process Excel file with users sheet', async () => {
      const mockData = {
        users: [
          { email: 'user1@example.com', full_name: 'User 1', role: 'CEO' },
          { email: 'user2@example.com', full_name: 'User 2', role: 'Admin' },
        ],
      };

      (parseExcel as any).mockResolvedValue(mockData);
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      const result = await processor.processFile('users.xlsx', Buffer.from('test'));

      expect(result.totalRows).toBe(2);
      expect(parseExcel).toHaveBeenCalled();
    });

    it('should handle Excel files without users sheet', async () => {
      const mockData = {
        objectives: [{ title: 'Objective' }],
        // No users sheet
      };

      (parseExcel as any).mockResolvedValue(mockData);

      await expect(
        processor.processFile('wrong.xlsx', Buffer.from('test'))
      ).rejects.toThrow('No users data found in Excel file');
    });
  });

  describe('permissions and security', () => {
    it('should check user permissions before processing', async () => {
      processor = new UserImportProcessor({
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        userRole: 'Manager', // Managers can't import users
      });

      await expect(
        processor.processFile('users.csv', Buffer.from('test'))
      ).rejects.toThrow('Insufficient permissions to import users');
    });

    it('should only allow CEO and Admin to import users', async () => {
      const ceoProcessor = new UserImportProcessor({
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        userRole: 'CEO',
      });

      const adminProcessor = new UserImportProcessor({
        tenantId: 'test-tenant-id',
        userId: 'test-user-id',
        userRole: 'Admin',
      });

      (parseCSV as any).mockResolvedValue([
        { email: 'test@example.com', role: 'Manager' },
      ]);
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      // Both should succeed
      await expect(ceoProcessor.processFile('users.csv', Buffer.from('test'))).resolves.toBeDefined();
      await expect(adminProcessor.processFile('users.csv', Buffer.from('test'))).resolves.toBeDefined();
    });
  });

  describe('job tracking', () => {
    it('should create and update job status', async () => {
      const mockRows = [
        { email: 'test@example.com', role: 'Admin' },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);
      mockSupabase.data = { id: 'job-id' };
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      await processor.processFile('users.csv', Buffer.from('test'));

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

    it('should track individual item processing', async () => {
      const mockRows = [
        { email: 'test@example.com', role: 'Admin' },
      ];

      (parseCSV as any).mockResolvedValue(mockRows);
      mockSupabase.data = { id: 'job-id' };
      mockSupabase.rpc.mockResolvedValue({ data: {}, error: null });

      await processor.processFile('users.csv', Buffer.from('test'));

      // Should create job items
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            job_id: 'job-id',
            row_number: 1,
            entity_type: 'user',
            entity_key: 'test@example.com',
            status: 'pending',
          }),
        ])
      );
    });
  });
});