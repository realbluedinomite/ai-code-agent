import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiResponse, ErrorResponse } from '../../shared/types';

export interface AppError extends Error {
  statusCode: number;
  code?: string;
  details?: Record<string, any>;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public code?: string;
  public details?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  // Log error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    requestId,
    path: req.path,
    method: req.method
  });

  // Handle specific error types
  if (error instanceof CustomError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.code || 'CUSTOM_ERROR',
        message: error.message,
        details: error.details
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        path: req.path,
        method: req.method
      }
    };

    res.status(error.statusCode).json(response);
    return;
  }

  // Handle validation errors (Joi)
  if ((error as any).isJoi) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          validationErrors: (error as any).details?.map((detail: any) => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        path: req.path,
        method: req.method
      }
    };

    res.status(400).json(response);
    return;
  }

  // Handle JWT errors
  if ((error as any).name === 'JsonWebTokenError') {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        path: req.path,
        method: req.method
      }
    };

    res.status(401).json(response);
    return;
  }

  // Default error
  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      path: req.path,
      method: req.method
    }
  };

  res.status(500).json(response);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new CustomError(
    `Route ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

export const createError = (message: string, statusCode: number = 500, code?: string, details?: Record<string, any>) => {
  return new CustomError(message, statusCode, code, details);
};