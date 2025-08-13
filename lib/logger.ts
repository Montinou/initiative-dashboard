/**
 * Production Logger Service
 * Provides structured logging with different levels and contexts
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  service?: string;
  userId?: string;
  tenantId?: string;
  jobId?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
  
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private shouldLog(level: LogLevel): boolean {
    return this.logLevels[level] >= this.logLevels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${contextStr} ${message}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, context);

    if (this.isDevelopment) {
      // In development, use console with color coding
      switch (level) {
        case 'debug':
          console.debug('\x1b[36m%s\x1b[0m', formattedMessage); // Cyan
          break;
        case 'info':
          console.info('\x1b[32m%s\x1b[0m', formattedMessage); // Green
          break;
        case 'warn':
          console.warn('\x1b[33m%s\x1b[0m', formattedMessage); // Yellow
          break;
        case 'error':
          console.error('\x1b[31m%s\x1b[0m', formattedMessage); // Red
          break;
      }
    } else {
      // In production, use structured logging
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...context,
      };

      // Send to monitoring service (could be Datadog, Sentry, CloudWatch, etc.)
      // For now, we'll use console in production but with structured format
      switch (level) {
        case 'error':
          console.error(JSON.stringify(logEntry));
          // TODO: Send to error tracking service like Sentry
          break;
        case 'warn':
          console.warn(JSON.stringify(logEntry));
          break;
        default:
          console.log(JSON.stringify(logEntry));
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    let errorDetails = context || {};
    
    if (error instanceof Error) {
      errorDetails = {
        ...errorDetails,
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
      };
    } else if (error) {
      errorDetails = {
        ...errorDetails,
        error: String(error),
      };
    }

    this.log('error', message, errorDetails);
  }

  // Create a child logger with persistent context
  child(context: LogContext): Logger {
    const childLogger = new Logger();
    const originalMethods = {
      debug: this.debug.bind(this),
      info: this.info.bind(this),
      warn: this.warn.bind(this),
      error: this.error.bind(this),
    };

    childLogger.debug = (message: string, additionalContext?: LogContext) => {
      originalMethods.debug(message, { ...context, ...additionalContext });
    };

    childLogger.info = (message: string, additionalContext?: LogContext) => {
      originalMethods.info(message, { ...context, ...additionalContext });
    };

    childLogger.warn = (message: string, additionalContext?: LogContext) => {
      originalMethods.warn(message, { ...context, ...additionalContext });
    };

    childLogger.error = (message: string, error?: Error | unknown, additionalContext?: LogContext) => {
      originalMethods.error(message, error, { ...context, ...additionalContext });
    };

    return childLogger;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing or specific use cases
export { Logger, LogLevel, LogContext };