import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { UserImportProcessor } from './userImportProcessor';
import { AreaImportProcessor } from './areaImportProcessor';
import { OKRImportProcessor } from './okrImportProcessor';
import { createClient } from '@/utils/supabase/server';

export type EntityType = 'areas' | 'users' | 'objectives' | 'initiatives' | 'activities' | 'mixed';

export interface UnifiedImportResult {
  entityType: EntityType;
  results: any;
  warnings: string[];
  importOrder?: string[];
}

interface EntityDetectionResult {
  type: EntityType;
  confidence: number;
  headers: string[];
  warnings: string[];
}

export class UnifiedImportProcessor {
  private supabase: any;
  private tenantId: string;
  private userId: string;

  constructor(supabase: any, tenantId: string, userId: string) {
    this.supabase = supabase;
    this.tenantId = tenantId;
    this.userId = userId;
  }

  /**
   * Process import with automatic entity detection
   */
  async processImport(
    fileBuffer: Buffer,
    filename: string,
    contentType: string,
    objectPath: string,
    explicitType?: EntityType
  ): Promise<UnifiedImportResult> {
    // If type is explicitly provided, use it
    if (explicitType && explicitType !== 'mixed') {
      return this.processSpecificEntity(fileBuffer, filename, contentType, objectPath, explicitType);
    }

    // Auto-detect entity type
    const detection = await this.detectEntityType(fileBuffer, contentType);
    
    if (detection.confidence < 0.6 && !explicitType) {
      throw new Error(
        `Could not confidently determine entity type (confidence: ${(detection.confidence * 100).toFixed(0)}%). ` +
        `Detected as '${detection.type}'. Please specify the entity type explicitly.`
      );
    }

    const warnings = detection.warnings;

    // Handle mixed imports (Excel with multiple sheets)
    if (detection.type === 'mixed') {
      return this.processMixedImport(fileBuffer, filename, contentType, objectPath);
    }

    // Process single entity type
    const result = await this.processSpecificEntity(
      fileBuffer, 
      filename, 
      contentType, 
      objectPath, 
      detection.type
    );

    return {
      ...result,
      warnings: [...warnings, ...(result.warnings || [])]
    };
  }

  /**
   * Detect entity type from file headers
   */
  private async detectEntityType(
    fileBuffer: Buffer,
    contentType: string
  ): Promise<EntityDetectionResult> {
    const warnings: string[] = [];

    // Check for Excel with multiple sheets
    if (contentType.includes('spreadsheet') || contentType.includes('excel')) {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      if (workbook.SheetNames.length > 1) {
        // Check if sheets match our entity types
        const entitySheets = this.identifyEntitySheets(workbook.SheetNames);
        if (entitySheets.length > 1) {
          return {
            type: 'mixed',
            confidence: 1.0,
            headers: [],
            warnings: [`File contains ${entitySheets.length} entity sheets: ${entitySheets.join(', ')}`]
          };
        }
      }

      // Single sheet Excel - get headers from first sheet
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (data.length > 0) {
        const headers = (data[0] as any[]).map(h => String(h).toLowerCase());
        return this.identifyEntityFromHeaders(headers);
      }
    }

    // CSV file
    if (contentType.includes('csv')) {
      const records = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        max_record_size: 1024,
        to_line: 1 // Only parse first line for headers
      });

      if (records.length > 0) {
        const headers = Object.keys(records[0]).map(h => h.toLowerCase());
        return this.identifyEntityFromHeaders(headers);
      }
    }

    return {
      type: 'objectives',
      confidence: 0,
      headers: [],
      warnings: ['Could not detect entity type from file']
    };
  }

  /**
   * Identify entity type from headers
   */
  private identifyEntityFromHeaders(headers: string[]): EntityDetectionResult {
    const headerSet = new Set(headers);
    const warnings: string[] = [];

    // Define signature headers for each entity type
    const signatures = {
      areas: {
        required: ['name'],
        optional: ['description', 'manager_email', 'manager', 'is_active'],
        confidence: 0
      },
      users: {
        required: ['email', 'full_name'],
        optional: ['role', 'area_name', 'area', 'phone', 'is_active'],
        confidence: 0
      },
      objectives: {
        required: ['title'],
        optional: ['description', 'area', 'area_name', 'start_date', 'end_date', 'priority', 'status'],
        confidence: 0
      },
      initiatives: {
        required: ['title', 'area'],
        optional: ['description', 'objective', 'start_date', 'due_date', 'progress', 'status'],
        confidence: 0
      },
      activities: {
        required: ['title', 'initiative'],
        optional: ['description', 'assigned_to', 'is_completed', 'completed'],
        confidence: 0
      }
    };

    // Calculate confidence scores
    for (const [entityType, sig] of Object.entries(signatures)) {
      let score = 0;
      let maxScore = 0;

      // Check required fields
      for (const field of sig.required) {
        maxScore += 2; // Required fields worth more
        if (headerSet.has(field) || headerSet.has(field.replace('_', ' '))) {
          score += 2;
        }
      }

      // Check optional fields
      for (const field of sig.optional) {
        maxScore += 1;
        if (headerSet.has(field) || headerSet.has(field.replace('_', ' '))) {
          score += 1;
        }
      }

      sig.confidence = maxScore > 0 ? score / maxScore : 0;
    }

    // Find best match
    let bestMatch: EntityType = 'objectives';
    let bestConfidence = 0;

    for (const [entityType, sig] of Object.entries(signatures)) {
      if (sig.confidence > bestConfidence) {
        bestConfidence = sig.confidence;
        bestMatch = entityType as EntityType;
      }
    }

    // Check for ambiguous detection
    const highConfidenceMatches = Object.entries(signatures)
      .filter(([_, sig]) => sig.confidence >= 0.6)
      .map(([type, _]) => type);

    if (highConfidenceMatches.length > 1) {
      warnings.push(
        `Headers match multiple entity types: ${highConfidenceMatches.join(', ')}. ` +
        `Using '${bestMatch}' with ${(bestConfidence * 100).toFixed(0)}% confidence.`
      );
    }

    return {
      type: bestMatch,
      confidence: bestConfidence,
      headers,
      warnings
    };
  }

  /**
   * Identify entity sheets in Excel workbook
   */
  private identifyEntitySheets(sheetNames: string[]): string[] {
    const entityTypes = ['areas', 'users', 'objectives', 'initiatives', 'activities'];
    return sheetNames.filter(name => 
      entityTypes.some(type => 
        name.toLowerCase().includes(type) || 
        type.includes(name.toLowerCase())
      )
    );
  }

  /**
   * Process specific entity type
   */
  private async processSpecificEntity(
    fileBuffer: Buffer,
    filename: string,
    contentType: string,
    objectPath: string,
    entityType: EntityType
  ): Promise<UnifiedImportResult> {
    let result: any;
    const warnings: string[] = [];

    switch (entityType) {
      case 'areas':
        const areaProcessor = new AreaImportProcessor(this.supabase, this.tenantId, this.userId);
        result = await areaProcessor.processImport(fileBuffer, filename, contentType, objectPath);
        break;

      case 'users':
        const userProcessor = new UserImportProcessor(this.supabase, this.tenantId, this.userId);
        result = await userProcessor.processImport(fileBuffer, filename, contentType, objectPath);
        break;

      case 'objectives':
      case 'initiatives':
      case 'activities':
        const okrProcessor = new OKRImportProcessor(this.supabase, this.tenantId, this.userId, null);
        result = await okrProcessor.processImport(fileBuffer, filename, contentType, objectPath);
        if (entityType !== 'objectives') {
          warnings.push(
            `Processing as OKR import. Make sure ${entityType} are properly linked to their parent entities.`
          );
        }
        break;

      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }

    return {
      entityType,
      results: result,
      warnings
    };
  }

  /**
   * Process mixed import (Excel with multiple entity sheets)
   */
  private async processMixedImport(
    fileBuffer: Buffer,
    filename: string,
    contentType: string,
    objectPath: string
  ): Promise<UnifiedImportResult> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const results: any = {};
    const warnings: string[] = [];
    const importOrder: string[] = [];

    // Define processing order (dependencies first)
    const processingOrder = ['areas', 'users', 'objectives', 'initiatives', 'activities'];
    
    // Identify and sort sheets
    const sheetsToProcess: Array<{ name: string; type: EntityType }> = [];
    
    for (const sheetName of workbook.SheetNames) {
      const sheetNameLower = sheetName.toLowerCase();
      
      for (const entityType of processingOrder) {
        if (sheetNameLower.includes(entityType) || entityType.includes(sheetNameLower)) {
          sheetsToProcess.push({ name: sheetName, type: entityType as EntityType });
          break;
        }
      }
    }

    // Sort by processing order
    sheetsToProcess.sort((a, b) => 
      processingOrder.indexOf(a.type) - processingOrder.indexOf(b.type)
    );

    // Process each sheet
    for (const { name, type } of sheetsToProcess) {
      try {
        warnings.push(`Processing sheet '${name}' as ${type}...`);
        importOrder.push(type);

        // Convert sheet to CSV buffer
        const worksheet = workbook.Sheets[name];
        const csvData = XLSX.utils.sheet_to_csv(worksheet);
        const sheetBuffer = Buffer.from(csvData);

        // Process using appropriate processor
        const sheetResult = await this.processSpecificEntity(
          sheetBuffer,
          `${filename}_${name}`,
          'text/csv',
          `${objectPath}_${name}`,
          type
        );

        results[type] = sheetResult.results;
        warnings.push(
          `${type}: Processed ${sheetResult.results.totalRows || 0} rows, ` +
          `${sheetResult.results.successRows || 0} success, ` +
          `${sheetResult.results.errorRows || 0} errors`
        );
      } catch (error) {
        const errorMsg = `Failed to process sheet '${name}': ${error instanceof Error ? error.message : 'Unknown error'}`;
        warnings.push(errorMsg);
        results[type] = { error: errorMsg };
      }
    }

    return {
      entityType: 'mixed',
      results,
      warnings,
      importOrder
    };
  }

  /**
   * Get preview for any file type
   */
  static async getPreview(
    fileBuffer: Buffer,
    contentType: string,
    explicitType?: EntityType
  ): Promise<{
    entityType: EntityType;
    headers: string[];
    rows: any[];
    totalRows: number;
    warnings: string[];
    sheets?: Array<{ name: string; type: EntityType; rowCount: number }>;
  }> {
    const processor = new UnifiedImportProcessor(null as any, '', '');
    const detection = await processor.detectEntityType(fileBuffer, contentType);
    const entityType = explicitType || detection.type;

    if (entityType === 'mixed') {
      // Preview for Excel with multiple sheets
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheets: Array<{ name: string; type: EntityType; rowCount: number }> = [];
      
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        const sheetType = processor.identifyEntitySheets([sheetName])[0] as EntityType || 'objectives';
        sheets.push({
          name: sheetName,
          type: sheetType,
          rowCount: data.length
        });
      }

      return {
        entityType: 'mixed',
        headers: [],
        rows: [],
        totalRows: sheets.reduce((sum, s) => sum + s.rowCount, 0),
        warnings: detection.warnings,
        sheets
      };
    }

    // Preview for single entity type
    switch (entityType) {
      case 'areas':
        const areaPreview = await AreaImportProcessor.getPreview(fileBuffer, contentType);
        return {
          entityType,
          ...areaPreview,
          warnings: detection.warnings
        };

      case 'users':
        const userPreview = await UserImportProcessor.getPreview(fileBuffer, contentType);
        return {
          entityType,
          ...userPreview,
          warnings: detection.warnings
        };

      default:
        // For OKR entities, use a simplified preview
        const okrProcessor = new OKRImportProcessor(null as any, '', '', null);
        const entities = await okrProcessor['parseFile'](fileBuffer, contentType);
        const headers = Object.keys(entities[0] || {});
        const rows = entities.slice(0, 10).map((e: any) => 
          headers.map(h => e[h] || '')
        );
        
        return {
          entityType,
          headers,
          rows,
          totalRows: entities.length,
          warnings: detection.warnings
        };
    }
  }
}