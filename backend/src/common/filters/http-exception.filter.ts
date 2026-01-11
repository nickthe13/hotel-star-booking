import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: any;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log the error
    this.logError(exception, errorResponse);

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: Request): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;

    // Handle HttpException (NestJS standard exceptions)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      let message: string;
      let details: any;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        details = responseObj.errors || responseObj.details;

        // Handle validation errors (array of messages)
        if (Array.isArray(message)) {
          details = message;
          message = 'Validation failed';
        }
      } else {
        message = exception.message;
      }

      return {
        statusCode: status,
        message,
        error: this.getErrorName(status),
        timestamp,
        path,
        ...(details && { details }),
      };
    }

    // Handle Prisma errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception, timestamp, path);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid data provided',
        error: 'Bad Request',
        timestamp,
        path,
      };
    }

    // Handle generic errors
    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : exception.message,
        error: 'Internal Server Error',
        timestamp,
        path,
      };
    }

    // Handle unknown errors
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      error: 'Internal Server Error',
      timestamp,
      path,
    };
  }

  private handlePrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
    timestamp: string,
    path: string,
  ): ErrorResponse {
    switch (exception.code) {
      case 'P2002':
        // Unique constraint violation
        const target = (exception.meta?.target as string[])?.join(', ') || 'field';
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `A record with this ${target} already exists`,
          error: 'Conflict',
          timestamp,
          path,
        };

      case 'P2025':
        // Record not found
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'Not Found',
          timestamp,
          path,
        };

      case 'P2003':
        // Foreign key constraint violation
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Related record not found',
          error: 'Bad Request',
          timestamp,
          path,
        };

      case 'P2014':
        // Required relation violation
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Required relation violation',
          error: 'Bad Request',
          timestamp,
          path,
        };

      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error occurred',
          error: 'Internal Server Error',
          timestamp,
          path,
        };
    }
  }

  private getErrorName(status: number): string {
    const errorNames: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };

    return errorNames[status] || 'Error';
  }

  private logError(exception: unknown, errorResponse: ErrorResponse): void {
    const { statusCode, message, path } = errorResponse;

    if (statusCode >= 500) {
      // Log full error for server errors
      this.logger.error(
        `[${statusCode}] ${path} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (statusCode >= 400) {
      // Log warning for client errors
      this.logger.warn(`[${statusCode}] ${path} - ${message}`);
    }
  }
}
