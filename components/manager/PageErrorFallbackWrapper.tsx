"use client";

import { PageErrorFallback } from './FallbackComponents';

export function PageErrorFallbackWrapper() {
  return (
    <PageErrorFallback 
      onRetry={() => window.location.reload()}
      onGoHome={() => window.location.href = '/'}
    />
  );
}