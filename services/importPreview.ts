import { UnifiedImportProcessor, EntityType } from './unifiedImportProcessor';
import { createClient } from '@/utils/supabase/server';

export interface ImportPreviewResult {
  entityType: EntityType;
  headers: string[];
  rows: any[][];
  totalRows: number;
  warnings: string[];
  errors: string[];
  recommendations: string[];
  sheets?: Array<{
    name: string;
    type: EntityType;
    rowCount: number;
  }>;
}

export interface ValidationReport {
  isValid: boolean;
  errors: Array<{
    row?: number;
    field?: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  statistics: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
  recommendations: string[];
}

export class ImportPreviewService {
  private supabase: any;
  private tenantId: string;
  private userId: string;

  constructor(supabase: any, tenantId: string, userId: string) {
    this.supabase = supabase;
    this.tenantId = tenantId;
    this.userId = userId;
  }

  /**
   * Get preview and validation for import file
   */
  async getPreviewAndValidation(
    fileBuffer: Buffer,
    filename: string,
    contentType: string,
    explicitType?: EntityType
  ): Promise<{
    preview: ImportPreviewResult;
    validation: ValidationReport;
  }> {
    try {
      // Get preview using UnifiedImportProcessor
      const preview = await UnifiedImportProcessor.getPreview(
        fileBuffer,
        contentType,
        explicitType
      );

      // Validate the data
      const validation = await this.validateImportData(
        fileBuffer,
        contentType,
        preview.entityType
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        preview,
        validation
      );

      const previewResult: ImportPreviewResult = {
        entityType: preview.entityType,
        headers: preview.headers,
        rows: preview.rows,
        totalRows: preview.totalRows,
        warnings: preview.warnings || [],
        errors: validation.errors.filter(e => e.severity === 'error').map(e => e.message),
        recommendations,
        sheets: preview.sheets
      };

      return {
        preview: previewResult,
        validation
      };
    } catch (error) {
      throw new Error(
        `Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate import data
   */
  private async validateImportData(
    fileBuffer: Buffer,
    contentType: string,
    entityType: EntityType
  ): Promise<ValidationReport> {
    const errors: ValidationReport['errors'] = [];
    const statistics = {
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      warningRows: 0
    };

    try {
      // Parse the file to get all data
      const processor = new UnifiedImportProcessor(this.supabase, this.tenantId, this.userId);
      const detection = await processor['detectEntityType'](fileBuffer, contentType);
      
      if (entityType === 'mixed') {
        // For mixed imports, validate each sheet separately
        errors.push({
          message: 'Mixed imports detected. Each sheet will be validated separately during processing.',
          severity: 'info'
        });
        return {
          isValid: true,
          errors,
          statistics,
          recommendations: ['Process sheets in order: Areas → Users → Objectives → Initiatives → Activities']
        };
      }

      // Entity-specific validation
      switch (entityType) {
        case 'areas':
          await this.validateAreas(fileBuffer, contentType, errors, statistics);
          break;
        case 'users':
          await this.validateUsers(fileBuffer, contentType, errors, statistics);
          break;
        case 'objectives':
        case 'initiatives':
        case 'activities':
          await this.validateOKREntities(fileBuffer, contentType, entityType, errors, statistics);
          break;
      }
    } catch (error) {
      errors.push({
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }

    const hasErrors = errors.some(e => e.severity === 'error');
    const recommendations = this.generateValidationRecommendations(errors, statistics);

    return {
      isValid: !hasErrors,
      errors,
      statistics,
      recommendations
    };
  }

  /**
   * Validate areas import
   */
  private async validateAreas(
    fileBuffer: Buffer,
    contentType: string,
    errors: ValidationReport['errors'],
    statistics: any
  ): Promise<void> {
    const { AreaImportProcessor } = await import('./areaImportProcessor');
    const processor = new AreaImportProcessor(this.supabase, this.tenantId, this.userId);
    const areas = await processor['parseFile'](fileBuffer, contentType);
    
    statistics.totalRows = areas.length;
    const seenNames = new Set<string>();
    const managerEmails = new Set<string>();

    for (let i = 0; i < areas.length; i++) {
      const area = areas[i];
      const rowNum = i + 2;
      let hasError = false;

      // Check required fields
      if (!area.name) {
        errors.push({
          row: rowNum,
          field: 'name',
          message: `Row ${rowNum}: Area name is required`,
          severity: 'error'
        });
        hasError = true;
      } else if (seenNames.has(area.name.toLowerCase())) {
        errors.push({
          row: rowNum,
          field: 'name',
          message: `Row ${rowNum}: Duplicate area name '${area.name}'`,
          severity: 'error'
        });
        hasError = true;
      }
      seenNames.add(area.name.toLowerCase());

      // Collect manager emails for batch validation
      if (area.manager_email) {
        managerEmails.add(area.manager_email.toLowerCase());
      }

      if (hasError) {
        statistics.errorRows++;
      } else {
        statistics.validRows++;
      }
    }

    // Validate manager existence
    if (managerEmails.size > 0) {
      const { data: existingUsers } = await this.supabase
        .from('user_profiles')
        .select('email')
        .eq('tenant_id', this.tenantId)
        .in('email', Array.from(managerEmails));

      const existingEmails = new Set(
        (existingUsers || []).map((u: any) => u.email.toLowerCase())
      );

      const missingManagers = Array.from(managerEmails).filter(
        email => !existingEmails.has(email)
      );

      if (missingManagers.length > 0) {
        errors.push({
          message: `${missingManagers.length} manager email(s) not found. Placeholder profiles will be created.`,
          severity: 'warning'
        });
        statistics.warningRows += missingManagers.length;
      }
    }
  }

  /**
   * Validate users import
   */
  private async validateUsers(
    fileBuffer: Buffer,
    contentType: string,
    errors: ValidationReport['errors'],
    statistics: any
  ): Promise<void> {
    const { UserImportProcessor } = await import('./userImportProcessor');
    const processor = new UserImportProcessor(this.supabase, this.tenantId, this.userId);
    const users = await processor['parseFile'](fileBuffer, contentType);
    
    statistics.totalRows = users.length;
    const seenEmails = new Set<string>();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const rowNum = i + 2;
      let hasError = false;

      // Check required fields
      if (!user.email) {
        errors.push({
          row: rowNum,
          field: 'email',
          message: `Row ${rowNum}: Email is required`,
          severity: 'error'
        });
        hasError = true;
      } else if (!emailRegex.test(user.email)) {
        errors.push({
          row: rowNum,
          field: 'email',
          message: `Row ${rowNum}: Invalid email format '${user.email}'`,
          severity: 'error'
        });
        hasError = true;
      } else if (seenEmails.has(user.email.toLowerCase())) {
        errors.push({
          row: rowNum,
          field: 'email',
          message: `Row ${rowNum}: Duplicate email '${user.email}'`,
          severity: 'error'
        });
        hasError = true;
      }
      seenEmails.add(user.email.toLowerCase());

      if (!user.full_name) {
        errors.push({
          row: rowNum,
          field: 'full_name',
          message: `Row ${rowNum}: Full name is required`,
          severity: 'error'
        });
        hasError = true;
      }

      // Validate role
      if (!['CEO', 'Admin', 'Manager'].includes(user.role)) {
        errors.push({
          row: rowNum,
          field: 'role',
          message: `Row ${rowNum}: Invalid role '${user.role}'. Must be CEO, Admin, or Manager`,
          severity: 'error'
        });
        hasError = true;
      }

      // Check area assignment for managers
      if (user.role === 'Manager' && user.area_name) {
        const { data: area } = await this.supabase
          .from('areas')
          .select('id')
          .eq('tenant_id', this.tenantId)
          .ilike('name', user.area_name)
          .single();

        if (!area) {
          errors.push({
            row: rowNum,
            field: 'area_name',
            message: `Row ${rowNum}: Area '${user.area_name}' not found for Manager`,
            severity: 'warning'
          });
          statistics.warningRows++;
        }
      }

      if (hasError) {
        statistics.errorRows++;
      } else {
        statistics.validRows++;
      }
    }
  }

  /**
   * Validate OKR entities import
   */
  private async validateOKREntities(
    fileBuffer: Buffer,
    contentType: string,
    entityType: EntityType,
    errors: ValidationReport['errors'],
    statistics: any
  ): Promise<void> {
    const { OKRImportProcessor } = await import('./okrImportProcessor');
    const processor = new OKRImportProcessor(this.supabase, this.tenantId, this.userId, null);
    const entities = await processor['parseFile'](fileBuffer, contentType);
    
    statistics.totalRows = entities.length;

    // Basic validation for OKR entities
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const rowNum = i + 2;
      let hasError = false;

      // Check for required title field
      if (!entity.title && !entity.name) {
        errors.push({
          row: rowNum,
          field: 'title',
          message: `Row ${rowNum}: Title/Name is required`,
          severity: 'error'
        });
        hasError = true;
      }

      // Entity-specific validation
      if (entityType === 'initiatives' && !entity.area) {
        errors.push({
          row: rowNum,
          field: 'area',
          message: `Row ${rowNum}: Area is required for initiatives`,
          severity: 'error'
        });
        hasError = true;
      }

      if (entityType === 'activities' && !entity.initiative) {
        errors.push({
          row: rowNum,
          field: 'initiative',
          message: `Row ${rowNum}: Initiative is required for activities`,
          severity: 'error'
        });
        hasError = true;
      }

      if (hasError) {
        statistics.errorRows++;
      } else {
        statistics.validRows++;
      }
    }

    // Add general warning about relationships
    if (entityType !== 'objectives') {
      errors.push({
        message: `Ensure parent entities (${entityType === 'activities' ? 'initiatives' : 'objectives/areas'}) exist before importing`,
        severity: 'info'
      });
    }
  }

  /**
   * Generate recommendations based on preview and validation
   */
  private generateRecommendations(
    preview: any,
    validation: ValidationReport
  ): string[] {
    const recommendations: string[] = [];

    // Entity-specific recommendations
    switch (preview.entityType) {
      case 'areas':
        recommendations.push('Import areas before importing users to establish manager relationships');
        break;
      case 'users':
        recommendations.push('Ensure areas are imported first if assigning managers to areas');
        break;
      case 'objectives':
        recommendations.push('Import objectives before initiatives to establish relationships');
        break;
      case 'initiatives':
        recommendations.push('Ensure objectives and areas exist before importing initiatives');
        break;
      case 'activities':
        recommendations.push('Import initiatives first, then activities');
        recommendations.push('Consider assigning activities to users for better tracking');
        break;
      case 'mixed':
        recommendations.push('Sheets will be processed in dependency order automatically');
        recommendations.push('Review each sheet individually for data accuracy');
        break;
    }

    // Size-based recommendations
    if (preview.totalRows > 1000) {
      recommendations.push('Large file detected. Import will be processed in batches for optimal performance');
    }

    if (preview.totalRows > 5000) {
      recommendations.push('Consider splitting the file for files over 5000 rows for better error recovery');
    }

    // Validation-based recommendations
    if (validation.statistics.warningRows > 0) {
      recommendations.push(`${validation.statistics.warningRows} rows have warnings. Review and fix if needed`);
    }

    if (validation.statistics.errorRows > 0) {
      recommendations.push(`${validation.statistics.errorRows} rows have errors that must be fixed before import`);
    }

    return recommendations;
  }

  /**
   * Generate validation-specific recommendations
   */
  private generateValidationRecommendations(
    errors: ValidationReport['errors'],
    statistics: any
  ): string[] {
    const recommendations: string[] = [];

    // Check for common issues
    const duplicateErrors = errors.filter(e => e.message.includes('Duplicate'));
    if (duplicateErrors.length > 0) {
      recommendations.push('Remove duplicate entries before importing');
    }

    const missingFieldErrors = errors.filter(e => e.message.includes('required'));
    if (missingFieldErrors.length > 0) {
      recommendations.push('Fill in all required fields marked with *');
    }

    const relationshipWarnings = errors.filter(e => e.message.includes('not found'));
    if (relationshipWarnings.length > 0) {
      recommendations.push('Some relationships reference non-existent entities. They will be created or skipped');
    }

    // Success rate recommendation
    const successRate = statistics.totalRows > 0 
      ? (statistics.validRows / statistics.totalRows) * 100 
      : 0;

    if (successRate < 50 && statistics.totalRows > 0) {
      recommendations.push('Less than 50% of rows are valid. Review the data format and requirements');
    } else if (successRate < 80 && statistics.totalRows > 0) {
      recommendations.push('Some rows have issues. Fix errors before importing for best results');
    } else if (successRate === 100 && statistics.totalRows > 0) {
      recommendations.push('All rows validated successfully. Ready to import!');
    }

    return recommendations;
  }

  /**
   * Get chunked preview for large files
   */
  async getChunkedPreview(
    fileBuffer: Buffer,
    contentType: string,
    chunkSize: number = 100,
    chunkIndex: number = 0
  ): Promise<{
    chunk: any[];
    totalChunks: number;
    totalRows: number;
  }> {
    const preview = await UnifiedImportProcessor.getPreview(fileBuffer, contentType);
    const startIdx = chunkIndex * chunkSize;
    const endIdx = Math.min(startIdx + chunkSize, preview.totalRows);
    
    // For actual implementation, we'd need to parse and return specific chunk
    // This is a simplified version
    return {
      chunk: preview.rows.slice(startIdx, endIdx),
      totalChunks: Math.ceil(preview.totalRows / chunkSize),
      totalRows: preview.totalRows
    };
  }
}