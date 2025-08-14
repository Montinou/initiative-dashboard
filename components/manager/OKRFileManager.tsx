"use client";

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useManagerArea } from '@/components/manager/ManagerAreaProvider';
import { getThemeFromTenant } from '@/lib/theme-config-simple';
import { 
  Upload, 
  History, 
  FileSpreadsheet, 
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { OKRFileUpload } from '@/components/OKRFileUpload';
import { OKRFileUploadHistory } from '@/components/OKRFileUploadHistory';

interface OKRUploadResult {
  success: boolean;
  data?: {
    uploadId: string;
    fileName: string;
    fileSize: number;
    recordsProcessed: number;
    sheetsProcessed: number;
    savedInitiatives: number;
    errors: string[];
    areaName: string;
    timestamp: string;
  };
  error?: string;
}

interface OKRFileManagerProps {
  areaName?: string;
  className?: string;
  onInitiativesUpdated?: () => void;
}

export function OKRFileManager({
  areaName,
  className = '',
  onInitiativesUpdated
}: OKRFileManagerProps) {
  const { session } = useAuth();
  const { area } = useManagerArea();
  const theme = area?.tenant?.subdomain ? getThemeFromTenant(area.tenant.subdomain) : null;
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [uploadStats, setUploadStats] = useState({
    totalUploads: 0,
    successfulUploads: 0,
    failedUploads: 0,
    totalInitiatives: 0
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const fetchUploadStats = useCallback(async () => {
    if (!session) return;

    try {
      setIsLoadingStats(true);
      const response = await fetch('/api/upload/okr-file/stats');
      
      if (response.ok) {
        const result = await response.json();
        setUploadStats(result.data || {
          totalUploads: 0,
          successfulUploads: 0,
          failedUploads: 0,
          totalInitiatives: 0
        });
      }
    } catch (error) {
      console.error('Error fetching upload stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, [session]);

  useEffect(() => {
    fetchUploadStats();
  }, [fetchUploadStats, refreshTrigger]);

  const handleUploadComplete = useCallback((result: OKRUploadResult) => {
    if (result.success && result.data) {
      // Update stats
      setUploadStats(prev => ({
        ...prev,
        totalUploads: prev.totalUploads + 1,
        successfulUploads: prev.successfulUploads + 1,
        totalInitiatives: prev.totalInitiatives + (result.data?.savedInitiatives || 0)
      }));

      // Trigger refresh of history
      setRefreshTrigger(prev => prev + 1);

      // Switch to history tab to show the result
      setActiveTab('history');

      // Notify parent about initiatives update
      if (onInitiativesUpdated) {
        onInitiativesUpdated();
      }
    } else {
      // Update failed upload count
      setUploadStats(prev => ({
        ...prev,
        totalUploads: prev.totalUploads + 1,
        failedUploads: prev.failedUploads + 1
      }));

      // Trigger refresh of history to show failed upload
      setRefreshTrigger(prev => prev + 1);
    }
  }, [onInitiativesUpdated]);

  const handleReUpload = useCallback((fileName: string) => {
    // Switch to upload tab for re-upload
    setActiveTab('upload');
    
    toast({
      title: "Re-upload file",
      description: `Please select "${fileName}" or a corrected version to re-upload.`,
    });
  }, [toast]);

  const refreshAll = () => {
    setRefreshTrigger(prev => prev + 1);
    fetchUploadStats();
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
      {/* Header with Stats */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">OKR File Manager</h1>
            <p className="text-muted-foreground mt-1">
              Upload and manage OKR Excel files {areaName ? `for ${areaName}` : ''}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={refreshAll}
            disabled={isLoadingStats}
            className="bg-card/50 hover:bg-card/70 border-border"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStats ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Upload Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="backdrop-blur-md bg-card/50 border border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-${colors.primary}/10`}>
                  <FileSpreadsheet className={`h-5 w-5 text-${colors.primary}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {uploadStats.totalUploads}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Uploads</div>
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
                  <div className="text-2xl font-bold text-foreground">
                    {uploadStats.successfulUploads}
                  </div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-card/50 border border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {uploadStats.failedUploads}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-md bg-card/50 border border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-${colors.primary}/10`}>
                  <Plus className={`h-5 w-5 text-${colors.primary}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {uploadStats.totalInitiatives}
                  </div>
                  <div className="text-sm text-muted-foreground">Initiatives Created</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Card className="backdrop-blur-md bg-card/50 border border-border">
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/20">
                <TabsTrigger 
                  value="upload" 
                  className={`flex items-center gap-2 data-[state=active]:bg-${colors.primary}/10 data-[state=active]:text-${colors.primary}`}
                >
                  <Upload className="h-4 w-4" />
                  Upload Files
                </TabsTrigger>
                <TabsTrigger 
                  value="history"
                  className={`flex items-center gap-2 data-[state=active]:bg-${colors.primary}/10 data-[state=active]:text-${colors.primary}`}
                >
                  <History className="h-4 w-4" />
                  Upload History
                </TabsTrigger>
              </TabsList>
              
              {activeTab === 'upload' && (
                <Badge variant="outline" className={`bg-${colors.primary}/10 text-${colors.primary} border-${colors.primary}/30`}>
                  Ready to Upload
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <TabsContent value="upload" className="mt-0">
              <OKRFileUpload
                onUploadComplete={handleUploadComplete}
                areaName={areaName}
                className="border-0 p-0 bg-transparent"
              />
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <OKRFileUploadHistory
                onReUpload={handleReUpload}
                refreshTrigger={refreshTrigger}
                className="border-0 p-0 bg-transparent"
              />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Quick Actions */}
      <Card className="backdrop-blur-md bg-card/50 border border-border">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 h-auto p-4 bg-${colors.primary}/5 hover:bg-${colors.primary}/10 border-${colors.primary}/20`}
            >
              <Upload className={`h-5 w-5 text-${colors.primary}`} />
              <div className="text-left">
                <div className={`font-medium text-${colors.primary}`}>New Upload</div>
                <div className="text-xs text-muted-foreground">Upload OKR Excel file</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const response = await fetch('/api/upload/okr-file/template');
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'OKR_Template.xlsx';
                  link.click();
                  window.URL.revokeObjectURL(url);
                } catch (error) {
                  toast({
                    title: "Download failed",
                    description: "Failed to download template. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
              className="flex items-center gap-2 h-auto p-4 bg-card/50 hover:bg-card/70 border-border"
            >
              <Download className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium text-foreground">Download Template</div>
                <div className="text-xs text-muted-foreground">Get Excel template</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={() => setActiveTab('history')}
              className="flex items-center gap-2 h-auto p-4 bg-card/50 hover:bg-card/70 border-border"
            >
              <History className="h-5 w-5 text-muted-foreground" />
              <div className="text-left">
                <div className="font-medium text-foreground">View History</div>
                <div className="text-xs text-muted-foreground">Check upload status</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}