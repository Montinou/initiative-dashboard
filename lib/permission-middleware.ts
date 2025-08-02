/**
 * Permission Validation Middleware
 * Integrates comprehensive permission validation into API routes and middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { UserRole } from './role-permissions';
import {
  runPermissionValidationSuite,
  validateSpecificPermission,
  validateAreaAccess,
  ValidationContext,
  getValidationSummary
} from './permission-validation';

export interface PermissionMiddlewareConfig {
  requiredRole?: UserRole;
  requiredPermissions?: string[];
  areaRestricted?: boolean;
  validateOperation?: string;
  skipValidation?: boolean;
}

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  tenantId: string | null;
  areaId: string | null;
  email: string;
}

/**
 * Extract user from authenticated request
 */
export async function extractAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    // Get user profile with role and area information
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role, tenant_id, area_id, email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) return null;

    return {
      id: profile.id,
      role: profile.role as UserRole,
      tenantId: profile.tenant_id,
      areaId: profile.area_id,
      email: profile.email
    };
  } catch (error) {
    console.error('Error extracting authenticated user:', error);
    return null;
  }
}

/**
 * Create validation context from request and user
 */
export function createValidationContext(
  user: AuthenticatedUser,
  request: NextRequest
): ValidationContext {
  return {
    userId: user.id,
    userRole: user.role,
    userTenantId: user.tenantId,
    userAreaId: user.areaId,
    requestPath: request.nextUrl.pathname,
    requestMethod: request.method
  };
}

/**
 * Permission validation middleware for API routes
 */
export function withPermissionValidation(
  config: PermissionMiddlewareConfig = {}
) {
  return function middleware(
    handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
  ) {
    return async (request: NextRequest): Promise<NextResponse> => {
      // Skip validation if explicitly disabled
      if (config.skipValidation) {
        const user = await extractAuthenticatedUser(request);
        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return handler(request, user);
      }

      // Extract authenticated user
      const user = await extractAuthenticatedUser(request);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Create validation context
      const context = createValidationContext(user, request);

      // Run comprehensive permission validation
      const validationSuite = runPermissionValidationSuite(context);
      
      // Log validation results for monitoring
      console.log(`🔒 ${getValidationSummary(validationSuite)} - ${user.role} ${user.id} ${request.nextUrl.pathname}`);

      // Check for critical failures
      if (validationSuite.overall.criticalFailures > 0) {
        console.error('🚨 Critical permission validation failures detected:', validationSuite);
        return NextResponse.json(
          { 
            error: 'Permission validation failed', 
            details: 'Critical security restrictions violated'
          }, 
          { status: 403 }
        );
      }

      // Role validation
      if (config.requiredRole && user.role !== config.requiredRole) {
        return NextResponse.json(
          { error: `Access denied: ${config.requiredRole} role required` },
          { status: 403 }
        );
      }

      // Specific operation validation
      if (config.validateOperation) {
        const operationResult = validateSpecificPermission(
          context,
          config.validateOperation,
          request.nextUrl.searchParams.get('areaId') || undefined
        );

        if (!operationResult.isValid) {
          return NextResponse.json(
            { error: operationResult.error || 'Operation not permitted' },
            { status: 403 }
          );
        }
      }

      // Area restriction validation
      if (config.areaRestricted) {
        const targetAreaId = request.nextUrl.searchParams.get('areaId') || 
                            request.nextUrl.searchParams.get('area_id');
        
        if (targetAreaId) {
          const areaResult = validateAreaAccess(context, targetAreaId);
          if (!areaResult.isValid) {
            return NextResponse.json(
              { error: areaResult.error || 'Area access denied' },
              { status: 403 }
            );
          }
        } else if (user.role === 'Manager') {
          // Managers must specify an area for area-restricted endpoints
          return NextResponse.json(
            { error: 'Area ID required for this operation' },
            { status: 400 }
          );
        }
      }

      // All validations passed, proceed with the handler
      return handler(request, user);
    };
  };
}

/**
 * Client-side permission validation hook
 */
export function validateClientPermissions(
  userRole: UserRole,
  userAreaId: string | null,
  userTenantId: string | null,
  operation?: string,
  targetAreaId?: string
): { canProceed: boolean; error?: string } {
  const context: ValidationContext = {
    userId: 'client-user',
    userRole,
    userTenantId,
    userAreaId
  };

  // Run basic validation suite
  const suite = runPermissionValidationSuite(context);

  if (suite.overall.criticalFailures > 0) {
    return {
      canProceed: false,
      error: 'Critical permission validation failed'
    };
  }

  // Validate specific operation if provided
  if (operation) {
    const operationResult = validateSpecificPermission(context, operation, targetAreaId);
    if (!operationResult.isValid) {
      return {
        canProceed: false,
        error: operationResult.error
      };
    }
  }

  // Validate area access if target area provided
  if (targetAreaId) {
    const areaResult = validateAreaAccess(context, targetAreaId);
    if (!areaResult.isValid) {
      return {
        canProceed: false,
        error: areaResult.error
      };
    }
  }

  return { canProceed: true };
}

/**
 * Database query permission validator
 */
export function validateDatabaseQuery(
  userRole: UserRole,
  userTenantId: string | null,
  userAreaId: string | null,
  queryType: 'select' | 'insert' | 'update' | 'delete',
  tableName: string,
  targetAreaId?: string
): { filters: Record<string, any> | null; error?: string } {
  const context: ValidationContext = {
    userId: 'db-user',
    userRole,
    userTenantId,
    userAreaId
  };

  // Run permission validation
  const suite = runPermissionValidationSuite(context);
  
  if (suite.overall.criticalFailures > 0) {
    return {
      filters: null,
      error: 'Database access denied due to permission validation failures'
    };
  }

  // Base tenant isolation
  if (!userTenantId) {
    return {
      filters: null,
      error: 'Tenant ID required for database access'
    };
  }

  const baseFilters = { tenant_id: userTenantId };

  // Manager area restriction
  if (userRole === 'Manager') {
    if (!userAreaId) {
      return {
        filters: null,
        error: 'Manager must be assigned to an area for database access'
      };
    }

    // For area-related tables, restrict to manager's area
    if (['initiatives', 'activities', 'subtasks'].includes(tableName)) {
      return {
        filters: { ...baseFilters, area_id: userAreaId },
        error: undefined
      };
    }

    // For user profiles, managers can only see users in their area
    if (tableName === 'user_profiles') {
      return {
        filters: { ...baseFilters, area_id: userAreaId },
        error: undefined
      };
    }
  }

  // CEO, Admin, and Analyst can access all areas within tenant
  if (['CEO', 'Admin', 'Analyst'].includes(userRole)) {
    return {
      filters: baseFilters,
      error: undefined
    };
  }

  return {
    filters: baseFilters,
    error: undefined
  };
}

/**
 * Route protection helper for Next.js middleware
 */
export function createRouteProtection(routes: Record<string, PermissionMiddlewareConfig>) {
  return async (request: NextRequest): Promise<NextResponse | undefined> => {
    const pathname = request.nextUrl.pathname;
    
    // Find matching route configuration
    const routeConfig = Object.entries(routes).find(([pattern, _]) => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
        return regex.test(pathname);
      }
      return pathname === pattern || pathname.startsWith(pattern);
    });

    if (!routeConfig) {
      return undefined; // No protection configured for this route
    }

    const [_, config] = routeConfig;

    // Extract user for route protection
    const user = await extractAuthenticatedUser(request);
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Create validation context
    const context = createValidationContext(user, request);

    // Run validation suite
    const validationSuite = runPermissionValidationSuite(context);

    // Block access on critical failures
    if (validationSuite.overall.criticalFailures > 0) {
      console.error('🚨 Route access blocked due to critical permission failures:', pathname, user.role);
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Role-based route protection
    if (config.requiredRole && user.role !== config.requiredRole) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Area restriction for manager routes
    if (config.areaRestricted && user.role === 'Manager' && !user.areaId) {
      return NextResponse.redirect(new URL('/setup-required', request.url));
    }

    return undefined; // Allow access
  };
}

/**
 * Audit logging for permission validation results
 */
export function logPermissionValidation(
  context: ValidationContext,
  validationResult: any,
  action: string,
  success: boolean
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    userId: context.userId,
    userRole: context.userRole,
    tenantId: context.userTenantId,
    areaId: context.userAreaId,
    action,
    requestPath: context.requestPath,
    requestMethod: context.requestMethod,
    success,
    failedChecks: validationResult.overall?.failedChecks || 0,
    criticalFailures: validationResult.overall?.criticalFailures || 0,
    validationSummary: getValidationSummary(validationResult)
  };

  // Log to appropriate monitoring system
  if (success) {
    console.log('✅ Permission validation passed:', logData);
  } else {
    console.warn('❌ Permission validation failed:', logData);
  }

  // TODO: Integrate with audit logging system
  // auditLogger.log('permission_validation', logData);
}