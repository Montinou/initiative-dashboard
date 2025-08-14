"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useManagerArea } from '@/components/manager/ManagerAreaProvider';
import { getThemeFromTenant } from '@/lib/theme-config-simple';
import { 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Trash2, 
  Download, 
  RefreshCw,
  Filter,
  Search,
  Calendar,
  MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileUploadRecord {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  upload_status: 'processing' | 'completed' | 'completed_with_errors' | 'failed';
  processed_records: number;
  error_message: string | null;
  uploaded_at: string;
  processed_at: string | null;
  area_name: string;
}

interface OKRFileUploadHistoryProps {
  onReUpload?: (fileName: string) => void;
  className?: string;
  refreshTrigger?: number;
}

export function OKRFileUploadHistory({
  onReUpload,
  className = '',
  refreshTrigger = 0
}: OKRFileUploadHistoryProps) {
  const { session } = useAuth();
  const { area } = useManagerArea();
  const theme = area?.tenant?.subdomain ? getThemeFromTenant(area.tenant.subdomain) : null;
  const { toast } = useToast();
  
  const [uploads, setUploads] = useState<FileUploadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');

  const fetchUploadHistory = useCallback(async () => {
    if (!session) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/upload/okr-file/history');
      
      if (!response.ok) {
        throw new Error('Failed to fetch upload history');
      }

      const result = await response.json();
      setUploads(result.data || []);
    } catch (error) {
      console.error('Error fetching upload history:', error);
      toast({
        title: "Error loading history",
        description: "Failed to load upload history. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [session, toast]);

  useEffect(() => {
    fetchUploadHistory();
  }, [fetchUploadHistory, refreshTrigger]);

  const handleDeleteUpload = async (uploadId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/upload/okr-file/${uploadId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete upload record');
      }

      setUploads(prev => prev.filter(upload => upload.id !== uploadId));
      
      toast({
        title: "Upload deleted",
        description: `Successfully deleted ${fileName}`,
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete upload record. Please try again.",
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getStatusBadge = (status: string) => {
    const colors = getStatusColor();
    
    switch (status) {
      case 'completed':
        return (
          <Badge className={`bg-${colors.success}/10 text-${colors.success} border-${colors.success}/20`}>
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'completed_with_errors':
        return (
          <Badge className={`bg-${colors.warning}/10 text-${colors.warning} border-${colors.warning}/20`}>
            <AlertCircle className="h-3 w-3 mr-1" />
            With Warnings
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'processing':
        return (
          <Badge className={`bg-${colors.primary}/10 text-${colors.primary} border-${colors.primary}/20`}>
            <Clock className="h-3 w-3 mr-1" />
            Processing
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            Unknown
          </Badge>
        );
    }
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

  const filteredUploads = uploads
    .filter(upload => {
      const matchesSearch = upload.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          upload.area_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || upload.upload_status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
        case 'oldest':
          return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
        case 'name':
          return a.file_name.localeCompare(b.file_name);
        case 'size':
          return b.file_size - a.file_size;
        default:
          return 0;
      }
    });

  const colors = getStatusColor();

  if (isLoading) {
    return (
      <Card className={`backdrop-blur-md bg-card/50 border border-border ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-y-4">
            <RefreshCw className={`h-6 w-6 animate-spin text-${colors.primary}`} />
            <span className="text-muted-foreground ml-2">Loading upload history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`backdrop-blur-md bg-card/50 border border-border ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Upload History</CardTitle>
            <CardDescription>
              Track your OKR file uploads and their processing status
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUploadHistory}
            className="bg-card/50 hover:bg-card/70 border-border"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files or areas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-card/50 border-border"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-card/50 border-border">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="completed_with_errors">With Warnings</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-32 bg-card/50 border-border">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="size">Size</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {filteredUploads.length === 0 ? (
          <div className="text-center py-8">
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No matching uploads' : 'No uploads yet'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Upload your first OKR Excel file to see it here'
              }
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {filteredUploads.map((upload) => {
                const uploadDate = formatDate(upload.uploaded_at);
                const processedDate = upload.processed_at ? formatDate(upload.processed_at) : null;
                
                return (
                  <div key={upload.id} className="border border-border/50 rounded-lg p-4 bg-card/20">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg bg-${colors.primary}/10`}>
                          <FileSpreadsheet className={`h-5 w-5 text-${colors.primary}`} />
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-foreground truncate">
                              {upload.file_name}
                            </h4>
                            {getStatusBadge(upload.upload_status)}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Size:</span> {formatFileSize(upload.file_size)}
                            </div>
                            <div>
                              <span className="font-medium">Area:</span> {upload.area_name}
                            </div>
                            <div>
                              <span className="font-medium">Records:</span> {upload.processed_records || 0}
                            </div>
                            <div>
                              <span className="font-medium">Uploaded:</span> {uploadDate.date} {uploadDate.time}
                            </div>
                          </div>
                          
                          {processedDate && (
                            <div className="text-xs text-muted-foreground">
                              Processed: {processedDate.date} {processedDate.time}
                            </div>
                          )}
                          
                          {upload.error_message && (
                            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded p-2 mt-2">
                              <strong>Error:</strong> {upload.error_message}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {upload.upload_status === 'failed' && onReUpload && (
                            <DropdownMenuItem onClick={() => onReUpload(upload.file_name)}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Re-upload
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDeleteUpload(upload.id, upload.file_name)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}