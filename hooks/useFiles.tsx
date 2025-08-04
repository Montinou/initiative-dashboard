/**
 * File Management Hook
 * Comprehensive hook for file operations with caching and state management
 */

"use client";

import { useState, useCallback, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { useAuth, useTenantId } from '@/lib/auth-context';
import { 
  validateFileUploadSecurity, 
  UserPermissionContext,
  FileSecurityCheck
} from '@/lib/file-upload/security';

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

export interface FileUploadOptions {
  areaId?: string;
  initiativeId?: string;
  fileCategory?: string;
  accessLevel?: 'private' | 'area' | 'tenant' | 'public';
  autoProcess?: boolean;
  metadata?: Record<string, any>;
}

export interface FileListOptions {
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'size' | 'type' | 'date' | 'uploader';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  category?: string;
  type?: string;
  status?: string;
  areaId?: string;
  initiativeId?: string;
}

export interface UploadState {
  isUploading: boolean;
  uploadProgress: Record<string, number>;
  uploadErrors: Record<string, string>;
  completedUploads: string[];
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useFiles(options: FileListOptions = {}) {
  const { session, user } = useAuth();
  const tenantId = useTenantId();
  
  // State
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    uploadProgress: {},
    uploadErrors: {},
    completedUploads: []
  });

  // Build query parameters
  const queryParams = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.set(key, value.toString());
    }
  });

  // Fetch files with SWR
  const cacheKey = session ? `/api/files?${queryParams.toString()}` : null;
  
  const { data, error, mutate: refetch, isLoading } = useSWR(
    cacheKey,
    async (url: string) => {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      dedupingInterval: 5000
    }
  );

  // ============================================================================
  // FILE OPERATIONS
  // ============================================================================

  const uploadFiles = useCallback(async (
    files: File[], 
    uploadOptions: FileUploadOptions = {}
  ): Promise<{ success: boolean; results: any[]; errors: string[] }> => {
    if (!session || !user || !tenantId) {
      throw new Error('Authentication required');
    }

    // Get user context for security validation
    const userContext: UserPermissionContext = {
      userId: user.id,
      tenantId: tenantId,
      areaId: user.user_metadata?.area_id,
      role: user.user_metadata?.role || 'Analyst',
      isSystemAdmin: user.user_metadata?.is_system_admin || false
    };

    const results: any[] = [];
    const errors: string[] = [];
    let uploadedCount = 0;

    setUploadState(prev => ({
      ...prev,
      isUploading: true,
      uploadProgress: {},
      uploadErrors: {},
      completedUploads: []
    }));

    try {
      for (const file of files) {
        const fileId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        try {
          // 1. Validate file security
          const securityCheck = await validateFileUploadSecurity(
            file,
            userContext,
            uploadOptions.areaId,
            uploadOptions.initiativeId
          );

          if (!securityCheck.isValid) {
            errors.push(`${file.name}: ${securityCheck.errors.join(', ')}`);
            setUploadState(prev => ({
              ...prev,
              uploadErrors: { ...prev.uploadErrors, [fileId]: securityCheck.errors.join(', ') }
            }));
            continue;
          }

          // 2. Prepare form data
          const formData = new FormData();
          formData.append('file', file);
          
          if (uploadOptions.areaId) formData.append('areaId', uploadOptions.areaId);
          if (uploadOptions.initiativeId) formData.append('initiativeId', uploadOptions.initiativeId);
          if (uploadOptions.fileCategory) formData.append('fileCategory', uploadOptions.fileCategory);
          if (uploadOptions.accessLevel) formData.append('accessLevel', uploadOptions.accessLevel);
          if (uploadOptions.autoProcess !== undefined) formData.append('autoProcess', uploadOptions.autoProcess.toString());
          if (uploadOptions.metadata) formData.append('metadata', JSON.stringify(uploadOptions.metadata));

          // 3. Upload with progress tracking
          const xhr = new XMLHttpRequest();
          
          const uploadPromise = new Promise<any>((resolve, reject) => {
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const progress = Math.round((event.loaded / event.total) * 100);
                setUploadState(prev => ({
                  ...prev,
                  uploadProgress: { ...prev.uploadProgress, [fileId]: progress }
                }));
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const response = JSON.parse(xhr.responseText);
                  resolve(response);
                } catch (e) {
                  reject(new Error('Invalid response format'));
                }
              } else {
                reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
              }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.ontimeout = () => reject(new Error('Upload timeout'));

            xhr.open('POST', '/api/files/upload', true);
            xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
            xhr.timeout = 300000; // 5 minutes timeout
            xhr.send(formData);
          });

          const result = await uploadPromise;

          if (result.success) {
            results.push({
              file: file.name,
              fileId: result.data.fileId,
              ...result.data
            });
            uploadedCount++;
            
            setUploadState(prev => ({
              ...prev,
              completedUploads: [...prev.completedUploads, fileId]
            }));
          } else {
            errors.push(`${file.name}: ${result.error}`);
            setUploadState(prev => ({
              ...prev,
              uploadErrors: { ...prev.uploadErrors, [fileId]: result.error }
            }));
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          errors.push(`${file.name}: ${errorMessage}`);
          setUploadState(prev => ({
            ...prev,
            uploadErrors: { ...prev.uploadErrors, [fileId]: errorMessage }
          }));
        }
      }

      // Refresh file list if any uploads succeeded
      if (uploadedCount > 0) {
        await refetch();
        
        // Also refresh related cache keys
        mutate(key => typeof key === 'string' && key.startsWith('/api/files'), undefined, { revalidate: true });
      }

      return {
        success: uploadedCount > 0,
        results,
        errors
      };

    } finally {
      setUploadState(prev => ({
        ...prev,
        isUploading: false
      }));
    }
  }, [session, user, tenantId, refetch]);

  const downloadFile = useCallback(async (fileId: string): Promise<{ success: boolean; url?: string; error?: string }> => {
    if (!session) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const response = await fetch(`/api/files/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Open download in new tab/window
        window.open(result.data.downloadUrl, '_blank');
        return { success: true, url: result.data.downloadUrl };
      } else {
        return { success: false, error: result.error || 'Download failed' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Download failed' 
      };
    }
  }, [session]);

  const deleteFile = useCallback(async (fileId: string): Promise<{ success: boolean; error?: string }> => {
    if (!session) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Refresh file list
        await refetch();
        mutate(key => typeof key === 'string' && key.startsWith('/api/files'), undefined, { revalidate: true });
        
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Delete failed' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Delete failed' 
      };
    }
  }, [session, refetch]);

  const shareFile = useCallback(async (
    fileId: string, 
    options: {
      shareType: 'public_link' | 'user_access' | 'area_access';
      expiresIn?: number;
      permissions?: string[];
      targetUserId?: string;
      targetAreaId?: string;
    }
  ): Promise<{ success: boolean; shareUrl?: string; expiresAt?: string; error?: string }> => {
    if (!session) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const response = await fetch(`/api/files/${fileId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(options)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        return { 
          success: true, 
          shareUrl: result.data.shareUrl,
          expiresAt: result.data.expiresAt
        };
      } else {
        return { success: false, error: result.error || 'Share failed' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Share failed' 
      };
    }
  }, [session]);

  const bulkAction = useCallback(async (
    action: 'download' | 'delete' | 'share',
    fileIds: string[]
  ): Promise<{ success: boolean; results: any[]; errors: string[] }> => {
    const results: any[] = [];
    const errors: string[] = [];

    for (const fileId of fileIds) {
      try {
        switch (action) {
          case 'download':
            const downloadResult = await downloadFile(fileId);
            if (downloadResult.success) {
              results.push({ fileId, action: 'downloaded' });
            } else {
              errors.push(`${fileId}: ${downloadResult.error}`);
            }
            break;

          case 'delete':
            const deleteResult = await deleteFile(fileId);
            if (deleteResult.success) {
              results.push({ fileId, action: 'deleted' });
            } else {
              errors.push(`${fileId}: ${deleteResult.error}`);
            }
            break;

          case 'share':
            const shareResult = await shareFile(fileId, {
              shareType: 'public_link',
              expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
              permissions: ['view', 'download']
            });
            if (shareResult.success) {
              results.push({ 
                fileId, 
                action: 'shared',
                shareUrl: shareResult.shareUrl,
                expiresAt: shareResult.expiresAt
              });
            } else {
              errors.push(`${fileId}: ${shareResult.error}`);
            }
            break;

          default:
            errors.push(`${fileId}: Unknown action ${action}`);
        }
      } catch (error) {
        errors.push(`${fileId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      success: results.length > 0,
      results,
      errors
    };
  }, [downloadFile, deleteFile]);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const getFileStats = useCallback(() => {
    if (!data?.data?.summary) return null;

    return {
      totalFiles: data.data.summary.totalFiles,
      totalSize: data.data.summary.totalSize,
      averageSize: data.data.summary.averageSize,
      categoryStats: data.data.summary.categoryStats,
      statusStats: data.data.summary.statusStats,
      typeStats: data.data.summary.typeStats
    };
  }, [data]);

  const formatFileSize = useCallback((bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }, []);

  // ============================================================================
  // RETURN HOOK INTERFACE
  // ============================================================================

  return {
    // Data
    files: data?.data?.files || [],
    pagination: data?.data?.pagination,
    filters: data?.data?.filters,
    summary: data?.data?.summary,
    
    // Loading states
    isLoading,
    isError: !!error,
    error: error?.message,
    
    // Upload state
    uploadState,
    
    // Operations
    uploadFiles,
    downloadFile,
    deleteFile,
    shareFile,
    bulkAction,
    refetch,
    
    // Utilities
    getFileStats,
    formatFileSize
  };
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook for area-specific files
 */
export function useAreaFiles(areaId: string, options: Omit<FileListOptions, 'areaId') = {}) {
  return useFiles({ ...options, areaId });
}

/**
 * Hook for initiative-specific files
 */
export function useInitiativeFiles(initiativeId: string, options: Omit<FileListOptions, 'initiativeId') = {}) {
  return useFiles({ ...options, initiativeId });
}

/**
 * Hook for recent files
 */
export function useRecentFiles(limit: number = 10) {
  return useFiles({ 
    sortBy: 'date', 
    sortOrder: 'desc', 
    limit,
    status: 'uploaded'
  });
}

/**
 * Hook for file statistics
 */
export function useFileStatistics() {
  const { summary, isLoading, error } = useFiles({ limit: 1 }); // Just get summary
  
  return {
    stats: summary,
    isLoading,
    error
  };
}