import { supabase } from '@/utils/supabase/client';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  tenantId?: string;
  areaId?: string;
  metadata?: Record<string, any>;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  context?: ErrorContext;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly context?: ErrorContext;
  public readonly timestamp: string;
  public readonly isRecoverable: boolean;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    context?: ErrorContext,
    isRecoverable: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.isRecoverable = isRecoverable;
  }
}

// Specific error types for the manager dashboard
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', context?: ErrorContext) {
    super(message, 'AUTH_ERROR', context, false);
    this.name = 'AuthenticationError';
  }
}

export class PermissionError extends AppError {
  constructor(message: string = 'Permission denied', context?: ErrorContext) {
    super(message, 'PERMISSION_ERROR', context, false);
    this.name = 'PermissionError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'VALIDATION_ERROR', context, true);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', context?: ErrorContext) {
    super(message, 'NETWORK_ERROR', context, true);
    this.name = 'NetworkError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', context?: ErrorContext) {
    super(message, 'DATABASE_ERROR', context, true);
    this.name = 'DatabaseError';
  }
}

export class FileUploadError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(message, 'FILE_UPLOAD_ERROR', context, true);
    this.name = 'FileUploadError';
  }
}

// Error handling utilities
export class ErrorHandler {
  static async logError(error: Error | AppError, context?: ErrorContext) {
    const errorLog = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        ...(error instanceof AppError ? error.context : {})
      },
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorLog);
    }

    // Store in localStorage for debugging
    if (typeof window !== 'undefined') {
      try {
        const existingLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
        existingLogs.push(errorLog);
        localStorage.setItem('errorLogs', JSON.stringify(existingLogs.slice(-50))); // Keep last 50 errors
      } catch {
        // Ignore localStorage errors
      }
    }

    // Log to audit trail if we have context
    if (context?.userId && context?.tenantId) {
      try {
        await supabase.from('audit_log').insert({
          tenant_id: context.tenantId,
          user_id: context.userId,
          action: 'error_occurred',
          resource_type: 'application',
          resource_id: null,
          new_values: {
            error_type: error.name,
            error_message: error.message,
            error_code: error instanceof AppError ? error.code : 'UNKNOWN',
            context: context
          }
        });
      } catch (auditError) {
        console.error('Failed to log error to audit trail:', auditError);
      }
    }

    // In production, send to monitoring service
    // Example: Sentry.captureException(error, { extra: errorLog });
  }

  static handleApiError(error: any, context?: ErrorContext): AppError {
    if (error instanceof AppError) {
      return error;
    }

    // Handle Supabase errors
    if (error?.message) {
      if (error.message.includes('JWT') || error.message.includes('auth')) {
        return new AuthenticationError(error.message, context);
      }
      
      if (error.message.includes('permission') || error.message.includes('policy')) {
        return new PermissionError(error.message, context);
      }
      
      if (error.message.includes('violates') || error.message.includes('constraint')) {
        return new ValidationError(error.message, context);
      }
      
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return new NetworkError(error.message, context);
      }
      
      return new DatabaseError(error.message, context);
    }

    // Handle fetch errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new NetworkError('Network connection failed', context);
    }

    // Generic error
    return new AppError(
      error.message || 'An unexpected error occurred',
      'UNKNOWN_ERROR',
      context
    );
  }

  static getUserFriendlyMessage(error: Error | AppError): string {
    if (error instanceof AuthenticationError) {
      return 'Your session has expired. Please refresh the page and sign in again.';
    }
    
    if (error instanceof PermissionError) {
      return 'You do not have permission to perform this action.';
    }
    
    if (error instanceof ValidationError) {
      return error.message; // Validation messages are usually user-friendly
    }
    
    if (error instanceof NetworkError) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }
    
    if (error instanceof DatabaseError) {
      return 'A database error occurred. Our team has been notified. Please try again in a few moments.';
    }
    
    if (error instanceof FileUploadError) {
      return error.message; // File upload messages are usually specific
    }
    
    return 'An unexpected error occurred. Please try again or contact support if the issue persists.';
  }

  static getRecoveryAction(error: Error | AppError): 'retry' | 'refresh' | 'redirect' | 'none' {
    if (error instanceof AuthenticationError) {
      return 'refresh';
    }
    
    if (error instanceof PermissionError) {
      return 'redirect';
    }
    
    if (error instanceof NetworkError || error instanceof DatabaseError) {
      return 'retry';
    }
    
    if (error instanceof AppError && !error.isRecoverable) {
      return 'none';
    }
    
    return 'retry';
  }
}

// React hook for error handling
export function useErrorHandler() {
  const handleError = async (error: Error | AppError, context?: ErrorContext) => {
    const appError = ErrorHandler.handleApiError(error, context);
    await ErrorHandler.logError(appError, context);
    return appError;
  };

  const handleAsyncError = <T>(
    asyncOperation: () => Promise<T>,
    context?: ErrorContext
  ) => {
    return async (): Promise<{ data?: T; error?: AppError }> => {
      try {
        const data = await asyncOperation();
        return { data };
      } catch (error) {
        const appError = await handleError(error as Error, context);
        return { error: appError };
      }
    };
  };

  return {
    handleError,
    handleAsyncError,
    getUserFriendlyMessage: ErrorHandler.getUserFriendlyMessage,
    getRecoveryAction: ErrorHandler.getRecoveryAction
  };
}

// Global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', async (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    await ErrorHandler.logError(
      new AppError(
        event.reason?.message || 'Unhandled promise rejection',
        'UNHANDLED_REJECTION'
      )
    );
  });

  window.addEventListener('error', async (event) => {
    console.error('Global error:', event.error);
    await ErrorHandler.logError(
      new AppError(
        event.error?.message || event.message || 'Global error',
        'GLOBAL_ERROR'
      )
    );
  });
}