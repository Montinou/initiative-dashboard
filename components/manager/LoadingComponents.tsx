'use client';

import React from 'react';
import { Loader2, TrendingUp, FileText, BarChart3, Users, Upload, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'skeleton' | 'progress';
}

// Generic loading spinner
export function LoadingSpinner({ message, size = 'md' }: LoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-3 p-6">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
      {message && (
        <p className="text-sm text-muted-foreground text-center">{message}</p>
      )}
    </div>
  );
}

// Skeleton loading for cards
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <Card className={`bg-card border-border ${className}`}>
      <CardHeader className="space-y-2">
        <Skeleton className="h-4 w-3/4 bg-muted" />
        <Skeleton className="h-3 w-1/2 bg-muted" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-8 w-full bg-muted" />
        <div className="flex space-x-2">
          <Skeleton className="h-4 w-16 bg-muted" />
          <Skeleton className="h-4 w-20 bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

// Loading state for summary cards
export function SummaryCardSkeleton() {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 bg-muted" />
            <Skeleton className="h-8 w-16 bg-muted" />
            <Skeleton className="h-3 w-20 bg-muted" />
          </div>
          <Skeleton className="h-12 w-12 rounded-lg bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

// Loading for initiatives list
export function InitiativesListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index} className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/4 bg-muted" />
                <Skeleton className="h-4 w-full bg-muted" />
                <Skeleton className="h-4 w-2/3 bg-muted" />
              </div>
              <div className="flex space-x-2 ml-4">
                <Skeleton className="h-6 w-16 bg-muted" />
                <Skeleton className="h-6 w-20 bg-muted" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16 bg-muted" />
                <Skeleton className="h-3 w-12 bg-muted" />
              </div>
              <Skeleton className="h-2 w-full bg-muted" />
            </div>
            <div className="flex justify-between items-center mt-4">
              <div className="flex space-x-4">
                <Skeleton className="h-4 w-20 bg-muted" />
                <Skeleton className="h-4 w-24 bg-muted" />
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-8 bg-muted" />
                <Skeleton className="h-8 w-8 bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Loading for file upload progress
export function FileUploadProgress({ 
  progress, 
  fileName, 
  status = 'uploading' 
}: { 
  progress: number; 
  fileName: string; 
  status?: 'uploading' | 'processing' | 'complete' | 'error' 
}) {
  const statusMessages = {
    uploading: 'Uploading file...',
    processing: 'Processing data...',
    complete: 'Upload complete!',
    error: 'Upload failed'
  };

  const statusColors = {
    uploading: 'bg-primary',
    processing: 'bg-accent',
    complete: 'bg-primary',
    error: 'bg-destructive'
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Upload className="h-5 w-5 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{fileName}</p>
            <p className="text-xs text-muted-foreground">{statusMessages[status]}</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(progress)}% complete</span>
            <span>{status === 'error' ? 'Failed' : `${Math.round(progress)}/100`}</span>
          </div>
          <Progress 
            value={progress} 
            className={`h-2 ${status === 'error' ? 'bg-destructive/20' : ''}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Chart loading skeleton
export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32 bg-muted" />
          <Skeleton className="h-4 w-20 bg-muted" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`${height} flex items-end justify-center space-x-2 p-4`}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton 
              key={index} 
              className={`w-8 bg-muted`}
              style={{ height: `${Math.random() * 80 + 20}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Activity feed loading
export function ActivityFeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-start space-x-3 p-4 rounded-lg bg-card border border-border">
          <Skeleton className="h-8 w-8 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 bg-muted" />
            <Skeleton className="h-3 w-1/2 bg-muted" />
            <Skeleton className="h-3 w-1/4 bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// File history loading
export function FileHistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-10 w-10 rounded bg-muted" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-40 bg-muted" />
              <Skeleton className="h-3 w-24 bg-muted" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-16 bg-muted" />
            <Skeleton className="h-8 w-8 bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Full page loading with context
export function PageLoading({ 
  title = "Loading Dashboard", 
  description = "Preparing your manager dashboard..." 
}: { 
  title?: string; 
  description?: string; 
}) {
  return (
    <div className="flex items-center justify-center min-h-[50vh] p-8">
      <Card className="w-full max-w-md mx-auto bg-card border-border">
        <CardContent className="p-8 text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 border-4 border-primary/20 rounded-full"></div>
            </div>
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex justify-center space-x-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-2 w-2 bg-primary rounded-full animate-pulse"
                style={{ animationDelay: `${index * 0.2}s` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Smart loading that shows different content based on type
export function SmartLoading({ 
  type, 
  count = 1 
}: { 
  type: 'initiatives' | 'metrics' | 'activity' | 'files' | 'chart' | 'page';
  count?: number;
}) {
  switch (type) {
    case 'initiatives':
      return <InitiativesListSkeleton />;
    case 'metrics':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <SummaryCardSkeleton key={index} />
          ))}
        </div>
      );
    case 'activity':
      return <ActivityFeedSkeleton />;
    case 'files':
      return <FileHistorySkeleton />;
    case 'chart':
      return <ChartSkeleton />;
    case 'page':
      return <PageLoading />;
    default:
      return <LoadingSpinner />;
  }
}

// Optimistic loading wrapper
export function OptimisticWrapper({ 
  isLoading, 
  children, 
  fallback 
}: { 
  isLoading: boolean; 
  children: React.ReactNode; 
  fallback: React.ReactNode; 
}) {
  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      )}
      {children || fallback}
    </div>
  );
}