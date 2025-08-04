/**
 * Excel Error Report Export API - IMPORT-003 Validation & Error Handling
 * 
 * API endpoint for generating downloadable Excel error reports with detailed
 * validation issues, suggestions, and fix recommendations.
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface ErrorReportRow {
  row: number;
  field: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  code: string;
  originalValue?: any;
  suggestedValue?: any;
  suggestions?: string;
}

interface ErrorReportRequest {
  errors: ErrorReportRow[];
  filename?: string;
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: ErrorReportRequest = await request.json();
    const { errors, filename = 'validation_errors.xlsx' } = body;

    if (!errors || !Array.isArray(errors)) {
      return NextResponse.json(
        { error: 'Invalid errors data provided' },
        { status: 400 }
      );
    }

    // Prepare the Excel data
    const worksheetData = [
      // Header row
      [
        'Row Number',
        'Field',
        'Severity',
        'Error Code', 
        'Error Message',
        'Original Value',
        'Suggested Value',
        'Fix Suggestions',
        'Category',
        'Priority'
      ],
      // Data rows
      ...errors.map(error => [
        error.row,
        error.field,
        error.severity.toUpperCase(),
        error.code,
        error.message,
        error.originalValue || '',
        error.suggestedValue || '',
        error.suggestions || '',
        categorizeError(error.code),
        getSeverityPriority(error.severity)
      ])
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Style the header row
    const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:J1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      
      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4F46E5' } },
        alignment: { horizontal: 'center' }
      };
    }

    // Set column widths
    worksheet['!cols'] = [
      { width: 10 },  // Row Number
      { width: 15 },  // Field
      { width: 12 },  // Severity
      { width: 20 },  // Error Code
      { width: 40 },  // Error Message
      { width: 20 },  // Original Value
      { width: 20 },  // Suggested Value
      { width: 50 },  // Fix Suggestions
      { width: 15 },  // Category
      { width: 10 }   // Priority
    ];

    // Add conditional formatting for severity levels
    addConditionalFormatting(worksheet, errors.length);

    // Add summary worksheet
    const summaryData = generateSummaryData(errors);
    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

    // Add the main errors worksheet
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Validation Errors');

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true 
    });

    // Return the Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('Error export failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate error report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function categorizeError(code: string): string {
  const categoryMappings: Record<string, string> = {
    'AREA_NOT_FOUND': 'Reference',
    'AREA_PERMISSION_DENIED': 'Permission',
    'PROGRESS_INVALID_FORMAT': 'Format',
    'PROGRESS_NOT_NUMERIC': 'Data Type',
    'PROGRESS_EXCEEDS_MAX': 'Business Rule',
    'REQUIRED_FIELD_MISSING': 'Missing Data',
    'INITIATIVE_POTENTIAL_DUPLICATE': 'Duplicate',
    'CURRENCY_INVALID_FORMAT': 'Format',
    'DATE_INVALID_FORMAT': 'Format',
    'STATUS_UNKNOWN': 'Data Type',
    'SUBTASK_WEIGHTS_EXCEED_100': 'Business Rule'
  };
  
  return categoryMappings[code] || 'General';
}

function getSeverityPriority(severity: string): number {
  const priorities = {
    'error': 1,
    'warning': 2,
    'info': 3
  };
  
  return priorities[severity as keyof typeof priorities] || 3;
}

function addConditionalFormatting(worksheet: XLSX.WorkSheet, dataRows: number): void {
  // Add color coding for severity levels
  for (let row = 1; row <= dataRows; row++) {
    const severityCell = `C${row + 1}`;
    if (!worksheet[severityCell]) continue;
    
    const severity = worksheet[severityCell].v?.toString().toLowerCase();
    let fillColor = '';
    
    switch (severity) {
      case 'error':
        fillColor = 'FFE6E6'; // Light red
        break;
      case 'warning':
        fillColor = 'FFF3CD'; // Light yellow
        break;
      case 'info':
        fillColor = 'E7F3FF'; // Light blue
        break;
    }
    
    if (fillColor) {
      worksheet[severityCell].s = {
        fill: { fgColor: { rgb: fillColor } }
      };
    }
  }
}

function generateSummaryData(errors: ErrorReportRow[]): any[][] {
  const totalErrors = errors.length;
  const errorsBySeverity = errors.reduce((acc, error) => {
    acc[error.severity] = (acc[error.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const errorsByCode = errors.reduce((acc, error) => {
    acc[error.code] = (acc[error.code] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const errorsByField = errors.reduce((acc, error) => {
    acc[error.field] = (acc[error.field] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostCommonErrors = Object.entries(errorsByCode)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);

  const mostProblematicFields = Object.entries(errorsByField)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);

  return [
    ['Validation Error Report Summary'],
    ['Generated on:', new Date().toISOString()],
    [''],
    ['Overview'],
    ['Total Errors:', totalErrors],
    ['Critical Errors:', errorsBySeverity.error || 0],
    ['Warnings:', errorsBySeverity.warning || 0],
    ['Info Messages:', errorsBySeverity.info || 0],
    [''],
    ['Most Common Error Codes'],
    ['Error Code', 'Count', 'Percentage'],
    ...mostCommonErrors.map(([code, count]) => [
      code, 
      count, 
      `${((count / totalErrors) * 100).toFixed(1)}%`
    ]),
    [''],
    ['Most Problematic Fields'],
    ['Field Name', 'Error Count', 'Percentage'],
    ...mostProblematicFields.map(([field, count]) => [
      field, 
      count, 
      `${((count / totalErrors) * 100).toFixed(1)}%`
    ]),
    [''],
    ['Recommendations'],
    ['1. Review the most common error codes above'],
    ['2. Focus on fixing critical errors first'],
    ['3. Use suggested values where provided'],
    ['4. Consider updating your data source to prevent recurring issues'],
    ['5. Contact support if you need help with specific error codes']
  ];
}