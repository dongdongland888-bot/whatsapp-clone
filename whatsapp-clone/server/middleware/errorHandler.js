// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || 'INTERNAL_ERROR';
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  }
  
  if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = 'Invalid or expired token';
  }
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    code = 'FILE_TOO_LARGE';
    message = 'File size exceeds the limit';
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    code = 'UNEXPECTED_FILE';
    message = 'Unexpected file field';
  }
  
  // MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    message = 'This record already exists';
    
    // Parse the duplicate field from error message
    const match = err.message.match(/Duplicate entry '(.+)' for key '(.+)'/);
    if (match) {
      const [, value, key] = match;
      if (key.includes('email')) {
        message = 'This email is already registered';
      } else if (key.includes('username')) {
        message = 'This username is already taken';
      } else if (key.includes('phone')) {
        message = 'This phone number is already registered';
      }
    }
  }
  
  if (err.code === 'ER_NO_REFERENCED_ROW' || err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    code = 'INVALID_REFERENCE';
    message = 'Referenced record does not exist';
  }
  
  if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    code = 'DATABASE_UNAVAILABLE';
    message = 'Database service is unavailable';
  }
  
  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'An unexpected error occurred. Please try again later.';
  }
  
  res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

// Not found handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
    code: 'NOT_FOUND'
  });
};

// Async handler wrapper to catch errors in async routes
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error creators
const createError = {
  badRequest: (message = 'Bad request') => new AppError(message, 400, 'BAD_REQUEST'),
  unauthorized: (message = 'Unauthorized') => new AppError(message, 401, 'UNAUTHORIZED'),
  forbidden: (message = 'Forbidden') => new AppError(message, 403, 'FORBIDDEN'),
  notFound: (message = 'Resource not found') => new AppError(message, 404, 'NOT_FOUND'),
  conflict: (message = 'Conflict') => new AppError(message, 409, 'CONFLICT'),
  tooManyRequests: (message = 'Too many requests') => new AppError(message, 429, 'TOO_MANY_REQUESTS'),
  internal: (message = 'Internal server error') => new AppError(message, 500, 'INTERNAL_ERROR')
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  createError
};
