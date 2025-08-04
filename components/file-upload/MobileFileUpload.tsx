/**
 * Mobile File Upload Component
 * Mobile-optimized file upload with bottom sheet UI and touch interactions
 */

"use client";

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Upload, 
  Camera, 
  FileText, 
  X, 
  Check,
  AlertCircle,
  ChevronUp,
  Plus,
  Image,
  FileSpreadsheet
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FileUploadDropzone } from './FileUploadDropzone';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface MobileFileUploadProps {
  isOpen: boolean;
  onClose: () => void;
  areaId?: string;
  initiativeId?: string;
  userRole?: string;
  maxFiles?: number;
  acceptedTypes?: string[];
  onUploadComplete?: (results: any[]) => void;
  onUploadError?: (errors: string[]) => void;
}

interface TouchUploadOption {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  description: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MobileFileUpload: React.FC<MobileFileUploadProps> = ({
  isOpen,
  onClose,
  areaId,
  initiativeId,
  userRole = 'Analyst',
  maxFiles = 5,
  acceptedTypes = ['.xlsx', '.xls', '.csv', '.pdf', '.jpg', '.png'],
  onUploadComplete,
  onUploadError
}) => {
  const [dragY, setDragY] = useState(0);
  const [uploadMode, setUploadMode] = useState<'options' | 'dropzone' | 'camera'>('options');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // DRAG HANDLERS FOR BOTTOM SHEET
  // ============================================================================

  const handleDrag = useCallback((event: any, info: PanInfo) => {
    if (info.offset.y > 0) {
      setDragY(info.offset.y);
    }
  }, []);

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    const threshold = 150;
    if (info.offset.y > threshold || info.velocity.y > 500) {
      onClose();
    } else {
      setDragY(0);
    }
  }, [onClose]);

  // ============================================================================
  // UPLOAD HANDLERS
  // ============================================================================

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCameraCapture = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadMode('dropzone');
    }
  }, []);

  const handleUploadComplete = useCallback((results: any[]) => {
    onUploadComplete?.(results);
    onClose();
  }, [onUploadComplete, onClose]);

  const handleUploadError = useCallback((errors: string[]) => {
    onUploadError?.(errors);
  }, [onUploadError]);

  // ============================================================================
  // UPLOAD OPTIONS
  // ============================================================================

  const uploadOptions: TouchUploadOption[] = [
    {
      id: 'files',
      label: 'Browse Files',
      icon: FileText,
      action: handleFileSelect,
      description: 'Select files from your device'
    },
    {
      id: 'camera',
      label: 'Take Photo',
      icon: Camera,
      action: handleCameraCapture,
      description: 'Capture document with camera'
    },
    {
      id: 'dropzone',
      label: 'Advanced Upload',
      icon: Upload,
      action: () => setUploadMode('dropzone'),
      description: 'Drag & drop with progress tracking'
    }
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: dragY }}
            exit={{ y: '100%' }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 500 }}
            dragElastic={0.2}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-gray-900 via-gray-800 to-gray-700 rounded-t-2xl shadow-2xl"
            style={{
              maxHeight: '90vh',
              minHeight: uploadMode === 'options' ? '300px' : '500px'
            }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-400 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-600">
              <div>
                <h2 className="text-xl font-semibold text-white">Upload Files</h2>
                <p className="text-sm text-gray-400 mt-1">
                  {areaId ? 'Upload to area' : 'Upload files'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {uploadMode === 'options' && (
                  <motion.div
                    key="options"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-6 space-y-4"
                  >
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4 text-blue-400" />
                          <div>
                            <p className="text-white font-semibold">Max {maxFiles}</p>
                            <p className="text-xs text-gray-400">Files allowed</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-green-400" />
                          <div>
                            <p className="text-white font-semibold">50MB</p>
                            <p className="text-xs text-gray-400">Max size</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Upload Options */}
                    <div className="space-y-3">
                      {uploadOptions.map((option) => (
                        <TouchUploadButton
                          key={option.id}
                          option={option}
                          onClick={option.action}
                        />
                      ))}
                    </div>

                    {/* Accepted Types */}
                    <div className="mt-6">
                      <p className="text-sm text-gray-400 mb-3">Accepted file types:</p>
                      <div className="flex flex-wrap gap-2">
                        {acceptedTypes.map((type) => (
                          <Badge
                            key={type}
                            variant="secondary"
                            className="text-xs bg-white/10 text-gray-300"
                          >
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {uploadMode === 'dropzone' && (
                  <motion.div
                    key="dropzone"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-6"
                  >
                    <div className="mb-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUploadMode('options')}
                        className="text-gray-400 hover:text-white mb-2"
                      >
                        ← Back to options
                      </Button>
                    </div>

                    <FileUploadDropzone
                      areaId={areaId}
                      initiativeId={initiativeId}
                      userRole={userRole}
                      maxFiles={maxFiles}
                      acceptedTypes={acceptedTypes}
                      compactMode={true}
                      showPreview={true}
                      onUploadComplete={(fileId, result) => handleUploadComplete([result])}
                      onUploadError={(fileId, error) => handleUploadError([error])}
                      className="border-dashed border-2 border-gray-600 rounded-lg"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Hidden Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedTypes.join(',')}
              onChange={handleFileInputChange}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// TOUCH UPLOAD BUTTON COMPONENT
// ============================================================================

interface TouchUploadButtonProps {
  option: TouchUploadOption;
  onClick: () => void;
}

const TouchUploadButton: React.FC<TouchUploadButtonProps> = ({ option, onClick }) => {
  const Icon = option.icon;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-lg bg-primary/20 border border-primary/30">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-medium">{option.label}</h3>
          <p className="text-sm text-gray-400 mt-1">{option.description}</p>
        </div>
        <ChevronUp className="h-5 w-5 text-gray-400 rotate-90" />
      </div>
    </motion.button>
  );
};

// ============================================================================
// MOBILE FILE PREVIEW COMPONENT
// ============================================================================

interface MobileFilePreviewProps {
  files: File[];
  onRemove: (index: number) => void;
  onUpload: () => void;
  uploadProgress?: Record<string, number>;
  uploadErrors?: Record<string, string>;
  isUploading?: boolean;
}

export const MobileFilePreview: React.FC<MobileFilePreviewProps> = ({
  files,
  onRemove,
  onUpload,
  uploadProgress = {},
  uploadErrors = {},
  isUploading = false
}) => {
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.includes('spreadsheet') || file.type.includes('excel')) return FileSpreadsheet;
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

  return (
    <div className="space-y-4">
      {/* File List */}
      <div className="space-y-2">
        {files.map((file, index) => {
          const FileIcon = getFileIcon(file);
          const fileKey = `${file.name}-${index}`;
          const progress = uploadProgress[fileKey] || 0;
          const error = uploadErrors[fileKey];

          return (
            <motion.div
              key={fileKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 rounded-lg bg-white/5 border border-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-white/10">
                  <FileIcon className="h-5 w-5 text-gray-300" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate text-sm">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(file.size)}
                  </p>
                  
                  {progress > 0 && progress < 100 && (
                    <div className="mt-2">
                      <Progress value={progress} className="h-1" />
                      <p className="text-xs text-gray-400 mt-1">{progress}%</p>
                    </div>
                  )}
                  
                  {error && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3 text-red-400" />
                      <p className="text-xs text-red-400">{error}</p>
                    </div>
                  )}
                  
                  {progress === 100 && !error && (
                    <div className="flex items-center gap-1 mt-1">
                      <Check className="h-3 w-3 text-green-400" />
                      <p className="text-xs text-green-400">Uploaded</p>
                    </div>
                  )}
                </div>

                {!isUploading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(index)}
                    className="text-gray-400 hover:text-red-400 p-1 h-6 w-6"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Upload Button */}
      {files.length > 0 && (
        <div className="sticky bottom-0 bg-gradient-to-t from-gray-900 to-transparent pt-4">
          <Button
            onClick={onUpload}
            disabled={isUploading}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3"
          >
            {isUploading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mr-2"
                >
                  <Upload className="h-4 w-4" />
                </motion.div>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {files.length} file{files.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};