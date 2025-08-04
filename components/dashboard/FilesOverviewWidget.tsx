/**
 * Files Overview Widget
 * Dashboard widget showing recent files and upload statistics
 */

"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Files, 
  Upload, 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Image, 
  Plus,
  MoreHorizontal,
  TrendingUp,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useRecentFiles, useFileStatistics } from '@/hooks/useFiles';
import { FileUploadDropzone } from '@/components/file-upload/FileUploadDropzone';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface FilesOverviewWidgetProps {
  className?: string;
  compactMode?: boolean;
  areaId?: string;
  userRole?: string;
  onFileUpload?: (files: any[]) => void;
  onViewAllFiles?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const FilesOverviewWidget: React.FC<FilesOverviewWidgetProps> = ({
  className,
  compactMode = false,
  areaId,
  userRole = 'Analyst',
  onFileUpload,
  onViewAllFiles
}) => {
  const [showUploader, setShowUploader] = useState(false);
  
  // Fetch recent files and statistics
  const { 
    files: recentFiles, 
    isLoading: filesLoading, 
    downloadFile,
    formatFileSize 
  } = useRecentFiles(5);
  
  const { 
    stats, 
    isLoading: statsLoading 
  } = useFileStatistics();

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleFileUpload = (results: any[]) => {
    onFileUpload?.(results);
    setShowUploader(false);
  };

  const handleFileDownload = async (fileId: string) => {
    const result = await downloadFile(fileId);
    if (!result.success) {
      // TODO: Show error toast
      console.error('Download failed:', result.error);
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
      case 'uploaded': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (showUploader) {
    return (
      <TooltipProvider>
        <Card className={cn(
          'bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-sm border border-white/20',
          className
        )}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className={cn('text-white', compactMode ? 'text-base' : 'text-lg')}>
                Upload Files
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUploader(false)}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <FileUploadDropzone
              compactMode={compactMode}
              areaId={areaId}
              userRole={userRole}
              onUploadComplete={(fileId, result) => {
                handleFileUpload([result]);
              }}
              maxFiles={5}
              showPreview={!compactMode}
            />
          </CardContent>
        </Card>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Card className={cn(
        'bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-sm border border-white/20',
        className
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Files className={cn('text-primary', compactMode ? 'h-4 w-4' : 'h-5 w-5')} />
              <CardTitle className={cn('text-white', compactMode ? 'text-base' : 'text-lg')}>
                Files
              </CardTitle>
            </div>
            
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUploader(true)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upload files</TooltipContent>
              </Tooltip>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onViewAllFiles}>
                    View All Files
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowUploader(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Statistics */}
          {!statsLoading && stats && (
            <div className="grid grid-cols-2 gap-3">
              <div className={cn(
                'p-3 rounded-lg bg-white/5 border border-white/10',
                compactMode && 'p-2'
              )}>
                <div className="flex items-center gap-2">
                  <Files className={cn('text-blue-400', compactMode ? 'h-3 w-3' : 'h-4 w-4')} />
                  <div>
                    <p className={cn('text-white font-semibold', compactMode ? 'text-sm' : 'text-base')}>
                      {stats.totalFiles}
                    </p>
                    <p className={cn('text-gray-400', compactMode ? 'text-xs' : 'text-sm')}>
                      Total Files
                    </p>
                  </div>
                </div>
              </div>

              <div className={cn(
                'p-3 rounded-lg bg-white/5 border border-white/10',
                compactMode && 'p-2'
              )}>
                <div className="flex items-center gap-2">
                  <TrendingUp className={cn('text-green-400', compactMode ? 'h-3 w-3' : 'h-4 w-4')} />
                  <div>
                    <p className={cn('text-white font-semibold', compactMode ? 'text-sm' : 'text-base')}>
                      {formatFileSize(stats.totalSize)}
                    </p>
                    <p className={cn('text-gray-400', compactMode ? 'text-xs' : 'text-sm')}>
                      Total Size
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Files */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className={cn('text-white font-medium', compactMode ? 'text-sm' : 'text-base')}>
                Recent Files
              </h4>
              {recentFiles.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewAllFiles}
                  className={cn(
                    'text-gray-400 hover:text-white',
                    compactMode ? 'text-xs px-2 py-1 h-6' : 'text-sm'
                  )}
                >
                  View All
                </Button>
              )}
            </div>

            {filesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className={cn(
                      'flex items-center gap-3 p-3 rounded-lg bg-white/5',
                      compactMode && 'p-2'
                    )}>
                      <div className={cn(
                        'bg-white/10 rounded',
                        compactMode ? 'h-6 w-6' : 'h-8 w-8'
                      )} />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-white/10 rounded w-3/4" />
                        <div className="h-2 bg-white/10 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentFiles.length === 0 ? (
              <div className={cn(
                'text-center py-6 text-gray-400',
                compactMode && 'py-4'
              )}>
                <Files className={cn('mx-auto mb-2 text-gray-500', compactMode ? 'h-6 w-6' : 'h-8 w-8')} />
                <p className={cn(compactMode ? 'text-xs' : 'text-sm')}>
                  No files uploaded yet
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUploader(true)}
                  className={cn(
                    'mt-2 text-white border-white/20 hover:bg-white/10',
                    compactMode && 'text-xs px-2 py-1 h-6'
                  )}
                >
                  Upload First File
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentFiles.map((file) => {
                  const FileIcon = getFileIcon(file.file_type);

                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group',
                        compactMode && 'p-2 gap-2'
                      )}
                    >
                      <div className={cn(
                        'flex items-center justify-center rounded bg-white/10',
                        compactMode ? 'h-6 w-6' : 'h-8 w-8'
                      )}>
                        <FileIcon className={cn(
                          'text-gray-300',
                          compactMode ? 'h-3 w-3' : 'h-4 w-4'
                        )} />
                      </div>

                      <div className="flex-1 min-w-0">
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
                        
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            'text-gray-400',
                            compactMode ? 'text-xs' : 'text-sm'
                          )}>
                            {formatFileSize(file.file_size)}
                          </span>
                          
                          <Badge className={cn(
                            'text-xs',
                            getStatusColor(file.upload_status),
                            compactMode && 'text-xs px-1 py-0'
                          )}>
                            {file.upload_status}
                          </Badge>

                          <div className="flex items-center gap-1 text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span className="text-xs">
                              {formatDate(file.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFileDownload(file.id)}
                        className={cn(
                          'opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white',
                          compactMode ? 'p-1 h-6 w-6' : 'p-2 h-8 w-8'
                        )}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* File Type Distribution */}
          {!statsLoading && stats?.typeStats && Object.keys(stats.typeStats).length > 0 && (
            <div className="space-y-2">
              <h4 className={cn('text-white font-medium', compactMode ? 'text-sm' : 'text-base')}>
                File Types
              </h4>
              <div className="space-y-2">
                {Object.entries(stats.typeStats).map(([type, count]) => {
                  const percentage = (count / stats.totalFiles) * 100;
                  const FileIcon = getFileIcon(type);

                  return (
                    <div key={type} className="flex items-center gap-2">
                      <FileIcon className={cn('text-gray-400', compactMode ? 'h-3 w-3' : 'h-4 w-4')} />
                      <span className={cn('text-gray-300 capitalize flex-1', compactMode ? 'text-xs' : 'text-sm')}>
                        {type}
                      </span>
                      <span className={cn('text-gray-400', compactMode ? 'text-xs' : 'text-sm')}>
                        {count}
                      </span>
                      <div className="w-16">
                        <Progress 
                          value={percentage} 
                          className={cn('h-1.5', compactMode && 'h-1')} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};