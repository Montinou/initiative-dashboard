/**
 * Glassmorphism File Upload Dropzone Component
 * Reusable drag-drop file upload with progress tracking and role-based UI
 */

"use client";

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Image, 
  FileSpreadsheet, 
  FileX, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  X,
  Eye,
  Download,
  Trash2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface FileUploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  result?: any;
  preview?: string;
}

export interface FileUploadDropzoneProps {
  // Configuration
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  acceptedCategories?: string[];
  
  // Upload options
  areaId?: string;
  initiativeId?: string;
  accessLevel?: 'private' | 'area' | 'tenant' | 'public';
  autoUpload?: boolean;
  
  // UI customization
  className?: string;
  disabled?: boolean;
  showPreview?: boolean;
  showProgress?: boolean;
  compactMode?: boolean;
  
  // Role-based features
  userRole?: string;
  canDelete?: boolean;
  canPreview?: boolean;
  
  // Event handlers
  onFilesSelected?: (files: File[]) => void;
  onUploadStart?: (fileId: string, file: File) => void;
  onUploadProgress?: (fileId: string, progress: number) => void;
  onUploadComplete?: (fileId: string, result: any) => void;
  onUploadError?: (fileId: string, error: string) => void;
  onFileRemove?: (fileId: string) => void;
  onFilePreview?: (fileId: string, file: File) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const FileUploadDropzone: React.FC<FileUploadDropzoneProps> = ({
  maxFiles = 10,
  maxFileSize = 100 * 1024 * 1024, // 100MB
  acceptedTypes = ['.xlsx', '.xls', '.csv', '.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'],
  acceptedCategories = ['spreadsheets', 'documents', 'images'],
  areaId,
  initiativeId,
  accessLevel = 'area',
  autoUpload = true,
  className,
  disabled = false,
  showPreview = true,
  showProgress = true,
  compactMode = false,
  userRole = 'Analyst',
  canDelete = true,
  canPreview = true,
  onFilesSelected,
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  onFileRemove,
  onFilePreview
}) => {
  // State
  const [uploadItems, setUploadItems] = useState<FileUploadItem[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // DRAG AND DROP HANDLERS
  // ============================================================================

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  }, [disabled]);

  // ============================================================================
  // FILE HANDLING
  // ============================================================================

  const handleFileSelection = useCallback((files: File[]) => {
    if (files.length === 0) return;

    // Validate file count
    const totalFiles = uploadItems.length + files.length;
    if (totalFiles > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      console.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Create upload items
    const newItems: FileUploadItem[] = files.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      file,
      status: 'pending',
      progress: 0
    }));

    // Add preview for images
    newItems.forEach(item => {
      if (item.file.type.startsWith('image/') && showPreview) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadItems(prev => 
            prev.map(upload => 
              upload.id === item.id 
                ? { ...upload, preview: e.target?.result as string }
                : upload
            )
          );
        };
        reader.readAsDataURL(item.file);
      }
    });

    setUploadItems(prev => [...prev, ...newItems]);
    onFilesSelected?.(files);

    // Auto-upload if enabled
    if (autoUpload) {
      newItems.forEach(item => {
        startUpload(item.id);
      });
    }
  }, [uploadItems.length, maxFiles, showPreview, autoUpload, onFilesSelected]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileSelection(files);
  }, [handleFileSelection]);

  const handleBrowseClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  // ============================================================================
  // UPLOAD LOGIC
  // ============================================================================

  const startUpload = useCallback(async (fileId: string) => {
    const item = uploadItems.find(u => u.id === fileId);
    if (!item) return;

    setUploadItems(prev => 
      prev.map(upload => 
        upload.id === fileId 
          ? { ...upload, status: 'uploading', progress: 0 }
          : upload
      )
    );

    setIsUploading(true);
    onUploadStart?.(fileId, item.file);

    try {
      // Perform real upload to API
      const result = await performRealUpload(fileId);

      setUploadItems(prev => 
        prev.map(upload => 
          upload.id === fileId 
            ? { ...upload, status: 'completed', progress: 100, result }
            : upload
        )
      );

      onUploadComplete?.(fileId, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadItems(prev => 
        prev.map(upload => 
          upload.id === fileId 
            ? { ...upload, status: 'error', error: errorMessage }
            : upload
        )
      );

      onUploadError?.(fileId, errorMessage);
    } finally {
      setIsUploading(uploadItems.some(u => u.status === 'uploading' && u.id !== fileId));
    }
  }, [uploadItems, onUploadStart, onUploadComplete, onUploadError]);

  // Real upload implementation using the API with progress tracking
  const performRealUpload = async (fileId: string): Promise<any> => {
    const item = uploadItems.find(u => u.id === fileId);
    if (!item) throw new Error('File not found');

    // Create FormData for upload
    const formData = new FormData();
    formData.append('file', item.file);
    
    // Add optional parameters
    if (areaId) formData.append('areaId', areaId);
    if (initiativeId) formData.append('initiativeId', initiativeId);
    if (accessLevel) formData.append('accessLevel', accessLevel);
    
    // Add metadata
    const metadata = {
      uploadedVia: 'dashboard',
      originalUploadId: fileId,
      userAgent: navigator.userAgent
    };
    formData.append('metadata', JSON.stringify(metadata));

    // Simulate progress since fetch doesn't support upload progress
    // Start progress simulation
    let simulatedProgress = 0;
    const progressInterval = setInterval(() => {
      simulatedProgress += Math.random() * 15 + 5; // 5-20% increments
      const progress = Math.min(simulatedProgress, 90); // Cap at 90% until completion
      
      setUploadItems(prev => 
        prev.map(upload => 
          upload.id === fileId 
            ? { ...upload, progress }
            : upload
        )
      );
      
      onUploadProgress?.(fileId, progress);
    }, 200);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      // Clear progress simulation
      clearInterval(progressInterval);

      // Set progress to 100% immediately after API call
      setUploadItems(prev => 
        prev.map(upload => 
          upload.id === fileId 
            ? { ...upload, progress: 100, status: 'processing' }
            : upload
        )
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      return {
        fileId: result.data.fileId,
        fileName: result.data.fileName,
        fileSize: result.data.fileSize,
        uploadedAt: result.data.uploadedAt,
        securityScore: result.data.securityScore,
        warnings: result.data.warnings || []
      };
    } catch (error) {
      // Clear progress simulation on error
      clearInterval(progressInterval);
      console.error('Upload error:', error);
      throw error;
    }
  };

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  const handleRemoveFile = useCallback((fileId: string) => {
    setUploadItems(prev => prev.filter(upload => upload.id !== fileId));
    onFileRemove?.(fileId);
  }, [onFileRemove]);

  const handlePreviewFile = useCallback((fileId: string) => {
    const item = uploadItems.find(u => u.id === fileId);
    if (item && canPreview) {
      onFilePreview?.(fileId, item.file);
    }
  }, [uploadItems, canPreview, onFilePreview]);

  const retryUpload = useCallback((fileId: string) => {
    startUpload(fileId);
  }, [startUpload]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.type.includes('csv')) return FileSpreadsheet;
    return FileText;
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

  const getStatusColor = (status: FileUploadItem['status']) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'uploading': case 'processing': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: FileUploadItem['status']) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'error': return AlertCircle;
      case 'uploading': case 'processing': return Loader2;
      default: return FileText;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <TooltipProvider>
      <div className={cn('w-full space-y-4', className)}>
        {/* Drop Zone */}
        <Card 
          className={cn(
            'relative overflow-hidden transition-all duration-300',
            'bg-gradient-to-br from-white/10 via-white/5 to-transparent',
            'backdrop-blur-sm border border-white/20',
            'hover:from-white/15 hover:via-white/8 hover:to-white/5',
            isDragActive && 'border-primary/50 bg-primary/10',
            disabled && 'opacity-50 cursor-not-allowed',
            compactMode ? 'p-4' : 'p-8'
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <CardContent className="p-0">
            <div className={cn(
              'flex flex-col items-center justify-center text-center space-y-4',
              compactMode ? 'py-4' : 'py-8'
            )}>
              <motion.div
                animate={{ 
                  scale: isDragActive ? 1.1 : 1,
                  rotate: isDragActive ? 5 : 0
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className={cn(
                  'p-4 rounded-full bg-gradient-to-br backdrop-blur-sm',
                  'from-primary/20 to-cyan-500/20 border border-primary/30',
                  compactMode ? 'p-3' : 'p-4'
                )}>
                  <Upload className={cn(
                    'text-primary',
                    compactMode ? 'h-6 w-6' : 'h-8 w-8'
                  )} />
                </div>
              </motion.div>

              <div className="space-y-2">
                <h3 className={cn(
                  'font-semibold text-white',
                  compactMode ? 'text-sm' : 'text-lg'
                )}>
                  {isDragActive ? 'Drop files here' : 'Upload Files'}
                </h3>
                
                <p className={cn(
                  'text-gray-300',
                  compactMode ? 'text-xs' : 'text-sm'
                )}>
                  Drag and drop files here, or{' '}
                  <button
                    onClick={handleBrowseClick}
                    className="text-primary hover:text-primary/80 underline"
                    disabled={disabled}
                  >
                    browse
                  </button>
                </p>

                <div className={cn(
                  'flex flex-wrap gap-1 justify-center',
                  compactMode ? 'text-xs' : 'text-sm'
                )}>
                  {acceptedTypes.slice(0, 6).map(type => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                  {acceptedTypes.length > 6 && (
                    <Badge variant="secondary" className="text-xs">
                      +{acceptedTypes.length - 6} more
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-gray-400">
                  Max {maxFiles} files, {formatFileSize(maxFileSize)} each
                </p>
              </div>
            </div>
          </CardContent>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled}
          />
        </Card>

        {/* Upload Progress */}
        <AnimatePresence>
          {uploadItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              {uploadItems.map((item) => (
                <FileUploadItem
                  key={item.id}
                  item={item}
                  compactMode={compactMode}
                  showProgress={showProgress}
                  canDelete={canDelete}
                  canPreview={canPreview}
                  onRemove={handleRemoveFile}
                  onPreview={handlePreviewFile}
                  onRetry={retryUpload}
                  getFileIcon={getFileIcon}
                  formatFileSize={formatFileSize}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Actions */}
        {uploadItems.length > 0 && !autoUpload && (
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadItems([])}
              disabled={isUploading}
            >
              Clear All
            </Button>
            <Button
              size="sm"
              onClick={() => uploadItems
                .filter(item => item.status === 'pending')
                .forEach(item => startUpload(item.id))
              }
              disabled={isUploading || uploadItems.every(item => item.status !== 'pending')}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload All'
              )}
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

// ============================================================================
// FILE UPLOAD ITEM COMPONENT
// ============================================================================

interface FileUploadItemProps {
  item: FileUploadItem;
  compactMode: boolean;
  showProgress: boolean;
  canDelete: boolean;
  canPreview: boolean;
  onRemove: (fileId: string) => void;
  onPreview: (fileId: string) => void;
  onRetry: (fileId: string) => void;
  getFileIcon: (file: File) => React.ElementType;
  formatFileSize: (bytes: number) => string;
  getStatusColor: (status: FileUploadItem['status']) => string;
  getStatusIcon: (status: FileUploadItem['status']) => React.ElementType;
}

const FileUploadItem: React.FC<FileUploadItemProps> = ({
  item,
  compactMode,
  showProgress,
  canDelete,
  canPreview,
  onRemove,
  onPreview,
  onRetry,
  getFileIcon,
  formatFileSize,
  getStatusColor,
  getStatusIcon
}) => {
  const FileIcon = getFileIcon(item.file);
  const StatusIcon = getStatusIcon(item.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm border border-white/10">
        <CardContent className={cn('p-4', compactMode && 'p-3')}>
          <div className="flex items-center gap-3">
            {/* File Icon/Preview */}
            <div className="flex-shrink-0">
              {item.preview ? (
                <img
                  src={item.preview}
                  alt={item.file.name}
                  className={cn(
                    'rounded object-cover',
                    compactMode ? 'h-8 w-8' : 'h-10 w-10'
                  )}
                />
              ) : (
                <div className={cn(
                  'flex items-center justify-center rounded bg-white/10',
                  compactMode ? 'h-8 w-8' : 'h-10 w-10'
                )}>
                  <FileIcon className={cn(
                    'text-white',
                    compactMode ? 'h-4 w-4' : 'h-5 w-5'
                  )} />
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={cn(
                  'font-medium text-white truncate',
                  compactMode ? 'text-sm' : 'text-base'
                )}>
                  {item.file.name}
                </p>
                <StatusIcon className={cn(
                  getStatusColor(item.status),
                  'flex-shrink-0',
                  compactMode ? 'h-3 w-3' : 'h-4 w-4',
                  (item.status === 'uploading' || item.status === 'processing') && 'animate-spin'
                )} />
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <p className={cn(
                  'text-gray-400',
                  compactMode ? 'text-xs' : 'text-sm'
                )}>
                  {formatFileSize(item.file.size)}
                </p>
                
                {item.status === 'error' && item.error && (
                  <p className={cn(
                    'text-red-400 truncate',
                    compactMode ? 'text-xs' : 'text-sm'
                  )}>
                    {item.error}
                  </p>
                )}
              </div>

              {/* Progress Bar */}
              {showProgress && (item.status === 'uploading' || item.status === 'processing') && (
                <div className="mt-2">
                  <Progress 
                    value={item.progress} 
                    className={cn(
                      'h-1.5',
                      compactMode && 'h-1'
                    )}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {item.status === 'processing' ? 'Processing...' : `${Math.round(item.progress)}%`}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {canPreview && item.status === 'completed' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPreview(item.id)}
                      className={cn(
                        'text-gray-400 hover:text-white',
                        compactMode ? 'p-1 h-6 w-6' : 'p-2 h-8 w-8'
                      )}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Preview file</TooltipContent>
                </Tooltip>
              )}

              {item.status === 'error' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRetry(item.id)}
                      className={cn(
                        'text-gray-400 hover:text-white',
                        compactMode ? 'p-1 h-6 w-6' : 'p-2 h-8 w-8'
                      )}
                    >
                      <Upload className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Retry upload</TooltipContent>
                </Tooltip>
              )}

              {canDelete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(item.id)}
                      className={cn(
                        'text-gray-400 hover:text-red-400',
                        compactMode ? 'p-1 h-6 w-6' : 'p-2 h-8 w-8'
                      )}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove file</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};