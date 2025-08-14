'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, WifiOff, Database, Shield, FileX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FallbackProps {
  onRetry?: () => void;
  message?: string;
  actionLabel?: string;
}

// Generic error fallback
export function ErrorFallback({ onRetry, message, actionLabel = "Try Again" }: FallbackProps) {
  return (
    <Card className="w-full bg-card border-border">
      <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Something went wrong</h3>
          <p className="text-muted-foreground mb-4">
            {message || "An error occurred while loading this content."}
          </p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Network error fallback
export function NetworkErrorFallback({ onRetry }: FallbackProps) {
  return (
    <Card className="w-full bg-card border-border">
      <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
        <WifiOff className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Connection Error</h3>
          <p className="text-muted-foreground mb-4">
            Unable to connect to the server. Please check your internet connection.
          </p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Connection
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Database error fallback
export function DatabaseErrorFallback({ onRetry }: FallbackProps) {
  return (
    <Card className="w-full bg-card border-border">
      <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
        <Database className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Database Error</h3>
          <p className="text-muted-foreground mb-4">
            Unable to access data. Our team has been notified.
          </p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Permission error fallback
export function PermissionErrorFallback() {
  return (
    <Card className="w-full bg-card border-border">
      <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
        <Shield className="h-12 w-12 text-amber-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Access Denied</h3>
          <p className="text-muted-foreground mb-4">
            You don't have permission to access this content.
          </p>
        </div>
        <Badge variant="destructive">Permission Required</Badge>
      </CardContent>
    </Card>
  );
}

// Empty state fallback
export function EmptyStateFallback({ 
  icon: Icon = FileX, 
  title = "No Data Found", 
  description = "There's no data to display at the moment.",
  actionLabel,
  onAction
}: {
  icon?: React.ElementType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card className="w-full bg-card border-border">
      <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
        <Icon className="h-16 w-16 text-muted-foreground" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
          <p className="text-muted-foreground mb-4 max-w-md">{description}</p>
        </div>
        {onAction && actionLabel && (
          <Button onClick={onAction} variant="outline">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Initiative-specific fallbacks
export function InitiativesErrorFallback({ onRetry }: FallbackProps) {
  return (
    <ErrorFallback 
      onRetry={onRetry}
      message="Unable to load initiatives. This might be a temporary issue."
      actionLabel="Reload Initiatives"
    />
  );
}

export function InitiativesEmptyFallback({ onCreateInitiative }: { onCreateInitiative?: () => void }) {
  return (
    <EmptyStateFallback
      title="No Initiatives Found"
      description="You haven't created any initiatives for your area yet. Start by creating your first initiative to track progress and manage tasks."
      actionLabel={onCreateInitiative ? "Create First Initiative" : undefined}
      onAction={onCreateInitiative}
    />
  );
}

// File upload fallbacks
export function FileUploadErrorFallback({ onRetry }: FallbackProps) {
  return (
    <ErrorFallback 
      onRetry={onRetry}
      message="File upload failed. Please check your file format and try again."
      actionLabel="Retry Upload"
    />
  );
}

export function FileHistoryEmptyFallback({ onUploadFile }: { onUploadFile?: () => void }) {
  return (
    <EmptyStateFallback
      title="No Files Uploaded"
      description="You haven't uploaded any OKR files yet. Upload your first Excel file to import initiatives and track progress."
      actionLabel={onUploadFile ? "Upload First File" : undefined}
      onAction={onUploadFile}
    />
  );
}

// Metrics fallbacks
export function MetricsErrorFallback({ onRetry }: FallbackProps) {
  return (
    <ErrorFallback 
      onRetry={onRetry}
      message="Unable to load metrics data. This might affect dashboard analytics."
      actionLabel="Reload Metrics"
    />
  );
}

export function MetricsEmptyFallback() {
  return (
    <EmptyStateFallback
      title="No Metrics Available"
      description="Metrics will appear here once you start creating initiatives and tracking progress."
    />
  );
}

// Activity feed fallbacks
export function ActivityFeedErrorFallback({ onRetry }: FallbackProps) {
  return (
    <ErrorFallback 
      onRetry={onRetry}
      message="Unable to load recent activity. Check your connection and try again."
      actionLabel="Reload Activity"
    />
  );
}

export function ActivityFeedEmptyFallback() {
  return (
    <EmptyStateFallback
      title="No Recent Activity"
      description="Activity will appear here as you and your team work on initiatives, upload files, and update progress."
    />
  );
}

// Chart/visualization fallbacks
export function ChartErrorFallback({ onRetry, chartType = "chart" }: FallbackProps & { chartType?: string }) {
  return (
    <ErrorFallback 
      onRetry={onRetry}
      message={`Unable to load ${chartType} data. This might be a temporary visualization issue.`}
      actionLabel="Reload Chart"
    />
  );
}

export function ChartEmptyFallback({ chartType = "chart" }: { chartType?: string }) {
  return (
    <EmptyStateFallback
      title={`No ${chartType} Data`}
      description={`${chartType} data will appear here once you have enough initiative progress to visualize.`}
    />
  );
}

// High-level page fallback
export function PageErrorFallback({ onRetry, onGoHome }: FallbackProps & { onGoHome?: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[50vh] p-4">
      <Card className="w-full max-w-md mx-auto bg-card border-border">
        <CardHeader className="text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <CardTitle className="text-foreground">Page Loading Error</CardTitle>
          <CardDescription className="text-muted-foreground">
            This page couldn't be loaded. This might be a temporary issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {onRetry && (
            <Button onClick={onRetry} className="w-full" variant="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Page
            </Button>
          )}
          {onGoHome && (
            <Button 
              onClick={onGoHome} 
              variant="outline" 
              className="w-full"
            >
              Go to Dashboard
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}