import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Production-safe logging service
 * Only logs in development mode, silent in production
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private readonly isDevelopment = !environment.production;

  /**
   * Log informational messages
   */
  log(...args: any[]): void {
    if (this.isDevelopment) {
      console.log(...args);
    }
  }

  /**
   * Log warning messages
   */
  warn(...args: any[]): void {
    if (this.isDevelopment) {
      console.warn(...args);
    }
  }

  /**
   * Log error messages
   * Errors are logged even in production for monitoring
   */
  error(...args: any[]): void {
    if (this.isDevelopment) {
      console.error(...args);
    } else {
      // In production, send errors to error tracking service
      // For now, just log to console in a safe way
      this.logToErrorTracking(...args);
    }
  }

  /**
   * Log debug messages (development only)
   */
  debug(...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(...args);
    }
  }

  /**
   * Log table data (development only)
   */
  table(data: any): void {
    if (this.isDevelopment && console.table) {
      console.table(data);
    }
  }

  /**
   * Send errors to error tracking service in production
   * This would integrate with services like Sentry, LogRocket, etc.
   */
  private logToErrorTracking(...args: any[]): void {
    // In production, you would send errors to an error tracking service
    // For example:
    // - Sentry.captureException()
    // - LogRocket.captureException()
    // - Custom API endpoint

    // For now, just use console.error but with sanitized data
    try {
      const sanitizedArgs = args.map(arg => {
        if (arg instanceof Error) {
          return {
            name: arg.name,
            message: arg.message,
            stack: arg.stack
          };
        }
        // Sanitize any sensitive data
        if (typeof arg === 'object') {
          return this.sanitizeObject(arg);
        }
        return arg;
      });

      console.error('[Production Error]', ...sanitizedArgs);
    } catch (error) {
      // Fallback if sanitization fails
      console.error('[Production Error] Error logging failed');
    }
  }

  /**
   * Sanitize object to remove sensitive data before logging
   */
  private sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sensitiveKeys = [
      'password',
      'token',
      'apiKey',
      'secret',
      'creditCard',
      'cvv',
      'ssn',
      'pin'
    ];

    const sanitized: any = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveKeys.some(sensitiveKey =>
          lowerKey.includes(sensitiveKey)
        );

        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitized[key] = this.sanitizeObject(obj[key]);
        } else {
          sanitized[key] = obj[key];
        }
      }
    }

    return sanitized;
  }

  /**
   * Performance timing utility
   */
  time(label: string): void {
    if (this.isDevelopment && console.time) {
      console.time(label);
    }
  }

  /**
   * End performance timing
   */
  timeEnd(label: string): void {
    if (this.isDevelopment && console.timeEnd) {
      console.timeEnd(label);
    }
  }

  /**
   * Group logs together
   */
  group(label: string): void {
    if (this.isDevelopment && console.group) {
      console.group(label);
    }
  }

  /**
   * End log group
   */
  groupEnd(): void {
    if (this.isDevelopment && console.groupEnd) {
      console.groupEnd();
    }
  }
}
