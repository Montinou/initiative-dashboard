/**
 * File Manager Component
 * Comprehensive file management with filtering, search, and role-based actions
 */

"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  Share,
  FileText,
  FileSpreadsheet,
  Image,
  Calendar,
  User,
  FolderOpen,
  MoreVertical,
  Grid,
  List,
  SortAsc,
  SortDesc,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface FileItem {
  id: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_type: string;
  file_category: string;
  upload_status: string;
  processing_status: string;
  access_level: string;
  created_at: string;
  updated_at: string;
  uploaded_by: string;
  uploader_name?: string;
  area_name?: string;
  initiative_title?: string;
  metadata: Record<string, any>;
}

export interface FileManagerProps {
  // Data
  files: FileItem[];
  loading?: boolean;
  
  // Configuration
  areaId?: string;
  initiativeId?: string;
  userRole?: string;
  canUpload?: boolean;
  canDelete?: boolean;
  canShare?: boolean;
  
  // UI Options
  className?: string;
  showUploader?: boolean;
  showArea?: boolean;
  showInitiative?: boolean;
  compactMode?: boolean;
  defaultView?: 'grid' | 'list';
  
  // Event handlers
  onRefresh?: () => void;
  onFileSelect?: (fileId: string) => void;
  onFilePreview?: (fileId: string) => void;
  onFileDownload?: (fileId: string) => void;
  onFileDelete?: (fileId: string) => void;
  onFileShare?: (fileId: string) => void;
  onBulkAction?: (action: string, fileIds: string[]) => void;
}

type SortField = 'name' | 'size' | 'type' | 'date' | 'uploader';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const FileManager: React.FC<FileManagerProps> = ({
  files,
  loading = false,
  areaId,
  initiativeId,
  userRole = 'Analyst',
  canUpload = true,
  canDelete = false,
  canShare = false,
  className,
  showUploader = true,
  showArea = true,
  showInitiative = true,
  compactMode = false,
  defaultView = 'list',
  onRefresh,
  onFileSelect,
  onFilePreview,
  onFileDownload,
  onFileDelete,
  onFileShare,
  onBulkAction
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const filteredAndSortedFiles = useMemo(() => {
    let filtered = files;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(file => 
        file.original_filename.toLowerCase().includes(query) ||
        file.uploader_name?.toLowerCase().includes(query) ||
        file.area_name?.toLowerCase().includes(query) ||
        file.initiative_title?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(file => file.file_category === filterCategory);
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(file => file.upload_status === filterStatus);
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(file => file.file_type === filterType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.original_filename.toLowerCase();
          bValue = b.original_filename.toLowerCase();
          break;
        case 'size':
          aValue = a.file_size;
          bValue = b.file_size;
          break;
        case 'type':
          aValue = a.file_type;
          bValue = b.file_type;
          break;
        case 'date':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'uploader':
          aValue = a.uploader_name?.toLowerCase() || '';
          bValue = b.uploader_name?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [files, searchQuery, filterCategory, filterStatus, filterType, sortField, sortOrder]);

  const fileStats = useMemo(() => {
    const totalSize = files.reduce((sum, file) => sum + file.file_size, 0);
    const categories = files.reduce((acc, file) => {
      acc[file.file_category] = (acc[file.file_category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: files.length,
      totalSize,
      categories,
      filtered: filteredAndSortedFiles.length
    };
  }, [files, filteredAndSortedFiles]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleFileSelect = useCallback((fileId: string, selected: boolean) => {
    setSelectedFiles(prev => 
      selected 
        ? [...prev, fileId]
        : prev.filter(id => id !== fileId)
    );
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    setSelectedFiles(selected ? filteredAndSortedFiles.map(f => f.id) : []);
  }, [filteredAndSortedFiles]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField]);

  const handleBulkAction = useCallback((action: string) => {
    if (selectedFiles.length > 0) {
      onBulkAction?.(action, selectedFiles);
      setSelectedFiles([]);
    }
  }, [selectedFiles, onBulkAction]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'spreadsheet': return FileSpreadsheet;
      case 'image': return Image;
      case 'pdf': 
      case 'document': 
      default: return FileText;
    }
  };

  const formatFileSize = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <TooltipProvider>
      <div className={cn('w-full space-y-4', className)}>
        {/* Header */}
        <Card className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-sm border border-white/20">
          <CardHeader className={cn('pb-4', compactMode && 'pb-2')}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className={cn('text-white', compactMode ? 'text-lg' : 'text-xl')}>
                  File Manager
                </CardTitle>
                <p className={cn('text-gray-300 mt-1', compactMode ? 'text-xs' : 'text-sm')}>
                  {fileStats.filtered} of {fileStats.total} files ({formatFileSize(fileStats.totalSize)})
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex items-center bg-white/10 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-8 w-8 p-0"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="h-8 w-8 p-0"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                </div>

                {/* Refresh Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={loading}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>

              {/* Category Filter */}
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="okr_data">OKR Data</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="uploaded">Uploaded</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="spreadsheet">Spreadsheets</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="pdf">PDFs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            {selectedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20"
              >
                <span className="text-sm text-white">
                  {selectedFiles.length} files selected
                </span>
                <div className="flex gap-2 ml-auto">
                  {canShare && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction('share')}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <Share className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('download')}
                    className="text-white border-white/20 hover:bg-white/10"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  {canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction('delete')}
                      className="text-red-400 border-red-400/20 hover:bg-red-400/10"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* File List/Grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <FileManagerSkeleton viewMode={viewMode} compactMode={compactMode} />
          ) : filteredAndSortedFiles.length === 0 ? (
            <EmptyState searchQuery={searchQuery} />
          ) : (
            <motion.div
              key={viewMode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {viewMode === 'list' ? (
                <FileListView
                  files={filteredAndSortedFiles}
                  selectedFiles={selectedFiles}
                  sortField={sortField}
                  sortOrder={sortOrder}
                  compactMode={compactMode}
                  showUploader={showUploader}
                  showArea={showArea}
                  showInitiative={showInitiative}
                  canDelete={canDelete}
                  canShare={canShare}
                  onSelectAll={handleSelectAll}
                  onFileSelect={handleFileSelect}
                  onSort={handleSort}
                  onFilePreview={onFilePreview}
                  onFileDownload={onFileDownload}
                  onFileDelete={onFileDelete}
                  onFileShare={onFileShare}
                  getFileIcon={getFileIcon}
                  formatFileSize={formatFileSize}
                  formatDate={formatDate}
                  getStatusColor={getStatusColor}
                />
              ) : (
                <FileGridView
                  files={filteredAndSortedFiles}
                  selectedFiles={selectedFiles}
                  compactMode={compactMode}
                  canDelete={canDelete}
                  canShare={canShare}
                  onFileSelect={handleFileSelect}
                  onFilePreview={onFilePreview}
                  onFileDownload={onFileDownload}
                  onFileDelete={onFileDelete}
                  onFileShare={onFileShare}
                  getFileIcon={getFileIcon}
                  formatFileSize={formatFileSize}
                  formatDate={formatDate}
                  getStatusColor={getStatusColor}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
};

// ============================================================================
// FILE LIST VIEW COMPONENT
// ============================================================================

interface FileListViewProps {
  files: FileItem[];
  selectedFiles: string[];
  sortField: SortField;
  sortOrder: SortOrder;
  compactMode: boolean;
  showUploader: boolean;
  showArea: boolean;
  showInitiative: boolean;
  canDelete: boolean;
  canShare: boolean;
  onSelectAll: (selected: boolean) => void;
  onFileSelect: (fileId: string, selected: boolean) => void;
  onSort: (field: SortField) => void;
  onFilePreview?: (fileId: string) => void;
  onFileDownload?: (fileId: string) => void;
  onFileDelete?: (fileId: string) => void;
  onFileShare?: (fileId: string) => void;
  getFileIcon: (fileType: string) => React.ElementType;
  formatFileSize: (bytes: number) => string;
  formatDate: (dateString: string) => string;
  getStatusColor: (status: string) => string;
}

const FileListView: React.FC<FileListViewProps> = ({
  files,
  selectedFiles,
  sortField,
  sortOrder,
  compactMode,
  showUploader,
  showArea,
  showInitiative,
  canDelete,
  canShare,
  onSelectAll,
  onFileSelect,
  onSort,
  onFilePreview,
  onFileDownload,
  onFileDelete,
  onFileShare,
  getFileIcon,
  formatFileSize,
  formatDate,
  getStatusColor
}) => {
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? SortAsc : SortDesc;
  };

  return (
    <Card className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-sm border border-white/20">
      <CardContent className="p-0">
        {/* Table Header */}
        <div className={cn(
          'grid items-center gap-4 p-4 border-b border-white/10 text-sm text-gray-300',
          compactMode ? 'text-xs' : 'text-sm',
          showUploader && showArea && showInitiative 
            ? 'grid-cols-[auto_1fr_80px_120px_100px_100px_100px_auto]'
            : 'grid-cols-[auto_1fr_80px_120px_100px_auto]'
        )}>
          <Checkbox
            checked={selectedFiles.length === files.length && files.length > 0}
            onCheckedChange={onSelectAll}
          />
          
          <button
            onClick={() => onSort('name')}
            className="flex items-center gap-1 hover:text-white transition-colors text-left"
          >
            Name
            {getSortIcon('name') && React.createElement(getSortIcon('name')!, { className: 'h-3 w-3' })}
          </button>
          
          <button
            onClick={() => onSort('size')}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            Size
            {getSortIcon('size') && React.createElement(getSortIcon('size')!, { className: 'h-3 w-3' })}
          </button>
          
          <button
            onClick={() => onSort('type')}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            Type
            {getSortIcon('type') && React.createElement(getSortIcon('type')!, { className: 'h-3 w-3' })}
          </button>
          
          <button
            onClick={() => onSort('date')}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            Date
            {getSortIcon('date') && React.createElement(getSortIcon('date')!, { className: 'h-3 w-3' })}
          </button>
          
          {showUploader && (
            <button
              onClick={() => onSort('uploader')}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              Uploader
              {getSortIcon('uploader') && React.createElement(getSortIcon('uploader')!, { className: 'h-3 w-3' })}
            </button>
          )}
          
          {showArea && <span>Area</span>}
          {showInitiative && <span>Initiative</span>}
          
          <span>Actions</span>
        </div>

        {/* File Rows */}
        <div className="divide-y divide-white/5">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.file_type);
            const isSelected = selectedFiles.includes(file.id);

            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  'grid items-center gap-4 p-4 hover:bg-white/5 transition-colors',
                  compactMode ? 'text-xs' : 'text-sm',
                  isSelected && 'bg-primary/10',
                  showUploader && showArea && showInitiative 
                    ? 'grid-cols-[auto_1fr_80px_120px_100px_100px_100px_auto]'
                    : 'grid-cols-[auto_1fr_80px_120px_100px_auto]'
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => onFileSelect(file.id, checked as boolean)}
                />
                
                <div className="flex items-center gap-3 min-w-0">
                  <FileIcon className={cn(
                    'text-gray-400 flex-shrink-0',
                    compactMode ? 'h-4 w-4' : 'h-5 w-5'
                  )} />
                  <div className="min-w-0">
                    <p className="text-white truncate font-medium">
                      {file.original_filename}
                    </p>
                    <Badge className={cn('text-xs mt-1', getStatusColor(file.upload_status))}>
                      {file.upload_status}
                    </Badge>
                  </div>
                </div>
                
                <span className="text-gray-400">{formatFileSize(file.file_size)}</span>
                <span className="text-gray-400 capitalize">{file.file_type}</span>
                <span className="text-gray-400">{formatDate(file.created_at)}</span>
                
                {showUploader && (
                  <span className="text-gray-400 truncate">{file.uploader_name || 'Unknown'}</span>
                )}
                
                {showArea && (
                  <span className="text-gray-400 truncate">{file.area_name || '-'}</span>
                )}
                
                {showInitiative && (
                  <span className="text-gray-400 truncate">{file.initiative_title || '-'}</span>
                )}
                
                <div className="flex items-center gap-1">
                  <FileActions
                    file={file}
                    canDelete={canDelete}
                    canShare={canShare}
                    onPreview={onFilePreview}
                    onDownload={onFileDownload}
                    onDelete={onFileDelete}
                    onShare={onFileShare}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// FILE GRID VIEW COMPONENT
// ============================================================================

interface FileGridViewProps {
  files: FileItem[];
  selectedFiles: string[];
  compactMode: boolean;
  canDelete: boolean;
  canShare: boolean;
  onFileSelect: (fileId: string, selected: boolean) => void;
  onFilePreview?: (fileId: string) => void;
  onFileDownload?: (fileId: string) => void;
  onFileDelete?: (fileId: string) => void;
  onFileShare?: (fileId: string) => void;
  getFileIcon: (fileType: string) => React.ElementType;
  formatFileSize: (bytes: number) => string;
  formatDate: (dateString: string) => string;
  getStatusColor: (status: string) => string;
}

const FileGridView: React.FC<FileGridViewProps> = ({
  files,
  selectedFiles,
  compactMode,
  canDelete,
  canShare,
  onFileSelect,
  onFilePreview,
  onFileDownload,
  onFileDelete,
  onFileShare,
  getFileIcon,
  formatFileSize,
  formatDate,
  getStatusColor
}) => {
  return (
    <div className={cn(
      'grid gap-4',
      compactMode 
        ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'
        : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
    )}>
      {files.map((file) => {
        const FileIcon = getFileIcon(file.file_type);
        const isSelected = selectedFiles.includes(file.id);

        return (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'relative group',
              isSelected && 'ring-2 ring-primary/50'
            )}
          >
            <Card className={cn(
              'bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-sm border border-white/20',
              'hover:from-white/15 hover:via-white/8 hover:to-white/5 transition-all duration-200',
              'cursor-pointer',
              isSelected && 'bg-primary/10 border-primary/30'
            )}>
              <CardContent className={cn('p-4', compactMode && 'p-3')}>
                {/* Selection Checkbox */}
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onFileSelect(file.id, checked as boolean)}
                    className="bg-white/20 border-white/40"
                  />
                </div>

                {/* File Icon */}
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={cn(
                    'p-4 rounded-lg bg-white/10 border border-white/20',
                    compactMode ? 'p-3' : 'p-4'
                  )}>
                    <FileIcon className={cn(
                      'text-gray-300',
                      compactMode ? 'h-6 w-6' : 'h-8 w-8'
                    )} />
                  </div>

                  {/* File Info */}
                  <div className="w-full space-y-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className={cn(
                          'text-white font-medium truncate',
                          compactMode ? 'text-xs' : 'text-sm'
                        )}>
                          {file.original_filename}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent>{file.original_filename}</TooltipContent>
                    </Tooltip>
                    
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        'text-gray-400',
                        compactMode ? 'text-xs' : 'text-sm'
                      )}>
                        {formatFileSize(file.file_size)}
                      </span>
                      <Badge className={cn('text-xs', getStatusColor(file.upload_status))}>
                        {file.upload_status}
                      </Badge>
                    </div>
                    
                    <p className={cn(
                      'text-gray-500',
                      compactMode ? 'text-xs' : 'text-sm'
                    )}>
                      {formatDate(file.created_at)}
                    </p>
                  </div>
                </div>

                {/* Actions Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <FileActions
                    file={file}
                    canDelete={canDelete}
                    canShare={canShare}
                    onPreview={onFilePreview}
                    onDownload={onFileDownload}
                    onDelete={onFileDelete}
                    onShare={onFileShare}
                    overlay
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};

// ============================================================================
// FILE ACTIONS COMPONENT
// ============================================================================

interface FileActionsProps {
  file: FileItem;
  canDelete: boolean;
  canShare: boolean;
  overlay?: boolean;
  onPreview?: (fileId: string) => void;
  onDownload?: (fileId: string) => void;
  onDelete?: (fileId: string) => void;
  onShare?: (fileId: string) => void;
}

const FileActions: React.FC<FileActionsProps> = ({
  file,
  canDelete,
  canShare,
  overlay = false,
  onPreview,
  onDownload,
  onDelete,
  onShare
}) => {
  if (overlay) {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPreview?.(file.id)}
          className="bg-white/20 hover:bg-white/30 text-white border-0"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onDownload?.(file.id)}
          className="bg-white/20 hover:bg-white/30 text-white border-0"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onPreview?.(file.id)}>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDownload?.(file.id)}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </DropdownMenuItem>
        {canShare && (
          <DropdownMenuItem onClick={() => onShare?.(file.id)}>
            <Share className="h-4 w-4 mr-2" />
            Share
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {canDelete && (
          <DropdownMenuItem 
            onClick={() => onDelete?.(file.id)}
            className="text-red-400 focus:text-red-400"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const FileManagerSkeleton: React.FC<{ viewMode: ViewMode; compactMode: boolean }> = ({ viewMode, compactMode }) => (
  <Card className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-sm border border-white/20">
    <CardContent className="p-6">
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-4 w-4 bg-white/10 rounded" />
            <div className="h-8 w-8 bg-white/10 rounded" />
            <div className="flex-1 h-4 bg-white/10 rounded" />
            <div className="h-4 w-16 bg-white/10 rounded" />
            <div className="h-4 w-20 bg-white/10 rounded" />
            <div className="h-4 w-24 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const EmptyState: React.FC<{ searchQuery: string }> = ({ searchQuery }) => (
  <Card className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-sm border border-white/20">
    <CardContent className="p-12 text-center">
      <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">
        {searchQuery ? 'No files found' : 'No files uploaded'}
      </h3>
      <p className="text-gray-400">
        {searchQuery 
          ? `No files match "${searchQuery}". Try adjusting your search or filters.`
          : 'Upload some files to get started.'
        }
      </p>
    </CardContent>
  </Card>
);