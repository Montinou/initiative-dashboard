import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { Storage } from '@google-cloud/storage';

// Import API route handlers
import { POST as signedUrlHandler } from '@/app/api/upload/okr-file/signed-url/route';
import { POST as notifyHandler } from '@/app/api/upload/okr-file/notify/route';
import { POST as processHandler } from '@/app/api/upload/okr-file/process/route';
import { GET as statusHandler } from '@/app/api/upload/okr-file/jobs/[id]/status/route';
import { GET as progressHandler } from '@/app/api/upload/okr-file/jobs/[id]/progress/route';

// Mock dependencies
vi.mock('@google-cloud/storage');
vi.mock('@/utils/supabase/server');
vi.mock('@/services/okrImportProcessor');

describe('OKR Upload API Integration Tests', () => {
  let mockStorage: any;
  let mockSupabase: any;
  let testFiles: Map<string, Buffer>;

  beforeAll(async () => {
    // Load test files
    testFiles = new Map();
    const fixturesDir = path.join(__dirname, '../../fixtures');
    
    // Create test fixtures if they don't exist
    await fs.mkdir(fixturesDir, { recursive: true });
    
    // Create sample CSV file
    const csvContent = `entity_type,title,description,priority,status,progress
objective,Test Objective 1,Description 1,high,planning,0
objective,Test Objective 2,Description 2,medium,in_progress,50`;
    
    await fs.writeFile(path.join(fixturesDir, 'test.csv'), csvContent);
    testFiles.set('test.csv', Buffer.from(csvContent));
    
    // Create sample Excel file (mock)
    testFiles.set('test.xlsx', Buffer.from('mock-excel-content'));
  });

  beforeEach(() => {
    // Setup mock Google Cloud Storage
    mockStorage = {
      bucket: vi.fn().mockReturnThis(),
      file: vi.fn().mockReturnThis(),
      generateSignedPostPolicyV4: vi.fn().mockResolvedValue([{
        url: 'https://storage.googleapis.com/test-bucket',
        fields: { key: 'test-key' },
      }]),
      exists: vi.fn().mockResolvedValue([true]),
      download: vi.fn().mockResolvedValue([testFiles.get('test.csv')]),
      metadata: vi.fn().mockResolvedValue([{ size: 1024 }]),
    };

    (Storage as any).mockImplementation(() => mockStorage);

    // Setup mock Supabase
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/upload/okr-file/signed-url', () => {
    it('should generate signed URL for valid request', async () => {
      const request = new NextRequest('http://localhost/api/upload/okr-file/signed-url', {
        method: 'POST',
        body: JSON.stringify({
          fileName: 'test.csv',
          fileSize: 1024,
          contentType: 'text/csv',
        }),
      });

      mockSupabase.data = { 
        id: 'user-profile-id',
        tenant_id: 'tenant-id',
        role: 'Admin',
      };

      const response = await signedUrlHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        uploadUrl: expect.any(String),
        fields: expect.any(Object),
        objectPath: expect.stringContaining('tenant-id/okr-imports'),
      });
    });

    it('should reject files that are too large', async () => {
      const request = new NextRequest('http://localhost/api/upload/okr-file/signed-url', {
        method: 'POST',
        body: JSON.stringify({
          fileName: 'huge.csv',
          fileSize: 100 * 1024 * 1024, // 100MB
          contentType: 'text/csv',
        }),
      });

      const response = await signedUrlHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('File size exceeds maximum');
    });

    it('should reject invalid file types', async () => {
      const request = new NextRequest('http://localhost/api/upload/okr-file/signed-url', {
        method: 'POST',
        body: JSON.stringify({
          fileName: 'test.pdf',
          fileSize: 1024,
          contentType: 'application/pdf',
        }),
      });

      const response = await signedUrlHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid file type');
    });

    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const request = new NextRequest('http://localhost/api/upload/okr-file/signed-url', {
        method: 'POST',
        body: JSON.stringify({
          fileName: 'test.csv',
          fileSize: 1024,
          contentType: 'text/csv',
        }),
      });

      const response = await signedUrlHandler(request);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/upload/okr-file/notify', () => {
    it('should create import job on successful upload', async () => {
      const request = new NextRequest('http://localhost/api/upload/okr-file/notify', {
        method: 'POST',
        body: JSON.stringify({
          objectPath: 'tenant-id/okr-imports/test.csv',
          originalFilename: 'test.csv',
          fileSize: 1024,
          contentType: 'text/csv',
        }),
      });

      mockSupabase.data = { 
        id: 'user-profile-id',
        tenant_id: 'tenant-id',
        area_id: 'area-id',
      };

      mockSupabase.insert.mockResolvedValue({
        data: { id: 'job-id' },
        error: null,
      });

      const response = await notifyHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        jobId: 'job-id',
        message: 'File upload recorded successfully',
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: 'tenant-id',
          user_id: 'user-profile-id',
          area_id: 'area-id',
          object_path: 'tenant-id/okr-imports/test.csv',
          status: 'pending',
        })
      );
    });

    it('should verify file exists in GCS before creating job', async () => {
      mockStorage.exists.mockResolvedValue([false]);

      const request = new NextRequest('http://localhost/api/upload/okr-file/notify', {
        method: 'POST',
        body: JSON.stringify({
          objectPath: 'tenant-id/okr-imports/nonexistent.csv',
        }),
      });

      const response = await notifyHandler(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('File not found');
    });
  });

  describe('POST /api/upload/okr-file/process', () => {
    it('should process small files synchronously', async () => {
      const request = new NextRequest('http://localhost/api/upload/okr-file/process', {
        method: 'POST',
        body: JSON.stringify({
          jobId: 'job-id',
        }),
      });

      mockSupabase.maybeSingle.mockResolvedValue({
        data: {
          id: 'job-id',
          object_path: 'tenant-id/okr-imports/small.csv',
          tenant_id: 'tenant-id',
          user_id: 'user-id',
          area_id: 'area-id',
        },
        error: null,
      });

      // Mock small file (2 rows)
      const smallCsv = `entity_type,title
objective,Test Objective 1
objective,Test Objective 2`;
      mockStorage.download.mockResolvedValue([Buffer.from(smallCsv)]);

      const response = await processHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        jobId: 'job-id',
        status: 'completed',
        mode: 'synchronous',
        totalRows: 2,
      });
    });

    it('should process large files asynchronously', async () => {
      const request = new NextRequest('http://localhost/api/upload/okr-file/process', {
        method: 'POST',
        body: JSON.stringify({
          jobId: 'job-id',
        }),
      });

      mockSupabase.maybeSingle.mockResolvedValue({
        data: {
          id: 'job-id',
          object_path: 'tenant-id/okr-imports/large.csv',
        },
        error: null,
      });

      // Mock large file (50 rows)
      const largeCsv = Array(50).fill(null)
        .map((_, i) => `objective,Test Objective ${i}`)
        .join('\n');
      
      mockStorage.download.mockResolvedValue([
        Buffer.from(`entity_type,title\n${largeCsv}`),
      ]);

      const response = await processHandler(request);
      const data = await response.json();

      expect(response.status).toBe(202);
      expect(data).toMatchObject({
        jobId: 'job-id',
        status: 'processing',
        mode: 'asynchronous',
        message: expect.stringContaining('being processed'),
      });
    });

    it('should handle processing errors gracefully', async () => {
      const request = new NextRequest('http://localhost/api/upload/okr-file/process', {
        method: 'POST',
        body: JSON.stringify({
          jobId: 'job-id',
        }),
      });

      mockSupabase.maybeSingle.mockResolvedValue({
        data: { id: 'job-id', object_path: 'path.csv' },
        error: null,
      });

      mockStorage.download.mockRejectedValue(new Error('Download failed'));

      const response = await processHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to process file');
    });
  });

  describe('GET /api/upload/okr-file/jobs/[id]/status', () => {
    it('should return job status with progress metrics', async () => {
      const request = new NextRequest('http://localhost/api/upload/okr-file/jobs/job-id/status');

      mockSupabase.maybeSingle.mockResolvedValue({
        data: {
          id: 'job-id',
          status: 'processing',
          total_rows: 100,
          processed_rows: 50,
          success_rows: 45,
          error_rows: 5,
          created_at: '2025-01-01T00:00:00Z',
          started_at: '2025-01-01T00:01:00Z',
        },
        error: null,
      });

      const response = await statusHandler(request, { params: { id: 'job-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        id: 'job-id',
        status: 'processing',
        progress: {
          percentage: 50,
          processedRows: 50,
          totalRows: 100,
          successRows: 45,
          errorRows: 5,
        },
      });
    });

    it('should include error details for failed jobs', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: {
          id: 'job-id',
          status: 'failed',
          error_summary: 'Multiple validation errors',
        },
        error: null,
      });

      // Mock job items with errors
      mockSupabase.select.mockResolvedValue({
        data: [
          {
            row_number: 5,
            error_message: 'Invalid email format',
          },
          {
            row_number: 10,
            error_message: 'Missing required field: title',
          },
        ],
        error: null,
      });

      const response = await statusHandler(request, { params: { id: 'job-id' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.errors).toHaveLength(2);
      expect(data.errorSummary).toBe('Multiple validation errors');
    });

    it('should return 404 for non-existent job', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const request = new NextRequest('http://localhost/api/upload/okr-file/jobs/invalid-id/status');

      const response = await statusHandler(request, { params: { id: 'invalid-id' } });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/upload/okr-file/jobs/[id]/progress (SSE)', () => {
    it('should stream progress updates', async () => {
      const request = new NextRequest('http://localhost/api/upload/okr-file/jobs/job-id/progress');

      let updateCount = 0;
      mockSupabase.maybeSingle.mockImplementation(() => {
        updateCount++;
        return Promise.resolve({
          data: {
            id: 'job-id',
            status: updateCount >= 3 ? 'completed' : 'processing',
            processed_rows: updateCount * 30,
            total_rows: 100,
          },
          error: null,
        });
      });

      const response = await progressHandler(request, { params: { id: 'job-id' } });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');
    });

    it('should handle job completion in SSE stream', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: {
          id: 'job-id',
          status: 'completed',
          processed_rows: 100,
          total_rows: 100,
        },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/upload/okr-file/jobs/job-id/progress');

      const response = await progressHandler(request, { params: { id: 'job-id' } });
      
      // For SSE, we need to read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        const { value } = await reader.read();
        const text = decoder.decode(value);
        
        expect(text).toContain('event: progress');
        expect(text).toContain('"status":"completed"');
        expect(text).toContain('"percentage":100');
      }
    });
  });

  describe('Template Download Endpoints', () => {
    it('should download CSV template for specific entity', async () => {
      const request = new NextRequest('http://localhost/api/upload/okr-file/template/csv/objectives');

      const response = await GET(request, { params: { entity: 'objectives' } });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('objectives-template.csv');
    });

    it('should download Excel template with all sheets', async () => {
      const request = new NextRequest('http://localhost/api/upload/okr-file/template/excel');

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('spreadsheet');
      expect(response.headers.get('Content-Disposition')).toContain('okr-import-template.xlsx');
    });

    it('should return 400 for invalid entity type', async () => {
      const request = new NextRequest('http://localhost/api/upload/okr-file/template/csv/invalid');

      const response = await GET(request, { params: { entity: 'invalid' } });

      expect(response.status).toBe(400);
    });
  });

  describe('Concurrent Upload Handling', () => {
    it('should handle multiple concurrent uploads', async () => {
      const uploads = Array(5).fill(null).map((_, i) => ({
        fileName: `file${i}.csv`,
        jobId: `job-${i}`,
      }));

      const requests = uploads.map(({ fileName, jobId }) =>
        new NextRequest('http://localhost/api/upload/okr-file/notify', {
          method: 'POST',
          body: JSON.stringify({
            objectPath: `tenant-id/okr-imports/${fileName}`,
            originalFilename: fileName,
          }),
        })
      );

      mockSupabase.insert.mockImplementation(({ original_filename }) => ({
        data: { 
          id: uploads.find(u => u.fileName === original_filename)?.jobId,
        },
        error: null,
      }));

      const responses = await Promise.all(
        requests.map(req => notifyHandler(req))
      );

      responses.forEach((response, i) => {
        expect(response.status).toBe(200);
      });

      expect(mockSupabase.insert).toHaveBeenCalledTimes(5);
    });

    it('should prevent duplicate job creation for same file', async () => {
      const objectPath = 'tenant-id/okr-imports/duplicate.csv';

      // First upload
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      mockSupabase.insert.mockResolvedValueOnce({
        data: { id: 'job-1' },
        error: null,
      });

      // Second upload (duplicate)
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'job-1', status: 'processing' },
        error: null,
      });

      const request1 = new NextRequest('http://localhost/api/upload/okr-file/notify', {
        method: 'POST',
        body: JSON.stringify({ objectPath }),
      });

      const request2 = new NextRequest('http://localhost/api/upload/okr-file/notify', {
        method: 'POST',
        body: JSON.stringify({ objectPath }),
      });

      const response1 = await notifyHandler(request1);
      const response2 = await notifyHandler(request2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(409); // Conflict
    });
  });

  describe('Error Recovery and Retries', () => {
    it('should retry failed database operations', async () => {
      let attempts = 0;
      mockSupabase.insert.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return { data: null, error: { message: 'Connection error' } };
        }
        return { data: { id: 'job-id' }, error: null };
      });

      const request = new NextRequest('http://localhost/api/upload/okr-file/notify', {
        method: 'POST',
        body: JSON.stringify({
          objectPath: 'tenant-id/okr-imports/test.csv',
        }),
      });

      const response = await notifyHandler(request);

      expect(attempts).toBe(3);
      expect(response.status).toBe(200);
    });

    it('should handle partial file processing failures', async () => {
      const request = new NextRequest('http://localhost/api/upload/okr-file/process', {
        method: 'POST',
        body: JSON.stringify({ jobId: 'job-id' }),
      });

      mockSupabase.maybeSingle.mockResolvedValue({
        data: { 
          id: 'job-id',
          object_path: 'path.csv',
          status: 'processing',
        },
        error: null,
      });

      // Simulate partial processing with some errors
      const csvWithErrors = `entity_type,title,progress
objective,Valid Objective,50
objective,Invalid Objective,200
objective,Another Valid,75`;

      mockStorage.download.mockResolvedValue([Buffer.from(csvWithErrors)]);

      const response = await processHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.successCount).toBe(2);
      expect(data.errorCount).toBe(1);
    });
  });
});