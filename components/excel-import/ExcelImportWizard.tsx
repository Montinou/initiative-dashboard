/**
 * Excel Import Wizard - Phase 3: Enhanced Excel Import Enhancement
 * 
 * Multi-step wizard for importing Excel files with advanced validation,
 * error reporting, and intelligent data mapping capabilities.
 * Maintains backward compatibility with existing templates.
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

"use client";

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Download,
  Eye,
  Settings,
  Database,
  TrendingUp,
  Users,
  Building2,
  Target,
  Calendar,
  DollarSign,
  Loader2,
  X,
  Info,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import ValidationResults from '@/components/import/ValidationResults';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ExcelImportStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  isComplete: boolean;
  hasError: boolean;
}

export interface ImportedDataRow {
  rowIndex: number;
  originalData: Record<string, any>;
  mappedData: Record<string, any>;
  validationResults: ValidationResult[];
  isValid: boolean;
  area?: string;
  initiative?: string;
  progress?: number;
  estimatedHours?: number;
  actualHours?: number;
  budget?: number;
  actualCost?: number;
  status?: string;
  kpiCategory?: string;
  progressMethod?: string;
  weightFactor?: number;
  isStrategic?: boolean;
}

export interface ValidationResult {
  field: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  code: string;
  suggestions?: string[];
}

export interface ImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warningRows: number;
  newInitiatives: number;
  updatedInitiatives: number;
  estimatedProcessingTime: number;
  kpiImpact: {
    affectedAreas: string[];
    expectedProgressChange: number;
    budgetImpact: number;
  };
}

export interface ExcelImportWizardProps {
  onImportComplete?: (summary: ImportSummary) => void;
  onImportCancel?: () => void;
  className?: string;
  userRole?: string;
  areaId?: string;
  maxFileSize?: number;
  allowedFileTypes?: string[];
}

// ============================================================================
// MAIN WIZARD COMPONENT
// ============================================================================

export const ExcelImportWizard: React.FC<ExcelImportWizardProps> = ({
  onImportComplete,
  onImportCancel,
  className,
  userRole = 'Analyst',
  areaId,
  maxFileSize = 100 * 1024 * 1024, // 100MB
  allowedFileTypes = ['.xlsx', '.xls', '.csv']
}) => {
  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [importedData, setImportedData] = useState<ImportedDataRow[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Define wizard steps
  const steps: ExcelImportStep[] = [
    {
      id: 'upload',
      title: 'Upload File',
      description: 'Select your Excel file to import',
      icon: Upload,
      isComplete: !!importedFile,
      hasError: false
    },
    {
      id: 'mapping',
      title: 'Data Mapping',
      description: 'Map columns to system fields',
      icon: Settings,
      isComplete: Object.keys(columnMappings).length > 0,
      hasError: false
    },
    {
      id: 'validation',
      title: 'Data Validation',
      description: 'Review and fix data issues',
      icon: CheckCircle,
      isComplete: importedData.length > 0 && importedData.every(row => row.isValid),
      hasError: validationResults.some(result => result.severity === 'error')
    },
    {
      id: 'preview',
      title: 'Preview & Review',
      description: 'Final review before import',
      icon: Eye,
      isComplete: !!importSummary,
      hasError: false
    },
    {
      id: 'import',
      title: 'Import Data',
      description: 'Import data to system',
      icon: Database,
      isComplete: false,
      hasError: false
    }
  ];

  // ============================================================================
  // FILE UPLOAD HANDLERS
  // ============================================================================

  const handleFileUpload = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Validate file
      if (!allowedFileTypes.some(type => file.name.toLowerCase().endsWith(type.substring(1)))) {
        throw new Error(`File type not supported. Allowed types: ${allowedFileTypes.join(', ')}`);
      }
      
      if (file.size > maxFileSize) {
        throw new Error(`File size exceeds limit of ${Math.round(maxFileSize / (1024 * 1024))}MB`);
      }

      // Parse Excel file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('parseOnly', 'true');

      const response = await fetch('/api/excel/parse', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse Excel file');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to parse Excel file');
      }

      // Process parsed data
      const parsedRows: ImportedDataRow[] = result.data.rows.map((row: any, index: number) => ({
        rowIndex: index + 1,
        originalData: row,
        mappedData: {},
        validationResults: [],
        isValid: false
      }));

      setImportedFile(file);
      setImportedData(parsedRows);
      
      // Auto-detect column mappings
      const detectedMappings = await detectColumnMappings(result.data.headers);
      setColumnMappings(detectedMappings);
      
      // Move to next step
      setCurrentStep(1);

    } catch (error) {
      console.error('File upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsProcessing(false);
    }
  }, [allowedFileTypes, maxFileSize]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  // ============================================================================
  // COLUMN MAPPING LOGIC
  // ============================================================================

  const detectColumnMappings = async (headers: string[]): Promise<Record<string, string>> => {
    // Intelligent column detection based on header text
    const mappings: Record<string, string> = {};
    
    const mappingRules = {
      // Area mapping
      'area': ['area', 'área', 'department', 'departamento', 'division', 'división'],
      'initiative': ['objective', 'objetivo', 'initiative', 'iniciativa', 'objetivo clave', 'key objective'],
      'progress': ['progress', 'avance', 'progreso', '% avance', 'percentage', 'porcentaje'],
      'status': ['status', 'estado', 'state'],
      'obstacles': ['obstacles', 'obstáculos', 'obstaculos', 'lows', 'barriers', 'barreras'],
      'enablers': ['enablers', 'potenciadores', 'highs', 'facilitators', 'facilitadores'],
      'budget': ['budget', 'presupuesto', 'cost', 'costo'],
      'actualCost': ['actual cost', 'costo real', 'spent', 'gastado'],
      'estimatedHours': ['estimated hours', 'horas estimadas', 'estimate', 'estimado'],
      'actualHours': ['actual hours', 'horas reales', 'hours worked', 'horas trabajadas'],
      'targetDate': ['target date', 'fecha objetivo', 'due date', 'fecha límite'],
      'priority': ['priority', 'prioridad', 'importance', 'importancia'],
      'weight': ['weight', 'peso', 'weight factor', 'factor de peso']
    };

    for (const [systemField, possibleHeaders] of Object.entries(mappingRules)) {
      const matchedHeader = headers.find(header => 
        possibleHeaders.some(pattern => 
          header.toLowerCase().includes(pattern.toLowerCase())
        )
      );
      
      if (matchedHeader) {
        mappings[matchedHeader] = systemField;
      }
    }

    return mappings;
  };

  const handleMappingChange = useCallback((columnHeader: string, systemField: string) => {
    setColumnMappings(prev => ({
      ...prev,
      [columnHeader]: systemField
    }));
  }, []);

  // ============================================================================
  // DATA VALIDATION LOGIC
  // ============================================================================

  const validateImportedData = useCallback(async () => {
    setIsProcessing(true);
    setValidationResults([]);

    try {
      const response = await fetch('/api/excel/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: importedData.map(row => row.originalData),
          mappings: columnMappings,
          userRole,
          areaId
        })
      });

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Validation failed');
      }

      // Update imported data with validation results
      const validatedData: ImportedDataRow[] = result.data.validatedRows.map((validatedRow: any, index: number) => ({
        ...importedData[index],
        mappedData: validatedRow.mappedData,
        validationResults: validatedRow.validationResults,
        isValid: validatedRow.isValid
      }));

      setImportedData(validatedData);
      setValidationResults(result.data.globalValidations || []);
      
      // Move to next step if no critical errors
      const hasCriticalErrors = result.data.globalValidations.some((v: ValidationResult) => v.severity === 'error');
      if (!hasCriticalErrors) {
        setCurrentStep(3);
      }

    } catch (error) {
      console.error('Validation error:', error);
      setError(error instanceof Error ? error.message : 'Validation failed');
    } finally {
      setIsProcessing(false);
    }
  }, [importedData, columnMappings, userRole, areaId]);

  // ============================================================================
  // IMPORT PREVIEW LOGIC
  // ============================================================================

  const generateImportPreview = useCallback(async () => {
    setIsProcessing(true);

    try {
      const validRows = importedData.filter(row => row.isValid);
      
      const summary: ImportSummary = {
        totalRows: importedData.length,
        validRows: validRows.length,
        invalidRows: importedData.length - validRows.length,
        warningRows: importedData.filter(row => 
          row.validationResults.some(result => result.severity === 'warning')
        ).length,
        newInitiatives: validRows.filter(row => !row.mappedData.existingId).length,
        updatedInitiatives: validRows.filter(row => row.mappedData.existingId).length,
        estimatedProcessingTime: Math.ceil(validRows.length / 10), // 10 rows per second estimate
        kpiImpact: {
          affectedAreas: [...new Set(validRows.map(row => row.mappedData.area).filter(Boolean))],
          expectedProgressChange: validRows.reduce((sum, row) => sum + (row.mappedData.progress || 0), 0) / validRows.length,
          budgetImpact: validRows.reduce((sum, row) => sum + (row.mappedData.budget || 0), 0)
        }
      };

      setImportSummary(summary);
      setCurrentStep(4);

    } catch (error) {
      console.error('Preview generation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate preview');
    } finally {
      setIsProcessing(false);
    }
  }, [importedData]);

  // ============================================================================
  // FINAL IMPORT LOGIC
  // ============================================================================

  const executeImport = useCallback(async () => {
    if (!importSummary) return;

    setIsProcessing(true);

    try {
      const validRows = importedData.filter(row => row.isValid);
      
      const response = await fetch('/api/excel/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: validRows.map(row => row.mappedData),
          mappings: columnMappings,
          userRole,
          areaId,
          importSummary
        })
      });

      if (!response.ok) {
        throw new Error('Import failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Import failed');
      }

      // Call success callback
      onImportComplete?.(importSummary);

    } catch (error) {
      console.error('Import error:', error);
      setError(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setIsProcessing(false);
    }
  }, [importedData, columnMappings, importSummary, userRole, areaId, onImportComplete]);

  // ============================================================================
  // ENHANCED VALIDATION HANDLERS FOR IMPORT-003
  // ============================================================================

  const convertValidationResultsToErrors = useCallback((results: ValidationResult[], rowIndex: number) => {
    return results.map((result, index) => ({
      id: `row-${rowIndex}-${index}`,
      row: rowIndex,
      column: result.field,
      field: result.field,
      errorType: result.severity as 'critical' | 'warning' | 'info',
      category: categorizeValidationError(result.field, result.code),
      message: result.message,
      suggestion: result.suggestions?.[0],
      code: result.code,
      value: result.originalValue,
      suggestedValue: result.suggestedValue
    }));
  }, []);

  const categorizeValidationError = useCallback((field: string, code: string): 'data_type' | 'business_logic' | 'referential_integrity' | 'format' | 'missing_data' | 'duplicate' | 'permission' => {
    const categoryMappings: Record<string, 'data_type' | 'business_logic' | 'referential_integrity' | 'format' | 'missing_data' | 'duplicate' | 'permission'> = {
      'AREA_NOT_FOUND': 'referential_integrity',
      'AREA_PERMISSION_DENIED': 'permission',
      'PROGRESS_INVALID_FORMAT': 'format',
      'PROGRESS_NOT_NUMERIC': 'data_type',
      'PROGRESS_EXCEEDS_MAX': 'business_logic',
      'REQUIRED_FIELD_MISSING': 'missing_data',
      'INITIATIVE_POTENTIAL_DUPLICATE': 'duplicate',
      'CURRENCY_INVALID_FORMAT': 'format',
      'DATE_INVALID_FORMAT': 'format',
      'STATUS_UNKNOWN': 'data_type'
    };
    
    return categoryMappings[code] || 'data_type';
  }, []);

  const handleExportErrorReport = useCallback(async () => {
    setIsProcessing(true);
    try {
      // Collect all validation errors
      const allErrors = importedData.flatMap(row => 
        row.validationResults?.map(result => ({
          row: row.rowIndex,
          field: result.field,
          severity: result.severity,
          message: result.message,
          code: result.code,
          originalValue: result.originalValue,
          suggestedValue: result.suggestedValue,
          suggestions: result.suggestions?.join('; ')
        })) || []
      );

      const response = await fetch('/api/excel/export-error-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          errors: allErrors,
          filename: `${importedFile?.name}_errors.xlsx`
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${importedFile?.name}_errors.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to export error report');
      }
    } catch (error) {
      console.error('Export error:', error);
      setError(error instanceof Error ? error.message : 'Failed to export error report');
    } finally {
      setIsProcessing(false);
    }
  }, [importedData, importedFile]);

  const handlePartialImport = useCallback(async (validRows: any[]) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/excel/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: validRows.map(row => row.mappedData),
          mappings: columnMappings,
          userRole,
          areaId,
          partialImport: true
        })
      });

      if (!response.ok) {
        throw new Error('Partial import failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Partial import failed');
      }

      // Create summary for partial import
      const partialSummary: ImportSummary = {
        totalRows: validRows.length,
        validRows: validRows.length,
        invalidRows: 0,
        warningRows: 0,
        newInitiatives: result.data.created || 0,
        updatedInitiatives: result.data.updated || 0,
        estimatedProcessingTime: result.data.processingTime || 0,
        kpiImpact: {
          affectedAreas: [...new Set(validRows.map(row => row.mappedData.area).filter(Boolean))],
          expectedProgressChange: validRows.reduce((sum, row) => sum + (row.mappedData.progress || 0), 0) / validRows.length,
          budgetImpact: validRows.reduce((sum, row) => sum + (row.mappedData.budget || 0), 0)
        }
      };

      onImportComplete?.(partialSummary);

    } catch (error) {
      console.error('Partial import error:', error);
      setError(error instanceof Error ? error.message : 'Partial import failed');
    } finally {
      setIsProcessing(false);
    }
  }, [columnMappings, userRole, areaId, onImportComplete]);

  const handleFixSuggestion = useCallback(async (error: any) => {
    // Apply suggested fix to the data
    const rowIndex = error.row;
    const fieldName = error.field;
    const suggestedValue = error.suggestedValue;

    if (rowIndex > 0 && suggestedValue !== undefined) {
      setImportedData(prevData => {
        const newData = [...prevData];
        const targetRow = newData.find(row => row.rowIndex === rowIndex);
        
        if (targetRow) {
          // Update the mapped data with the suggested value
          targetRow.mappedData[fieldName] = suggestedValue;
          
          // Remove the fixed error from validation results
          targetRow.validationResults = targetRow.validationResults?.filter(
            result => !(result.field === fieldName && result.code === error.code)
          ) || [];
          
          // Recalculate validity
          targetRow.isValid = !targetRow.validationResults.some(r => r.severity === 'error');
        }
        
        return newData;
      });
      
      // Optionally re-validate the entire dataset
      // await validateImportedData();
    }
  }, []);

  // ============================================================================
  // NAVIGATION HANDLERS
  // ============================================================================

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
    }
  }, [steps.length]);

  const goToNextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, steps.length]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const StepIcon = step.icon;
        const isActive = index === currentStep;
        const isCompleted = step.isComplete;
        const hasError = step.hasError;

        return (
          <React.Fragment key={step.id}>
            <div
              className={cn(
                'flex flex-col items-center cursor-pointer transition-all duration-300',
                isActive && 'scale-110'
              )}
              onClick={() => goToStep(index)}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                  isActive && 'bg-primary border-primary text-white shadow-lg',
                  isCompleted && !isActive && 'bg-green-500 border-green-500 text-white',
                  hasError && 'bg-red-500 border-red-500 text-white',
                  !isActive && !isCompleted && !hasError && 'bg-white/10 border-white/30 text-white/70'
                )}
              >
                {isCompleted && !hasError ? (
                  <CheckCircle className="h-6 w-6" />
                ) : hasError ? (
                  <AlertTriangle className="h-6 w-6" />
                ) : (
                  <StepIcon className="h-6 w-6" />
                )}
              </div>
              <div className="text-center mt-2">
                <p className={cn(
                  'text-sm font-medium',
                  isActive ? 'text-white' : 'text-white/70'
                )}>
                  {step.title}
                </p>
                <p className={cn(
                  'text-xs',
                  isActive ? 'text-white/80' : 'text-white/50'
                )}>
                  {step.description}
                </p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                'h-0.5 flex-1 mx-4 transition-all duration-300',
                index < currentStep ? 'bg-green-500' : 'bg-white/20'
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  const renderUploadStep = () => (
    <Card className="glass-morphism border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Excel File
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-300',
            'border-white/30 hover:border-white/50'
          )}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={(e) => e.preventDefault()}
        >
          <FileSpreadsheet className="h-16 w-16 text-white/60 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {importedFile ? importedFile.name : 'Choose your Excel file'}
          </h3>
          <p className="text-white/70 mb-4">
            {importedFile 
              ? `File size: ${(importedFile.size / (1024 * 1024)).toFixed(2)} MB`
              : 'Drag and drop your file here, or click to browse'
            }
          </p>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-primary hover:bg-primary/80"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {importedFile ? 'Change File' : 'Select File'}
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={allowedFileTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {importedFile && (
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">File Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/60">Name:</span>
                <span className="text-white ml-2">{importedFile.name}</span>
              </div>
              <div>
                <span className="text-white/60">Size:</span>
                <span className="text-white ml-2">{(importedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <div>
                <span className="text-white/60">Type:</span>
                <span className="text-white ml-2">{importedFile.type || 'Excel Spreadsheet'}</span>
              </div>
              <div>
                <span className="text-white/60">Rows:</span>
                <span className="text-white ml-2">{importedData.length}</span>
              </div>
            </div>
          </div>
        )}

        <Alert className="bg-blue-500/10 border-blue-500/20">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-white">
            <strong>Supported formats:</strong> Excel (.xlsx, .xls) and CSV files up to {Math.round(maxFileSize / (1024 * 1024))}MB.
            <br />
            <strong>Compatible templates:</strong> All existing SIGA templates are supported with automatic column detection.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );

  const renderMappingStep = () => (
    <Card className="glass-morphism border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Column Mapping
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-blue-500/10 border-blue-500/20">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-white">
            We've automatically detected most column mappings. Please review and adjust as needed.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {Object.keys(importedData[0]?.originalData || {}).map((columnHeader) => (
            <div key={columnHeader} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
              <div className="flex-1">
                <label className="text-white font-medium">{columnHeader}</label>
                <p className="text-white/60 text-sm">
                  Sample: {importedData[0]?.originalData[columnHeader] || 'N/A'}
                </p>
              </div>
              <div className="flex-1">
                <Select
                  value={columnMappings[columnHeader] || ''}
                  onValueChange={(value) => handleMappingChange(columnHeader, value)}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select system field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Don't map</SelectItem>
                    <SelectItem value="area">Area</SelectItem>
                    <SelectItem value="initiative">Initiative/Objective</SelectItem>
                    <SelectItem value="progress">Progress (%)</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="obstacles">Obstacles</SelectItem>
                    <SelectItem value="enablers">Enablers</SelectItem>
                    <SelectItem value="budget">Budget</SelectItem>
                    <SelectItem value="actualCost">Actual Cost</SelectItem>
                    <SelectItem value="estimatedHours">Estimated Hours</SelectItem>
                    <SelectItem value="actualHours">Actual Hours</SelectItem>
                    <SelectItem value="targetDate">Target Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                    <SelectItem value="weight">Weight Factor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <Button
            onClick={() => setCurrentStep(2)}
            disabled={Object.keys(columnMappings).length === 0}
            className="bg-primary hover:bg-primary/80"
          >
            Validate Data
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <RefreshCw className="h-4 w-4 mr-2" />
            Auto-detect Again
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderValidationStep = () => {
    // Prepare data for ValidationResults component
    const validatedRows = importedData.map(row => ({
      ...row,
      validationErrors: row.validationResults ? convertValidationResultsToErrors(row.validationResults, row.rowIndex) : [],
      hasErrors: row.validationResults ? row.validationResults.some(r => r.severity === 'error') : false,
      hasWarnings: row.validationResults ? row.validationResults.some(r => r.severity === 'warning') : false,
      hasInfo: row.validationResults ? row.validationResults.some(r => r.severity === 'info') : false
    }));

    const globalValidationErrors = validationResults.map((result, index) => ({
      id: `global-${index}`,
      row: 0,
      column: '',
      field: result.field,
      errorType: result.severity as 'critical' | 'warning' | 'info',
      category: 'business_logic' as const,
      message: result.message,
      suggestion: result.suggestions?.[0],
      code: result.field.toUpperCase(),
      value: result.originalValue,
      suggestedValue: result.suggestedValue
    }));

    const validationSummary = {
      totalRows: importedData.length,
      validRows: importedData.filter(row => row.isValid).length,
      errorRows: importedData.filter(row => !row.isValid).length,
      warningRows: importedData.filter(row => 
        row.validationResults?.some(result => result.severity === 'warning')
      ).length,
      infoRows: importedData.filter(row => 
        row.validationResults?.some(result => result.severity === 'info')
      ).length,
      criticalErrors: [...validatedRows.flatMap(r => r.validationErrors), ...globalValidationErrors]
        .filter(e => e.errorType === 'critical').length,
      averageConfidence: importedData.reduce((sum, row) => sum + (row.confidence || 0), 0) / importedData.length,
      processingTime: 0, // Will be calculated during validation
      mostCommonErrors: [] // Will be calculated from actual errors
    };

    return (
      <ValidationResults
        validatedRows={validatedRows}
        globalValidations={globalValidationErrors}
        summary={validationSummary}
        onExportErrorReport={handleExportErrorReport}
        onRetryValidation={validateImportedData}
        onPartialImport={handlePartialImport}
        onFixSuggestion={handleFixSuggestion}
        className="space-y-6"
        showDetailedView={true}
        allowPartialImport={true}
      />
    );
  };

  const renderPreviewStep = () => {
    if (!importSummary) return null;

    return (
      <div className="space-y-6">
        <Card className="glass-morphism border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Import Preview & Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                  <div>
                    <div className="text-2xl font-bold text-green-300">{importSummary.validRows}</div>
                    <div className="text-green-200 text-sm">Valid Rows</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Target className="h-8 w-8 text-blue-400" />
                  <div>
                    <div className="text-2xl font-bold text-blue-300">{importSummary.newInitiatives}</div>
                    <div className="text-blue-200 text-sm">New Initiatives</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-8 w-8 text-purple-400" />
                  <div>
                    <div className="text-2xl font-bold text-purple-300">{importSummary.updatedInitiatives}</div>
                    <div className="text-purple-200 text-sm">Updates</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-8 w-8 text-yellow-400" />
                  <div>
                    <div className="text-2xl font-bold text-yellow-300">{importSummary.estimatedProcessingTime}s</div>
                    <div className="text-yellow-200 text-sm">Est. Time</div>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Impact */}
            <div className="bg-white/5 rounded-lg p-6">
              <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Expected KPI Impact
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-white/60 text-sm">Affected Areas</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {importSummary.kpiImpact.affectedAreas.map((area) => (
                      <Badge key={area} className="bg-blue-500/20 text-blue-300">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-sm">Average Progress Change</label>
                  <div className="text-2xl font-bold text-white mt-1">
                    +{Math.round(importSummary.kpiImpact.expectedProgressChange)}%
                  </div>
                </div>
                <div>
                  <label className="text-white/60 text-sm">Budget Impact</label>
                  <div className="text-2xl font-bold text-white mt-1">
                    ${importSummary.kpiImpact.budgetImpact.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Final Confirmation */}
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-white">
                <strong>Ready to import:</strong> {importSummary.validRows} rows will be processed.
                {importSummary.invalidRows > 0 && (
                  <span className="text-yellow-300">
                    {' '}({importSummary.invalidRows} invalid rows will be skipped)
                  </span>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderImportStep = () => (
    <Card className="glass-morphism border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Database className="h-5 w-5" />
          {isProcessing ? 'Importing Data...' : 'Import Complete'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isProcessing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
              <div>
                <h3 className="text-white font-medium">Processing your data...</h3>
                <p className="text-white/60">This may take a few moments</p>
              </div>
            </div>
            <Progress value={65} className="h-2" />
            <p className="text-white/60 text-sm">
              Validating and inserting records into the database...
            </p>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto" />
            <h3 className="text-2xl font-bold text-white">Import Successful!</h3>
            <p className="text-white/70">
              Your data has been successfully imported into the system.
            </p>
            {importSummary && (
              <div className="bg-white/5 rounded-lg p-4 max-w-md mx-auto">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Processed:</span>
                    <span className="text-white">{importSummary.validRows} rows</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">New initiatives:</span>
                    <span className="text-white">{importSummary.newInitiatives}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Updated:</span>
                    <span className="text-white">{importSummary.updatedInitiatives}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className={cn('max-w-6xl mx-auto space-y-6', className)}>
      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Error Display */}
      {error && (
        <Alert className="bg-red-500/10 border-red-500/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-white">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentStep === 0 && renderUploadStep()}
          {currentStep === 1 && renderMappingStep()}
          {currentStep === 2 && renderValidationStep()}
          {currentStep === 3 && renderPreviewStep()}
          {currentStep === 4 && renderImportStep()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls */}
      <div className="flex justify-between items-center pt-6">
        <Button
          variant="outline"
          onClick={currentStep === 0 ? onImportCancel : goToPreviousStep}
          disabled={isProcessing}
          className="border-white/20 text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 0 ? 'Cancel' : 'Previous'}
        </Button>

        <div className="flex items-center gap-2">
          {currentStep < steps.length - 1 && (
            <Button
              onClick={goToNextStep}
              disabled={!steps[currentStep].isComplete || isProcessing}
              className="bg-primary hover:bg-primary/80"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          
          {currentStep === steps.length - 1 && (
            <Button
              onClick={executeImport}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Import Data
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelImportWizard;