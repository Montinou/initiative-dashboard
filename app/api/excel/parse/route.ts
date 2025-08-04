/**
 * Excel Parsing API Endpoint - Phase 3
 * 
 * Handles Excel file parsing for the import wizard with advanced error handling
 * and backward compatibility with existing SIGA templates.
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface ParsedExcelData {
  headers: string[];
  rows: Record<string, any>[];
  sheetNames: string[];
  metadata: {
    filename: string;
    fileSize: number;
    rowCount: number;
    columnCount: number;
    templateType: 'siga_standard' | 'okr_template' | 'custom' | 'unknown';
    encoding: string;
    hasFormulas: boolean;
  };
}

interface ParseResult {
  success: boolean;
  data?: ParsedExcelData;
  error?: string;
  warnings?: string[];
}

// ============================================================================
// TEMPLATE DETECTION PATTERNS
// ============================================================================

const TEMPLATE_PATTERNS = {
  siga_standard: {
    required_headers: ['área', 'objetivo clave', '% avance'],
    optional_headers: ['obstáculos', 'potenciadores', 'estado'],
    confidence_threshold: 0.7
  },
  okr_template: {
    required_headers: ['area', 'objective', 'progress'],
    optional_headers: ['status', 'budget', 'actual cost'],
    confidence_threshold: 0.7
  },
  enhanced_kpi: {
    required_headers: ['area', 'initiative', 'progress'],
    optional_headers: ['weight factor', 'kpi category', 'estimated hours'],
    confidence_threshold: 0.6
  }
};

// ============================================================================
// MAIN PARSE HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const parseOnly = formData.get('parseOnly') === 'true';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unsupported file type. Please upload an Excel (.xlsx, .xls) or CSV file.' 
        },
        { status: 400 }
      );
    }

    // File size validation (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { 
          success: false, 
          error: `File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit` 
        },
        { status: 400 }
      );
    }

    // Parse the Excel file
    const parseResult = await parseExcelFile(file);

    if (!parseResult.success) {
      return NextResponse.json(parseResult, { status: 400 });
    }

    // Log parsing activity
    await logParsingActivity(supabase, user.id, {
      filename: file.name,
      fileSize: file.size,
      rowCount: parseResult.data!.rows.length,
      templateType: parseResult.data!.metadata.templateType,
      parseOnly
    });

    return NextResponse.json(parseResult);

  } catch (error) {
    console.error('Excel parsing error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to parse Excel file',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// EXCEL PARSING LOGIC
// ============================================================================

async function parseExcelFile(file: File): Promise<ParseResult> {
  try {
    const warnings: string[] = [];
    
    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse with XLSX
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { 
        type: 'buffer',
        cellText: false,
        cellFormula: true,
        cellHTML: false,
        cellNF: false,
        cellDates: true,
        dateNF: 'yyyy-mm-dd'
      });
    } catch (xlsxError) {
      // Try as CSV if XLSX parsing fails
      if (file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv')) {
        return parseCSVFile(buffer, file.name);
      }
      throw new Error(`Failed to parse Excel file: ${xlsxError.message}`);
    }

    // Get sheet names
    const sheetNames = workbook.SheetNames;
    if (sheetNames.length === 0) {
      return {
        success: false,
        error: 'No worksheets found in the Excel file'
      };
    }

    // Find the main data sheet (prioritize certain names)
    const dataSheet = findDataSheet(workbook, sheetNames);
    if (!dataSheet) {
      return {
        success: false,
        error: 'No data found in any worksheet'
      };
    }

    // Convert sheet to JSON
    const jsonData = XLSX.utils.sheet_to_json(dataSheet.sheet, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: false,
      dateNF: 'yyyy-mm-dd'
    }) as any[][];

    if (jsonData.length === 0) {
      return {
        success: false,
        error: 'The selected worksheet is empty'
      };
    }

    // Extract headers and data rows
    const headers = jsonData[0] as string[];
    const dataRows = jsonData.slice(1);

    // Clean and normalize headers
    const cleanedHeaders = headers.map(header => 
      String(header).trim().replace(/\s+/g, ' ')
    ).filter(header => header !== '');

    if (cleanedHeaders.length === 0) {
      return {
        success: false,
        error: 'No valid column headers found'
      };
    }

    // Convert rows to objects
    const rows: Record<string, any>[] = dataRows
      .filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined))
      .map((row, index) => {
        const rowObject: Record<string, any> = {};
        cleanedHeaders.forEach((header, colIndex) => {
          const cellValue = row[colIndex];
          rowObject[header] = cellValue !== undefined && cellValue !== null ? cellValue : '';
        });
        return rowObject;
      });

    // Detect template type
    const templateType = detectTemplateType(cleanedHeaders);
    
    // Check for formulas
    const hasFormulas = checkForFormulas(dataSheet.sheet);
    if (hasFormulas) {
      warnings.push('File contains formulas that will be converted to values');
    }

    // Detect encoding issues
    const encodingIssues = detectEncodingIssues(cleanedHeaders, rows);
    if (encodingIssues.length > 0) {
      warnings.push(...encodingIssues);
    }

    // Validate minimum data requirements
    if (rows.length === 0) {
      return {
        success: false,
        error: 'No data rows found in the file'
      };
    }

    if (rows.length > 10000) {
      warnings.push('File contains more than 10,000 rows. Import may take longer than usual.');
    }

    const parsedData: ParsedExcelData = {
      headers: cleanedHeaders,
      rows,
      sheetNames,
      metadata: {
        filename: file.name,
        fileSize: file.size,
        rowCount: rows.length,
        columnCount: cleanedHeaders.length,
        templateType,
        encoding: 'utf-8',
        hasFormulas
      }
    };

    return {
      success: true,
      data: parsedData,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error) {
    console.error('Excel parsing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    };
  }
}

// ============================================================================
// CSV PARSING FALLBACK
// ============================================================================

function parseCSVFile(buffer: Buffer, filename: string): ParseResult {
  try {
    const csvText = buffer.toString('utf-8');
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length === 0) {
      return {
        success: false,
        error: 'CSV file is empty'
      };
    }

    // Parse CSV (simple implementation - doesn't handle all edge cases)
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]);
    const dataRows = lines.slice(1).map(line => parseCSVLine(line));

    // Convert to objects
    const rows = dataRows
      .filter(row => row.some(cell => cell !== ''))
      .map(row => {
        const rowObject: Record<string, any> = {};
        headers.forEach((header, index) => {
          rowObject[header] = row[index] || '';
        });
        return rowObject;
      });

    const templateType = detectTemplateType(headers);

    return {
      success: true,
      data: {
        headers,
        rows,
        sheetNames: ['CSV Data'],
        metadata: {
          filename,
          fileSize: buffer.length,
          rowCount: rows.length,
          columnCount: headers.length,
          templateType,
          encoding: 'utf-8',
          hasFormulas: false
        }
      }
    };

  } catch (error) {
    return {
      success: false,
      error: `Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ============================================================================
// TEMPLATE DETECTION
// ============================================================================

function detectTemplateType(headers: string[]): 'siga_standard' | 'okr_template' | 'custom' | 'unknown' {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Check SIGA standard template
  const sigaScore = calculateTemplateScore(normalizedHeaders, TEMPLATE_PATTERNS.siga_standard);
  if (sigaScore >= TEMPLATE_PATTERNS.siga_standard.confidence_threshold) {
    return 'siga_standard';
  }

  // Check OKR template
  const okrScore = calculateTemplateScore(normalizedHeaders, TEMPLATE_PATTERNS.okr_template);
  if (okrScore >= TEMPLATE_PATTERNS.okr_template.confidence_threshold) {
    return 'okr_template';
  }

  // Check enhanced KPI template
  const kpiScore = calculateTemplateScore(normalizedHeaders, TEMPLATE_PATTERNS.enhanced_kpi);
  if (kpiScore >= TEMPLATE_PATTERNS.enhanced_kpi.confidence_threshold) {
    return 'custom';
  }

  return 'unknown';
}

function calculateTemplateScore(headers: string[], pattern: any): number {
  const requiredMatches = pattern.required_headers.filter((required: string) =>
    headers.some(header => header.includes(required) || required.includes(header))
  ).length;

  const optionalMatches = pattern.optional_headers.filter((optional: string) =>
    headers.some(header => header.includes(optional) || optional.includes(header))
  ).length;

  const totalRequired = pattern.required_headers.length;
  const totalOptional = pattern.optional_headers.length;

  // Weight required matches more heavily
  const score = (requiredMatches / totalRequired) * 0.8 + 
                (optionalMatches / totalOptional) * 0.2;

  return score;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function findDataSheet(workbook: XLSX.WorkBook, sheetNames: string[]): { sheet: XLSX.WorkSheet; name: string } | null {
  // Priority order for sheet selection
  const priorityNames = [
    'tablero gestión',
    'tablero',
    'data',
    'datos',
    'okr',
    'objectives',
    'objetivos',
    'initiatives',
    'iniciativas'
  ];

  // First, try priority names
  for (const priority of priorityNames) {
    const matchedName = sheetNames.find(name => 
      name.toLowerCase().includes(priority.toLowerCase())
    );
    if (matchedName) {
      const sheet = workbook.Sheets[matchedName];
      if (sheet && !isSheetEmpty(sheet)) {
        return { sheet, name: matchedName };
      }
    }
  }

  // Fallback to first non-empty sheet
  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (sheet && !isSheetEmpty(sheet)) {
      return { sheet, name: sheetName };
    }
  }

  return null;
}

function isSheetEmpty(sheet: XLSX.WorkSheet): boolean {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
  return range.e.r < 1 || range.e.c < 1; // Less than 2 rows or 2 columns
}

function checkForFormulas(sheet: XLSX.WorkSheet): boolean {
  for (const cellAddress in sheet) {
    if (cellAddress.startsWith('!')) continue;
    const cell = sheet[cellAddress];
    if (cell && cell.f) {
      return true;
    }
  }
  return false;
}

function detectEncodingIssues(headers: string[], rows: Record<string, any>[]): string[] {
  const issues: string[] = [];
  
  // Check for common encoding problems
  const encodingPatterns = [
    /Ã¡/g, // á becomes Ã¡
    /Ã©/g, // é becomes Ã©
    /Ã­/g, // í becomes Ã­
    /Ã³/g, // ó becomes Ã³
    /Ãº/g, // ú becomes Ãº
    /Ã±/g, // ñ becomes Ã±
  ];

  const checkText = (text: string) => {
    return encodingPatterns.some(pattern => pattern.test(text));
  };

  // Check headers
  if (headers.some(header => checkText(header))) {
    issues.push('Possible encoding issues detected in column headers');
  }

  // Check sample of data
  const sampleSize = Math.min(10, rows.length);
  for (let i = 0; i < sampleSize; i++) {
    const row = rows[i];
    const hasEncodingIssue = Object.values(row).some(value => 
      typeof value === 'string' && checkText(value)
    );
    
    if (hasEncodingIssue) {
      issues.push('Possible encoding issues detected in data rows');
      break;
    }
  }

  return issues;
}

// ============================================================================
// LOGGING
// ============================================================================

async function logParsingActivity(
  supabase: any,
  userId: string,
  activity: {
    filename: string;
    fileSize: number;
    rowCount: number;
    templateType: string;
    parseOnly: boolean;
  }
): Promise<void> {
  try {
    // Get user profile for tenant info
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id, area_id')
      .eq('user_id', userId)
      .single();

    if (profile) {
      await supabase.from('audit_log').insert({
        tenant_id: profile.tenant_id,
        user_id: profile.id,
        action: 'EXCEL_PARSE',
        resource_type: 'excel_import',
        new_values: {
          filename: activity.filename,
          fileSize: activity.fileSize,
          rowCount: activity.rowCount,
          templateType: activity.templateType,
          parseOnly: activity.parseOnly,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Failed to log parsing activity:', error);
    // Don't throw - logging failures shouldn't break parsing
  }
}