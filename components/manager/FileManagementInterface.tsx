"use client";

import { useState, useEffect, useCallback } from 'react';
import { useManagerContext } from '@/hooks/useManagerAreaData';
import { getThemeFromTenant } from '@/lib/theme-config';
import { 
  FileSpreadsheet, 
  Upload, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Trash2,
  Download,
  RefreshCw,
  FolderOpen,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { OKRFileUpload } from '@/components/OKRFileUpload';
import { OKRFileUploadHistory } from '@/components/OKRFileUploadHistory';

interface FileStats {
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  processingUploads: number;
  totalRecordsProcessed: number;
  totalInitiativesCreated: number;
  avgProcessingTime: number;
  lastUploadDate: string | null;
  diskSpaceUsed: number;
}

interface RecentActivity {
  id: string;
  type: 'upload' | 'process' | 'delete' | 'error';
  message: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

interface FileManagementInterfaceProps {
  className?: string;
}

export function FileManagementInterface({ className = '' }: FileManagementInterfaceProps) {
  const { areaData, isLoading: areaLoading } = useManagerContext();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('upload');
  const [fileStats, setFileStats] = useState<FileStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const theme = areaData?.area?.tenant_id ? getThemeFromTenant(areaData.area.tenant_id) : null;

  // Fetch file statistics
  const fetchFileStats = useCallback(async () => {
    if (!areaData?.area?.id) return;

    try {
      setIsLoadingStats(true);
      const response = await fetch(`/api/manager/file-stats?areaId=${areaData.area.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch file statistics');
      }

      const result = await response.json();
      setFileStats(result.data);
    } catch (error) {
      console.error('Error fetching file stats:', error);
      // Don't show toast for stats errors to avoid spam
    } finally {
      setIsLoadingStats(false);
    }
  }, [areaData?.area?.id]);

  // Fetch recent activity
  const fetchRecentActivity = useCallback(async () => {
    if (!areaData?.area?.id) return;

    try {
      const response = await fetch(`/api/manager/file-activity?areaId=${areaData.area.id}&limit=10`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch recent activity');
      }

      const result = await response.json();
      setRecentActivity(result.data || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  }, [areaData?.area?.id]);

  useEffect(() => {
    if (areaData?.area?.id) {
      fetchFileStats();
      fetchRecentActivity();
    }
  }, [fetchFileStats, fetchRecentActivity, refreshTrigger]);

  const handleUploadComplete = (result: any) => {
    // Refresh stats and activity after upload
    setRefreshTrigger(prev => prev + 1);
    
    // Add to recent activity
    const newActivity: RecentActivity = {
      id: `upload-${Date.now()}`,
      type: 'upload',
      message: result.success 
        ? `Successfully uploaded ${result.data?.fileName} with ${result.data?.savedInitiatives} initiatives`
        : `Failed to upload file: ${result.error}`,
      timestamp: new Date().toISOString(),
      status: result.success ? 'success' : 'error'
    };
    
    setRecentActivity(prev => [newActivity, ...prev.slice(0, 9)]);

    if (result.success) {
      setActiveTab('history');
    }
  };

  const handleReUpload = (fileName: string) => {
    setActiveTab('upload');
    toast({
      title: "Re-upload ready",
      description: `Ready to re-upload ${fileName}`,
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = () => {
    if (theme?.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2') {
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

  if (areaLoading) {
    return (
      <Card className={`backdrop-blur-md bg-card/50 border border-border ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className={`h-6 w-6 animate-spin text-${colors.primary} mr-2`} />
            <span className="text-muted-foreground">Loading file management...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!areaData?.area) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to load area data. Please refresh the page or contact support.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="backdrop-blur-md bg-card/50 border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${colors.primary}/10`}>
                <Upload className={`h-5 w-5 text-${colors.primary}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {fileStats?.totalUploads || 0}
                </p>
                <p className="text-sm text-muted-foreground">Total Uploads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-card/50 border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${colors.success}/10`}>
                <CheckCircle className={`h-5 w-5 text-${colors.success}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {fileStats?.totalInitiativesCreated || 0}
                </p>
                <p className="text-sm text-muted-foreground">Initiatives Created</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-card/50 border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${colors.warning}/10`}>
                <BarChart3 className={`h-5 w-5 text-${colors.warning}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {fileStats?.totalRecordsProcessed || 0}
                </p>
                <p className="text-sm text-muted-foreground">Records Processed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-md bg-card/50 border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted/20`}>
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {fileStats?.diskSpaceUsed ? formatBytes(fileStats.diskSpaceUsed) : '0 Bytes'}
                </p>
                <p className="text-sm text-muted-foreground">Storage Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Rate Alert */}
      {fileStats && fileStats.totalUploads > 0 && (
        <Alert className={`bg-${colors.primary}/10 border-${colors.primary}/20`}>
          <TrendingUp className={`h-4 w-4 text-${colors.primary}`} />
          <AlertDescription className="text-foreground">
            <strong>Upload Success Rate:</strong> {' '}
            {Math.round((fileStats.successfulUploads / fileStats.totalUploads) * 100)}% 
            ({fileStats.successfulUploads} of {fileStats.totalUploads} uploads successful)
            {fileStats.failedUploads > 0 && (
              <span className="text-destructive ml-2">
                • {fileStats.failedUploads} failed uploads require attention
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File Operations - Takes 2/3 of the space */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-card/50 border border-border">
              <TabsTrigger 
                value="upload" 
                className="data-[state=active]:bg-card data-[state=active]:text-foreground"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </TabsTrigger>
              <TabsTrigger 
                value="history"
                className="data-[state=active]:bg-card data-[state=active]:text-foreground"
              >
                <Clock className="h-4 w-4 mr-2" />
                Upload History
                {fileStats && fileStats.processingUploads > 0 && (
                  <Badge 
                    variant="secondary" 
                    className={`ml-2 bg-${colors.warning}/20 text-${colors.warning}`}
                  >
                    {fileStats.processingUploads}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="mt-6">
              <OKRFileUpload 
                onUploadComplete={handleUploadComplete}
                areaName={areaData.area.name}
              />
            </TabsContent>
            
            <TabsContent value="history" className="mt-6">
              <OKRFileUploadHistory 
                onReUpload={handleReUpload}
                refreshTrigger={refreshTrigger}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Recent Activity Sidebar - Takes 1/3 of the space */}
        <div className="lg:col-span-1">
          <Card className="backdrop-blur-md bg-card/50 border border-border h-fit">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchRecentActivity}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Latest file operations in {areaData.area.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-card/20 border border-border/50">
                      <div className={`
                        p-1 rounded-full flex-shrink-0 mt-0.5
                        ${activity.status === 'success' ? `bg-${colors.success}/20` : ''}
                        ${activity.status === 'error' ? 'bg-destructive/20' : ''}
                        ${activity.status === 'warning' ? `bg-${colors.warning}/20` : ''}
                        ${activity.status === 'info' ? `bg-${colors.primary}/20` : ''}
                      `}>
                        {activity.type === 'upload' && (
                          <Upload className={`h-3 w-3 ${
                            activity.status === 'success' ? `text-${colors.success}` : 'text-destructive'
                          }`} />
                        )}
                        {activity.type === 'process' && (
                          <CheckCircle className={`h-3 w-3 text-${colors.success}`} />
                        )}
                        {activity.type === 'delete' && (
                          <Trash2 className="h-3 w-3 text-destructive" />
                        )}
                        {activity.type === 'error' && (
                          <AlertCircle className="h-3 w-3 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-relaxed">
                          {activity.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="backdrop-blur-md bg-card/50 border border-border mt-4">
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start bg-card/50 hover:bg-card/70 border-border"
                onClick={() => setActiveTab('upload')}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload New File
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start bg-card/50 hover:bg-card/70 border-border"
                onClick={() => setRefreshTrigger(prev => prev + 1)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh All Data
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start bg-card/50 hover:bg-card/70 border-border"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/upload/okr-file/template');
                    if (response.ok) {
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = 'OKR_Template.xlsx';
                      link.click();
                      window.URL.revokeObjectURL(url);
                      toast({
                        title: "Template downloaded",
                        description: "OKR template downloaded successfully",
                      });
                    }
                  } catch (error) {
                    toast({
                      title: "Download failed",
                      description: "Failed to download template",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}