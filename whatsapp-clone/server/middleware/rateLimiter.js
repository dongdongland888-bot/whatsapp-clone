const rateLimit = require('express-rate-limit');

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful auth requests
  skip: (req, res) => {
    return req.path === '/api/health';
  }
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 failed login attempts per hour
  message: {
    success: false,
    message: 'Too many login attempts, please try again after an hour.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Only count failed requests
  skipSuccessfulRequests: true
});

// Registration rate limiter
const registrationLimiter = rateLimit({
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

// Message sending rate limiter
const messageLimiter = rateLimit({
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

// File upload rate limiter
const uploadLimiter = rateLimit({
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

// API calls rate limiter (for expensive operations)
const apiCallLimiter = rateLimit({
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

// WebSocket connection limiter (manual implementation)
const wsConnectionTracker = new Map();

const wsLimiter = {
  canConnect: (ip) => {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxConnections = 5;
    
    if (!wsConnectionTracker.has(ip)) {
      wsConnectionTracker.set(ip, []);
    }
    
    const connections = wsConnectionTracker.get(ip);
    // Remove old connections
    const validConnections = connections.filter(time => now - time < windowMs);
    wsConnectionTracker.set(ip, validConnections);
    
    if (validConnections.length >= maxConnections) {
      return false;
    }
    
    validConnections.push(now);
    return true;
  },
  
  removeConnection: (ip) => {
    if (wsConnectionTracker.has(ip)) {
      const connections = wsConnectionTracker.get(ip);
      if (connections.length > 0) {
        connections.shift();
      }
    }
  }
};

module.exports = {
  generalLimiter,
  authLimiter,
  registrationLimiter,
  messageLimiter,
  uploadLimiter,
  apiCallLimiter,
  wsLimiter
};
