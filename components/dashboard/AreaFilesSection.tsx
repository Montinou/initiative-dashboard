/**
 * Area Files Section
 * Comprehensive file management section for area dashboards
 */

"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  FolderOpen, 
  Upload, 
  Filter,
  Search,
  Grid,
  List,
  Plus,
  Download,
  Eye,
  Share,
  Trash2,
  MoreVertical,
  FileSpreadsheet,
  FileText,
  Image,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useAreaFiles } from '@/hooks/useFiles';
import { FileUploadDropzone } from '@/components/file-upload/FileUploadDropzone';
import { FileManager } from '@/components/file-upload/FileManager';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface AreaFilesSectionProps {
  areaId: string;
  areaName: string;
  userRole: string;
  canUpload?: boolean;
  canDelete?: boolean;
  canShare?: boolean;
  className?: string;
  compactMode?: boolean;
}

type ViewMode = 'overview' | 'files' | 'upload';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AreaFilesSection: React.FC<AreaFilesSectionProps> = ({
  areaId,
  areaName,
  userRole,
  canUpload = true,
  canDelete = false,
  canShare = false,
  className,
  compactMode = false
}) => {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showUploader, setShowUploader] = useState(false);

  // Fetch area files
  const {
    files,
    isLoading,
    isError,
    error,
    uploadFiles,
    downloadFile,
    deleteFile,
    bulkAction,
    refetch,
    formatFileSize,
    getFileStats
  } = useAreaFiles(areaId, {
    search: searchQuery || undefined,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Statistics
  const stats = getFileStats();

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const recentFiles = useMemo(() => {
    return files.slice(0, 5);
  }, [files]);

  const categoriesCount = useMemo(() => {
    return files.reduce((acc, file) => {
      const category = file.file_category || 'unknown';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [files]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleFileUpload = async (uploadedFiles: File[]) => {
    try {
      const result = await uploadFiles(uploadedFiles, {
        areaId,
        fileCategory: 'area_document',
        accessLevel: 'area',
        autoProcess: true
      });

      if (result.success) {
        setShowUploader(false);
        refetch();
        toast.success(`Successfully uploaded ${result.results.length} file(s)`);
      } else {
        console.error('Upload errors:', result.errors);
        toast.error(`Upload failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFileDownload = async (fileId: string) => {
    const result = await downloadFile(fileId);
    if (!result.success) {
      console.error('Download failed:', result.error);
      toast.error(`Download failed: ${result.error}`);
    } else {
      toast.success('File downloaded successfully');
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      const result = await deleteFile(fileId);
      if (!result.success) {
        console.error('Delete failed:', result.error);
        toast.error(`Delete failed: ${result.error}`);
      } else {
        toast.success('File deleted successfully');
      }
    }
  };

  const handleBulkAction = async (action: string, fileIds: string[]) => {
    const result = await bulkAction(action as any, fileIds);
    if (!result.success) {
      console.error('Bulk action failed:', result.errors);
      toast.error(`Bulk ${action} failed: ${result.errors.join(', ')}`);
    } else {
      toast.success(`Successfully performed ${action} on ${result.results.length} file(s)`);
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded': return 'bg-primary/10 text-primary border-primary/30';
      case 'processing': return 'bg-accent/10 text-accent-foreground border-accent/30';
      case 'failed': return 'bg-destructive/10 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ============================================================================
  // RENDER ERROR STATE
  // ============================================================================

  if (isError) {
    return (
      <Card className={cn(
        'bg-card border border-border',
        className
      )}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load files: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // RENDER MAIN COMPONENT
  // ============================================================================

  return (
    <TooltipProvider>
      <Card className={cn(
        'bg-card border border-border',
        className
      )}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className={cn('text-primary', compactMode ? 'h-4 w-4' : 'h-5 w-5')} />
              <CardTitle className={cn('text-foreground', compactMode ? 'text-base' : 'text-lg')}>
                {areaName} Files
              </CardTitle>
              {stats && (
                <Badge variant="secondary" className="ml-2">
                  {stats.totalFiles} files
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {canUpload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUploader(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              )}
              
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'overview' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('overview')}
                  className="h-8 px-3 text-xs"
                >
                  Overview
                </Button>
                <Button
                  variant={viewMode === 'files' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('files')}
                  className="h-8 px-3 text-xs"
                >
                  All Files
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="wait">
            {showUploader ? (
              <motion.div
                key="uploader"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">Upload Files to {areaName}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowUploader(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                  
                  <FileUploadDropzone
                    areaId={areaId}
                    userRole={userRole}
                    compactMode={compactMode}
                    onFilesSelected={(files) => handleFileUpload(files)}
                    onUploadComplete={() => {
                      setShowUploader(false);
                      refetch();
                    }}
                    maxFiles={10}
                    acceptedTypes={['.xlsx', '.xls', '.csv', '.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg']}
                  />
                </div>
              </motion.div>
            ) : viewMode === 'overview' ? (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Statistics Cards */}
                {stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                      icon={FileText}
                      label="Total Files"
                      value={stats.totalFiles.toString()}
                      compactMode={compactMode}
                    />
                    <StatCard
                      icon={Upload}
                      label="Total Size"
                      value={formatFileSize(stats.totalSize)}
                      compactMode={compactMode}
                    />
                    <StatCard
                      icon={CheckCircle}
                      label="Processed"
                      value={Object.keys(stats.statusStats).reduce((sum, key) => 
                        key === 'uploaded' ? sum + stats.statusStats[key] : sum, 0
                      ).toString()}
                      compactMode={compactMode}
                    />
                    <StatCard
                      icon={Clock}
                      label="Processing"
                      value={Object.keys(stats.statusStats).reduce((sum, key) => 
                        key === 'processing' ? sum + stats.statusStats[key] : sum, 0
                      ).toString()}
                      compactMode={compactMode}
                    />
                  </div>
                )}

                {/* Recent Files */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className={cn('font-semibold text-foreground', compactMode ? 'text-base' : 'text-lg')}>
                      Recent Files
                    </h3>
                    {files.length > 5 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode('files')}
                      >
                        View All
                      </Button>
                    )}
                  </div>

                  {isLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="h-8 w-8 bg-muted rounded" />
                          <div className="flex-1 space-y-1">
                            <div className="h-3 bg-muted rounded w-3/4" />
                            <div className="h-2 bg-muted rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recentFiles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium mb-2 text-foreground">No files in this area</p>
                      <p className="text-sm mb-4">Upload files to share with your team</p>
                      {canUpload && (
                        <Button
                          variant="outline"
                          onClick={() => setShowUploader(true)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload First File
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentFiles.map((file) => (
                        <FileListItem
                          key={file.id}
                          file={file}
                          compactMode={compactMode}
                          canDelete={canDelete}
                          onDownload={() => handleFileDownload(file.id)}
                          onDelete={canDelete ? () => handleFileDelete(file.id) : undefined}
                          getFileIcon={getFileIcon}
                          getStatusColor={getStatusColor}
                          formatFileSize={formatFileSize}
                          formatDate={formatDate}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* File Categories */}
                {Object.keys(categoriesCount).length > 0 && (
                  <div className="space-y-3">
                    <h3 className={cn('font-semibold text-foreground', compactMode ? 'text-base' : 'text-lg')}>
                      File Categories
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(categoriesCount).map(([category, count]) => (
                        <div
                          key={category}
                          className="p-3 rounded-lg bg-muted/50 border border-border"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-foreground capitalize">{category.replace('_', ' ')}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="files"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <FileManager
                  files={files}
                  loading={isLoading}
                  areaId={areaId}
                  userRole={userRole}
                  canUpload={canUpload}
                  canDelete={canDelete}
                  canShare={canShare}
                  showUploader={false}
                  showArea={false}
                  compactMode={compactMode}
                  onRefresh={refetch}
                  onFilePreview={(fileId) => console.log('Preview file:', fileId)}
                  onFileDownload={handleFileDownload}
                  onFileDelete={canDelete ? handleFileDelete : undefined}
                  onBulkAction={handleBulkAction}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  compactMode: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, compactMode }) => (
  <div className={cn(
    'p-4 rounded-lg bg-muted/50 border border-border',
    compactMode && 'p-3'
  )}>
    <div className="flex items-center gap-2">
      <Icon className={cn('text-primary', compactMode ? 'h-4 w-4' : 'h-5 w-5')} />
      <div>
        <p className={cn('text-foreground font-semibold', compactMode ? 'text-sm' : 'text-base')}>
          {value}
        </p>
        <p className={cn('text-muted-foreground', compactMode ? 'text-xs' : 'text-sm')}>
          {label}
        </p>
      </div>
    </div>
  </div>
);

interface FileListItemProps {
  file: any;
  compactMode: boolean;
  canDelete: boolean;
  onDownload: () => void;
  onDelete?: () => void;
  getFileIcon: (fileType: string) => React.ElementType;
  getStatusColor: (status: string) => string;
  formatFileSize: (bytes: number) => string;
  formatDate: (dateString: string) => string;
}

const FileListItem: React.FC<FileListItemProps> = ({
  file,
  compactMode,
  canDelete,
  onDownload,
  onDelete,
  getFileIcon,
  getStatusColor,
  formatFileSize,
  formatDate
}) => {
  const FileIcon = getFileIcon(file.file_type);

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group',
      compactMode && 'p-2'
    )}>
      <div className={cn(
        'flex items-center justify-center rounded bg-muted',
        compactMode ? 'h-6 w-6' : 'h-8 w-8'
      )}>
        <FileIcon className={cn(
          'text-muted-foreground',
          compactMode ? 'h-3 w-3' : 'h-4 w-4'
        )} />
      </div>

      <div className="flex-1 min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <p className={cn(
              'text-foreground font-medium truncate',
              compactMode ? 'text-sm' : 'text-base'
            )}>
              {file.original_filename}
            </p>
          </TooltipTrigger>
          <TooltipContent>{file.original_filename}</TooltipContent>
        </Tooltip>
        
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('text-muted-foreground', compactMode ? 'text-xs' : 'text-sm')}>
            {formatFileSize(file.file_size)}
          </span>
          <Badge className={cn('text-xs', getStatusColor(file.upload_status))}>
            {file.upload_status}
          </Badge>
          <span className={cn('text-muted-foreground', compactMode ? 'text-xs' : 'text-sm')}>
            {formatDate(file.created_at)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDownload}
          className={cn(
            compactMode ? 'p-1 h-6 w-6' : 'p-2 h-8 w-8'
          )}
        >
          <Download className="h-3 w-3" />
        </Button>
        
        {canDelete && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className={cn(
              'text-destructive hover:text-destructive',
              compactMode ? 'p-1 h-6 w-6' : 'p-2 h-8 w-8'
            )}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};