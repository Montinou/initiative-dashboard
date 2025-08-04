/**
 * Advanced Excel Data Validation Engine - Phase 3
 * 
 * Comprehensive validation system for Excel import data with detailed error reporting,
 * intelligent data type detection, and integration with KPI standardization.
 * Maintains backward compatibility with existing SIGA templates.
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { validateKPIData } from '@/lib/kpi/calculator';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ValidationResult {
  field: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  code: string;
  suggestions?: string[];
  originalValue?: any;
  suggestedValue?: any;
}

// Enhanced ValidationError interface for IMPORT-003 integration
export interface ValidationError {
  id: string;
  row: number;
  column: string;
  field: string;
  errorType: 'critical' | 'warning' | 'info';
  category: 'data_type' | 'business_logic' | 'referential_integrity' | 'format' | 'missing_data' | 'duplicate' | 'permission';
  message: string;
  suggestion?: string;
  value?: any;
  suggestedValue?: any;
  code: string;
  context?: {
    relatedFields?: string[];
    dependencies?: string[];
    businessRule?: string;
    expectedFormat?: string;
    validOptions?: string[];
  };
  fixActions?: FixAction[];
  documentation?: {
    title: string;
    description: string;
    examples?: string[];
    learnMoreUrl?: string;
  };
}

export interface FixAction {
  id: string;
  label: string;
  description: string;
  action: 'replace_value' | 'clear_field' | 'apply_default' | 'merge_duplicate' | 'skip_row' | 'custom';
  parameters?: Record<string, any>;
  confidence: number; // 0-100
  previewValue?: any;
}

export interface ValidatedRow {
  rowIndex: number;
  originalData: Record<string, any>;
  mappedData: Record<string, any>;
  validationResults: ValidationResult[];
  validationErrors: ValidationError[]; // Enhanced error details for IMPORT-003
  isValid: boolean;
  confidence: number; // 0-100% confidence in data quality
  hasErrors: boolean;
  hasWarnings: boolean;
  hasInfo: boolean;
}

export interface ValidationContext {
  userRole: string;
  tenantId: string;
  areaId?: string;
  existingAreas: string[];
  existingInitiatives: Array<{ id: string; title: string; area_id: string }>;
  columnMappings: Record<string, string>;
  validationRules: ValidationRules;
}

export interface ValidationRules {
  requireArea: boolean;
  requireProgress: boolean;
  allowNegativeProgress: boolean;
  maxProgress: number;
  requireBudget: boolean;
  maxBudgetVariance: number;
  enforceAreaRestrictions: boolean;
  requiredFields: string[];
  kpiValidation: boolean;
}

export interface GlobalValidation {
  type: 'duplicate_detection' | 'area_consistency' | 'budget_variance' | 'kpi_integrity';
  severity: 'error' | 'warning' | 'info';
  message: string;
  affectedRows: number[];
  suggestions: string[];
}

// ============================================================================
// MAIN VALIDATION ENGINE CLASS
// ============================================================================

export class ExcelValidationEngine {
  private context: ValidationContext;
  private supabase;

  constructor(context: ValidationContext) {
    this.context = context;
    this.supabase = createClient(cookies());
  }

  /**
   * Main validation method - validates all rows and returns comprehensive results
   */
  async validateImportData(
    data: Record<string, any>[],
    columnMappings: Record<string, string>
  ): Promise<{
    validatedRows: ValidatedRow[];
    globalValidations: GlobalValidation[];
    validationErrors: ValidationError[]; // Enhanced errors for IMPORT-003
    summary: {
      totalRows: number;
      validRows: number;
      invalidRows: number;
      warningRows: number;
      infoRows: number;
      criticalErrors: number;
      averageConfidence: number;
      processingTime: number;
      mostCommonErrors: Array<{
        code: string;
        message: string;
        count: number;
        percentage: number;
      }>;
    };
  }> {
    const startTime = Date.now();
    
    try {
      // Update context with current mappings
      this.context.columnMappings = columnMappings;

      // Validate each row individually
      const validatedRows: ValidatedRow[] = [];
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const validatedRow = await this.validateSingleRow(row, i + 1);
        validatedRows.push(validatedRow);
      }

      // Perform global validations
      const globalValidations = await this.performGlobalValidations(validatedRows);

      // Convert validation results to enhanced error format
      const validationErrors = this.convertToValidationErrors(validatedRows, globalValidations);

      // Calculate enhanced summary statistics
      const processingTime = Date.now() - startTime;
      const summary = this.calculateEnhancedValidationSummary(validatedRows, validationErrors, processingTime);

      return {
        validatedRows,
        globalValidations,
        validationErrors,
        summary
      };

    } catch (error) {
      console.error('Validation engine error:', error);
      throw new Error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates a single row of data
   */
  private async validateSingleRow(rowData: Record<string, any>, rowIndex: number): Promise<ValidatedRow> {
    const validationResults: ValidationResult[] = [];
    const mappedData: Record<string, any> = {};
    let confidence = 100;

    // Map data according to column mappings
    for (const [originalColumn, systemField] of Object.entries(this.context.columnMappings)) {
      if (systemField && rowData[originalColumn] !== undefined) {
        mappedData[systemField] = rowData[originalColumn];
      }
    }

    // Validate each mapped field
    for (const [field, value] of Object.entries(mappedData)) {
      const fieldValidations = await this.validateField(field, value, rowIndex);
      validationResults.push(...fieldValidations);
      
      // Reduce confidence based on validation issues
      const errorCount = fieldValidations.filter(v => v.severity === 'error').length;
      const warningCount = fieldValidations.filter(v => v.severity === 'warning').length;
      confidence -= (errorCount * 20) + (warningCount * 5);
    }

    // Validate required fields
    const requiredFieldValidations = this.validateRequiredFields(mappedData, rowIndex);
    validationResults.push(...requiredFieldValidations);

    // Validate cross-field relationships
    const relationshipValidations = await this.validateFieldRelationships(mappedData, rowIndex);
    validationResults.push(...relationshipValidations);

    // KPI-specific validations if enabled
    if (this.context.validationRules.kpiValidation) {
      const kpiValidations = this.validateKPIConsistency(mappedData, rowIndex);
      validationResults.push(...kpiValidations);
    }

    // Weight percentage validation for subtasks
    const weightValidations = this.validateSubtaskWeights(mappedData, rowIndex);
    validationResults.push(...weightValidations);

    // Ensure confidence doesn't go below 0
    confidence = Math.max(0, confidence);

    // Determine if row is valid (no errors)
    const isValid = !validationResults.some(result => result.severity === 'error');

    // Convert validation results to enhanced error format for this row
    const validationErrors = this.convertRowValidationResults(validationResults, rowIndex, rowData);

    // Calculate error type flags
    const hasErrors = validationErrors.some(e => e.errorType === 'critical');
    const hasWarnings = validationErrors.some(e => e.errorType === 'warning');
    const hasInfo = validationErrors.some(e => e.errorType === 'info');

    return {
      rowIndex,
      originalData: rowData,
      mappedData,
      validationResults,
      validationErrors,
      isValid,
      confidence,
      hasErrors,
      hasWarnings,
      hasInfo
    };
  }

  /**
   * Validates individual fields based on their type and constraints
   */
  private async validateField(field: string, value: any, rowIndex: number): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    switch (field) {
      case 'area':
        results.push(...await this.validateAreaField(value, rowIndex));
        break;
      case 'initiative':
        results.push(...this.validateInitiativeField(value, rowIndex));
        break;
      case 'progress':
        results.push(...this.validateProgressField(value, rowIndex));
        break;
      case 'status':
        results.push(...this.validateStatusField(value, rowIndex));
        break;
      case 'budget':
      case 'actualCost':
        results.push(...this.validateCurrencyField(field, value, rowIndex));
        break;
      case 'estimatedHours':
      case 'actualHours':
        results.push(...this.validateHoursField(field, value, rowIndex));
        break;
      case 'targetDate':
        results.push(...this.validateDateField(value, rowIndex));
        break;
      case 'priority':
        results.push(...this.validatePriorityField(value, rowIndex));
        break;
      case 'weight':
        results.push(...this.validateWeightField(value, rowIndex));
        break;
      default:
        // Generic field validation
        results.push(...this.validateGenericField(field, value, rowIndex));
    }

    return results;
  }

  /**
   * Area field validation with intelligent matching
   */
  private async validateAreaField(value: any, rowIndex: number): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    if (!value || typeof value !== 'string') {
      results.push({
        field: 'area',
        severity: 'error',
        message: 'Area field is required and must be text',
        code: 'AREA_REQUIRED',
        originalValue: value,
        suggestions: this.context.existingAreas.slice(0, 3)
      });
      return results;
    }

    const areaName = String(value).trim();
    
    // Check exact match
    const exactMatch = this.context.existingAreas.find(area => 
      area.toLowerCase() === areaName.toLowerCase()
    );

    if (exactMatch) {
      // Perfect match
      return results;
    }

    // Check fuzzy match
    const fuzzyMatch = this.findBestAreaMatch(areaName);
    if (fuzzyMatch.confidence > 0.8) {
      results.push({
        field: 'area',
        severity: 'warning',
        message: `Area "${areaName}" doesn't exactly match existing areas`,
        code: 'AREA_FUZZY_MATCH',
        originalValue: value,
        suggestedValue: fuzzyMatch.match,
        suggestions: [fuzzyMatch.match, ...this.context.existingAreas.slice(0, 2)]
      });
    } else {
      // No good match found
      results.push({
        field: 'area',
        severity: 'error',
        message: `Area "${areaName}" doesn't match any existing areas`,
        code: 'AREA_NOT_FOUND',
        originalValue: value,
        suggestions: this.context.existingAreas.slice(0, 3)
      });
    }

    // Check role-based area restrictions
    if (this.context.validationRules.enforceAreaRestrictions && 
        this.context.userRole === 'Manager' && 
        this.context.areaId) {
      
      const userArea = this.context.existingAreas.find(area => area === this.context.areaId);
      if (userArea && areaName.toLowerCase() !== userArea.toLowerCase()) {
        results.push({
          field: 'area',
          severity: 'error',
          message: 'Managers can only import data for their assigned area',
          code: 'AREA_PERMISSION_DENIED',
          originalValue: value,
          suggestedValue: userArea,
          suggestions: [userArea]
        });
      }
    }

    return results;
  }

  /**
   * Progress field validation with range and format checks
   */
  private validateProgressField(value: any, rowIndex: number): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (value === null || value === undefined || value === '') {
      if (this.context.validationRules.requireProgress) {
        results.push({
          field: 'progress',
          severity: 'error',
          message: 'Progress field is required',
          code: 'PROGRESS_REQUIRED',
          originalValue: value,
          suggestions: ['Enter a value between 0 and 100']
        });
      }
      return results;
    }

    // Convert to number
    let numericValue: number;
    try {
      // Handle percentage format (e.g., "50%" -> 50)
      if (typeof value === 'string' && value.includes('%')) {
        numericValue = parseFloat(value.replace('%', ''));
      } else {
        numericValue = parseFloat(String(value));
      }
    } catch (error) {
      results.push({
        field: 'progress',
        severity: 'error',
        message: 'Progress must be a valid number',
        code: 'PROGRESS_INVALID_FORMAT',
        originalValue: value,
        suggestions: ['Use format: 50 or 50%']
      });
      return results;
    }

    if (isNaN(numericValue)) {
      results.push({
        field: 'progress',
        severity: 'error',
        message: 'Progress must be a valid number',
        code: 'PROGRESS_NOT_NUMERIC',
        originalValue: value,
        suggestions: ['Use format: 50 or 50%']
      });
      return results;
    }

    // Validate range
    if (!this.context.validationRules.allowNegativeProgress && numericValue < 0) {
      results.push({
        field: 'progress',
        severity: 'error',
        message: 'Progress cannot be negative',
        code: 'PROGRESS_NEGATIVE',
        originalValue: value,
        suggestedValue: 0,
        suggestions: ['Use a value between 0 and 100']
      });
    }

    if (numericValue > this.context.validationRules.maxProgress) {
      results.push({
        field: 'progress',
        severity: 'error',
        message: `Progress cannot exceed ${this.context.validationRules.maxProgress}%`,
        code: 'PROGRESS_EXCEEDS_MAX',
        originalValue: value,
        suggestedValue: this.context.validationRules.maxProgress,
        suggestions: [`Maximum allowed: ${this.context.validationRules.maxProgress}%`]
      });
    }

    // Warning for unusual values
    if (numericValue > 100 && numericValue <= this.context.validationRules.maxProgress) {
      results.push({
        field: 'progress',
        severity: 'warning',
        message: 'Progress over 100% is unusual but allowed',
        code: 'PROGRESS_OVER_100',
        originalValue: value,
        suggestions: ['Verify this progress value is correct']
      });
    }

    return results;
  }

  /**
   * Status field validation with standardized values
   */
  private validateStatusField(value: any, rowIndex: number): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!value) return results; // Status is optional

    const statusValue = String(value).trim().toLowerCase();
    const validStatuses = ['planning', 'in_progress', 'completed', 'on_hold', 'cancelled'];
    const statusAliases = {
      'en progreso': 'in_progress',
      'en proceso': 'in_progress',
      'activo': 'in_progress',
      'terminado': 'completed',
      'finalizado': 'completed',
      'completo': 'completed',
      'pausado': 'on_hold',
      'suspendido': 'on_hold',
      'cancelado': 'cancelled',
      'planeando': 'planning',
      'planificación': 'planning'
    };

    // Check direct match
    if (validStatuses.includes(statusValue)) {
      return results;
    }

    // Check aliases (Spanish translations)
    const aliasMatch = statusAliases[statusValue];
    if (aliasMatch) {
      results.push({
        field: 'status',
        severity: 'info',
        message: `Status "${value}" will be converted to "${aliasMatch}"`,
        code: 'STATUS_ALIAS_CONVERSION',
        originalValue: value,
        suggestedValue: aliasMatch,
        suggestions: [aliasMatch]
      });
      return results;
    }

    // No match found
    results.push({
      field: 'status',
      severity: 'warning',
      message: `Unknown status "${value}". Will default to "planning"`,
      code: 'STATUS_UNKNOWN',
      originalValue: value,
      suggestedValue: 'planning',
      suggestions: validStatuses
    });

    return results;
  }

  /**
   * Currency field validation (budget, actualCost)
   */
  private validateCurrencyField(field: string, value: any, rowIndex: number): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!value) {
      if (field === 'budget' && this.context.validationRules.requireBudget) {
        results.push({
          field,
          severity: 'error',
          message: 'Budget field is required',
          code: 'BUDGET_REQUIRED',
          originalValue: value,
          suggestions: ['Enter a monetary value']
        });
      }
      return results;
    }

    // Parse currency value
    let numericValue: number;
    try {
      const cleanValue = String(value)
        .replace(/[$,\s]/g, '') // Remove currency symbols and commas
        .replace(/[^\d.-]/g, ''); // Keep only digits, dots, and dashes
      
      numericValue = parseFloat(cleanValue);
    } catch (error) {
      results.push({
        field,
        severity: 'error',
        message: `${field} must be a valid monetary amount`,
        code: 'CURRENCY_INVALID_FORMAT',
        originalValue: value,
        suggestions: ['Use format: 1000 or $1,000.00']
      });
      return results;
    }

    if (isNaN(numericValue)) {
      results.push({
        field,
        severity: 'error',
        message: `${field} must be a valid number`,
        code: 'CURRENCY_NOT_NUMERIC',
        originalValue: value,
        suggestions: ['Use format: 1000 or $1,000.00']
      });
      return results;
    }

    // Validate positive values
    if (numericValue < 0) {
      results.push({
        field,
        severity: 'warning',
        message: `${field} is negative, which is unusual`,
        code: 'CURRENCY_NEGATIVE',
        originalValue: value,
        suggestions: ['Verify this negative value is correct']
      });
    }

    // Validate reasonable ranges
    if (numericValue > 10000000) { // $10M
      results.push({
        field,
        severity: 'warning',
        message: `${field} amount seems very large`,
        code: 'CURRENCY_VERY_LARGE',
        originalValue: value,
        suggestions: ['Verify this amount is correct']
      });
    }

    return results;
  }

  /**
   * Validates required fields based on rules
   */
  private validateRequiredFields(mappedData: Record<string, any>, rowIndex: number): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (const requiredField of this.context.validationRules.requiredFields) {
      if (!mappedData[requiredField] || 
          (typeof mappedData[requiredField] === 'string' && mappedData[requiredField].trim() === '')) {
        results.push({
          field: requiredField,
          severity: 'error',
          message: `${requiredField} is required but missing`,
          code: 'REQUIRED_FIELD_MISSING',
          originalValue: mappedData[requiredField],
          suggestions: [`Please provide a value for ${requiredField}`]
        });
      }
    }

    return results;
  }

  /**
   * Validates relationships between fields
   */
  private async validateFieldRelationships(mappedData: Record<string, any>, rowIndex: number): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Budget vs Actual Cost relationship
    if (mappedData.budget && mappedData.actualCost) {
      const budget = parseFloat(String(mappedData.budget).replace(/[^0-9.-]/g, ''));
      const actualCost = parseFloat(String(mappedData.actualCost).replace(/[^0-9.-]/g, ''));
      
      if (!isNaN(budget) && !isNaN(actualCost)) {
        const variance = Math.abs(actualCost - budget) / budget;
        
        if (variance > this.context.validationRules.maxBudgetVariance) {
          results.push({
            field: 'actualCost',
            severity: 'warning',
            message: `Actual cost varies significantly from budget (${Math.round(variance * 100)}% difference)`,
            code: 'BUDGET_VARIANCE_HIGH',
            originalValue: mappedData.actualCost,
            suggestions: ['Verify both budget and actual cost values are correct']
          });
        }
      }
    }

    // Estimated vs Actual Hours relationship
    if (mappedData.estimatedHours && mappedData.actualHours) {
      const estimated = parseFloat(String(mappedData.estimatedHours));
      const actual = parseFloat(String(mappedData.actualHours));
      
      if (!isNaN(estimated) && !isNaN(actual) && estimated > 0) {
        const ratio = actual / estimated;
        
        if (ratio > 2.0) {
          results.push({
            field: 'actualHours',
            severity: 'warning',
            message: 'Actual hours are more than double the estimate',
            code: 'HOURS_OVERRUN_HIGH',
            originalValue: mappedData.actualHours,
            suggestions: ['Review time estimates and actual tracking']
          });
        }
      }
    }

    // Progress vs Status consistency
    if (mappedData.progress && mappedData.status) {
      const progress = parseFloat(String(mappedData.progress).replace('%', ''));
      const status = String(mappedData.status).toLowerCase();
      
      if (!isNaN(progress)) {
        if (progress >= 100 && status !== 'completed') {
          results.push({
            field: 'status',
            severity: 'warning',
            message: 'Progress is 100% but status is not "completed"',
            code: 'PROGRESS_STATUS_INCONSISTENT',
            originalValue: mappedData.status,
            suggestedValue: 'completed',
            suggestions: ['Consider changing status to "completed"']
          });
        }
        
        if (progress === 0 && status === 'completed') {
          results.push({
            field: 'progress',
            severity: 'warning',
            message: 'Status is completed but progress is 0%',
            code: 'STATUS_PROGRESS_INCONSISTENT',
            originalValue: mappedData.progress,
            suggestions: ['Update progress to reflect completion or change status']
          });
        }
      }
    }

    return results;
  }

  /**
   * KPI consistency validation
   */
  private validateKPIConsistency(mappedData: Record<string, any>, rowIndex: number): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Use the KPI validation from calculator
    try {
      const kpiErrors = validateKPIData({
        progress: mappedData.progress || 0,
        weight_factor: mappedData.weight || 1.0,
        is_strategic: mappedData.isStrategic || false,
        estimated_hours: mappedData.estimatedHours || 0,
        actual_hours: mappedData.actualHours || 0,
        progress_method: 'manual', // Default for imports
        subtasks: [] // Will be calculated later
      } as any);

      for (const error of kpiErrors) {
        results.push({
          field: 'kpi',
          severity: 'warning',
          message: error,
          code: 'KPI_VALIDATION_WARNING',
          suggestions: ['Review KPI calculation parameters']
        });
      }
    } catch (error) {
      // KPI validation is optional, don't fail import
      console.warn('KPI validation error:', error);
    }

    return results;
  }

  /**
   * Performs global validations across all rows
   */
  private async performGlobalValidations(validatedRows: ValidatedRow[]): Promise<GlobalValidation[]> {
    const globalValidations: GlobalValidation[] = [];

    // Duplicate detection
    const duplicates = this.detectDuplicateInitiatives(validatedRows);
    if (duplicates.length > 0) {
      globalValidations.push({
        type: 'duplicate_detection',
        severity: 'warning',
        message: `Found ${duplicates.length} potential duplicate initiatives`,
        affectedRows: duplicates.map(d => d.rowIndex),
        suggestions: [
          'Review duplicate initiatives and merge if necessary',
          'Ensure initiative names are unique within each area'
        ]
      });
    }

    // Area consistency check
    const areaInconsistencies = this.checkAreaConsistency(validatedRows);
    if (areaInconsistencies.length > 0) {
      globalValidations.push({
        type: 'area_consistency',
        severity: 'warning',
        message: 'Some initiatives reference non-standard area names',
        affectedRows: areaInconsistencies,
        suggestions: [
          'Standardize area names across all initiatives',
          'Use exact area names from system configuration'
        ]
      });
    }

    // Budget variance analysis
    const budgetVariances = this.analyzeBudgetVariances(validatedRows);
    if (budgetVariances.severity !== 'info') {
      globalValidations.push(budgetVariances);
    }

    return globalValidations;
  }

  /**
   * Detects duplicate initiatives
   */
  private detectDuplicateInitiatives(rows: ValidatedRow[]): ValidatedRow[] {
    const seen = new Map<string, ValidatedRow>();
    const duplicates: ValidatedRow[] = [];

    for (const row of rows) {
      if (!row.mappedData.initiative || !row.mappedData.area) continue;
      
      const key = `${row.mappedData.area}:${row.mappedData.initiative}`.toLowerCase();
      
      if (seen.has(key)) {
        duplicates.push(row);
        // Also mark the original as duplicate if not already marked
        const original = seen.get(key)!;
        if (!duplicates.includes(original)) {
          duplicates.push(original);
        }
      } else {
        seen.set(key, row);
      }
    }

    return duplicates;
  }

  /**
   * Checks area name consistency
   */
  private checkAreaConsistency(rows: ValidatedRow[]): number[] {
    const inconsistentRows: number[] = [];
    
    for (const row of rows) {
      if (!row.mappedData.area) continue;
      
      const hasAreaError = row.validationResults.some(result => 
        result.field === 'area' && result.severity === 'error'
      );
      
      if (hasAreaError) {
        inconsistentRows.push(row.rowIndex);
      }
    }

    return inconsistentRows;
  }

  /**
   * Analyzes budget variances across all rows
   */
  private analyzeBudgetVariances(rows: ValidatedRow[]): GlobalValidation {
    const budgetRows = rows.filter(row => 
      row.mappedData.budget && row.mappedData.actualCost
    );

    if (budgetRows.length === 0) {
      return {
        type: 'budget_variance',
        severity: 'info',
        message: 'No budget data available for variance analysis',
        affectedRows: [],
        suggestions: []
      };
    }

    const highVarianceRows = budgetRows.filter(row => {
      const budget = parseFloat(String(row.mappedData.budget).replace(/[^0-9.-]/g, ''));
      const actualCost = parseFloat(String(row.mappedData.actualCost).replace(/[^0-9.-]/g, ''));
      
      if (isNaN(budget) || isNaN(actualCost) || budget === 0) return false;
      
      const variance = Math.abs(actualCost - budget) / budget;
      return variance > 0.25; // 25% variance threshold
    });

    if (highVarianceRows.length > budgetRows.length * 0.3) {
      return {
        type: 'budget_variance',
        severity: 'warning',
        message: `High budget variances detected in ${highVarianceRows.length} of ${budgetRows.length} rows`,
        affectedRows: highVarianceRows.map(row => row.rowIndex),
        suggestions: [
          'Review budget planning and actual cost tracking',
          'Consider revising budget estimates based on historical data'
        ]
      };
    }

    return {
      type: 'budget_variance',
      severity: 'info',
      message: 'Budget variances are within acceptable ranges',
      affectedRows: [],
      suggestions: []
    };
  }

  /**
   * Calculates validation summary statistics
   */
  private calculateValidationSummary(validatedRows: ValidatedRow[]) {
    const totalRows = validatedRows.length;
    const validRows = validatedRows.filter(row => row.isValid).length;
    const invalidRows = totalRows - validRows;
    const warningRows = validatedRows.filter(row => 
      row.validationResults.some(result => result.severity === 'warning')
    ).length;
    
    const averageConfidence = totalRows > 0 
      ? Math.round(validatedRows.reduce((sum, row) => sum + row.confidence, 0) / totalRows)
      : 0;

    return {
      totalRows,
      validRows,
      invalidRows,
      warningRows,
      averageConfidence
    };
  }

  /**
   * Finds the best matching area using fuzzy string matching
   */
  private findBestAreaMatch(input: string): { match: string; confidence: number } {
    let bestMatch = '';
    let bestConfidence = 0;

    for (const area of this.context.existingAreas) {
      const confidence = this.calculateStringConfidence(input.toLowerCase(), area.toLowerCase());
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = area;
      }
    }

    return { match: bestMatch, confidence: bestConfidence };
  }

  /**
   * Calculates string similarity confidence (simple Levenshtein-based)
   */
  private calculateStringConfidence(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Calculates Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,    // deletion
          matrix[j - 1][i] + 1,    // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Generic field validation for unmapped fields
   */
  private validateGenericField(field: string, value: any, rowIndex: number): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Check for common data quality issues
    if (typeof value === 'string') {
      // Check for excessive whitespace
      if (value !== value.trim()) {
        results.push({
          field,
          severity: 'info',
          message: 'Field contains leading/trailing whitespace',
          code: 'WHITESPACE_FOUND',
          originalValue: value,
          suggestedValue: value.trim(),
          suggestions: ['Remove extra whitespace']
        });
      }

      // Check for very long text
      if (value.length > 500) {
        results.push({
          field,
          severity: 'warning',
          message: 'Field contains very long text',
          code: 'TEXT_TOO_LONG',
          originalValue: value,
          suggestions: ['Consider shortening the text or using description field']
        });
      }
    }

    return results;
  }

  /**
   * Validates hours fields
   */
  private validateHoursField(field: string, value: any, rowIndex: number): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!value) return results; // Hours are optional

    const numericValue = parseFloat(String(value));
    
    if (isNaN(numericValue)) {
      results.push({
        field,
        severity: 'error',
        message: `${field} must be a valid number`,
        code: 'HOURS_NOT_NUMERIC',
        originalValue: value,
        suggestions: ['Use format: 40 or 40.5']
      });
      return results;
    }

    if (numericValue < 0) {
      results.push({
        field,
        severity: 'error',
        message: `${field} cannot be negative`,
        code: 'HOURS_NEGATIVE',
        originalValue: value,
        suggestedValue: 0,
        suggestions: ['Use a positive number of hours']
      });
    }

    if (numericValue > 10000) {
      results.push({
        field,
        severity: 'warning',
        message: `${field} seems very high`,
        code: 'HOURS_VERY_HIGH',
        originalValue: value,
        suggestions: ['Verify this hour value is correct']
      });
    }

    return results;
  }

  /**
   * Validates date fields
   */
  private validateDateField(value: any, rowIndex: number): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!value) return results; // Date is optional

    let dateValue: Date;
    try {
      dateValue = new Date(value);
    } catch (error) {
      results.push({
        field: 'targetDate',
        severity: 'error',
        message: 'Invalid date format',
        code: 'DATE_INVALID_FORMAT',
        originalValue: value,
        suggestions: ['Use format: YYYY-MM-DD or MM/DD/YYYY']
      });
      return results;
    }

    if (isNaN(dateValue.getTime())) {
      results.push({
        field: 'targetDate',
        severity: 'error',
        message: 'Invalid date value',
        code: 'DATE_INVALID_VALUE',
        originalValue: value,
        suggestions: ['Use a valid date']
      });
      return results;
    }

    // Check if date is in the past
    const now = new Date();
    if (dateValue < now) {
      results.push({
        field: 'targetDate',
        severity: 'warning',
        message: 'Target date is in the past',
        code: 'DATE_IN_PAST',
        originalValue: value,
        suggestions: ['Consider updating to a future date']
      });
    }

    return results;
  }

  /**
   * Validates priority field
   */
  private validatePriorityField(value: any, rowIndex: number): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!value) return results; // Priority is optional

    const priorityValue = String(value).toLowerCase().trim();
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    const priorityAliases = {
      'bajo': 'low',
      'baja': 'low',
      'medio': 'medium',
      'media': 'medium',
      'alto': 'high',
      'alta': 'high',
      'crítico': 'critical',
      'critico': 'critical',
      'urgente': 'critical'
    };

    if (validPriorities.includes(priorityValue)) {
      return results;
    }

    const aliasMatch = priorityAliases[priorityValue];
    if (aliasMatch) {
      results.push({
        field: 'priority',
        severity: 'info',
        message: `Priority "${value}" will be converted to "${aliasMatch}"`,
        code: 'PRIORITY_ALIAS_CONVERSION',
        originalValue: value,
        suggestedValue: aliasMatch,
        suggestions: [aliasMatch]
      });
      return results;
    }

    results.push({
      field: 'priority',
      severity: 'warning',
      message: `Unknown priority "${value}". Will default to "medium"`,
      code: 'PRIORITY_UNKNOWN',
      originalValue: value,
      suggestedValue: 'medium',
      suggestions: validPriorities
    });

    return results;
  }

  /**
   * Validates weight field
   */
  private validateWeightField(value: any, rowIndex: number): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!value) return results; // Weight is optional, will default to 1.0

    const numericValue = parseFloat(String(value));
    
    if (isNaN(numericValue)) {
      results.push({
        field: 'weight',
        severity: 'error',
        message: 'Weight must be a valid number',
        code: 'WEIGHT_NOT_NUMERIC',
        originalValue: value,
        suggestions: ['Use format: 1.0 or 2.5']
      });
      return results;
    }

    if (numericValue < 0.1 || numericValue > 3.0) {
      results.push({
        field: 'weight',
        severity: 'error',
        message: 'Weight must be between 0.1 and 3.0',
        code: 'WEIGHT_OUT_OF_RANGE',
        originalValue: value,
        suggestedValue: Math.max(0.1, Math.min(3.0, numericValue)),
        suggestions: ['Use a value between 0.1 and 3.0']
      });
    }

    return results;
  }

  /**
   * Validates initiative field
   */
  private validateInitiativeField(value: any, rowIndex: number): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!value || (typeof value === 'string' && value.trim() === '')) {
      results.push({
        field: 'initiative',
        severity: 'error',
        message: 'Initiative/objective field is required',
        code: 'INITIATIVE_REQUIRED',
        originalValue: value,
        suggestions: ['Provide a clear, descriptive initiative name']
      });
      return results;
    }

    const initiativeText = String(value).trim();
    
    // Check minimum length
    if (initiativeText.length < 5) {
      results.push({
        field: 'initiative',
        severity: 'warning',
        message: 'Initiative name is very short',
        code: 'INITIATIVE_TOO_SHORT',
        originalValue: value,
        suggestions: ['Provide a more descriptive initiative name']
      });
    }

    // Check maximum length
    if (initiativeText.length > 200) {
      results.push({
        field: 'initiative',
        severity: 'warning',
        message: 'Initiative name is very long',
        code: 'INITIATIVE_TOO_LONG',
        originalValue: value,
        suggestions: ['Consider shortening the initiative name']
      });
    }

    // Check for potential duplicates in existing initiatives
    const potentialDuplicate = this.context.existingInitiatives.find(existing => 
      this.calculateStringConfidence(
        initiativeText.toLowerCase(), 
        existing.title.toLowerCase()
      ) > 0.85
    );

    if (potentialDuplicate) {
      results.push({
        field: 'initiative',
        severity: 'warning',
        message: `Similar initiative already exists: "${potentialDuplicate.title}"`,
        code: 'INITIATIVE_POTENTIAL_DUPLICATE',
        originalValue: value,
        suggestions: [
          'Verify this is not a duplicate',
          'Consider updating the existing initiative instead'
        ]
      });
    }

    return results;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Creates a validation engine with proper context from request data
 */
export async function createValidationEngine(
  userRole: string,
  tenantId: string,
  areaId?: string
): Promise<ExcelValidationEngine> {
  const supabase = createClient(cookies());

  // Fetch existing areas
  const { data: areas } = await supabase
    .from('areas')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  // Fetch existing initiatives
  const { data: initiatives } = await supabase
    .from('initiatives')
    .select('id, title, area_id')
    .eq('tenant_id', tenantId)
    .limit(1000); // Reasonable limit for duplicate detection

  // Build validation rules based on role
  const validationRules: ValidationRules = {
    requireArea: true,
    requireProgress: false,
    allowNegativeProgress: false,
    maxProgress: 150, // Allow some over-completion
    requireBudget: userRole === 'CEO' || userRole === 'Admin',
    maxBudgetVariance: 0.5, // 50% variance threshold
    enforceAreaRestrictions: userRole === 'Manager',
    requiredFields: ['area', 'initiative'],
    kpiValidation: true
  };

  const context: ValidationContext = {
    userRole,
    tenantId,
    areaId,
    existingAreas: areas?.map(area => area.name) || [],
    existingInitiatives: initiatives || [],
    columnMappings: {},
    validationRules
  };

  return new ExcelValidationEngine(context);
}

// ============================================================================
// ENHANCED VALIDATION METHODS FOR IMPORT-003
// ============================================================================

/**
 * Enhanced validation methods for comprehensive error reporting and categorization
 */
declare module './validation-engine' {
  namespace ExcelValidationEngine {
    interface ExcelValidationEngine {
      convertToValidationErrors(validatedRows: ValidatedRow[], globalValidations: GlobalValidation[]): ValidationError[];
      convertRowValidationResults(results: ValidationResult[], rowIndex: number, originalData: Record<string, any>): ValidationError[];
      calculateEnhancedValidationSummary(validatedRows: ValidatedRow[], validationErrors: ValidationError[], processingTime: number): any;
      validateSubtaskWeights(mappedData: Record<string, any>, rowIndex: number): ValidationResult[];
      generateFixActions(error: ValidationResult, field: string, value: any): FixAction[];
      categorizeError(field: string, code: string): string;
      getErrorDocumentation(code: string): any;
    }
  }
}

ExcelValidationEngine.prototype.convertToValidationErrors = function(
  validatedRows: ValidatedRow[], 
  globalValidations: GlobalValidation[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Convert global validations
  globalValidations.forEach((validation, index) => {
    errors.push({
      id: `global-${index}`,
      row: 0, // Global errors don't belong to a specific row
      column: '',
      field: validation.type,
      errorType: validation.severity as 'critical' | 'warning' | 'info',
      category: this.categorizeError(validation.type, validation.type),
      message: validation.message,
      suggestion: validation.suggestions?.[0],
      code: validation.type.toUpperCase(),
      context: {
        dependencies: validation.affectedRows?.map(r => `Row ${r}`) || []
      },
      documentation: this.getErrorDocumentation(validation.type)
    });
  });
  
  // Convert row validations
  validatedRows.forEach(row => {
    row.validationErrors.forEach(error => {
      errors.push(error);
    });
  });
  
  return errors;
};

ExcelValidationEngine.prototype.convertRowValidationResults = function(
  results: ValidationResult[], 
  rowIndex: number, 
  originalData: Record<string, any>
): ValidationError[] {
  return results.map((result, index) => {
    const column = this.findOriginalColumn(result.field, originalData);
    
    return {
      id: `row-${rowIndex}-${index}`,
      row: rowIndex,
      column: column || result.field,
      field: result.field,
      errorType: result.severity as 'critical' | 'warning' | 'info',
      category: this.categorizeError(result.field, result.code),
      message: result.message,
      suggestion: result.suggestions?.[0],
      value: result.originalValue,
      suggestedValue: result.suggestedValue,
      code: result.code,
      context: this.getErrorContext(result.field, result.code),
      fixActions: this.generateFixActions(result, result.field, result.originalValue),
      documentation: this.getErrorDocumentation(result.code)
    };
  });
};

ExcelValidationEngine.prototype.calculateEnhancedValidationSummary = function(
  validatedRows: ValidatedRow[], 
  validationErrors: ValidationError[], 
  processingTime: number
) {
  const totalRows = validatedRows.length;
  const validRows = validatedRows.filter(row => row.isValid).length;
  const invalidRows = totalRows - validRows;
  const warningRows = validatedRows.filter(row => row.hasWarnings).length;
  const infoRows = validatedRows.filter(row => row.hasInfo).length;
  const criticalErrors = validationErrors.filter(e => e.errorType === 'critical').length;
  
  const averageConfidence = totalRows > 0 
    ? Math.round(validatedRows.reduce((sum, row) => sum + row.confidence, 0) / totalRows)
    : 0;

  // Calculate most common errors
  const errorCounts = new Map<string, { message: string; count: number }>();
  validationErrors.forEach(error => {
    const existing = errorCounts.get(error.code) || { message: error.message, count: 0 };
    errorCounts.set(error.code, { ...existing, count: existing.count + 1 });
  });

  const mostCommonErrors = Array.from(errorCounts.entries())
    .map(([code, { message, count }]) => ({
      code,
      message,
      count,
      percentage: (count / validationErrors.length) * 100
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalRows,
    validRows,
    invalidRows,
    warningRows,
    infoRows,
    criticalErrors,
    averageConfidence,
    processingTime,
    mostCommonErrors
  };
};

ExcelValidationEngine.prototype.validateSubtaskWeights = function(
  mappedData: Record<string, any>, 
  rowIndex: number
): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  // Check if this row has subtask weight information
  if (mappedData.subtaskWeights && Array.isArray(mappedData.subtaskWeights)) {
    const totalWeight = mappedData.subtaskWeights.reduce((sum: number, weight: number) => sum + weight, 0);
    
    if (totalWeight > 100) {
      results.push({
        field: 'subtaskWeights',
        severity: 'error',
        message: `Subtask weights sum to ${totalWeight}%, which exceeds 100%`,
        code: 'SUBTASK_WEIGHTS_EXCEED_100',
        originalValue: mappedData.subtaskWeights,
        suggestions: ['Adjust weights so they sum to 100% or less']
      });
    } else if (totalWeight < 50 && mappedData.subtaskWeights.length > 1) {
      results.push({
        field: 'subtaskWeights',
        severity: 'warning',
        message: `Subtask weights sum to only ${totalWeight}%, which seems low`,
        code: 'SUBTASK_WEIGHTS_LOW',
        originalValue: mappedData.subtaskWeights,
        suggestions: ['Verify subtask weights are complete']
      });
    }
  }
  
  return results;
};

ExcelValidationEngine.prototype.generateFixActions = function(
  error: ValidationResult, 
  field: string, 
  value: any
): FixAction[] {
  const actions: FixAction[] = [];
  
  switch (error.code) {
    case 'AREA_NOT_FOUND':
      actions.push({
        id: 'replace_with_suggested',
        label: 'Use Suggested Area',
        description: 'Replace with the closest matching area',
        action: 'replace_value',
        confidence: 85,
        previewValue: error.suggestedValue,
        parameters: { newValue: error.suggestedValue }
      });
      break;
      
    case 'PROGRESS_EXCEEDS_MAX':
      actions.push({
        id: 'cap_at_maximum',
        label: 'Cap at Maximum',
        description: 'Set progress to the maximum allowed value',
        action: 'replace_value',
        confidence: 90,
        previewValue: error.suggestedValue,
        parameters: { newValue: error.suggestedValue }
      });
      break;
      
    case 'REQUIRED_FIELD_MISSING':
      actions.push({
        id: 'apply_default',
        label: 'Apply Default Value',
        description: 'Use a sensible default value for this field',
        action: 'apply_default',
        confidence: 70,
        previewValue: this.getDefaultValue(field),
        parameters: { defaultValue: this.getDefaultValue(field) }
      });
      break;
      
    case 'PROGRESS_INVALID_FORMAT':
      actions.push({
        id: 'parse_percentage',
        label: 'Parse as Percentage',
        description: 'Convert text to numeric percentage',
        action: 'replace_value',
        confidence: 80,
        previewValue: this.parsePercentage(value),
        parameters: { newValue: this.parsePercentage(value) }
      });
      break;
  }
  
  // Always add skip option for non-critical errors
  if (error.severity !== 'error') {
    actions.push({
      id: 'skip_row',
      label: 'Skip This Row',
      description: 'Exclude this row from import',
      action: 'skip_row',
      confidence: 100,
      parameters: { skip: true }
    });
  }
  
  return actions;
};

ExcelValidationEngine.prototype.categorizeError = function(field: string, code: string): string {
  // Map error codes to categories
  const categoryMappings: Record<string, string> = {
    'AREA_NOT_FOUND': 'referential_integrity',
    'AREA_PERMISSION_DENIED': 'permission',
    'PROGRESS_INVALID_FORMAT': 'format',
    'PROGRESS_NOT_NUMERIC': 'data_type',
    'PROGRESS_EXCEEDS_MAX': 'business_logic',
    'REQUIRED_FIELD_MISSING': 'missing_data',
    'INITIATIVE_POTENTIAL_DUPLICATE': 'duplicate',
    'CURRENCY_INVALID_FORMAT': 'format',
    'DATE_INVALID_FORMAT': 'format',
    'STATUS_UNKNOWN': 'data_type',
    'SUBTASK_WEIGHTS_EXCEED_100': 'business_logic'
  };
  
  return categoryMappings[code] || 'data_type';
};

ExcelValidationEngine.prototype.getErrorDocumentation = function(code: string) {
  const documentation: Record<string, any> = {
    'AREA_NOT_FOUND': {
      title: 'Area Reference Error',
      description: 'The specified area does not exist in the system',
      examples: ['Sales', 'Marketing', 'Operations'],
      learnMoreUrl: '/docs/areas'
    },
    'PROGRESS_INVALID_FORMAT': {
      title: 'Progress Format Error',
      description: 'Progress values must be numeric percentages',
      examples: ['50', '75%', '100'],
      learnMoreUrl: '/docs/progress-tracking'
    },
    'SUBTASK_WEIGHTS_EXCEED_100': {
      title: 'Subtask Weight Validation',
      description: 'Subtask weights cannot exceed 100% total',
      examples: ['25, 25, 25, 25', '30, 40, 30'],
      learnMoreUrl: '/docs/subtask-weighting'
    }
  };
  
  return documentation[code];
};

ExcelValidationEngine.prototype.getErrorContext = function(field: string, code: string) {
  const contexts: Record<string, any> = {
    'PROGRESS_EXCEEDS_MAX': {
      businessRule: 'Progress cannot exceed the configured maximum percentage',
      expectedFormat: 'Numeric value between 0 and 150',
      relatedFields: ['status', 'completionDate']
    },
    'AREA_NOT_FOUND': {
      businessRule: 'All initiatives must be assigned to valid areas',
      dependencies: ['User area access permissions'],
      validOptions: this.context.existingAreas
    }
  };
  
  return contexts[code];
};

ExcelValidationEngine.prototype.findOriginalColumn = function(
  systemField: string, 
  originalData: Record<string, any>
): string | null {
  for (const [originalColumn, mappedField] of Object.entries(this.context.columnMappings)) {
    if (mappedField === systemField) {
      return originalColumn;
    }
  }
  return null;
};

ExcelValidationEngine.prototype.getDefaultValue = function(field: string): any {
  const defaults: Record<string, any> = {
    'status': 'planning',
    'priority': 'medium',
    'progress': 0,
    'weight': 1.0
  };
  
  return defaults[field] || '';
};

ExcelValidationEngine.prototype.parsePercentage = function(value: any): number {
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return typeof value === 'number' ? value : 0;
};