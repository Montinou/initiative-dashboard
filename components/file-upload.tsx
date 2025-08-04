"use client";

import { useState, useCallback } from 'react';
import { useAuth, useTenantId } from '@/lib/auth-context';
import { getThemeFromTenant } from '@/lib/theme-config';
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface UploadResult {
  success: boolean;
  data?: {
    fileName: string;
    fileSize: number;
    recordsProcessed: number;
    sheetsProcessed: number;
    sheetDetails: Array<{
      sheetName: string;
      data: any[];
      recordCount: number;
    }>;
    errors: string[];
    parsedData: any[];
    timestamp: string;
  };
  error?: string;
}

interface FileUploadComponentProps {
  onUploadComplete?: (result: UploadResult) => void;
  maxFiles?: number;
  accept?: string[];
  className?: string;
}

export function FileUploadComponent({
  onUploadComplete,
  maxFiles = 5,
  accept = ['.xlsx', '.xls', '.csv'],
  className = ''
}: FileUploadComponentProps) {
  const { session } = useAuth();
  const tenantId = useTenantId();
  const theme = tenantId ? getThemeFromTenant(tenantId) : null;
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [currentFileName, setCurrentFileName] = useState<string>('');

  const uploadFile = async (file: File): Promise<UploadResult> => {
    if (!session?.access_token) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
      });

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
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  };

  const handleFileSelect = useCallback(async (files: FileList) => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    
    const results: UploadResult[] = [];

    for (let i = 0; i < Math.min(files.length, maxFiles); i++) {
      const file = files[i];
      setCurrentFileName(file.name);
      setUploadProgress((i / files.length) * 100);

      // Validate file type
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!accept.includes(fileExtension)) {
        results.push({
          success: false,
          error: `File type ${fileExtension} not supported. Supported types: ${accept.join(', ')}`
        });
        continue;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        results.push({
          success: false,
          error: `File "${file.name}" is too large. Maximum size is 10MB.`
        });
        continue;
      }

      try {
        const result = await uploadFile(file);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: `Failed to upload "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    setUploadProgress(100);
    setUploadResults(results);
    setIsUploading(false);
    setCurrentFileName('');

    // Notify parent component
    if (onUploadComplete) {
      results.forEach(result => onUploadComplete(result));
    }
  }, [accept, maxFiles, onUploadComplete]);

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
    setIsDragActive(false);
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

  const clearResults = () => {
    setUploadResults([]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200
          ${isDragActive 
            ? theme?.slug === 'siga' ? 'border-siga-green bg-siga-green/10 scale-105' : 'border-primary bg-primary/10 scale-105'
            : theme?.slug === 'siga' ? 'border-siga-green/50 hover:border-siga-green bg-card/50 hover:bg-siga-green/5' : 'border-border hover:border-border/70 bg-card/50'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        `}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept={accept.join(',')}
          onChange={handleFileInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className={`
            p-3 rounded-full transition-colors duration-200
            ${isDragActive 
              ? theme?.slug === 'siga' ? 'bg-siga-green/20' : 'bg-primary/20'
              : theme?.slug === 'siga' ? 'bg-siga-green/10' : 'bg-muted/50'
            }
          `}>
            <Upload className={`h-6 w-6 ${
              isDragActive 
                ? theme?.slug === 'siga' ? 'text-siga-green' : 'text-primary'
                : theme?.slug === 'siga' ? 'text-siga-green' : 'text-muted-foreground'
            }`} />
          </div>
          
          <div>
            <h3 className={`text-lg font-semibold mb-2 ${
              theme?.slug === 'siga' ? 'text-siga-green' : 'text-foreground'
            }`}>
              {isDragActive ? 'Suelta los archivos aquí' : 'Subir Archivo Excel'}
            </h3>
            <p className="text-muted-foreground mb-3">
              Arrastra archivos {accept.join(', ')} o haz clic para seleccionar
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {accept.map(type => (
                <Badge key={type} variant="outline" className={`transition-colors duration-200 ${
                  theme?.slug === 'siga' 
                    ? 'bg-siga-green/10 text-siga-green border-siga-green/30 hover:bg-siga-green/20' 
                    : 'bg-muted/20 text-foreground border-border'
                }`}>
                  {type.toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <Card className="backdrop-blur-md bg-card/50 border border-border">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground/80">Subiendo: {currentFileName}</span>
                <span className="text-foreground/80">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <Card className="backdrop-blur-md bg-card/50 border border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground text-lg">
                Resultados de Carga ({uploadResults.length})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={clearResults}
                className="bg-muted/20 hover:bg-muted/30 border-border text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadResults.map((result, index) => (
              <div key={index} className="space-y-3">
                {result.success && result.data ? (
                  <div className={`rounded-lg p-4 ${
                    theme?.slug === 'fema' ? 'bg-fema-blue/10 border border-fema-blue/20' :
                    theme?.slug === 'siga' ? 'bg-siga-green/10 border border-siga-green/20' :
                    'bg-primary/10 border border-primary/20'
                  }`}>
                    <div className="flex items-start gap-3">
                      <CheckCircle className={`h-5 w-5 mt-0.5 ${
                        theme?.slug === 'fema' ? 'text-fema-blue' :
                        theme?.slug === 'siga' ? 'text-siga-green' :
                        'text-primary'
                      }`} />
                      <div className="flex-1 space-y-2">
                        <div>
                          <h4 className={`font-medium ${
                            theme?.slug === 'fema' ? 'text-fema-blue' :
                            theme?.slug === 'siga' ? 'text-siga-green' :
                            'text-primary'
                          }`}>
                            {result.data.fileName}
                          </h4>
                          <p className="text-sm text-foreground/80">
                            Archivo procesado exitosamente
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-foreground/70">
                          <div>
                            <span className="font-medium">Tamaño:</span> {formatFileSize(result.data.fileSize)}
                          </div>
                          <div>
                            <span className="font-medium">Registros:</span> {result.data.recordsProcessed}
                          </div>
                          {result.data.sheetsProcessed && (
                            <>
                              <div>
                                <span className="font-medium">Hojas:</span> {result.data.sheetsProcessed}
                              </div>
                              <div>
                                <span className="font-medium">Timestamp:</span> {new Date(result.data.timestamp).toLocaleTimeString()}
                              </div>
                            </>
                          )}
                        </div>

                        {result.data.sheetDetails && result.data.sheetDetails.length > 0 && (
                          <div className="mt-3">
                            <h5 className={`font-medium mb-2 ${
                              theme?.slug === 'fema' ? 'text-fema-blue' :
                              theme?.slug === 'siga' ? 'text-siga-green' :
                              'text-primary'
                            }`}>
                              Detalles por hoja:
                            </h5>
                            <div className="space-y-2">
                              {result.data.sheetDetails.map((sheet, i) => (
                                <div key={i} className="flex items-center justify-between bg-muted/20 rounded px-3 py-2">
                                  <span className="text-sm text-foreground/80">{sheet.sheetName}</span>
                                  <Badge variant="outline" className={`${
                                    theme?.slug === 'fema' ? 'bg-fema-blue/20 text-fema-blue border-fema-blue/30' :
                                    theme?.slug === 'siga' ? 'bg-siga-green/20 text-siga-green border-siga-green/30' :
                                    'bg-primary/20 text-primary border-primary/30'
                                  }`}>
                                    {sheet.recordCount} registros
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {result.data.errors.length > 0 && (
                          <div className="mt-3">
                            <h5 className={`font-medium mb-2 ${
                              theme?.slug === 'fema' ? 'text-fema-yellow' :
                              theme?.slug === 'siga' ? 'text-siga-yellow' :
                              'text-secondary'
                            }`}>
                              Advertencias ({result.data.errors.length}):
                            </h5>
                            <ul className={`space-y-1 text-sm ${
                              theme?.slug === 'fema' ? 'text-fema-yellow/80' :
                              theme?.slug === 'siga' ? 'text-siga-yellow/80' :
                              'text-secondary/80'
                            }`}>
                              {result.data.errors.slice(0, 5).map((error, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className={`${  
                                    theme?.slug === 'fema' ? 'text-fema-yellow' :
                                    theme?.slug === 'siga' ? 'text-siga-yellow' :
                                    'text-secondary'
                                  }`}>•</span>
                                  <span>{error}</span>
                                </li>
                              ))}
                              {result.data.errors.length > 5 && (
                                <li className={`italic ${
                                  theme?.slug === 'fema' ? 'text-fema-yellow' :
                                  theme?.slug === 'siga' ? 'text-siga-yellow' :
                                  'text-secondary'
                                }`}>
                                  ... y {result.data.errors.length - 5} más
                                </li>
                              )}
                            </ul>
                          </div>
                        )}

                        {result.data.parsedData.length > 0 && (
                          <div className="mt-3">
                            <h5 className={`font-medium mb-2 ${
                              theme?.slug === 'fema' ? 'text-fema-blue' :
                              theme?.slug === 'siga' ? 'text-siga-green' :
                              'text-primary'
                            }`}>
                              Vista previa de datos:
                            </h5>
                            <div className={`bg-muted/30 rounded border overflow-x-auto ${
                              theme?.slug === 'fema' ? 'border-fema-blue/20' :
                              theme?.slug === 'siga' ? 'border-siga-green/20' :
                              'border-primary/20'
                            }`}>
                              <table className="w-full text-xs text-foreground/80">
                                <thead>
                                  <tr className={`border-b ${
                                    theme?.slug === 'fema' ? 'border-fema-blue/20' :
                                    theme?.slug === 'siga' ? 'border-siga-green/20' :
                                    'border-primary/20'
                                  }`}>
                                    <th className="text-left p-2">Área</th>
                                    <th className="text-left p-2">Objetivo</th>
                                    <th className="text-left p-2">Progreso</th>
                                    <th className="text-left p-2">Estado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {result.data.parsedData.slice(0, 3).map((row, i) => (
                                    <tr key={i} className={`border-b ${
                                      theme?.slug === 'fema' ? 'border-fema-blue/10' :
                                      theme?.slug === 'siga' ? 'border-siga-green/10' :
                                      'border-primary/10'
                                    }`}>
                                      <td className="p-2">{row.area}</td>
                                      <td className="p-2">{row.objetivo}</td>
                                      <td className="p-2">{row.progreso}%</td>
                                      <td className="p-2">{row.estado}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {result.data.parsedData.length > 3 && (
                                <div className={`p-2 text-center italic ${
                                  theme?.slug === 'fema' ? 'text-fema-blue' :
                                  theme?.slug === 'siga' ? 'text-siga-green' :
                                  'text-primary'
                                }`}>
                                  ... y {result.data.parsedData.length - 3} registros más
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-destructive mb-2">
                          Error en procesamiento
                        </h4>
                        <p className="text-sm text-destructive/80">
                          {result.error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}