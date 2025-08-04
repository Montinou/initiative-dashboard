/**
 * File Upload API Integration Tests
 * 
 * Integration testing for file upload API endpoints, file processing,
 * validation, and data persistence.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createMockFile, mockFetchSuccess, mockFetchError } from '../../utils/test-setup'
import { TEST_USERS, TEST_TENANTS, TEST_AREAS, API_RESPONSES } from '../../utils/test-globals'

describe('File Upload API Integration Tests', () => {
  let mockFetch: any

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/upload/okr-file', () => {
    const validFormData = new FormData()
    const validFile = createMockFile({ name: 'test-okr.xlsx', size: 5000 })
    validFormData.append('file', validFile)
    validFormData.append('area_id', TEST_AREAS.MARKETING.id)
    validFormData.append('tenant_id', TEST_TENANTS.FEMA.id)

    it('should upload valid Excel file successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => API_RESPONSES.FILE_UPLOAD_SUCCESS
      })

      const response = await fetch('/api/upload/okr-file', {
        method: 'POST',
        body: validFormData,
        headers: {
          'Authorization': `Bearer ${TEST_USERS.MANAGER.id}`,
          'X-Tenant-ID': TEST_TENANTS.FEMA.id
        }
      })

      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result.success).toBe(true)
      expect(result.data.uploadId).toBeTruthy()
      expect(result.data.fileName).toBe('test-upload.xlsx')
      expect(result.data.recordsProcessed).toBe(10)
      expect(result.data.sheetsProcessed).toBe(2)
      expect(result.data.savedInitiatives).toBe(8)
      expect(result.data.errors).toEqual([])
    })

    it('should handle file upload with processing warnings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => API_RESPONSES.FILE_UPLOAD_WITH_WARNINGS
      })

      const response = await fetch('/api/upload/okr-file', {
        method: 'POST',
        body: validFormData,
        headers: {
          'Authorization': `Bearer ${TEST_USERS.MANAGER.id}`,
          'X-Tenant-ID': TEST_TENANTS.FEMA.id
        }
      })

      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result.success).toBe(true)
      expect(result.data.errors).toHaveLength(2)
      expect(result.data.errors[0]).toContain('Invalid date format')
      expect(result.data.errors[1]).toContain('Progress exceeds 100%')
      expect(result.data.savedInitiatives).toBe(6) // Some initiatives still saved
    })

    it('should reject invalid file types', async () => {
      const invalidFile = createMockFile({ 
        name: 'invalid.pdf', 
        type: 'application/pdf' 
      })
      const invalidFormData = new FormData()
      invalidFormData.append('file', invalidFile)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'File type ".pdf" not supported. Please upload Excel files (.xlsx or .xls) only.'
        })
      })

      const response = await fetch('/api/upload/okr-file', {
        method: 'POST',
        body: invalidFormData,
        headers: {
          'Authorization': `Bearer ${TEST_USERS.MANAGER.id}`,
          'X-Tenant-ID': TEST_TENANTS.FEMA.id
        }
      })

      const result = await response.json()

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error).toContain('File type ".pdf" not supported')
    })

    it('should reject files exceeding size limit', async () => {
      const largeFile = createMockFile({ 
        name: 'large.xlsx', 
        size: 15 * 1024 * 1024 // 15MB
      })
      const largeFormData = new FormData()
      largeFormData.append('file', largeFile)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 413,
        json: async () => ({
          success: false,
          error: 'File too large. Maximum allowed size is 10MB.'
        })
      })

      const response = await fetch('/api/upload/okr-file', {
        method: 'POST',
        body: largeFormData,
        headers: {
          'Authorization': `Bearer ${TEST_USERS.MANAGER.id}`,
          'X-Tenant-ID': TEST_TENANTS.FEMA.id
        }
      })

      const result = await response.json()

      expect(response.status).toBe(413)
      expect(result.success).toBe(false)
      expect(result.error).toContain('File too large')
    })

    it('should require authentication', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => API_RESPONSES.UNAUTHORIZED_ERROR
      })

      const response = await fetch('/api/upload/okr-file', {
        method: 'POST',
        body: validFormData
        // No Authorization header
      })

      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized access')
    })

    it('should enforce tenant isolation', async () => {
      const crossTenantFormData = new FormData()
      crossTenantFormData.append('file', validFile)
      crossTenantFormData.append('area_id', TEST_AREAS.MARKETING.id)
      crossTenantFormData.append('tenant_id', TEST_TENANTS.SIGA.id) // Different tenant

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          success: false,
          error: 'Access denied to tenant resources',
          code: 'TENANT_ACCESS_DENIED'
        })
      })

      const response = await fetch('/api/upload/okr-file', {
        method: 'POST',
        body: crossTenantFormData,
        headers: {
          'Authorization': `Bearer ${TEST_USERS.MANAGER.id}`,
          'X-Tenant-ID': TEST_TENANTS.FEMA.id // User from FEMA trying to upload to SIGA
        }
      })

      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Access denied to tenant resources')
    })

    it('should validate user permissions for area access', async () => {
      const unauthorizedAreaFormData = new FormData()
      unauthorizedAreaFormData.append('file', validFile)
      unauthorizedAreaFormData.append('area_id', 'unauthorized-area-id')
      unauthorizedAreaFormData.append('tenant_id', TEST_TENANTS.FEMA.id)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          success: false,
          error: 'Access denied to this area',
          code: 'AREA_ACCESS_DENIED'
        })
      })

      const response = await fetch('/api/upload/okr-file', {
        method: 'POST',
        body: unauthorizedAreaFormData,
        headers: {
          'Authorization': `Bearer ${TEST_USERS.MANAGER.id}`,
          'X-Tenant-ID': TEST_TENANTS.FEMA.id
        }
      })

      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Access denied to this area')
    })

    it('should handle server errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Internal server error during file processing'
        })
      })

      const response = await fetch('/api/upload/okr-file', {
        method: 'POST',
        body: validFormData,
        headers: {
          'Authorization': `Bearer ${TEST_USERS.MANAGER.id}`,
          'X-Tenant-ID': TEST_TENANTS.FEMA.id
        }
      })

      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Internal server error')
    })
  })

  describe('GET /api/upload/okr-file/template', () => {
    it('should download Excel template successfully', async () => {
      const mockExcelBuffer = Buffer.from('Mock Excel template content')
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: async () => new Blob([mockExcelBuffer]),
        headers: new Headers({
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="OKR_Template.xlsx"'
        })
      })

      const response = await fetch('/api/upload/okr-file/template', {
        headers: {
          'Authorization': `Bearer ${TEST_USERS.MANAGER.id}`,
          'X-Tenant-ID': TEST_TENANTS.FEMA.id
        }
      })

      expect(response.ok).toBe(true)
      expect(response.headers.get('Content-Type')).toContain('spreadsheetml.sheet')
      expect(response.headers.get('Content-Disposition')).toContain('OKR_Template.xlsx')

      const blob = await response.blob()
      expect(blob.size).toBeGreaterThan(0)
    })

    it('should require authentication for template download', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => API_RESPONSES.UNAUTHORIZED_ERROR
      })

      const response = await fetch('/api/upload/okr-file/template')

      expect(response.status).toBe(401)
    })

    it('should handle template generation errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Template generation failed'
        })
      })

      const response = await fetch('/api/upload/okr-file/template', {
        headers: {
          'Authorization': `Bearer ${TEST_USERS.MANAGER.id}`,
          'X-Tenant-ID': TEST_TENANTS.FEMA.id
        }
      })

      expect(response.status).toBe(500)
      const result = await response.json()
      expect(result.error).toContain('Template generation failed')
    })
  })

  describe('GET /api/upload/okr-file/history', () => {
    it('should return upload history for user', async () => {
      const mockHistory = {
        data: [
          {
            id: 'upload-1',
            fileName: 'okr-q1.xlsx',
            uploadedAt: '2024-01-15T10:00:00Z',
            status: 'completed',
            recordsProcessed: 10,
            savedInitiatives: 8
          },
          {
            id: 'upload-2',
            fileName: 'okr-q2.xlsx',
            uploadedAt: '2024-01-14T15:30:00Z',
            status: 'completed',
            recordsProcessed: 15,
            savedInitiatives: 12
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockHistory
      })

      const response = await fetch'/api/upload/okr-file/history?page=1&limit=10', {
        headers: {
          'Authorization': `Bearer ${TEST_USERS.MANAGER.id}`,
          'X-Tenant-ID': TEST_TENANTS.FEMA.id
        }
      })

      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.data[0].fileName).toBe('okr-q1.xlsx')
      expect(result.data[0].status).toBe('completed')
      expect(result.pagination.total).toBe(2)
    })

    it('should filter history by date range', async () => {
      const mockFilteredHistory = {
        data: [
          {
            id: 'upload-1',
            fileName: 'okr-recent.xlsx',
            uploadedAt: '2024-01-15T10:00:00Z',
            status: 'completed'
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFilteredHistory
      })

      const response = await fetch('/api/upload/okr-file/history?from=2024-01-15&to=2024-01-16', {
        headers: {
          'Authorization': `Bearer ${TEST_USERS.MANAGER.id}`,
          'X-Tenant-ID': TEST_TENANTS.FEMA.id
        }
      })

      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].fileName).toBe('okr-recent.xlsx')
    })

    it('should isolate history by tenant', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [], // Empty for different tenant
          pagination: { page: 1, limit: 10, total: 0 }
        })
      })

      const response = await fetch('/api/upload/okr-file/history', {
        headers: {
          'Authorization': `Bearer ${TEST_USERS.MANAGER.id}`,
          'X-Tenant-ID': TEST_TENANTS.SIGA.id // Different tenant
        }
      })

      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })
  })

  describe('GET /api/upload/okr-file/stats', () => {
    it('should return upload statistics', async () => {
      const mockStats = {
        data: {
          totalUploads: 25,
          successfulUploads: 23,
          failedUploads: 2,
          totalInitiativesCreated: 180,
          totalRecordsProcessed: 250,
          avgProcessingTime: 1200, // milliseconds
          lastUpload: '2024-01-15T10:00:00Z',
          uploadsByMonth: [
            { month: '2024-01', count: 10 },
            { month: '2024-02', count: 15 }
          ]
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockStats
      })

      const response = await fetch('/api/upload/okr-file/stats', {
        headers: {
          'Authorization': `Bearer ${TEST_USERS.MANAGER.id}`,
          'X-Tenant-ID': TEST_TENANTS.FEMA.id
        }
      })

      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result.data.totalUploads).toBe(25)
      expect(result.data.successfulUploads).toBe(23)
      expect(result.data.uploadsByMonth).toHaveLength(2)
    })

    it('should require appropriate permissions for stats', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => API_RESPONSES.FORBIDDEN_ERROR
      })

      const response = await fetch('/api/upload/okr-file/stats', {
        headers: {
          'Authorization': `Bearer ${TEST_USERS.ANALYST.id}`, // Analyst role
          'X-Tenant-ID': TEST_TENANTS.FEMA.id
        }
      })

      expect(response.status).toBe(403)
      const result = await response.json()
      expect(result.error).toBe('Insufficient permissions')
    })
  })

  describe('DELETE /api/upload/okr-file/:uploadId', () => {
    it('should delete upload record successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'Upload record deleted successfully'
        })
      })

      const response = await fetch('/api/upload/okr-file/upload-123', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${TEST_USERS.MANAGER.id}`,
          'X-Tenant-ID': TEST_TENANTS.FEMA.id
        }
      })

      const result = await response.json()

      expect(response.ok).toBe(true)
      expect(result.success).toBe(true)
      expect(result.message).toContain('deleted successfully')
    })

    it('should prevent deletion of uploads from other tenants', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: 'Upload not found or access denied'
        })
      })

      const response = await fetch('/api/upload/okr-file/other-tenant-upload', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${TEST_USERS.MANAGER.id}`,
          'X-Tenant-ID': TEST_TENANTS.FEMA.id
        }
      })

      expect(response.status).toBe(404)
      const result = await response.json()
      expect(result.error).toContain('not found or access denied')
    })

    it('should require appropriate permissions for deletion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => API_RESPONSES.FORBIDDEN_ERROR
      })

      const response = await fetch('/api/upload/okr-file/upload-123', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${TEST_USERS.ANALYST.id}`, // Insufficient permissions
          'X-Tenant-ID': TEST_TENANTS.FEMA.id
        }
      })

      expect(response.status).toBe(403)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed requests gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'Invalid request format'
        })
      })

      const response = await fetch('/api/upload/okr-file', {
        method: 'POST',
        body: 'invalid-body-format',
        headers: {
          'Authorization': `Bearer ${TEST_USERS.MANAGER.id}`,
          'X-Tenant-ID': TEST_TENANTS.FEMA.id
        }
      })

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.error).toContain('Invalid request format')
    })

    it('should handle concurrent upload requests', async () => {
      const uploadPromises = Array(3).fill(null).map(() =>
        fetch('/api/upload/okr-file', {
          method: 'POST',
          body: validFormData,
          headers: {
            'Authorization': `Bearer ${TEST_USERS.MANAGER.id}`,
            'X-Tenant-ID': TEST_TENANTS.FEMA.id
          }
        })
      )

      // Mock successful responses for all requests
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ ...API_RESPONSES.FILE_UPLOAD_SUCCESS, data: { ...API_RESPONSES.FILE_UPLOAD_SUCCESS.data, uploadId: 'upload-1' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ ...API_RESPONSES.FILE_UPLOAD_SUCCESS, data: { ...API_RESPONSES.FILE_UPLOAD_SUCCESS.data, uploadId: 'upload-2' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ ...API_RESPONSES.FILE_UPLOAD_SUCCESS, data: { ...API_RESPONSES.FILE_UPLOAD_SUCCESS.data, uploadId: 'upload-3' } })
        })

      const responses = await Promise.all(uploadPromises)
      const results = await Promise.all(responses.map(r => r.json()))

      // All requests should succeed with unique upload IDs
      expect(responses.every(r => r.ok)).toBe(true)
      expect(results.map(r => r.data.uploadId)).toEqual(['upload-1', 'upload-2', 'upload-3'])
    })

    it('should validate file content integrity', async () => {
      const corruptedFile = createMockFile({ 
        name: 'corrupted.xlsx', 
        content: 'corrupted-content' 
      })
      const corruptedFormData = new FormData()
      corruptedFormData.append('file', corruptedFile)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          success: false,
          error: 'File content is corrupted or invalid Excel format'
        })
      })

      const response = await fetch('/api/upload/okr-file', {
        method: 'POST',
        body: corruptedFormData,
        headers: {
          'Authorization': `Bearer ${TEST_USERS.MANAGER.id}`,
          'X-Tenant-ID': TEST_TENANTS.FEMA.id
        }
      })

      expect(response.status).toBe(422)
      const result = await response.json()
      expect(result.error).toContain('corrupted or invalid Excel format')
    })
  })
})