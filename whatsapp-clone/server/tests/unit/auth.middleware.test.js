/**
 * Unit tests for authentication middleware
 */
const jwt = require('jsonwebtoken');
const {
  verifyToken,
  optionalAuth,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} = require('../../middleware/auth');

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../config/db');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      body: {},
      params: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('verifyToken', () => {
    it('should return 401 if no authorization header', () => {
      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. No token provided.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', () => {
      req.headers.authorization = 'Basic sometoken';

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. No token provided.'
      });
    });

    it('should return 401 if token is empty after Bearer', () => {
      req.headers.authorization = 'Bearer ';

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Invalid token format.'
      });
    });

    it('should return 401 if token is invalid', () => {
      req.headers.authorization = 'Bearer invalid-token';

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token.'
      });
    });

    it('should return 401 with TOKEN_EXPIRED if token is expired', () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { id: 1, email: 'test@test.com', username: 'test' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );
      req.headers.authorization = `Bearer ${expiredToken}`;

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    });

    it('should call next and set req.user if token is valid', () => {
      const user = { id: 1, email: 'test@test.com', username: 'testuser' };
      const validToken = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${validToken}`;

      verifyToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toMatchObject({
        id: user.id,
        email: user.email,
        username: user.username
      });
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should set req.user to null if no authorization header', () => {
      optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should set req.user to null if authorization header is invalid', () => {
      req.headers.authorization = 'Invalid header';

      optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should set req.user to null if token is invalid', () => {
      req.headers.authorization = 'Bearer invalid-token';

      optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should set req.user if token is valid', () => {
      const user = { id: 1, email: 'test@test.com', username: 'testuser' };
      const validToken = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
      req.headers.authorization = `Bearer ${validToken}`;

      optionalAuth(req, res, next);

      expect(req.user).toMatchObject({
        id: user.id,
        email: user.email,
        username: user.username
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('generateAccessToken', () => {
    it('should generate a valid JWT token', () => {
      const user = { id: 1, email: 'test@test.com', username: 'testuser' };

      const token = generateAccessToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify the token is valid
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.username).toBe(user.username);
    });

    it('should set expiration on the token', () => {
      const user = { id: 1, email: 'test@test.com', username: 'testuser' };

      const token = generateAccessToken(user);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const user = { id: 1 };

      const token = generateRefreshToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should only include user id in refresh token', () => {
      const user = { id: 1, email: 'test@test.com', username: 'testuser' };

      const token = generateRefreshToken(user);
      const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
      const decoded = jwt.verify(token, refreshSecret);

      expect(decoded.id).toBe(user.id);
      expect(decoded.email).toBeUndefined();
      expect(decoded.username).toBeUndefined();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should return decoded token for valid refresh token', () => {
      const user = { id: 1 };
      const token = generateRefreshToken(user);

      const decoded = verifyRefreshToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.id).toBe(user.id);
    });

    it('should return null for invalid refresh token', () => {
      const result = verifyRefreshToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for expired refresh token', () => {
      const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
      const expiredToken = jwt.sign({ id: 1 }, refreshSecret, { expiresIn: '-1s' });

      const result = verifyRefreshToken(expiredToken);

      expect(result).toBeNull();
    });
  });
});
