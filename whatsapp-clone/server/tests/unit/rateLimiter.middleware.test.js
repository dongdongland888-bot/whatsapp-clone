/**
 * Unit tests for rate limiter middleware
 */
const rateLimit = require('express-rate-limit');
const {
  generalLimiter,
  authLimiter,
  registrationLimiter,
  messageLimiter,
  uploadLimiter,
  apiCallLimiter,
  wsLimiter
} = require('../../middleware/rateLimiter');

// Mock express-rate-limit
jest.mock('express-rate-limit', () => {
  return jest.fn().mockImplementation((options) => {
    return (req, res, next) => {
      // Simulate rate limiting based on options
      if (req._shouldRateLimit) {
        res.status(429).json(options.message);
      } else {
        next();
      }
    };
  });
});

describe('Rate Limiter Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      path: '/api/test',
      ip: '127.0.0.1'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn()
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generalLimiter', () => {
    it('should be configured with correct options', () => {
      // We'll verify the configuration by checking if the rateLimit function was called with the right options
      expect(rateLimit).toHaveBeenCalledWith({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: {
          success: false,
          message: 'Too many requests, please try again later.',
          retryAfter: 15 * 60 // seconds
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: expect.any(Function)
      });

      // Test the skip function
      const options = rateLimit.mock.calls[0][0];
      const skipFunction = options.skip;
      
      expect(skipFunction({ path: '/api/health' })).toBe(true);
      expect(skipFunction({ path: '/api/users' })).toBe(false);
    });
  });

  describe('authLimiter', () => {
    it('should be configured with correct options', () => {
      // Find the authLimiter call
      const authLimiterOptions = rateLimit.mock.calls.find(call => {
        const options = call[0];
        return options.windowMs === 60 * 60 * 1000 && options.max === 5;
      });
      
      expect(authLimiterOptions).toBeDefined();
      
      const options = authLimiterOptions[0];
      expect(options).toMatchObject({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 5, // Limit each IP to 5 failed login attempts per hour
        message: {
          success: false,
          message: 'Too many login attempts, please try again after an hour.',
          retryAfter: 60 * 60
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true
      });
    });
  });

  describe('registrationLimiter', () => {
    it('should be configured with correct options', () => {
      // Find the registrationLimiter call
      const regLimiterOptions = rateLimit.mock.calls.find(call => {
        const options = call[0];
        return options.windowMs === 24 * 60 * 60 * 1000 && options.max === 3;
      });
      
      expect(regLimiterOptions).toBeDefined();
      
      const options = regLimiterOptions[0];
      expect(options).toMatchObject({
        windowMs: 24 * 60 * 60 * 1000, // 24 hours
        max: 3, // Limit each IP to 3 registration attempts per day
        message: {
          success: false,
          message: 'Too many registration attempts, please try again tomorrow.',
          retryAfter: 24 * 60 * 60
        },
        standardHeaders: true,
        legacyHeaders: false
      });
    });
  });

  describe('messageLimiter', () => {
    it('should be configured with correct options', () => {
      // Find the messageLimiter call
      const msgLimiterOptions = rateLimit.mock.calls.find(call => {
        const options = call[0];
        return options.windowMs === 60 * 1000 && options.max === 60;
      });
      
      expect(msgLimiterOptions).toBeDefined();
      
      const options = msgLimiterOptions[0];
      expect(options).toMatchObject({
        windowMs: 60 * 1000, // 1 minute
        max: 60, // Limit each IP to 60 messages per minute
        message: {
          success: false,
          message: 'Too many messages sent, please slow down.',
          retryAfter: 60
        },
        standardHeaders: true,
        legacyHeaders: false
      });
    });
  });

  describe('uploadLimiter', () => {
    it('should be configured with correct options', () => {
      // Find the uploadLimiter call
      const uploadLimiterOptions = rateLimit.mock.calls.find(call => {
        const options = call[0];
        return options.windowMs === 60 * 60 * 1000 && options.max === 50;
      });
      
      expect(uploadLimiterOptions).toBeDefined();
      
      const options = uploadLimiterOptions[0];
      expect(options).toMatchObject({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 50, // Limit each IP to 50 uploads per hour
        message: {
          success: false,
          message: 'Too many file uploads, please try again later.',
          retryAfter: 60 * 60
        },
        standardHeaders: true,
        legacyHeaders: false
      });
    });
  });

  describe('apiCallLimiter', () => {
    it('should be configured with correct options', () => {
      // Find the apiCallLimiter call
      const apiLimiterOptions = rateLimit.mock.calls.find(call => {
        const options = call[0];
        return options.windowMs === 60 * 1000 && options.max === 30;
      });
      
      expect(apiLimiterOptions).toBeDefined();
      
      const options = apiLimiterOptions[0];
      expect(options).toMatchObject({
        windowMs: 60 * 1000, // 1 minute
        max: 30, // Limit each IP to 30 API calls per minute
        message: {
          success: false,
          message: 'Too many API calls, please slow down.',
          retryAfter: 60
        },
        standardHeaders: true,
        legacyHeaders: false
      });
    });
  });
});

describe('WebSocket Rate Limiter (Manual Implementation)', () => {
  beforeEach(() => {
    // Clear the connection tracker for each test
    for (const [key] of wsLimiter._tracker || new Map()) {
      wsLimiter._tracker.delete(key);
    }
  });

  describe('canConnect', () => {
    it('should allow initial connections', () => {
      expect(wsLimiter.canConnect('127.0.0.1')).toBe(true);
      expect(wsLimiter.canConnect('127.0.0.1')).toBe(true);
      expect(wsLimiter.canConnect('127.0.0.1')).toBe(true);
      expect(wsLimiter.canConnect('127.0.0.1')).toBe(true);
      expect(wsLimiter.canConnect('127.0.0.1')).toBe(true);
    });

    it('should reject connections beyond the limit', () => {
      // Make 5 connections
      for (let i = 0; i < 5; i++) {
        expect(wsLimiter.canConnect('127.0.0.1')).toBe(true);
      }
      
      // The 6th should be rejected
      expect(wsLimiter.canConnect('127.0.0.1')).toBe(false);
    });

    it('should allow connections after the window has passed', () => {
      jest.useFakeTimers();
      
      // Make 5 connections
      for (let i = 0; i < 5; i++) {
        expect(wsLimiter.canConnect('127.0.0.1')).toBe(true);
      }
      
      // The 6th should be rejected
      expect(wsLimiter.canConnect('127.0.0.1')).toBe(false);
      
      // Advance time beyond the window (1 minute + 1 second)
      jest.advanceTimersByTime(61000);
      
      // Now it should allow another connection
      expect(wsLimiter.canConnect('127.0.0.1')).toBe(true);
      
      jest.useRealTimers();
    });

    it('should track connections separately for different IPs', () => {
      // Fill up connections for IP 1
      for (let i = 0; i < 5; i++) {
        expect(wsLimiter.canConnect('127.0.0.1')).toBe(true);
      }
      
      // IP 1 should be full
      expect(wsLimiter.canConnect('127.0.0.1')).toBe(false);
      
      // But IP 2 should still have capacity
      expect(wsLimiter.canConnect('127.0.0.2')).toBe(true);
    });
  });

  describe('removeConnection', () => {
    it('should remove a connection', () => {
      // Make 3 connections
      expect(wsLimiter.canConnect('127.0.0.1')).toBe(true);
      expect(wsLimiter.canConnect('127.0.0.1')).toBe(true);
      expect(wsLimiter.canConnect('127.0.0.1')).toBe(true);
      
      // Should be able to make 2 more
      expect(wsLimiter.canConnect('127.0.0.1')).toBe(true);
      expect(wsLimiter.canConnect('127.0.0.1')).toBe(true);
      
      // Should be full now
      expect(wsLimiter.canConnect('127.0.0.1')).toBe(false);
      
      // Remove one connection
      wsLimiter.removeConnection('127.0.0.1');
      
      // Should be able to make another connection
      expect(wsLimiter.canConnect('127.0.0.1')).toBe(true);
    });

    it('should not crash if removing connection for non-existent IP', () => {
      expect(() => wsLimiter.removeConnection('nonexistent')).not.toThrow();
    });
  });

  // Add access to the internal tracker for testing purposes
  Object.defineProperty(wsLimiter, '_tracker', {
    get: function() {
      // Since wsConnectionTracker is internal to the module, we'll access it differently
      // For testing purposes, we'll create a way to access the internal state
      return this.__tracker;
    },
    set: function(value) {
      this.__tracker = value;
    }
  });
});

// Create a more complete test by accessing the actual implementation
describe('WebSocket Rate Limiter - Actual Implementation', () => {
  // Since we can't directly access the internal wsConnectionTracker map,
  // we'll test the functionality through the exposed methods
  beforeEach(() => {
    // Reset the module to clear any state
    jest.resetModules();
    const { wsLimiter } = require('../../middleware/rateLimiter');
    global.wsLimiter = wsLimiter;
  });

  afterEach(() => {
    // Clean up
    if (global.wsConnectionTracker) {
      global.wsConnectionTracker.clear();
    }
  });

  test('wsLimiter canConnect and removeConnection work together', () => {
    const { wsLimiter } = require('../../middleware/rateLimiter');
    
    // Track how many connections we make
    const connections = [];
    
    // Make 5 connections
    for (let i = 0; i < 5; i++) {
      const canConnect = wsLimiter.canConnect('127.0.0.1');
      connections.push(canConnect);
      expect(canConnect).toBe(true);
    }
    
    // The 6th should fail
    expect(wsLimiter.canConnect('127.0.0.1')).toBe(false);
    
    // Remove one connection
    wsLimiter.removeConnection('127.0.0.1');
    
    // Now a new connection should be possible
    expect(wsLimiter.canConnect('127.0.0.1')).toBe(true);
    
    // And then it should fail again
    expect(wsLimiter.canConnect('127.0.0.1')).toBe(false);
  });
});