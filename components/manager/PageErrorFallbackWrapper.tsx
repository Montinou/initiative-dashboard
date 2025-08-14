"use client";

import { PageErrorFallback } from './FallbackComponents';

/**
 * PageErrorFallbackWrapper - Production error boundary fallback
 * 
 * Features:
 * - Provides retry functionality with page reload
 * - Navigation to home page option
 * - Consistent error handling across manager views
 */
export function PageErrorFallbackWrapper() {
  return (
    <PageErrorFallback 
      onRetry={() => window.location.reload()}
      onGoHome={() => window.location.href = '/'}
    />
  );
}