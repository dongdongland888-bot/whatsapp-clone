/**
 * Unit tests for rate limiter middleware
 */

describe('Rate Limiter Middleware', () => {
  let rateLimiter;

  beforeEach(() => {
    jest.resetModules();
    // Import after reset to get fresh module
    rateLimiter = require('../../middleware/rateLimiter');
  });

  describe('generalLimiter', () => {
    it('should be defined', () => {
      expect(rateLimiter.generalLimiter).toBeDefined();
      expect(typeof rateLimiter.generalLimiter).toBe('function');
    });
  });

  describe('authLimiter', () => {
    it('should be defined', () => {
      expect(rateLimiter.authLimiter).toBeDefined();
      expect(typeof rateLimiter.authLimiter).toBe('function');
    });
  });

  describe('registrationLimiter', () => {
    it('should be defined', () => {
      expect(rateLimiter.registrationLimiter).toBeDefined();
      expect(typeof rateLimiter.registrationLimiter).toBe('function');
    });
  });

  describe('messageLimiter', () => {
    it('should be defined', () => {
      expect(rateLimiter.messageLimiter).toBeDefined();
      expect(typeof rateLimiter.messageLimiter).toBe('function');
    });
  });

  describe('uploadLimiter', () => {
    it('should be defined', () => {
      expect(rateLimiter.uploadLimiter).toBeDefined();
      expect(typeof rateLimiter.uploadLimiter).toBe('function');
    });
  });

  describe('apiCallLimiter', () => {
    it('should be defined', () => {
      expect(rateLimiter.apiCallLimiter).toBeDefined();
      expect(typeof rateLimiter.apiCallLimiter).toBe('function');
    });
  });
});

describe('WebSocket Rate Limiter', () => {
  let wsLimiter;

  beforeEach(() => {
    jest.resetModules();
    const rateLimiter = require('../../middleware/rateLimiter');
    wsLimiter = rateLimiter.wsLimiter;
  });

  describe('canConnect', () => {
    it('should allow initial connections', () => {
      expect(wsLimiter.canConnect('192.168.1.1')).toBe(true);
      expect(wsLimiter.canConnect('192.168.1.1')).toBe(true);
      expect(wsLimiter.canConnect('192.168.1.1')).toBe(true);
      expect(wsLimiter.canConnect('192.168.1.1')).toBe(true);
      expect(wsLimiter.canConnect('192.168.1.1')).toBe(true);
    });

    it('should reject connections beyond the limit', () => {
      const ip = '192.168.1.2';
      
      // Make 5 connections (the limit)
      for (let i = 0; i < 5; i++) {
        expect(wsLimiter.canConnect(ip)).toBe(true);
      }
      
      // The 6th should be rejected
      expect(wsLimiter.canConnect(ip)).toBe(false);
    });

    it('should track connections separately for different IPs', () => {
      const ip1 = '192.168.1.3';
      const ip2 = '192.168.1.4';
      
      // Fill up connections for IP 1
      for (let i = 0; i < 5; i++) {
        expect(wsLimiter.canConnect(ip1)).toBe(true);
      }
      
      // IP 1 should be full
      expect(wsLimiter.canConnect(ip1)).toBe(false);
      
      // But IP 2 should still have capacity
      expect(wsLimiter.canConnect(ip2)).toBe(true);
    });
  });

  describe('removeConnection', () => {
    it('should remove a connection and allow new ones', () => {
      const ip = '192.168.1.5';
      
      // Make 5 connections
      for (let i = 0; i < 5; i++) {
        wsLimiter.canConnect(ip);
      }
      
      // Should be full
      expect(wsLimiter.canConnect(ip)).toBe(false);
      
      // Remove one connection
      wsLimiter.removeConnection(ip);
      
      // Should be able to make another connection
      expect(wsLimiter.canConnect(ip)).toBe(true);
    });

    it('should not crash if removing connection for non-existent IP', () => {
      expect(() => wsLimiter.removeConnection('nonexistent')).not.toThrow();
    });
  });
});
