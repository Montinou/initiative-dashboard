/**
 * Excel Data Validation API Endpoint - Phase 3
 * 
 * Handles comprehensive validation of Excel import data using the advanced
 * validation engine with detailed error reporting and suggestions.
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { createValidationEngine } from '@/lib/excel/validation-engine';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface ValidationRequest {
  data: Record<string, any>[];
  mappings: Record<string, string>;
  userRole: string;
  areaId?: string;
  validationRules?: {
    strictMode?: boolean;
    allowPartialData?: boolean;
    skipDuplicateCheck?: boolean;
  };
}

interface ValidationResponse {
  success: boolean;
  data?: {
    validatedRows: any[];
    globalValidations: any[];
    summary: {
      totalRows: number;
      validRows: number;
      invalidRows: number;
      warningRows: number;
      averageConfidence: number;
    };
    recommendations: string[];
  };
  error?: string;
}

// ============================================================================
// MAIN VALIDATION HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Authentication check
    const supabase = createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, tenant_id, area_id, role, full_name')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: ValidationRequest = await request.json();
    
    if (!body.data || !Array.isArray(body.data)) {
      return NextResponse.json(
        { success: false, error: 'Invalid data format' },
        { status: 400 }
      );
    }

    if (!body.mappings || typeof body.mappings !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Column mappings are required' },
        { status: 400 }
      );
    }

    if (body.data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data provided for validation' },
        { status: 400 }
      );
    }

    // Size limits
    if (body.data.length > 10000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Data set too large. Maximum 10,000 rows allowed per validation.' 
        },
        { status: 400 }
      );
    }

    // Create validation engine
    const validationEngine = await createValidationEngine(
      userProfile.role,
      userProfile.tenant_id,
      userProfile.area_id
    );

    // Perform validation
    const validationResult = await validationEngine.validateImportData(
      body.data,
      body.mappings
    );

    // Generate recommendations based on validation results
    const recommendations = generateRecommendations(
      validationResult,
      body.mappings,
      userProfile.role
    );

    // Log validation activity
    await logValidationActivity(supabase, userProfile, {
      rowCount: body.data.length,
      validRows: validationResult.summary.validRows,
      invalidRows: validationResult.summary.invalidRows,
      processingTime: Date.now() - startTime,
      averageConfidence: validationResult.summary.averageConfidence
    });

    const response: ValidationResponse = {
      success: true,
      data: {
        validatedRows: validationResult.validatedRows,
        globalValidations: validationResult.globalValidations,
        summary: validationResult.summary,
        recommendations
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Validation error:', error);
    
    // Log error for monitoring
    try {
      const supabase = createClient(cookies());
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, tenant_id')
          .eq('user_id', user.id)
          .single();
          
        if (profile) {
          await supabase.from('audit_log').insert({
            tenant_id: profile.tenant_id,
            user_id: profile.id,
            action: 'EXCEL_VALIDATION_ERROR',
            resource_type: 'excel_import',
            new_values: {
              error: error instanceof Error ? error.message : 'Unknown error',
              processingTime: Date.now() - startTime,
              timestamp: new Date().toISOString()
            }
          });
        }
      }
    } catch (logError) {
      console.error('Failed to log validation error:', logError);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// RECOMMENDATION GENERATOR
// ============================================================================

function generateRecommendations(
  validationResult: any,
  mappings: Record<string, string>,
  userRole: string
): string[] {
  const recommendations: string[] = [];
  const { summary, globalValidations, validatedRows } = validationResult;

  // Data quality recommendations
  if (summary.averageConfidence < 70) {
    recommendations.push(
      'Data quality is below recommended threshold. Review and clean your data before importing.'
    );
  }

  if (summary.invalidRows > summary.totalRows * 0.3) {
    recommendations.push(
      `${Math.round((summary.invalidRows / summary.totalRows) * 100)}% of rows have validation errors. Consider fixing data issues in the source file.`
    );
  }

  // Column mapping recommendations
  const mappedColumns = Object.keys(mappings).filter(key => mappings[key] !== '');
  const requiredMappings = ['area', 'initiative'];
  const missingRequired = requiredMappings.filter(required => 
    !Object.values(mappings).includes(required)
  );

  if (missingRequired.length > 0) {
    recommendations.push(
      `Missing required column mappings: ${missingRequired.join(', ')}. These are essential for proper data import.`
    );
  }

  if (mappedColumns.length < 4) {
    recommendations.push(
      'Consider mapping more columns to get better data insights and tracking capabilities.'
    );
  }

  // Global validation recommendations
  for (const globalValidation of globalValidations) {
    switch (globalValidation.type) {
      case 'duplicate_detection':
        recommendations.push(
          'Duplicate initiatives detected. Review and merge duplicates to avoid data inconsistency.'
        );
        break;
      case 'area_consistency':
        recommendations.push(
          'Area names are inconsistent. Standardize area names to match your organizational structure.'
        );
        break;
      case 'budget_variance':
        if (globalValidation.severity === 'warning') {
          recommendations.push(
            'High budget variances detected. Review financial data accuracy and consider budget adjustments.'
          );
        }
        break;
    }
  }

  // Role-specific recommendations
  if (userRole === 'Manager') {
    const nonAreaRows = validatedRows.filter(row => 
      row.validationResults.some(result => 
        result.field === 'area' && result.code === 'AREA_PERMISSION_DENIED'
      )
    );
    
    if (nonAreaRows.length > 0) {
      recommendations.push(
        `${nonAreaRows.length} rows reference areas outside your permissions. These will be filtered out during import.`
      );
    }
  }

  // Progress tracking recommendations
  const progressIssues = validatedRows.filter(row =>
    row.validationResults.some(result => result.field === 'progress')
  );
  
  if (progressIssues.length > summary.totalRows * 0.2) {
    recommendations.push(
      'Many rows have progress tracking issues. Ensure progress values are between 0-100% and properly formatted.'
    );
  }

  // Template-specific recommendations
  if (!mappings.progress) {
    recommendations.push(
      'No progress column mapped. Consider adding progress tracking for better initiative monitoring.'
    );
  }

  if (!mappings.targetDate && !mappings.deadline) {
    recommendations.push(
      'No deadline column mapped. Adding target dates will improve project planning and tracking.'
    );
  }

  // Performance recommendations
  if (summary.totalRows > 1000) {
    recommendations.push(
      'Large dataset detected. Consider importing data in smaller batches for better performance.'
    );
  }

  // KPI recommendations
  if (!mappings.weight && userRole !== 'Analyst') {
    recommendations.push(
      'No weight factor column mapped. Adding initiative weights will improve KPI calculations and strategic insights.'
    );
  }

  // Ensure we have at least some recommendations
  if (recommendations.length === 0) {
    if (summary.validRows === summary.totalRows) {
      recommendations.push(
        'All data passed validation successfully! You can proceed with confidence to import.'
      );
    } else {
      recommendations.push(
        'Review validation results and fix any errors before importing. Focus on red-highlighted issues first.'
      );
    }
  }

  // Limit recommendations to avoid overwhelming users
  return recommendations.slice(0, 8);
}

// ============================================================================
// LOGGING AND ANALYTICS
// ============================================================================

async function logValidationActivity(
  supabase: any,
  userProfile: any,
  metrics: {
    rowCount: number;
    validRows: number;
    invalidRows: number;
    processingTime: number;
    averageConfidence: number;
  }
): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      tenant_id: userProfile.tenant_id,
      user_id: userProfile.id,
      action: 'EXCEL_VALIDATION',
      resource_type: 'excel_import',
      new_values: {
        rowCount: metrics.rowCount,
        validRows: metrics.validRows,
        invalidRows: metrics.invalidRows,
        successRate: Math.round((metrics.validRows / metrics.rowCount) * 100),
        processingTime: metrics.processingTime,
        averageConfidence: metrics.averageConfidence,
        timestamp: new Date().toISOString()
      }
    });

    // Update validation statistics (for analytics)
    await updateValidationStats(supabase, userProfile.tenant_id, metrics);

  } catch (error) {
    console.error('Failed to log validation activity:', error);
    // Don't throw - logging failures shouldn't break validation
  }
}

async function updateValidationStats(
  supabase: any,
  tenantId: string,
  metrics: any
): Promise<void> {
  try {
    // This could update a statistics table for dashboard analytics
    // For now, just log to audit for future analysis
    await supabase.from('audit_log').insert({
      tenant_id: tenantId,
      action: 'VALIDATION_METRICS',
      resource_type: 'analytics',
      new_values: {
        daily_validation_count: 1,
        daily_row_count: metrics.rowCount,
        daily_success_rate: metrics.validRows / metrics.rowCount,
        average_processing_time: metrics.processingTime,
        date: new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Failed to update validation stats:', error);
  }
}

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Simple health check for validation service
    const { searchParams } = new URL(request.url);
    const check = searchParams.get('check');

    if (check === 'validation-engine') {
      // Test validation engine initialization
      const testEngine = await createValidationEngine('Analyst', 'test-tenant-id');
      
      return NextResponse.json({
        status: 'healthy',
        service: 'excel-validation',
        timestamp: new Date().toISOString(),
        version: '3.0.0'
      });
    }

    return NextResponse.json({
      status: 'healthy',
      service: 'excel-validation',
      endpoints: {
        validate: '/api/excel/validate',
        parse: '/api/excel/parse',
        import: '/api/excel/import'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Health check failed'
      },
      { status: 500 }
    );
  }
}