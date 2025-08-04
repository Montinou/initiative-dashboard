/**
 * Query validation utilities for ensuring consistent tenant_id + area_id filtering
 * This prevents data leakage between tenants and areas
 */

interface QueryFilters {
  tenant_id: string;
  area_id: string;
}

interface QueryValidationResult {
  isValid: boolean;
  errors: string[];
  filters: QueryFilters | null;
}

/**
 * Validates that all database queries include both tenant_id and area_id filters
 * This is critical for data isolation in multi-tenant applications
 */
export function validateQueryFilters(
  tenantId: string | null | undefined,
  areaId: string | null | undefined,
  context: string = 'query'
): QueryValidationResult {
  const errors: string[] = [];

  if (!tenantId) {
    errors.push(`${context}: tenant_id is required for data isolation`);
  }

  if (!areaId) {
    errors.push(`${context}: area_id is required for manager data access`);
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (tenantId && !uuidRegex.test(tenantId)) {
    errors.push(`${context}: tenant_id must be a valid UUID`);
  }

  if (areaId && !uuidRegex.test(areaId)) {
    errors.push(`${context}: area_id must be a valid UUID`);
  }

  const isValid = errors.length === 0;
  const filters = isValid && tenantId && areaId ? { tenant_id: tenantId, area_id: areaId } : null;

  return {
    isValid,
    errors,
    filters
  };
}

/**
 * Adds required tenant_id and area_id filters to a Supabase query
 * Throws an error if filters are invalid
 */
export function applyRequiredFilters<T>(
  query: any,
  tenantId: string,
  areaId: string,
  context: string = 'query'
): any {
  const validation = validateQueryFilters(tenantId, areaId, context);
  
  if (!validation.isValid) {
    throw new Error(`Query validation failed: ${validation.errors.join(', ')}`);
  }

  return query
    .eq('tenant_id', tenantId)
    .eq('area_id', areaId);
}

/**
 * Creates a standardized filter object for manager queries
 */
export function createManagerQueryFilters(
  tenantId: string,
  areaId: string
): QueryFilters {
  const validation = validateQueryFilters(tenantId, areaId, 'manager filters');
  
  if (!validation.isValid) {
    throw new Error(`Invalid manager query filters: ${validation.errors.join(', ')}`);
  }

  return {
    tenant_id: tenantId,
    area_id: areaId
  };
}

/**
 * Validates that a database record belongs to the correct tenant and area
 */
export function validateRecordOwnership(
  record: any,
  expectedTenantId: string,
  expectedAreaId: string,
  recordType: string = 'record'
): boolean {
  if (!record) {
    throw new Error(`${recordType} not found`);
  }

  if (record.tenant_id !== expectedTenantId) {
    throw new Error(`${recordType} does not belong to the expected tenant`);
  }

  if (record.area_id !== expectedAreaId) {
    throw new Error(`${recordType} does not belong to the expected area`);
  }

  return true;
}

/**
 * Audit log helper - logs when query validation fails
 */
export function logQueryValidationFailure(
  userId: string,
  context: string,
  errors: string[],
  attemptedFilters: any
): void {
  console.error('Query validation failure:', {
    userId,
    context,
    errors,
    attemptedFilters,
    timestamp: new Date().toISOString()
  });
  
  // TODO: In production, send this to your monitoring/alerting system
  // This indicates a potential security issue or bug
}

/**
 * Middleware helper for API routes to validate filters
 */
export function validateAPIFilters(
  tenantId: string | null | undefined,
  areaId: string | null | undefined,
  endpointName: string
): QueryFilters {
  const validation = validateQueryFilters(tenantId, areaId, endpointName);
  
  if (!validation.isValid) {
    throw new Error(`API validation failed for ${endpointName}: ${validation.errors.join(', ')}`);
  }

  return validation.filters!;
}

/**
 * Helper to ensure all initiative queries include proper filtering
 */
export function createInitiativeQuery(
  supabase: any,
  tenantId: string,
  areaId: string,
  selectFields: string = '*'
) {
  validateQueryFilters(tenantId, areaId, 'initiative query');
  
  return supabase
    .from('initiatives')
    .select(selectFields)
    .eq('tenant_id', tenantId)
    .eq('area_id', areaId);
}

/**
 * Helper to ensure all subtask queries include proper filtering
 */
export function createSubtaskQuery(
  supabase: any,
  tenantId: string,
  areaId: string,
  selectFields: string = '*'
) {
  validateQueryFilters(tenantId, areaId, 'subtask query');
  
  return supabase
    .from('subtasks')
    .select(selectFields)
    .eq('tenant_id', tenantId);
}

/**
 * Helper to ensure all file upload queries include proper filtering
 */
export function createFileUploadQuery(
  supabase: any,
  tenantId: string,
  areaId: string,
  selectFields: string = '*'
) {
  validateQueryFilters(tenantId, areaId, 'file upload query');
  
  return supabase
    .from('file_uploads')
    .select(selectFields)
    .eq('tenant_id', tenantId)
    .eq('area_id', areaId);
}

/**
 * Helper to ensure all audit log queries include proper filtering
 */
export function createAuditLogQuery(
  supabase: any,
  tenantId: string,
  selectFields: string = '*'
) {
  if (!tenantId) {
    throw new Error('tenant_id is required for audit log queries');
  }
  
  return supabase
    .from('audit_log')
    .select(selectFields)
    .eq('tenant_id', tenantId);
}

/**
 * Security check: Ensures manager can only access their own area's data
 */
export function enforceManagerAreaAccess(
  requestedAreaId: string,
  managerAreaId: string,
  managerRole: string
): void {
  // SuperAdmins can access any area
  if (managerRole === 'SuperAdmin') {
    return;
  }

  // Regular managers can only access their assigned area
  if (managerRole === 'Manager' && requestedAreaId !== managerAreaId) {
    throw new Error('Access denied: Manager can only access their assigned area');
  }

  // Other roles should not reach this function
  if (managerRole !== 'Manager' && managerRole !== 'SuperAdmin') {
    throw new Error('Access denied: Invalid role for area access');
  }
}

/**
 * Data integrity check: Ensures all related records have consistent tenant/area IDs
 */
export function validateRelatedRecordsIntegrity(
  parentRecord: any,
  childRecords: any[],
  parentType: string,
  childType: string
): void {
  if (!parentRecord || !childRecords) {
    return;
  }

  const parentTenantId = parentRecord.tenant_id;
  const parentAreaId = parentRecord.area_id;

  for (const child of childRecords) {
    if (child.tenant_id && child.tenant_id !== parentTenantId) {
      throw new Error(
        `Data integrity violation: ${childType} tenant_id (${child.tenant_id}) ` +
        `does not match ${parentType} tenant_id (${parentTenantId})`
      );
    }

    // Not all child records have area_id (e.g., subtasks inherit from initiatives)
    if (child.area_id && child.area_id !== parentAreaId) {
      throw new Error(
        `Data integrity violation: ${childType} area_id (${child.area_id}) ` +
        `does not match ${parentType} area_id (${parentAreaId})`
      );
    }
  }
}

/**
 * Performance helper: Creates optimized queries with proper indexing hints
 */
export function createOptimizedManagerQuery(
  supabase: any,
  table: string,
  tenantId: string,
  areaId: string,
  selectFields: string = '*'
) {
  validateQueryFilters(tenantId, areaId, `optimized ${table} query`);
  
  // Order matters for composite index performance: tenant_id first, then area_id
  return supabase
    .from(table)
    .select(selectFields)
    .eq('tenant_id', tenantId)
    .eq('area_id', areaId);
}

// Note: Server-only function validateManagerArea() has been moved to 
// @/lib/server/query-validation.ts to avoid client/server conflicts