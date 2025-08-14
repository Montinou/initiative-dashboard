"use client";

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useManagerArea } from '@/components/manager/ManagerAreaProvider';
import { getThemeFromTenant } from '@/lib/theme-config-simple';
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet, X, Download, RefreshCw, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

interface OKRUploadResult {
  success: boolean;
  data?: {
    uploadId: string;
    fileName: string;
    fileSize: number;
    recordsProcessed: number;
    sheetsProcessed: number;
    sheetDetails: Array<{
      sheetName: string;
      data: any[];
      recordCount: number;
    }>;
    savedInitiatives: number;
    errors: string[];
    areaName: string;
    timestamp: string;
  };
  error?: string;
}

interface OKRFileUploadProps {
  onUploadComplete?: (result: OKRUploadResult) => void;
  className?: string;
  areaName?: string;
}

export function OKRFileUpload({
  onUploadComplete,
  className = '',
  areaName
}: OKRFileUploadProps) {
  const { session } = useAuth();
  const { area } = useManagerArea();
  const theme = area?.tenant?.subdomain ? getThemeFromTenant(area.tenant.subdomain) : null;
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<OKRUploadResult | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [uploadStage, setUploadStage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Accepted file types for OKR files
  const acceptedTypes = ['.xlsx', '.xls'];
  const acceptedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];

  const uploadOKRFile = async (file: File): Promise<OKRUploadResult> => {
    if (!session) {
      return {
        success: false,
        error: 'Authentication required. Please log in to upload files.'
      };
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Progressive upload stages with realistic timing
      const stages = [
        { progress: 10, message: 'Preparing file for upload...', duration: 300 },
        { progress: 30, message: 'Uploading file to server...', duration: 800 },
        { progress: 50, message: 'Validating Excel format...', duration: 500 },
        { progress: 70, message: 'Parsing Excel sheets...', duration: 1000 },
        { progress: 85, message: 'Creating initiatives...', duration: 700 },
        { progress: 95, message: 'Finalizing upload...', duration: 400 }
      ];

      let currentStageIndex = 0;
      
      // Start upload stages
      const progressInterval = setInterval(() => {
        if (currentStageIndex < stages.length) {
          const stage = stages[currentStageIndex];
          setUploadProgress(stage.progress);
          setUploadStage(stage.message);
          currentStageIndex++;
        }
      }, 400);

      setIsProcessing(true);
      
      const response = await fetch('/api/upload/okr-file', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      
      // Final stage
      setUploadProgress(100);
      setUploadStage('Processing complete!');
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during upload'
      };
    } finally {
      setIsProcessing(false);
    }
  };

  const validateFile = (file: File): string | null => {
    // Check if file exists
    if (!file) {
      return 'No file selected. Please choose an Excel file to upload.';
    }

    // Check file name
    if (!file.name || file.name.trim() === '') {
      return 'Invalid file name. Please select a properly named Excel file.';
    }

    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      return `File type "${fileExtension}" not supported. Please upload Excel files (.xlsx or .xls) only.`;
    }

    // Check MIME type - be more flexible with MIME types as they can vary
    const isValidMimeType = acceptedMimeTypes.includes(file.type) || 
                           file.type === '' || // Sometimes MIME type is not detected
                           file.type === 'application/octet-stream'; // Generic binary type
    
    if (!isValidMimeType && file.type !== '') {
      return `Invalid file format detected (${file.type}). Please upload a valid Excel file (.xlsx or .xls).`;
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return `File too large (${formatFileSize(file.size)}). Maximum allowed size is 10MB.`;
    }

    // Check if file is not empty
    if (file.size === 0) {
      return 'File is empty. Please select a valid Excel file with data.';
    }

    // Check minimum file size (should be at least a few KB for a valid Excel file)
    const minSize = 1024; // 1KB minimum
    if (file.size < minSize) {
      return `File too small (${formatFileSize(file.size)}). This doesn't appear to be a valid Excel file.`;
    }

    // Validate file name doesn't contain dangerous characters
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(file.name)) {
      return 'File name contains invalid characters. Please rename your file and try again.';
    }

    // Check for extremely long file names
    if (file.name.length > 255) {
      return 'File name is too long. Please use a shorter file name.';
    }

    return null;
  };

  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    if (fileArray.length === 0) return;

    // Only allow one file at a time for OKR uploads
    if (fileArray.length > 1) {
      toast({
        title: "Multiple files not allowed",
        description: "Please upload one OKR Excel file at a time.",
        variant: "destructive",
      });
      return;
    }

    const file = fileArray[0];
    setCurrentFileName(file.name);

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setUploadResult({
        success: false,
        error: validationError
      });
      toast({
        title: "File validation failed",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      const result = await uploadOKRFile(file);
      setUploadResult(result);

      if (result.success && result.data) {
        toast({
          title: "Upload successful",
          description: `Processed ${result.data.savedInitiatives} initiatives from ${result.data.sheetsProcessed} sheets.`,
        });
      } else {
        toast({
          title: "Upload failed",
          description: result.error,
          variant: "destructive",
        });
      }

      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete(result);
      }
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error occurred'
      };
      setUploadResult(errorResult);
      
      toast({
        title: "Upload error",
        description: errorResult.error,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setCurrentFileName('');
      setUploadProgress(0);
      setUploadStage('');
      setIsProcessing(false);
    }
  }, [onUploadComplete, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input value to allow same file selection
    e.target.value = '';
  }, [handleFileSelect]);

  const handleRetryUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const clearResults = () => {
    setUploadResult(null);
  };

  const downloadTemplate = async () => {
    try {
      toast({
        title: "Downloading template",
        description: "Preparing your OKR Excel template...",
      });

      const response = await fetch('/api/upload/okr-file/template');
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'OKR_Template.xlsx';
      
      if (contentDisposition) {
        const matches = /filename="([^"]*)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);

      toast({
        title: "Template downloaded",
        description: `Successfully downloaded ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download OKR template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = () => {
    if (theme?.tenantSlug === 'siga-turismo') {
      return {
        primary: 'siga-green',
        success: 'siga-green',
        warning: 'siga-yellow',
        error: 'destructive'
      };
    }
    return {
      primary: 'primary',
      success: 'primary',
      warning: 'secondary',
      error: 'destructive'
    };
  };

  const colors = getStatusColor();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Upload OKR Excel File</h2>
          <p className="text-muted-foreground mt-1">
            Upload your OKR objectives and key results {areaName ? `for ${areaName}` : ''}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={downloadTemplate}
          className="bg-card/50 hover:bg-card/70 border-border"
        >
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Upload Zone */}
      <Card className="backdrop-blur-md bg-card/50 border border-border">
        <CardContent className="p-0">
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300
              ${isDragActive 
                ? `border-${colors.primary} bg-${colors.primary}/10 scale-[1.02]` 
                : `border-border hover:border-border/70 bg-card/20 hover:bg-${colors.primary}/5`
              }
              ${isUploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}
            `}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedTypes.join(',')}
              onChange={handleFileInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            
            <div className="flex flex-col items-center gap-4">
              <div className={`
                p-4 rounded-full transition-all duration-300
                ${isDragActive 
                  ? `bg-${colors.primary}/20 ring-4 ring-${colors.primary}/20` 
                  : `bg-${colors.primary}/10 hover:bg-${colors.primary}/20`
                }
              `}>
                <FileSpreadsheet className={`h-8 w-8 text-${colors.primary}`} />
              </div>
              
              <div className="space-y-2">
                <h3 className={`text-xl font-semibold text-${colors.primary}`}>
                  {isDragActive ? 'Drop your Excel file here' : 'Upload OKR Excel File'}
                </h3>
                <p className="text-muted-foreground">
                  Drag and drop your Excel file here, or click to browse
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-3">
                  {acceptedTypes.map(type => (
                    <Badge 
                      key={type} 
                      variant="outline" 
                      className={`bg-${colors.primary}/10 text-${colors.primary} border-${colors.primary}/30 hover:bg-${colors.primary}/20`}
                    >
                      {type.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>Maximum file size: 10MB</p>
                <p>Supported formats: Excel (.xlsx, .xls)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {isUploading && (
        <Card className="backdrop-blur-md bg-card/50 border border-border">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <RefreshCw className={`h-5 w-5 animate-spin text-${colors.primary}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-foreground font-medium">
                      {currentFileName}
                    </span>
                    <span className={`text-${colors.primary} font-medium`}>
                      {Math.round(uploadProgress)}%
                    </span>
                  </div>
                  <Progress value={uploadProgress} className="h-3" />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {uploadStage || 'Initializing...'}
                    </span>
                    {isProcessing && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex space-x-1">
                          <div className={`w-1 h-1 bg-${colors.primary} rounded-full animate-bounce`}></div>
                          <div className={`w-1 h-1 bg-${colors.primary} rounded-full animate-bounce`} style={{ animationDelay: '0.1s' }}></div>
                          <div className={`w-1 h-1 bg-${colors.primary} rounded-full animate-bounce`} style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        Processing
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Results */}
      {uploadResult && (
        <Card className="backdrop-blur-md bg-card/50 border border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-foreground">
                {uploadResult.success ? (
                  <CheckCircle className={`h-5 w-5 text-${colors.success}`} />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                )}
                {uploadResult.success ? 'Upload Successful' : 'Upload Failed'}
              </CardTitle>
              <div className="flex items-center gap-2">
                {!uploadResult.success && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetryUpload}
                    className="bg-muted/20 hover:bg-muted/30 border-border"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearResults}
                  className="bg-muted/20 hover:bg-muted/30 border-border"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadResult.success && uploadResult.data ? (
              <div className={`rounded-lg p-4 bg-${colors.success}/10 border border-${colors.success}/20`}>
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-foreground">File:</span>
                      <p className="text-foreground/80">{uploadResult.data.fileName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Size:</span>
                      <p className="text-foreground/80">{formatFileSize(uploadResult.data.fileSize)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Area:</span>
                      <p className="text-foreground/80">{uploadResult.data.areaName}</p>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Time:</span>
                      <p className="text-foreground/80">
                        {new Date(uploadResult.data.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <Separator className="opacity-20" />

                  {/* Processing Results */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className={`text-center p-3 rounded-lg bg-${colors.success}/5 border border-${colors.success}/10`}>
                      <div className={`text-2xl font-bold text-${colors.success}`}>
                        {uploadResult.data.savedInitiatives}
                      </div>
                      <div className="text-sm text-foreground/70">Initiatives Created</div>
                    </div>
                    <div className={`text-center p-3 rounded-lg bg-${colors.primary}/5 border border-${colors.primary}/10`}>
                      <div className={`text-2xl font-bold text-${colors.primary}`}>
                        {uploadResult.data.sheetsProcessed}
                      </div>
                      <div className="text-sm text-foreground/70">Sheets Processed</div>
                    </div>
                    <div className={`text-center p-3 rounded-lg bg-muted/20 border border-border/50`}>
                      <div className="text-2xl font-bold text-foreground">
                        {uploadResult.data.recordsProcessed}
                      </div>
                      <div className="text-sm text-foreground/70">Records Parsed</div>
                    </div>
                  </div>

                  {/* Sheet Details */}
                  {uploadResult.data.sheetDetails && uploadResult.data.sheetDetails.length > 0 && (
                    <div>
                      <h5 className={`font-medium mb-3 text-${colors.primary}`}>
                        Sheet Processing Details:
                      </h5>
                      <div className="space-y-2">
                        {uploadResult.data.sheetDetails.map((sheet, i) => (
                          <div key={i} className="flex items-center justify-between bg-muted/20 rounded-lg px-4 py-3">
                            <span className="text-sm font-medium text-foreground">
                              {sheet.sheetName}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`bg-${colors.primary}/20 text-${colors.primary} border-${colors.primary}/30`}
                            >
                              {sheet.recordCount} records
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Errors/Warnings */}
                  {uploadResult.data.errors && uploadResult.data.errors.length > 0 && (
                    <div>
                      <h5 className={`font-medium mb-3 text-${colors.warning} flex items-center gap-2`}>
                        <AlertTriangle className="h-4 w-4" />
                        Warnings ({uploadResult.data.errors.length}):
                      </h5>
                      <div className={`bg-${colors.warning}/10 border border-${colors.warning}/20 rounded-lg p-3`}>
                        <ul className={`space-y-1 text-sm text-${colors.warning}/90`}>
                          {uploadResult.data.errors.slice(0, 10).map((error, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className={`text-${colors.warning} mt-1`}>•</span>
                              <span>{error}</span>
                            </li>
                          ))}
                          {uploadResult.data.errors.length > 10 && (
                            <li className={`italic text-${colors.warning}`}>
                              ... and {uploadResult.data.errors.length - 10} more warnings
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Upload Failed:</strong> {uploadResult.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}