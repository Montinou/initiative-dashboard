import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateQueryFilters,
  applyRequiredFilters,
  createManagerQueryFilters,
  validateRecordOwnership,
  logQueryValidationFailure,
  validateAPIFilters,
  createInitiativeQuery,
  createSubtaskQuery,
  createFileUploadQuery,
  createAuditLogQuery,
  enforceManagerAreaAccess,
  validateRelatedRecordsIntegrity,
  createOptimizedManagerQuery,
  validateManagerArea
} from '@/lib/query-validation';

// Mock Supabase client
const mockSupabaseQuery = {
  from: vi.fn(() => mockSupabaseQuery),
  select: vi.fn(() => mockSupabaseQuery),
  eq: vi.fn(() => mockSupabaseQuery),
  single: vi.fn(() => mockSupabaseQuery)
};

const mockSupabase = {
  from: vi.fn(() => mockSupabaseQuery)
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase)
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({}))
}));

// Mock console.error
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Query Validation', () => {
  const validTenantId = '550e8400-e29b-41d4-a716-446655440000';
  const validAreaId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy.mockClear();
  });

  describe('validateQueryFilters', () => {
    it('should pass validation with valid tenant and area IDs', () => {
      const result = validateQueryFilters(validTenantId, validAreaId);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.filters).toEqual({
        tenant_id: validTenantId,
        area_id: validAreaId
      });
    });

    it('should fail validation when tenant ID is missing', () => {
      const result = validateQueryFilters(null, validAreaId);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('query: tenant_id is required for data isolation');
      expect(result.filters).toBeNull();
    });

    it('should fail validation when area ID is missing', () => {
      const result = validateQueryFilters(validTenantId, null);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('query: area_id is required for manager data access');
      expect(result.filters).toBeNull();
    });

    it('should fail validation when tenant ID is not a valid UUID', () => {
      const result = validateQueryFilters('invalid-uuid', validAreaId);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('query: tenant_id must be a valid UUID');
      expect(result.filters).toBeNull();
    });

    it('should fail validation when area ID is not a valid UUID', () => {
      const result = validateQueryFilters(validTenantId, 'invalid-uuid');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('query: area_id must be a valid UUID');
      expect(result.filters).toBeNull();
    });

    it('should use custom context in error messages', () => {
      const result = validateQueryFilters(null, null, 'custom context');
      
      expect(result.errors).toContain('custom context: tenant_id is required for data isolation');
      expect(result.errors).toContain('custom context: area_id is required for manager data access');
    });

    it('should handle undefined values', () => {
      const result = validateQueryFilters(undefined, undefined);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should handle empty string values', () => {
      const result = validateQueryFilters('', '');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('query: tenant_id is required for data isolation');
      expect(result.errors).toContain('query: area_id is required for manager data access');
    });
  });

  describe('applyRequiredFilters', () => {
    const mockQuery = {
      eq: vi.fn().mockReturnThis()
    };

    beforeEach(() => {
      mockQuery.eq.mockClear();
      mockQuery.eq.mockReturnThis();
    });

    it('should apply filters to valid query', () => {
      const result = applyRequiredFilters(mockQuery, validTenantId, validAreaId);
      
      expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', validTenantId);
      expect(mockQuery.eq).toHaveBeenCalledWith('area_id', validAreaId);
      expect(result).toBe(mockQuery);
    });

    it('should throw error for invalid filters', () => {
      expect(() => {
        applyRequiredFilters(mockQuery, 'invalid-uuid', validAreaId);
      }).toThrow('Query validation failed');
    });

    it('should include context in error message', () => {
      expect(() => {
        applyRequiredFilters(mockQuery, null, validAreaId, 'test context');
      }).toThrow('Query validation failed: test context: tenant_id is required for data isolation');
    });
  });

  describe('createManagerQueryFilters', () => {
    it('should create filters for valid inputs', () => {
      const result = createManagerQueryFilters(validTenantId, validAreaId);
      
      expect(result).toEqual({
        tenant_id: validTenantId,
        area_id: validAreaId
      });
    });

    it('should throw error for invalid inputs', () => {
      expect(() => {
        createManagerQueryFilters('invalid-uuid', validAreaId);
      }).toThrow('Invalid manager query filters');
    });
  });

  describe('validateRecordOwnership', () => {
    const mockRecord = {
      tenant_id: validTenantId,
      area_id: validAreaId
    };

    it('should pass validation for matching tenant and area', () => {
      const result = validateRecordOwnership(mockRecord, validTenantId, validAreaId);
      expect(result).toBe(true);
    });

    it('should throw error when record is null', () => {
      expect(() => {
        validateRecordOwnership(null, validTenantId, validAreaId);
      }).toThrow('record not found');
    });

    it('should throw error when tenant ID does not match', () => {
      expect(() => {
        validateRecordOwnership(mockRecord, 'different-tenant', validAreaId);
      }).toThrow('record does not belong to the expected tenant');
    });

    it('should throw error when area ID does not match', () => {
      expect(() => {
        validateRecordOwnership(mockRecord, validTenantId, 'different-area');
      }).toThrow('record does not belong to the expected area');
    });

    it('should use custom record type in error messages', () => {
      expect(() => {
        validateRecordOwnership(null, validTenantId, validAreaId, 'initiative');
      }).toThrow('initiative not found');
    });
  });

  describe('logQueryValidationFailure', () => {
    it('should log validation failure details', () => {
      const errors = ['tenant_id required', 'area_id required'];
      const attemptedFilters = { tenant_id: null, area_id: 'test' };
      
      logQueryValidationFailure('user-123', 'test context', errors, attemptedFilters);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Query validation failure:',
        expect.objectContaining({
          userId: 'user-123',
          context: 'test context',
          errors,
          attemptedFilters,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('validateAPIFilters', () => {
    it('should return filters for valid inputs', () => {
      const result = validateAPIFilters(validTenantId, validAreaId, 'test endpoint');
      
      expect(result).toEqual({
        tenant_id: validTenantId,
        area_id: validAreaId
      });
    });

    it('should throw error for invalid inputs', () => {
      expect(() => {
        validateAPIFilters(null, validAreaId, 'test endpoint');
      }).toThrow('API validation failed for test endpoint');
    });
  });

  describe('createInitiativeQuery', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.select.mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.eq.mockReturnValue(mockSupabaseQuery);
    });

    it('should create initiative query with proper filters', () => {
      createInitiativeQuery(mockSupabase, validTenantId, validAreaId);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('initiatives');
      expect(mockSupabaseQuery.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('tenant_id', validTenantId);
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('area_id', validAreaId);
    });

    it('should accept custom select fields', () => {
      createInitiativeQuery(mockSupabase, validTenantId, validAreaId, 'id, title');
      
      expect(mockSupabaseQuery.select).toHaveBeenCalledWith('id, title');
    });

    it('should throw error for invalid filters', () => {
      expect(() => {
        createInitiativeQuery(mockSupabase, 'invalid', validAreaId);
      }).toThrow();
    });
  });

  describe('createSubtaskQuery', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.select.mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.eq.mockReturnValue(mockSupabaseQuery);
    });

    it('should create subtask query with tenant filter only', () => {
      createSubtaskQuery(mockSupabase, validTenantId, validAreaId);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('subtasks');
      expect(mockSupabaseQuery.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('tenant_id', validTenantId);
      // Note: subtasks inherit area_id from parent initiative, so no area_id filter applied
    });
  });

  describe('createFileUploadQuery', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.select.mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.eq.mockReturnValue(mockSupabaseQuery);
    });

    it('should create file upload query with proper filters', () => {
      createFileUploadQuery(mockSupabase, validTenantId, validAreaId);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('file_uploads');
      expect(mockSupabaseQuery.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('tenant_id', validTenantId);
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('area_id', validAreaId);
    });
  });

  describe('createAuditLogQuery', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.select.mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.eq.mockReturnValue(mockSupabaseQuery);
    });

    it('should create audit log query with tenant filter only', () => {
      createAuditLogQuery(mockSupabase, validTenantId);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('audit_log');
      expect(mockSupabaseQuery.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('tenant_id', validTenantId);
    });

    it('should throw error when tenant ID is missing', () => {
      expect(() => {
        createAuditLogQuery(mockSupabase, null);
      }).toThrow('tenant_id is required for audit log queries');
    });
  });

  describe('enforceManagerAreaAccess', () => {
    it('should allow SuperAdmin to access any area', () => {
      expect(() => {
        enforceManagerAreaAccess('area-123', 'area-456', 'SuperAdmin');
      }).not.toThrow();
    });

    it('should allow Manager to access their assigned area', () => {
      expect(() => {
        enforceManagerAreaAccess('area-123', 'area-123', 'Manager');
      }).not.toThrow();
    });

    it('should deny Manager access to different area', () => {
      expect(() => {
        enforceManagerAreaAccess('area-123', 'area-456', 'Manager');
      }).toThrow('Access denied: Manager can only access their assigned area');
    });

    it('should deny access for invalid roles', () => {
      expect(() => {
        enforceManagerAreaAccess('area-123', 'area-123', 'Analyst');
      }).toThrow('Access denied: Invalid role for area access');
    });
  });

  describe('validateRelatedRecordsIntegrity', () => {
    const parentRecord = {
      tenant_id: validTenantId,
      area_id: validAreaId
    };

    it('should pass when all records have consistent IDs', () => {
      const childRecords = [
        { tenant_id: validTenantId, area_id: validAreaId },
        { tenant_id: validTenantId, area_id: validAreaId }
      ];
      
      expect(() => {
        validateRelatedRecordsIntegrity(parentRecord, childRecords, 'initiative', 'subtask');
      }).not.toThrow();
    });

    it('should handle null parent or child records', () => {
      expect(() => {
        validateRelatedRecordsIntegrity(null, [], 'initiative', 'subtask');
      }).not.toThrow();
      
      expect(() => {
        validateRelatedRecordsIntegrity(parentRecord, null, 'initiative', 'subtask');
      }).not.toThrow();
    });

    it('should throw error for tenant ID mismatch', () => {
      const childRecords = [
        { tenant_id: 'different-tenant', area_id: validAreaId }
      ];
      
      expect(() => {
        validateRelatedRecordsIntegrity(parentRecord, childRecords, 'initiative', 'subtask');
      }).toThrow(/Data integrity violation.*tenant_id/);
    });

    it('should throw error for area ID mismatch', () => {
      const childRecords = [
        { tenant_id: validTenantId, area_id: 'different-area' }
      ];
      
      expect(() => {
        validateRelatedRecordsIntegrity(parentRecord, childRecords, 'initiative', 'subtask');
      }).toThrow(/Data integrity violation.*area_id/);
    });

    it('should ignore child records without area_id', () => {
      const childRecords = [
        { tenant_id: validTenantId } // No area_id
      ];
      
      expect(() => {
        validateRelatedRecordsIntegrity(parentRecord, childRecords, 'initiative', 'subtask');
      }).not.toThrow();
    });
  });

  describe('createOptimizedManagerQuery', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.select.mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.eq.mockReturnValue(mockSupabaseQuery);
    });

    it('should create optimized query with proper order', () => {
      createOptimizedManagerQuery(mockSupabase, 'initiatives', validTenantId, validAreaId);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('initiatives');
      expect(mockSupabaseQuery.select).toHaveBeenCalledWith('*');
      
      // Check that tenant_id is applied first (for composite index performance)
      const eqCalls = mockSupabaseQuery.eq.mock.calls;
      expect(eqCalls[0]).toEqual(['tenant_id', validTenantId]);
      expect(eqCalls[1]).toEqual(['area_id', validAreaId]);
    });

    it('should accept custom select fields', () => {
      createOptimizedManagerQuery(mockSupabase, 'initiatives', validTenantId, validAreaId, 'id, title');
      
      expect(mockSupabaseQuery.select).toHaveBeenCalledWith('id, title');
    });

    it('should throw error for invalid filters', () => {
      expect(() => {
        createOptimizedManagerQuery(mockSupabase, 'initiatives', 'invalid', validAreaId);
      }).toThrow();
    });
  });

  describe('validateManagerArea', () => {
    const mockProfile = {
      role: 'Manager',
      area_id: validAreaId,
      is_active: true
    };

    const mockArea = {
      id: validAreaId
    };

    beforeEach(() => {
      mockSupabaseQuery.single.mockResolvedValue({ data: mockProfile, error: null });
    });

    it('should return true for manager accessing their assigned area', async () => {
      mockSupabaseQuery.single
        .mockResolvedValueOnce({ data: mockProfile, error: null });

      const result = await validateManagerArea(validAreaId, 'user-123', validTenantId);
      expect(result).toBe(true);
    });

    it('should return false for manager accessing different area', async () => {
      mockSupabaseQuery.single
        .mockResolvedValueOnce({ data: mockProfile, error: null });

      const result = await validateManagerArea('different-area', 'user-123', validTenantId);
      expect(result).toBe(false);
    });

    it('should return true for Admin accessing any area', async () => {
      const adminProfile = { ...mockProfile, role: 'Admin' };
      mockSupabaseQuery.single
        .mockResolvedValueOnce({ data: adminProfile, error: null })
        .mockResolvedValueOnce({ data: mockArea, error: null });

      const result = await validateManagerArea(validAreaId, 'admin-123', validTenantId);
      expect(result).toBe(true);
    });

    it('should return true for CEO accessing any area', async () => {
      const ceoProfile = { ...mockProfile, role: 'CEO' };
      mockSupabaseQuery.single
        .mockResolvedValueOnce({ data: ceoProfile, error: null })
        .mockResolvedValueOnce({ data: mockArea, error: null });

      const result = await validateManagerArea(validAreaId, 'ceo-123', validTenantId);
      expect(result).toBe(true);
    });

    it('should return true for Analyst accessing any area', async () => {
      const analystProfile = { ...mockProfile, role: 'Analyst' };
      mockSupabaseQuery.single
        .mockResolvedValueOnce({ data: analystProfile, error: null })
        .mockResolvedValueOnce({ data: mockArea, error: null });

      const result = await validateManagerArea(validAreaId, 'analyst-123', validTenantId);
      expect(result).toBe(true);
    });

    it('should return false when profile is not found', async () => {
      mockSupabaseQuery.single
        .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      const result = await validateManagerArea(validAreaId, 'user-123', validTenantId);
      expect(result).toBe(false);
    });

    it('should return false when user is not active', async () => {
      const inactiveProfile = { ...mockProfile, is_active: false };
      mockSupabaseQuery.single
        .mockResolvedValueOnce({ data: inactiveProfile, error: null });

      const result = await validateManagerArea(validAreaId, 'user-123', validTenantId);
      expect(result).toBe(false);
    });

    it('should return false for unknown roles', async () => {
      const unknownProfile = { ...mockProfile, role: 'Unknown' };
      mockSupabaseQuery.single
        .mockResolvedValueOnce({ data: unknownProfile, error: null });

      const result = await validateManagerArea(validAreaId, 'user-123', validTenantId);
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseQuery.single
        .mockRejectedValueOnce(new Error('Database connection failed'));

      const result = await validateManagerArea(validAreaId, 'user-123', validTenantId);
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error validating manager area access:',
        expect.any(Error)
      );
    });

    it('should validate area exists for Admin role', async () => {
      const adminProfile = { ...mockProfile, role: 'Admin' };
      mockSupabaseQuery.single
        .mockResolvedValueOnce({ data: adminProfile, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Area not found' } });

      const result = await validateManagerArea('non-existent-area', 'admin-123', validTenantId);
      expect(result).toBe(false);
    });
  });
});