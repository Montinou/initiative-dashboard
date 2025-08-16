/**
 * Foreign key relationship validation utilities
 * Ensures data integrity and proper relationships between entities
 */

import { createClient } from '@/utils/supabase/client';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  validatedData?: any;
}

interface RelationshipCheck {
  table: string;
  foreignKey: string;
  referencedTable: string;
  referencedKey: string;
  value: string;
  tenantId?: string;
  areaId?: string;
}

/**
 * Validates that a foreign key reference exists and belongs to the correct tenant/area
 */
export async function validateForeignKeyRelationship(
  check: RelationshipCheck
): Promise<ValidationResult> {
  const supabase = createClient();
  const errors: string[] = [];

  try {
    // Build query to check if referenced record exists
    let query = supabase
      .from(check.referencedTable)
      .select(check.referencedKey)
      .eq(check.referencedKey, check.value);

    // Add tenant filtering if required
    if (check.tenantId) {
      query = query;
    }

    // Add area filtering if required
    if (check.areaId) {
      query = query.eq('area_id', check.areaId);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      errors.push(
        `Invalid ${check.foreignKey}: Referenced ${check.referencedTable} ` +
        `with ${check.referencedKey}="${check.value}" does not exist or is not accessible`
      );
      return { isValid: false, errors };
    }

    return { isValid: true, errors: [], validatedData: data };

  } catch (error) {
    errors.push(`Foreign key validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors };
  }
}

/**
 * Validates area_id belongs to the correct tenant
 */
export async function validateAreaBelongsToTenant(
  areaId: string,
  tenantId: string
): Promise<ValidationResult> {
  return validateForeignKeyRelationship({
    table: 'initiatives', // Source table (example)
    foreignKey: 'area_id',
    referencedTable: 'areas',
    referencedKey: 'id',
    value: areaId,
    tenantId: tenantId
  });
}

/**
 * Validates user_id belongs to the correct tenant
 */
export async function validateUserBelongsToTenant(
  userId: string,
  tenantId: string
): Promise<ValidationResult> {
  return validateForeignKeyRelationship({
    table: 'initiatives', // Source table (example)
    foreignKey: 'created_by',
    referencedTable: 'user_profiles',
    referencedKey: 'id',
    value: userId,
    tenantId: tenantId
  });
}

/**
 * Validates initiative belongs to the correct area and tenant
 */
export async function validateInitiativeBelongsToArea(
  initiativeId: string,
  areaId: string,
  tenantId: string
): Promise<ValidationResult> {
  return validateForeignKeyRelationship({
    table: 'subtasks', // Source table (example)
    foreignKey: 'initiative_id',
    referencedTable: 'initiatives',
    referencedKey: 'id',
    value: initiativeId,
    tenantId: tenantId,
    areaId: areaId
  });
}

/**
 * Comprehensive validation for initiative creation
 */
export async function validateInitiativeReferences(data: {
  tenant_id: string;
  area_id: string;
  created_by: string;
  owner_id: string;
}): Promise<ValidationResult> {
  const errors: string[] = [];
  
  // Validate area belongs to tenant
  const areaValidation = await validateAreaBelongsToTenant(data.area_id, data.tenant_id);
  if (!areaValidation.isValid) {
    errors.push(...areaValidation.errors);
  }

  // Validate created_by user belongs to tenant
  const createdByValidation = await validateUserBelongsToTenant(data.created_by, data.tenant_id);
  if (!createdByValidation.isValid) {
    errors.push(...createdByValidation.errors);
  }

  // Validate owner user belongs to tenant (if different from created_by)
  if (data.owner_id !== data.created_by) {
    const ownerValidation = await validateUserBelongsToTenant(data.owner_id, data.tenant_id);
    if (!ownerValidation.isValid) {
      errors.push(...ownerValidation.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Comprehensive validation for subtask creation
 */
export async function validateSubtaskReferences(data: {
  tenant_id: string;
  initiative_id: string;
}): Promise<ValidationResult> {
  const supabase = createClient();
  const errors: string[] = [];

  try {
    // Validate initiative exists and belongs to the same tenant
    const { data: initiative, error } = await supabase
      .from('initiatives')
      .select('id, tenant_id, area_id')
      .eq('id', data.initiative_id)
      
      .single();

    if (error || !initiative) {
      errors.push(`Invalid initiative_id: Initiative does not exist or does not belong to the specified tenant`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      validatedData: initiative
    };

  } catch (error) {
    errors.push(`Subtask validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors };
  }
}

/**
 * Comprehensive validation for file upload creation
 */
export async function validateFileUploadReferences(data: {
  tenant_id: string;
  area_id: string;
  uploaded_by: string;
}): Promise<ValidationResult> {
  const errors: string[] = [];

  // Validate area belongs to tenant
  const areaValidation = await validateAreaBelongsToTenant(data.area_id, data.tenant_id);
  if (!areaValidation.isValid) {
    errors.push(...areaValidation.errors);
  }

  // Validate uploaded_by user belongs to tenant
  const userValidation = await validateUserBelongsToTenant(data.uploaded_by, data.tenant_id);
  if (!userValidation.isValid) {
    errors.push(...userValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates that a user has the required role and is assigned to the specified area
 */
export async function validateUserAreaAssignment(
  userId: string,
  requiredAreaId: string,
  tenantId: string,
  requiredRole?: string
): Promise<ValidationResult> {
  const supabase = createClient();
  const errors: string[] = [];

  try {
    const { data: userProfile, error } = await supabase
      .from('user_profiles')
      .select('id, tenant_id, area_id, role, is_active')
      .eq('user_id', userId)
      
      .single();

    if (error || !userProfile) {
      errors.push('User profile not found or does not belong to the specified tenant');
      return { isValid: false, errors };
    }

    if (!userProfile.is_active) {
      errors.push('User account is inactive');
    }

    if (requiredRole && userProfile.role !== requiredRole) {
      errors.push(`User does not have the required role: ${requiredRole}`);
    }

    if (userProfile.area_id !== requiredAreaId) {
      errors.push('User is not assigned to the specified area');
    }

    return {
      isValid: errors.length === 0,
      errors,
      validatedData: userProfile
    };

  } catch (error) {
    errors.push(`User validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors };
  }
}

/**
 * Validates manager permissions for a specific operation
 */
export async function validateManagerOperation(
  managerId: string,
  targetAreaId: string,
  tenantId: string,
  operation: string
): Promise<ValidationResult> {
  const userValidation = await validateUserAreaAssignment(
    managerId,
    targetAreaId,
    tenantId,
    'Manager'
  );

  if (!userValidation.isValid) {
    return {
      isValid: false,
      errors: userValidation.errors.map(error => `${operation}: ${error}`)
    };
  }

  return { isValid: true, errors: [] };
}

/**
 * Batch validation for multiple foreign key relationships
 */
export async function validateMultipleForeignKeys(
  checks: RelationshipCheck[]
): Promise<ValidationResult> {
  const errors: string[] = [];
  const validatedData: any[] = [];

  for (const check of checks) {
    const result = await validateForeignKeyRelationship(check);
    if (!result.isValid) {
      errors.push(...result.errors);
    } else if (result.validatedData) {
      validatedData.push(result.validatedData);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    validatedData: validatedData.length > 0 ? validatedData : undefined
  };
}

/**
 * Helper to create relationship checks for common scenarios
 */
export const createCommonChecks = {
  areaInTenant: (areaId: string, tenantId: string): RelationshipCheck => ({
    table: 'initiatives',
    foreignKey: 'area_id',
    referencedTable: 'areas',
    referencedKey: 'id',
    value: areaId,
    tenantId
  }),

  userInTenant: (userId: string, tenantId: string): RelationshipCheck => ({
    table: 'initiatives',
    foreignKey: 'created_by',
    referencedTable: 'user_profiles',
    referencedKey: 'id',
    value: userId,
    tenantId
  }),

  initiativeInArea: (initiativeId: string, areaId: string, tenantId: string): RelationshipCheck => ({
    table: 'subtasks',
    foreignKey: 'initiative_id',
    referencedTable: 'initiatives',
    referencedKey: 'id',
    value: initiativeId,
    tenantId,
    areaId
  })
};

/**
 * Data integrity checker for existing records
 */
export async function checkDataIntegrity(
  table: string,
  tenantId: string,
  areaId?: string
): Promise<ValidationResult> {
  const supabase = createClient();
  const errors: string[] = [];

  try {
    // This would be expanded based on specific integrity checks needed
    // For now, just validate that tenant and area exist
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      errors.push(`Tenant ${tenantId} does not exist`);
    }

    if (areaId) {
      const { data: area, error: areaError } = await supabase
        .from('areas')
        .select('id, tenant_id')
        .eq('id', areaId)
        
        .single();

      if (areaError || !area) {
        errors.push(`Area ${areaId} does not exist or does not belong to tenant ${tenantId}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };

  } catch (error) {
    errors.push(`Data integrity check error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors };
  }
}