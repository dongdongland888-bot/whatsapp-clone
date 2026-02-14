/**
 * Unit tests for error handler middleware
 */
const { errorHandler, notFoundHandler, asyncHandler, AppError, createError } = require('../../middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      url: '/test'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  it('should handle general errors', () => {
    const error = new Error('Something went wrong');
    error.statusCode = 500;
    
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Something went wrong',
      code: 'INTERNAL_ERROR',
      stack: error.stack
    });
  });

  it('should handle ValidationError', () => {
    const error = new Error('Validation failed');
    error.name = 'ValidationError';
    
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      stack: error.stack
    });
  });

  it('should handle UnauthorizedError', () => {
    const error = new Error('Invalid token');
    error.name = 'UnauthorizedError';
    
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid or expired token',
      code: 'UNAUTHORIZED',
      stack: error.stack
    });
  });

  it('should handle file size limit errors', () => {
    const error = new Error('File too large');
    error.code = 'LIMIT_FILE_SIZE';
    
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'File size exceeds the limit',
      code: 'FILE_TOO_LARGE',
      stack: error.stack
    });
  });

  it('should handle duplicate entry errors for email', () => {
    const error = new Error("Duplicate entry 'test@example.com' for key 'users.email'");
    error.code = 'ER_DUP_ENTRY';
    
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'This email is already registered',
      code: 'DUPLICATE_ENTRY',
      stack: error.stack
    });
  });

  it('should handle duplicate entry errors for username', () => {
    const error = new Error("Duplicate entry 'testuser' for key 'users.username'");
    error.code = 'ER_DUP_ENTRY';
    
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'This username is already taken',
      code: 'DUPLICATE_ENTRY',
      stack: error.stack
    });
  });

  it('should handle duplicate entry errors for phone', () => {
    const error = new Error("Duplicate entry '+1234567890' for key 'users.phone'");
    error.code = 'ER_DUP_ENTRY';
    
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'This phone number is already registered',
      code: 'DUPLICATE_ENTRY',
      stack: error.stack
    });
  });

  it('should handle foreign key constraint errors', () => {
    const error = new Error('Foreign key constraint failed');
    error.code = 'ER_NO_REFERENCED_ROW';
    
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Referenced record does not exist',
      code: 'INVALID_REFERENCE',
      stack: error.stack
    });
  });

  it('should handle database connection errors', () => {
    const error = new Error('Connection refused');
    error.code = 'ECONNREFUSED';
    
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(503);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Database service is unavailable',
      code: 'DATABASE_UNAVAILABLE',
      stack: error.stack
    });
  });

  it('should hide internal error details in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const error = new Error('Internal error');
    error.statusCode = 500;
    
    errorHandler(error, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'An unexpected error occurred. Please try again later.',
      code: 'INTERNAL_ERROR'
      // stack should not be included in production
    });

    // Restore original env
    process.env.NODE_ENV = originalEnv;
  });
});

describe('Not Found Handler', () => {
  it('should return 404 for non-existent routes', () => {
    const mockReq = { method: 'GET', url: '/nonexistent' };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    notFoundHandler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message: 'Route GET /nonexistent not found',
      code: 'NOT_FOUND'
    });
  });
});

describe('Async Handler', () => {
  it('should wrap async functions and pass errors to next', async () => {
    const error = new Error('Async error');
    const asyncFn = jest.fn().mockRejectedValue(error);
    
    const wrappedHandler = asyncHandler(asyncFn);
    const mockNext = jest.fn();
    
    await wrappedHandler({}, {}, mockNext);
    
    expect(asyncFn).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('should wrap async functions and handle successful execution', async () => {
    const result = 'success';
    const asyncFn = jest.fn().mockResolvedValue(result);
    
    const wrappedHandler = asyncHandler(asyncFn);
    const mockRes = { json: jest.fn() };
    const mockNext = jest.fn();
    
    await wrappedHandler({}, mockRes, mockNext);
    
    expect(asyncFn).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });
});

describe('AppError Class', () => {
  it('should create an instance of AppError with correct properties', () => {
    const error = new AppError('Custom message', 400, 'CUSTOM_ERROR');
    
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Custom message');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('CUSTOM_ERROR');
    expect(error.isOperational).toBe(true);
  });
});

describe('Error Creators', () => {
  test('badRequest should create a 400 error', () => {
    const error = createError.badRequest();
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toBe('Bad request');
  });

  test('badRequest should accept custom message', () => {
    const error = createError.badRequest('Custom bad request');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
    expect(error.message).toBe('Custom bad request');
  });

  test('unauthorized should create a 401 error', () => {
    const error = createError.unauthorized();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.message).toBe('Unauthorized');
  });

  test('forbidden should create a 403 error', () => {
    const error = createError.forbidden();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
    expect(error.message).toBe('Forbidden');
  });

  test('notFound should create a 404 error', () => {
    const error = createError.notFound();
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Resource not found');
  });

  test('conflict should create a 409 error', () => {
    const error = createError.conflict();
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
    expect(error.message).toBe('Conflict');
  });

  test('tooManyRequests should create a 429 error', () => {
    const error = createError.tooManyRequests();
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('TOO_MANY_REQUESTS');
    expect(error.message).toBe('Too many requests');
  });

  test('internal should create a 500 error', () => {
    const error = createError.internal();
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.message).toBe('Internal server error');
  });
});