import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AppError,
  AuthenticationError,
  PermissionError,
  ValidationError,
  NetworkError,
  DatabaseError,
  FileUploadError,
  ErrorHandler,
  useErrorHandler,
  ErrorContext
} from '@/lib/error-handling';

// Mock supabase client
vi.mock('@/utils/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null })
    }))
  }
}));

// Mock window object
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with all properties', () => {
      const error = new AppError('Test error', 'TEST_ERROR', { userId: '123' }, false);
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.context).toEqual({ userId: '123' });
      expect(error.isRecoverable).toBe(false);
      expect(error.timestamp).toBeTruthy();
      expect(error.name).toBe('AppError');
    });

    it('should use default values', () => {
      const error = new AppError('Test error');
      
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.context).toBeUndefined();
      expect(error.isRecoverable).toBe(true);
    });
  });

  describe('AuthenticationError', () => {
    it('should create auth error with defaults', () => {
      const error = new AuthenticationError();
      
      expect(error.message).toBe('Authentication failed');
      expect(error.code).toBe('AUTH_ERROR');
      expect(error.isRecoverable).toBe(false);
      expect(error.name).toBe('AuthenticationError');
    });

    it('should accept custom message', () => {
      const error = new AuthenticationError('Session expired');
      expect(error.message).toBe('Session expired');
    });
  });

  describe('PermissionError', () => {
    it('should create permission error', () => {
      const error = new PermissionError();
      
      expect(error.message).toBe('Permission denied');
      expect(error.code).toBe('PERMISSION_ERROR');
      expect(error.isRecoverable).toBe(false);
      expect(error.name).toBe('PermissionError');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.isRecoverable).toBe(true);
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('NetworkError', () => {
    it('should create network error', () => {
      const error = new NetworkError();
      
      expect(error.message).toBe('Network request failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.isRecoverable).toBe(true);
      expect(error.name).toBe('NetworkError');
    });
  });

  describe('DatabaseError', () => {
    it('should create database error', () => {
      const error = new DatabaseError();
      
      expect(error.message).toBe('Database operation failed');
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.isRecoverable).toBe(true);
      expect(error.name).toBe('DatabaseError');
    });
  });

  describe('FileUploadError', () => {
    it('should create file upload error', () => {
      const error = new FileUploadError('File too large');
      
      expect(error.message).toBe('File too large');
      expect(error.code).toBe('FILE_UPLOAD_ERROR');
      expect(error.isRecoverable).toBe(true);
      expect(error.name).toBe('FileUploadError');
    });
  });
});

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('[]');
  });

  describe('handleApiError', () => {
    it('should return AppError if already AppError', () => {
      const appError = new AppError('Test', 'TEST');
      const result = ErrorHandler.handleApiError(appError);
      expect(result).toBe(appError);
    });

    it('should handle JWT/auth errors', () => {
      const error = { message: 'JWT expired' };
      const result = ErrorHandler.handleApiError(error);
      
      expect(result).toBeInstanceOf(AuthenticationError);
      expect(result.message).toBe('JWT expired');
    });

    it('should handle permission/policy errors', () => {
      const error = { message: 'permission denied by policy' };
      const result = ErrorHandler.handleApiError(error);
      
      expect(result).toBeInstanceOf(PermissionError);
      expect(result.message).toBe('permission denied by policy');
    });

    it('should handle validation/constraint errors', () => {
      const error = { message: 'violates foreign key constraint' };
      const result = ErrorHandler.handleApiError(error);
      
      expect(result).toBeInstanceOf(ValidationError);
      expect(result.message).toBe('violates foreign key constraint');
    });

    it('should handle network/fetch errors', () => {
      const error = { message: 'network request failed' };
      const result = ErrorHandler.handleApiError(error);
      
      expect(result).toBeInstanceOf(NetworkError);
      expect(result.message).toBe('network request failed');
    });

    it('should handle database errors', () => {
      const error = { message: 'database connection lost' };
      const result = ErrorHandler.handleApiError(error);
      
      expect(result).toBeInstanceOf(DatabaseError);
      expect(result.message).toBe('database connection lost');
    });

    it('should handle TypeError for fetch', () => {
      const error = new TypeError('Failed to fetch');
      const result = ErrorHandler.handleApiError(error);
      
      expect(result).toBeInstanceOf(NetworkError);
      expect(result.message).toBe('Network connection failed');
    });

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong');
      const result = ErrorHandler.handleApiError(error);
      
      // Generic errors with messages are treated as database errors
      expect(result).toBeInstanceOf(DatabaseError);
      expect(result.message).toBe('Something went wrong');
      expect(result.code).toBe('DATABASE_ERROR');
    });

    it('should handle errors without message', () => {
      const error = {};
      const result = ErrorHandler.handleApiError(error);
      
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('An unexpected error occurred');
    });

    it('should pass context through', () => {
      const context: ErrorContext = { userId: '123', tenantId: '456' };
      const error = new Error('Test');
      const result = ErrorHandler.handleApiError(error, context);
      
      expect(result.context).toEqual(context);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return friendly message for AuthenticationError', () => {
      const error = new AuthenticationError();
      const message = ErrorHandler.getUserFriendlyMessage(error);
      expect(message).toBe('Your session has expired. Please refresh the page and sign in again.');
    });

    it('should return friendly message for PermissionError', () => {
      const error = new PermissionError();
      const message = ErrorHandler.getUserFriendlyMessage(error);
      expect(message).toBe('You do not have permission to perform this action.');
    });

    it('should return validation error message as-is', () => {
      const error = new ValidationError('Email is required');
      const message = ErrorHandler.getUserFriendlyMessage(error);
      expect(message).toBe('Email is required');
    });

    it('should return friendly message for NetworkError', () => {
      const error = new NetworkError();
      const message = ErrorHandler.getUserFriendlyMessage(error);
      expect(message).toBe('Network connection issue. Please check your internet connection and try again.');
    });

    it('should return friendly message for DatabaseError', () => {
      const error = new DatabaseError();
      const message = ErrorHandler.getUserFriendlyMessage(error);
      expect(message).toBe('A database error occurred. Our team has been notified. Please try again in a few moments.');
    });

    it('should return file upload error message as-is', () => {
      const error = new FileUploadError('File size exceeds 10MB limit');
      const message = ErrorHandler.getUserFriendlyMessage(error);
      expect(message).toBe('File size exceeds 10MB limit');
    });

    it('should return generic message for unknown errors', () => {
      const error = new Error('Random error');
      const message = ErrorHandler.getUserFriendlyMessage(error);
      expect(message).toBe('An unexpected error occurred. Please try again or contact support if the issue persists.');
    });
  });

  describe('getRecoveryAction', () => {
    it('should return refresh for AuthenticationError', () => {
      const error = new AuthenticationError();
      const action = ErrorHandler.getRecoveryAction(error);
      expect(action).toBe('refresh');
    });

    it('should return redirect for PermissionError', () => {
      const error = new PermissionError();
      const action = ErrorHandler.getRecoveryAction(error);
      expect(action).toBe('redirect');
    });

    it('should return retry for NetworkError', () => {
      const error = new NetworkError();
      const action = ErrorHandler.getRecoveryAction(error);
      expect(action).toBe('retry');
    });

    it('should return retry for DatabaseError', () => {
      const error = new DatabaseError();
      const action = ErrorHandler.getRecoveryAction(error);
      expect(action).toBe('retry');
    });

    it('should return none for non-recoverable AppError', () => {
      const error = new AppError('Fatal error', 'FATAL', undefined, false);
      const action = ErrorHandler.getRecoveryAction(error);
      expect(action).toBe('none');
    });

    it('should return retry for recoverable errors', () => {
      const error = new Error('Some error');
      const action = ErrorHandler.getRecoveryAction(error);
      expect(action).toBe('retry');
    });
  });

  describe('logError', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    afterEach(() => {
      consoleErrorSpy.mockClear();
    });

    it('should log error to console in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // Reset the spy to capture calls during this test
      consoleErrorSpy.mockClear();

      const error = new AppError('Test error', 'TEST');
      await ErrorHandler.logError(error);

      // The function should log to console in development mode
      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls.find(call => 
        call[0] === 'Error logged:' && 
        typeof call[1] === 'object' && 
        call[1].message === 'Test error'
      );
      expect(logCall).toBeTruthy();

      process.env.NODE_ENV = originalEnv;
    });

    it('should store error in localStorage', async () => {
      // Clear the mock to ensure we capture calls from this test
      mockLocalStorage.setItem.mockClear();
      
      const error = new AppError('Test error', 'TEST');
      await ErrorHandler.logError(error);

      // Check that localStorage.setItem was called with the error logs
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'errorLogs',
        expect.stringContaining('Test error')
      );
    });

    it('should keep only last 50 errors in localStorage', async () => {
      const existingLogs = Array(50).fill({}).map((_, i) => ({ message: `Error ${i}` }));
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingLogs));
      mockLocalStorage.setItem.mockClear();

      const error = new AppError('New error', 'TEST');
      await ErrorHandler.logError(error);

      // Check that setItem was called
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      
      if (mockLocalStorage.setItem.mock.calls.length > 0) {
        const savedLogs = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
        expect(savedLogs).toHaveLength(50);
        expect(savedLogs[49].message).toBe('New error');
      }
    });

    it('should handle localStorage errors gracefully', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      const error = new AppError('Test error', 'TEST');
      // Should not throw
      await expect(ErrorHandler.logError(error)).resolves.not.toThrow();
    });
  });
});

describe('useErrorHandler hook', () => {
  it('should handle errors with handleError', async () => {
    const { handleError } = useErrorHandler();
    const error = new Error('Test error');
    const context = { userId: '123' };

    const result = await handleError(error, context);

    expect(result).toBeInstanceOf(AppError);
    expect(result.message).toBe('Test error');
    expect(result.context).toEqual(context);
  });

  it('should handle async operations with handleAsyncError', async () => {
    const { handleAsyncError } = useErrorHandler();
    
    // Successful operation
    const successOp = async () => 'success';
    const successHandler = handleAsyncError(successOp);
    const successResult = await successHandler();
    
    expect(successResult).toEqual({ data: 'success' });

    // Failed operation
    const failOp = async () => {
      throw new Error('Operation failed');
    };
    const failHandler = handleAsyncError(failOp, { userId: '123' });
    const failResult = await failHandler();
    
    expect(failResult.error).toBeInstanceOf(AppError);
    expect(failResult.error?.message).toBe('Operation failed');
    expect(failResult.data).toBeUndefined();
  });

  it('should expose utility functions', () => {
    const { getUserFriendlyMessage, getRecoveryAction } = useErrorHandler();
    
    const error = new AuthenticationError();
    
    expect(getUserFriendlyMessage(error)).toBe(
      'Your session has expired. Please refresh the page and sign in again.'
    );
    expect(getRecoveryAction(error)).toBe('refresh');
  });
});

describe('Global error handlers', () => {
  it('should handle unhandled promise rejections', async () => {
    const logErrorSpy = vi.spyOn(ErrorHandler, 'logError');
    
    const event = new Event('unhandledrejection') as any;
    event.reason = { message: 'Promise rejected' };
    
    window.dispatchEvent(event);
    
    await vi.waitFor(() => {
      expect(logErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Promise rejected',
          code: 'UNHANDLED_REJECTION'
        })
      );
    });
  });

  it('should handle global errors', async () => {
    const logErrorSpy = vi.spyOn(ErrorHandler, 'logError');
    
    const event = new ErrorEvent('error', {
      error: { message: 'Global error occurred' }
    });
    
    window.dispatchEvent(event);
    
    await vi.waitFor(() => {
      expect(logErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Global error occurred',
          code: 'GLOBAL_ERROR'
        })
      );
    });
  });
});