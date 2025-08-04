/**
 * ValidationResults.tsx - IMPORT-003 Validation & Error Handling
 * 
 * Comprehensive validation results interface with user-friendly error reporting,
 * visual error highlighting, categorized errors, and actionable suggestions.
 * Integrates with the Excel import wizard for enhanced data validation.
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Eye,
  EyeOff,
  BarChart3,
  TrendingUp,
  X,
  RefreshCw,
  Upload,
  Lightbulb,
  Bug,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ValidationError {
  id: string;
  row: number;
  column: string;
  field: string;
  errorType: 'critical' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  value?: any;
  suggestedValue?: any;
  code: string;
}

export interface ValidationSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
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
}

export interface ValidatedRow {
  rowIndex: number;
  originalData: Record<string, any>;
  mappedData: Record<string, any>;
  validationErrors: ValidationError[];
  isValid: boolean;
  confidence: number;
  hasErrors: boolean;
  hasWarnings: boolean;
  hasInfo: boolean;
}

export interface ValidationResultsProps {
  validatedRows: ValidatedRow[];
  globalValidations: ValidationError[];
  summary: ValidationSummary;
  onExportErrorReport?: () => Promise<void>;
  onRetryValidation?: () => Promise<void>;
  onPartialImport?: (validRows: ValidatedRow[]) => Promise<void>;
  onFixSuggestion?: (error: ValidationError) => void;
  className?: string;
  showDetailedView?: boolean;
  allowPartialImport?: boolean;
}

// ============================================================================
// MAIN VALIDATION RESULTS COMPONENT
// ============================================================================

export const ValidationResults: React.FC<ValidationResultsProps> = ({
  validatedRows,
  globalValidations,
  summary,
  onExportErrorReport,
  onRetryValidation,
  onPartialImport,
  onFixSuggestion,
  className,
  showDetailedView = true,
  allowPartialImport = true
}) => {
  // State management
  const [currentTab, setCurrentTab] = useState<'overview' | 'errors' | 'data'>('overview');
  const [filterType, setFilterType] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [selectedErrors, setSelectedErrors] = useState<Set<string>>(new Set());

  // Computed data
  const allErrors = useMemo(() => {
    const errors: ValidationError[] = [];
    
    // Add global validations
    globalValidations.forEach(error => {
      errors.push(error);
    });
    
    // Add row-specific errors
    validatedRows.forEach(row => {
      row.validationErrors.forEach(error => {
        errors.push({
          ...error,
          row: row.rowIndex
        });
      });
    });
    
    return errors;
  }, [validatedRows, globalValidations]);

  const filteredErrors = useMemo(() => {
    return allErrors.filter(error => {
      // Filter by type
      if (filterType !== 'all' && error.errorType !== filterType) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery && !error.message.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [allErrors, filterType, searchQuery]);

  const filteredRows = useMemo(() => {
    return validatedRows.filter(row => {
      if (showOnlyErrors && row.isValid) {
        return false;
      }
      return true;
    });
  }, [validatedRows, showOnlyErrors]);

  // Event handlers
  const handleExportErrorReport = useCallback(async () => {
    setIsExporting(true);
    try {
      await onExportErrorReport?.();
    } finally {
      setIsExporting(false);
    }
  }, [onExportErrorReport]);

  const handlePartialImport = useCallback(async () => {
    const validRows = validatedRows.filter(row => row.isValid);
    await onPartialImport?.(validRows);
  }, [validatedRows, onPartialImport]);

  const toggleRowExpansion = useCallback((rowIndex: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowIndex)) {
        newSet.delete(rowIndex);
      } else {
        newSet.add(rowIndex);
      }
      return newSet;
    });
  }, []);

  const toggleErrorSelection = useCallback((errorId: string) => {
    setSelectedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderSeverityIcon = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  const getSeverityColor = (severity: 'critical' | 'warning' | 'info') => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 border-red-500/20 text-red-300';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300';
      case 'info':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-300';
    }
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-morphism border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <div>
                <div className="text-2xl font-bold text-green-300">{summary.validRows}</div>
                <div className="text-green-200 text-sm">Valid Rows</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-morphism border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <div>
                <div className="text-2xl font-bold text-red-300">{summary.criticalErrors}</div>
                <div className="text-red-200 text-sm">Critical Errors</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-morphism border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-yellow-400" />
              <div>
                <div className="text-2xl font-bold text-yellow-300">{summary.warningRows}</div>
                <div className="text-yellow-200 text-sm">Warnings</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-morphism border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-blue-400" />
              <div>
                <div className="text-2xl font-bold text-blue-300">{summary.averageConfidence}%</div>
                <div className="text-blue-200 text-sm">Confidence</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Validation Progress */}
      <Card className="glass-morphism border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Validation Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Valid Data</span>
              <span className="text-green-300">{Math.round((summary.validRows / summary.totalRows) * 100)}%</span>
            </div>
            <Progress 
              value={(summary.validRows / summary.totalRows) * 100} 
              className="h-2"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Data Quality</span>
              <span className="text-blue-300">{summary.averageConfidence}%</span>
            </div>
            <Progress 
              value={summary.averageConfidence} 
              className="h-2"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div className="text-center">
              <div className="text-lg font-semibold text-white">{summary.totalRows}</div>
              <div className="text-white/60 text-sm">Total Rows</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-white">{summary.processingTime}ms</div>
              <div className="text-white/60 text-sm">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-white">{filteredErrors.length}</div>
              <div className="text-white/60 text-sm">Issues Found</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Most Common Errors */}
      {summary.mostCommonErrors.length > 0 && (
        <Card className="glass-morphism border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Most Common Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.mostCommonErrors.slice(0, 5).map((error, index) => (
                <div key={error.code} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {error.code}
                      </Badge>
                      <span className="text-white text-sm">{error.message}</span>
                    </div>
                    <div className="text-white/60 text-xs mt-1">
                      Affects {error.count} rows ({error.percentage.toFixed(1)}%)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">{error.count}</div>
                    <Progress value={error.percentage} className="w-16 h-1 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        {allowPartialImport && summary.validRows > 0 && (
          <Button
            onClick={handlePartialImport}
            className="bg-green-600 hover:bg-green-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Valid Rows ({summary.validRows})
          </Button>
        )}
        
        {onExportErrorReport && filteredErrors.length > 0 && (
          <Button
            onClick={handleExportErrorReport}
            disabled={isExporting}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            {isExporting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Error Report
              </>
            )}
          </Button>
        )}
        
        {onRetryValidation && (
          <Button
            onClick={onRetryValidation}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-validate Data
          </Button>
        )}
      </div>
    </div>
  );

  const renderErrorsTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-white/60" />
          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
            <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Issues</SelectItem>
              <SelectItem value="critical">Critical Only</SelectItem>
              <SelectItem value="warning">Warnings Only</SelectItem>
              <SelectItem value="info">Info Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-white/60" />
          <Input
            placeholder="Search errors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 bg-white/10 border-white/20 text-white placeholder:text-white/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="bulk-select"
            checked={selectedErrors.size === filteredErrors.length}
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedErrors(new Set(filteredErrors.map(e => e.id)));
              } else {
                setSelectedErrors(new Set());
              }
            }}
          />
          <label htmlFor="bulk-select" className="text-white/70 text-sm">
            Select All ({filteredErrors.length})
          </label>
        </div>
      </div>

      {/* Error List */}
      <Card className="glass-morphism border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Validation Issues ({filteredErrors.length})
            </span>
            {selectedErrors.size > 0 && (
              <Badge variant="outline">
                {selectedErrors.size} selected
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredErrors.map((error) => (
              <div
                key={error.id}
                className={cn(
                  "p-4 rounded-lg border transition-all duration-200",
                  getSeverityColor(error.errorType),
                  selectedErrors.has(error.id) && "ring-2 ring-blue-500/50"
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedErrors.has(error.id)}
                    onCheckedChange={() => toggleErrorSelection(error.id)}
                  />
                  
                  {renderSeverityIcon(error.errorType)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        Row {error.row}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {error.field}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {error.code}
                      </Badge>
                    </div>
                    
                    <p className="text-white text-sm mb-2">{error.message}</p>
                    
                    {error.value && (
                      <div className="text-white/60 text-xs mb-2">
                        Current value: <code className="bg-white/10 px-1 rounded">{error.value}</code>
                      </div>
                    )}
                    
                    {error.suggestion && (
                      <div className="flex items-start gap-2 mt-2 p-2 bg-blue-500/10 rounded">
                        <Lightbulb className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-blue-300 text-xs">
                          <strong>Suggestion:</strong> {error.suggestion}
                          {error.suggestedValue && (
                            <div className="mt-1">
                              Try: <code className="bg-blue-500/20 px-1 rounded">{error.suggestedValue}</code>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {onFixSuggestion && error.suggestedValue && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onFixSuggestion(error)}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      Apply Fix
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {filteredErrors.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <p className="text-white/70">No validation issues found!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderDataTab = () => (
    <div className="space-y-6">
      {/* Data Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-errors-only"
            checked={showOnlyErrors}
            onCheckedChange={setShowOnlyErrors}
          />
          <label htmlFor="show-errors-only" className="text-white/70 text-sm">
            Show only rows with errors
          </label>
        </div>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => setExpandedRows(new Set(filteredRows.map(r => r.rowIndex)))}
          className="border-white/20 text-white hover:bg-white/10"
        >
          <Eye className="h-4 w-4 mr-2" />
          Expand All
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => setExpandedRows(new Set())}
          className="border-white/20 text-white hover:bg-white/10"
        >
          <EyeOff className="h-4 w-4 mr-2" />
          Collapse All
        </Button>
      </div>

      {/* Data Table */}
      <Card className="glass-morphism border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Data Preview ({filteredRows.length} rows)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-white">Row</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white">Issues</TableHead>
                  <TableHead className="text-white">Confidence</TableHead>
                  <TableHead className="text-white">Data</TableHead>
                  <TableHead className="text-white w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <React.Fragment key={row.rowIndex}>
                    <TableRow className="border-white/5">
                      <TableCell className="text-white font-mono">
                        {row.rowIndex}
                      </TableCell>
                      <TableCell>
                        {row.isValid ? (
                          <Badge className="bg-green-500/20 text-green-300">Valid</Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-300">Invalid</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.hasErrors && (
                            <Badge variant="outline" className="border-red-500/50 text-red-300 text-xs">
                              E: {row.validationErrors.filter(e => e.errorType === 'critical').length}
                            </Badge>
                          )}
                          {row.hasWarnings && (
                            <Badge variant="outline" className="border-yellow-500/50 text-yellow-300 text-xs">
                              W: {row.validationErrors.filter(e => e.errorType === 'warning').length}
                            </Badge>
                          )}
                          {row.hasInfo && (
                            <Badge variant="outline" className="border-blue-500/50 text-blue-300 text-xs">
                              I: {row.validationErrors.filter(e => e.errorType === 'info').length}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={row.confidence} className="w-16 h-2" />
                          <span className="text-white/70 text-sm">{row.confidence}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-white/70 text-sm">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(row.mappedData).slice(0, 3).map(([key, value]) => (
                            <span key={key} className="bg-white/10 px-2 py-1 rounded text-xs">
                              {key}: {String(value).slice(0, 20)}
                              {String(value).length > 20 && '...'}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleRowExpansion(row.rowIndex)}
                          className="h-8 w-8 p-0"
                        >
                          {expandedRows.has(row.rowIndex) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    {expandedRows.has(row.rowIndex) && (
                      <TableRow>
                        <TableCell colSpan={6} className="p-0">
                          <Collapsible open={true}>
                            <CollapsibleContent>
                              <div className="p-4 bg-white/5 border-t border-white/10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Original Data */}
                                  <div>
                                    <h5 className="text-white font-medium mb-2">Original Data</h5>
                                    <div className="space-y-1 text-sm">
                                      {Object.entries(row.originalData).map(([key, value]) => (
                                        <div key={key} className="flex justify-between">
                                          <span className="text-white/60">{key}:</span>
                                          <span className="text-white">{String(value)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {/* Validation Errors */}
                                  <div>
                                    <h5 className="text-white font-medium mb-2">Validation Issues</h5>
                                    <div className="space-y-2">
                                      {row.validationErrors.map((error, index) => (
                                        <div
                                          key={index}
                                          className={cn(
                                            "p-2 rounded text-xs",
                                            getSeverityColor(error.errorType)
                                          )}
                                        >
                                          <div className="flex items-center gap-2 mb-1">
                                            {renderSeverityIcon(error.errorType)}
                                            <Badge variant="outline" className="text-xs">
                                              {error.field}
                                            </Badge>
                                          </div>
                                          <p>{error.message}</p>
                                          {error.suggestion && (
                                            <p className="mt-1 italic">💡 {error.suggestion}</p>
                                          )}
                                        </div>
                                      ))}
                                      
                                      {row.validationErrors.length === 0 && (
                                        <div className="text-green-300 text-sm">
                                          ✅ No issues found
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Validation Results</h2>
          <p className="text-white/70">
            {summary.validRows} of {summary.totalRows} rows validated successfully
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {summary.criticalErrors > 0 && (
            <Alert className="bg-red-500/10 border-red-500/20 inline-flex p-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-300 ml-2">
                {summary.criticalErrors} critical errors require attention
              </AlertDescription>
            </Alert>
          )}
          
          {summary.criticalErrors === 0 && summary.validRows > 0 && (
            <Alert className="bg-green-500/10 border-green-500/20 inline-flex p-2">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-300 ml-2">
                Ready for import
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={currentTab} onValueChange={(value: any) => setCurrentTab(value)}>
        <TabsList className="bg-white/10 border-white/20">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white/20">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="errors" className="data-[state=active]:bg-white/20">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Issues ({filteredErrors.length})
          </TabsTrigger>
          {showDetailedView && (
            <TabsTrigger value="data" className="data-[state=active]:bg-white/20">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Data Preview
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {renderOverviewTab()}
        </TabsContent>

        <TabsContent value="errors" className="mt-6">
          {renderErrorsTab()}
        </TabsContent>

        {showDetailedView && (
          <TabsContent value="data" className="mt-6">
            {renderDataTab()}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ValidationResults;