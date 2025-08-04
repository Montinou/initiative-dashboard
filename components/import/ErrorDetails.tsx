/**
 * ErrorDetails.tsx - IMPORT-003 Validation & Error Handling
 * 
 * Detailed error breakdown component with contextual information,
 * fix suggestions, batch operations, and intelligent error analysis.
 * Provides deep dive into validation issues with actionable solutions.
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
  Lightbulb,
  Bug,
  Shield,
  Zap,
  Target,
  FileX,
  BookOpen,
  Code,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  X,
  RefreshCw,
  Wand2,
  CheckSquare,
  Square,
  MoreHorizontal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ErrorDetail {
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

export interface ErrorGroup {
  category: string;
  errorType: 'critical' | 'warning' | 'info';
  count: number;
  errors: ErrorDetail[];
  description: string;
  commonCause?: string;
  batchFixAvailable: boolean;
}

export interface ErrorDetailsProps {
  errors: ErrorDetail[];
  onApplyFix?: (errorId: string, fixAction: FixAction) => Promise<void>;
  onBatchFix?: (errorIds: string[], fixAction: FixAction) => Promise<void>;
  onIgnoreError?: (errorId: string, reason?: string) => void;
  onRequestHelp?: (errorId: string, context: string) => void;
  className?: string;
  readOnly?: boolean;
  showDocumentation?: boolean;
}

// ============================================================================
// MAIN ERROR DETAILS COMPONENT
// ============================================================================

export const ErrorDetails: React.FC<ErrorDetailsProps> = ({
  errors,
  onApplyFix,
  onBatchFix,
  onIgnoreError,
  onRequestHelp,
  className,
  readOnly = false,
  showDocumentation = true
}) => {
  // State management
  const [selectedErrors, setSelectedErrors] = useState<Set<string>>(new Set());
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'severity' | 'row' | 'category' | 'field'>('severity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTab, setCurrentTab] = useState<'grouped' | 'detailed' | 'fixes'>('grouped');
  const [isApplyingFix, setIsApplyingFix] = useState<Set<string>>(new Set());
  const [selectedBatchFix, setSelectedBatchFix] = useState<FixAction | null>(null);

  // Computed data
  const errorGroups = useMemo(() => {
    const groups: Record<string, ErrorGroup> = {};
    
    errors.forEach(error => {
      const key = `${error.category}-${error.errorType}`;
      if (!groups[key]) {
        groups[key] = {
          category: error.category,
          errorType: error.errorType,
          count: 0,
          errors: [],
          description: getCategoryDescription(error.category),
          commonCause: getCommonCause(error.category),
          batchFixAvailable: hasBatchFixAvailable(error.category)
        };
      }
      groups[key].count++;
      groups[key].errors.push(error);
    });
    
    return Object.values(groups).sort((a, b) => {
      // Sort by severity first (critical > warning > info)
      const severityOrder = { critical: 3, warning: 2, info: 1 };
      if (a.errorType !== b.errorType) {
        return severityOrder[b.errorType] - severityOrder[a.errorType];
      }
      return b.count - a.count;
    });
  }, [errors]);

  const filteredAndSortedErrors = useMemo(() => {
    let filtered = errors.filter(error => {
      if (filterCategory !== 'all' && error.category !== filterCategory) return false;
      if (filterSeverity !== 'all' && error.errorType !== filterSeverity) return false;
      if (searchQuery && !error.message.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !error.field.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'severity':
          const severityOrder = { critical: 3, warning: 2, info: 1 };
          comparison = severityOrder[b.errorType] - severityOrder[a.errorType];
          break;
        case 'row':
          comparison = a.row - b.row;
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'field':
          comparison = a.field.localeCompare(b.field);
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [errors, filterCategory, filterSeverity, searchQuery, sortBy, sortOrder]);

  // Helper functions
  const getCategoryDescription = useCallback((category: string): string => {
    const descriptions = {
      data_type: 'Issues with data types and format validation',
      business_logic: 'Violations of business rules and constraints',
      referential_integrity: 'References to non-existent records or relationships',
      format: 'Data format and structure issues',
      missing_data: 'Required fields that are empty or missing',
      duplicate: 'Duplicate records or conflicting data',
      permission: 'Access restrictions and authorization issues'
    };
    return descriptions[category as keyof typeof descriptions] || 'General validation issues';
  }, []);

  const getCommonCause = useCallback((category: string): string => {
    const causes = {
      data_type: 'Incorrect column mapping or data entry errors',
      business_logic: 'Business rule changes or incorrect data relationships',
      referential_integrity: 'Missing reference data or outdated relationships',
      format: 'Inconsistent data formatting across sources',
      missing_data: 'Incomplete data entry or missing required fields',
      duplicate: 'Data synchronization issues or manual entry errors',
      permission: 'User role restrictions or area access limitations'
    };
    return causes[category as keyof typeof causes] || 'Various validation issues';
  }, []);

  const hasBatchFixAvailable = useCallback((category: string): boolean => {
    return ['format', 'missing_data', 'data_type'].includes(category);
  }, []);

  // Event handlers
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

  const toggleErrorExpansion = useCallback((errorId: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  }, []);

  const handleApplyFix = useCallback(async (errorId: string, fixAction: FixAction) => {
    if (!onApplyFix) return;
    
    setIsApplyingFix(prev => new Set(prev).add(errorId));
    try {
      await onApplyFix(errorId, fixAction);
    } finally {
      setIsApplyingFix(prev => {
        const newSet = new Set(prev);
        newSet.delete(errorId);
        return newSet;
      });
    }
  }, [onApplyFix]);

  const handleBatchFix = useCallback(async () => {
    if (!onBatchFix || !selectedBatchFix || selectedErrors.size === 0) return;
    
    const errorIds = Array.from(selectedErrors);
    try {
      await onBatchFix(errorIds, selectedBatchFix);
      setSelectedErrors(new Set());
      setSelectedBatchFix(null);
    } catch (error) {
      console.error('Batch fix failed:', error);
    }
  }, [onBatchFix, selectedBatchFix, selectedErrors]);

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

  const getCategoryIcon = (category: string) => {
    const icons = {
      data_type: Code,
      business_logic: Shield,
      referential_integrity: Target,
      format: FileX,
      missing_data: AlertCircle,
      duplicate: Copy,
      permission: Bug
    };
    const IconComponent = icons[category as keyof typeof icons] || Bug;
    return <IconComponent className="h-4 w-4" />;
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

  const renderGroupedView = () => (
    <div className="space-y-4">
      {errorGroups.map((group, index) => (
        <Card key={`${group.category}-${group.errorType}`} className="glass-morphism border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getCategoryIcon(group.category)}
                {renderSeverityIcon(group.errorType)}
                <div>
                  <CardTitle className="text-white text-lg">
                    {group.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </CardTitle>
                  <p className="text-white/60 text-sm">{group.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge className={cn(getSeverityColor(group.errorType))}>
                  {group.count} {group.count === 1 ? 'error' : 'errors'}
                </Badge>
                
                {group.batchFixAvailable && !readOnly && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                    onClick={() => {
                      const groupErrorIds = group.errors.map(e => e.id);
                      setSelectedErrors(new Set(groupErrorIds));
                    }}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Batch Fix
                  </Button>
                )}
              </div>
            </div>
            
            {group.commonCause && (
              <Alert className="bg-blue-500/5 border-blue-500/20 mt-3">
                <Lightbulb className="h-4 w-4" />
                <AlertDescription className="text-white/80">
                  <strong>Common cause:</strong> {group.commonCause}
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          
          <CardContent>
            <div className="space-y-2">
              {group.errors.slice(0, 3).map(error => (
                <div
                  key={error.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedErrors.has(error.id)}
                      onCheckedChange={() => toggleErrorSelection(error.id)}
                    />
                    <Badge variant="outline" className="text-xs">
                      Row {error.row}
                    </Badge>
                    <span className="text-white text-sm">{error.message}</span>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setCurrentTab('detailed');
                      setExpandedErrors(new Set([error.id]));
                    }}
                    className="text-white/60 hover:text-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {group.errors.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterCategory(group.category);
                    setFilterSeverity(group.errorType);
                    setCurrentTab('detailed');
                  }}
                  className="w-full text-white/70 hover:text-white"
                >
                  View all {group.errors.length} errors
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderDetailedView = () => (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-white/60" />
          <Input
            placeholder="Search errors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 bg-white/10 border-white/20 text-white placeholder:text-white/50"
          />
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="data_type">Data Type</SelectItem>
            <SelectItem value="business_logic">Business Logic</SelectItem>
            <SelectItem value="referential_integrity">Referential Integrity</SelectItem>
            <SelectItem value="format">Format</SelectItem>
            <SelectItem value="missing_data">Missing Data</SelectItem>
            <SelectItem value="duplicate">Duplicate</SelectItem>
            <SelectItem value="permission">Permission</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="border-white/20 text-white hover:bg-white/10"
          >
            {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>
          
          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
            <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="severity">Severity</SelectItem>
              <SelectItem value="row">Row</SelectItem>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="field">Field</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {selectedErrors.size > 0 && (
          <Badge variant="outline" className="ml-auto">
            {selectedErrors.size} selected
          </Badge>
        )}
      </div>

      {/* Error List */}
      <div className="space-y-2">
        {filteredAndSortedErrors.map((error) => (
          <Card
            key={error.id}
            className={cn(
              "glass-morphism border-white/10 transition-all duration-200",
              selectedErrors.has(error.id) && "ring-2 ring-blue-500/50",
              expandedErrors.has(error.id) && "bg-white/5"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedErrors.has(error.id)}
                  onCheckedChange={() => toggleErrorSelection(error.id)}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {renderSeverityIcon(error.errorType)}
                    {getCategoryIcon(error.category)}
                    
                    <Badge variant="outline" className="text-xs">
                      Row {error.row}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {error.field}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {error.code}
                    </Badge>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleErrorExpansion(error.id)}
                      className="ml-auto h-6 w-6 p-0"
                    >
                      {expandedErrors.has(error.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  <p className="text-white text-sm mb-2">{error.message}</p>
                  
                  {error.value && (
                    <div className="text-white/60 text-xs mb-2">
                      Current value: <code className="bg-white/10 px-1 rounded">{String(error.value)}</code>
                    </div>
                  )}
                  
                  {error.suggestion && (
                    <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded">
                      <Lightbulb className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-blue-300 text-xs">
                        <strong>Suggestion:</strong> {error.suggestion}
                      </div>
                    </div>
                  )}
                  
                  {/* Expanded Content */}
                  <AnimatePresence>
                    {expandedErrors.has(error.id) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 space-y-4"
                      >
                        {/* Context Information */}
                        {error.context && (
                          <div className="bg-white/5 rounded-lg p-3">
                            <h5 className="text-white font-medium mb-2">Context</h5>
                            <div className="space-y-2 text-sm">
                              {error.context.businessRule && (
                                <div>
                                  <span className="text-white/60">Business Rule:</span>
                                  <span className="text-white ml-2">{error.context.businessRule}</span>
                                </div>
                              )}
                              {error.context.expectedFormat && (
                                <div>
                                  <span className="text-white/60">Expected Format:</span>
                                  <code className="bg-white/10 px-1 rounded ml-2">{error.context.expectedFormat}</code>
                                </div>
                              )}
                              {error.context.validOptions && (
                                <div>
                                  <span className="text-white/60">Valid Options:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {error.context.validOptions.map((option, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">
                                        {option}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Fix Actions */}
                        {error.fixActions && error.fixActions.length > 0 && !readOnly && (
                          <div className="bg-white/5 rounded-lg p-3">
                            <h5 className="text-white font-medium mb-2">Available Fixes</h5>
                            <div className="space-y-2">
                              {error.fixActions.map((fix) => (
                                <div
                                  key={fix.id}
                                  className="flex items-center justify-between p-2 bg-white/5 rounded"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-white text-sm">{fix.label}</span>
                                      <Badge 
                                        variant="outline" 
                                        className={cn(
                                          "text-xs",
                                          fix.confidence > 80 ? "border-green-500/50 text-green-300" :
                                          fix.confidence > 60 ? "border-yellow-500/50 text-yellow-300" :
                                          "border-red-500/50 text-red-300"
                                        )}
                                      >
                                        {fix.confidence}% confidence
                                      </Badge>
                                    </div>
                                    <p className="text-white/60 text-xs mt-1">{fix.description}</p>
                                    {fix.previewValue && (
                                      <p className="text-blue-300 text-xs mt-1">
                                        Preview: <code className="bg-blue-500/20 px-1 rounded">{String(fix.previewValue)}</code>
                                      </p>
                                    )}
                                  </div>
                                  
                                  <Button
                                    size="sm"
                                    onClick={() => handleApplyFix(error.id, fix)}
                                    disabled={isApplyingFix.has(error.id)}
                                    className="bg-green-600 hover:bg-green-700 ml-2"
                                  >
                                    {isApplyingFix.has(error.id) ? (
                                      <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Zap className="h-4 w-4 mr-1" />
                                        Apply
                                      </>
                                    )}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Documentation */}
                        {error.documentation && showDocumentation && (
                          <div className="bg-white/5 rounded-lg p-3">
                            <h5 className="text-white font-medium mb-2 flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              {error.documentation.title}
                            </h5>
                            <p className="text-white/70 text-sm mb-2">{error.documentation.description}</p>
                            
                            {error.documentation.examples && (
                              <div className="mb-2">
                                <span className="text-white/60 text-xs">Examples:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {error.documentation.examples.map((example, index) => (
                                    <code key={index} className="bg-white/10 px-2 py-1 rounded text-xs">
                                      {example}
                                    </code>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {error.documentation.learnMoreUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-white/20 text-white hover:bg-white/10"
                                onClick={() => window.open(error.documentation!.learnMoreUrl, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Learn More
                              </Button>
                            )}
                          </div>
                        )}
                        
                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                          {onIgnoreError && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onIgnoreError(error.id)}
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Ignore
                            </Button>
                          )}
                          
                          {onRequestHelp && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onRequestHelp(error.id, error.message)}
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Get Help
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigator.clipboard.writeText(JSON.stringify(error, null, 2))}
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Details
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredAndSortedErrors.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <p className="text-white/70">No errors match your current filters</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderFixesView = () => (
    <div className="space-y-6">
      {/* Batch Fix Section */}
      {selectedErrors.size > 0 && (
        <Card className="glass-morphism border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Batch Fix ({selectedErrors.size} errors selected)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-blue-500/10 border-blue-500/20">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-white">
                Apply the same fix to all selected errors. This action cannot be undone.
              </AlertDescription>
            </Alert>
            
            <div className="flex items-center gap-4">
              <Select
                value={selectedBatchFix?.id || ''}
                onValueChange={(value) => {
                  // Find the fix action from available fixes
                  const allFixes = errors.flatMap(e => e.fixActions || []);
                  const fix = allFixes.find(f => f.id === value);
                  setSelectedBatchFix(fix || null);
                }}
              >
                <SelectTrigger className="flex-1 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select a batch fix to apply" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="replace_empty">Replace empty values with defaults</SelectItem>
                  <SelectItem value="format_dates">Standardize date formats</SelectItem>
                  <SelectItem value="trim_whitespace">Remove extra whitespace</SelectItem>
                  <SelectItem value="apply_mapping">Apply column mapping suggestions</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                onClick={handleBatchFix}
                disabled={!selectedBatchFix}
                className="bg-green-600 hover:bg-green-700"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Apply Batch Fix
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Individual Fix Suggestions */}
      <Card className="glass-morphism border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="h-5 w-5" />
            Fix Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {errors
              .filter(error => error.fixActions && error.fixActions.length > 0)
              .slice(0, 10)
              .map((error) => (
                <div key={error.id} className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {renderSeverityIcon(error.errorType)}
                    <Badge variant="outline" className="text-xs">Row {error.row}</Badge>
                    <span className="text-white text-sm">{error.message}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {error.fixActions!.slice(0, 2).map((fix) => (
                      <Button
                        key={fix.id}
                        size="sm"
                        variant="outline"
                        onClick={() => handleApplyFix(error.id, fix)}
                        disabled={isApplyingFix.has(error.id)}
                        className="border-white/20 text-white hover:bg-white/10 justify-start"
                      >
                        {isApplyingFix.has(error.id) ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4 mr-2" />
                        )}
                        {fix.label}
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "ml-auto text-xs",
                            fix.confidence > 80 ? "border-green-500/50 text-green-300" :
                            fix.confidence > 60 ? "border-yellow-500/50 text-yellow-300" :
                            "border-red-500/50 text-red-300"
                          )}
                        >
                          {fix.confidence}%
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Error Details</h2>
          <p className="text-white/70">
            {errors.length} {errors.length === 1 ? 'issue' : 'issues'} found across your data
          </p>
        </div>
        
        {selectedErrors.size > 0 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedErrors(new Set())}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Clear Selection
            </Button>
            
            <Badge variant="outline">
              {selectedErrors.size} selected
            </Badge>
          </div>
        )}
      </div>

      <Tabs value={currentTab} onValueChange={(value: any) => setCurrentTab(value)}>
        <TabsList className="bg-white/10 border-white/20">
          <TabsTrigger value="grouped" className="data-[state=active]:bg-white/20">
            <Shield className="h-4 w-4 mr-2" />
            Grouped ({errorGroups.length})
          </TabsTrigger>
          <TabsTrigger value="detailed" className="data-[state=active]:bg-white/20">
            <Bug className="h-4 w-4 mr-2" />
            Detailed ({filteredAndSortedErrors.length})
          </TabsTrigger>
          <TabsTrigger value="fixes" className="data-[state=active]:bg-white/20">
            <Wand2 className="h-4 w-4 mr-2" />
            Fixes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grouped" className="mt-6">
          {renderGroupedView()}
        </TabsContent>

        <TabsContent value="detailed" className="mt-6">
          {renderDetailedView()}
        </TabsContent>

        <TabsContent value="fixes" className="mt-6">
          {renderFixesView()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ErrorDetails;