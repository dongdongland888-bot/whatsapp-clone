/**
 * Integration tests for authentication endpoints
 */
const request = require('supertest');
const bcrypt = require('bcryptjs');
const express = require('express');
const db = require('../../config/db');

// Mock the database
jest.mock('../../config/db');

// Create a minimal test app for auth routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Import auth routes
  const authRoutes = require('../../routes/auth');
  app.use('/api/auth', authRoutes);
  
  return app;
};

describe('Authentication API Integration Tests', () => {
  let app;
  let mockDbExecute;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    mockDbExecute = jest.fn();
    db.execute = mockDbExecute;
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Mock that user doesn't exist yet
      mockDbExecute
        .mockResolvedValueOnce([[]]) // Check if email exists
        .mockResolvedValueOnce([[]]) // Check if username exists
        .mockResolvedValueOnce([{ insertId: 123 }]) // Insert user
        .mockResolvedValueOnce([{}]); // Insert preferences

      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!',
        phone: '+1234567890'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should return error for duplicate email', async () => {
      // Mock that email already exists
      mockDbExecute.mockResolvedValueOnce([[{ id: 1 }]]); // Email exists check

      const userData = {
        username: 'testuser',
        email: 'existing@example.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    it('should return error for duplicate username', async () => {
      // Mock that email doesn't exist but username does
      mockDbExecute
        .mockResolvedValueOnce([[]]) // Email exists check
        .mockResolvedValueOnce([[{ id: 1 }]]); // Username exists check

      const userData = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'TestPass123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('username');
    });

    it('should return validation errors for invalid input', async () => {
      const invalidUserData = {
        username: 'ab', // Too short
        email: 'invalid-email', // Invalid email
        password: '123' // Too weak
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user with correct credentials', async () => {
      // Mock user exists with hashed password
      const hashedPassword = await bcrypt.hash('CorrectPass123!', 12);
      mockDbExecute
        .mockResolvedValueOnce([[{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          password: hashedPassword
        }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Update online status
        .mockResolvedValueOnce([[{ theme: 'light' }]]); // Get preferences

      const loginData = {
        email: 'test@example.com',
        password: 'CorrectPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).toHaveProperty('username', 'testuser');
    });

    it('should return error for non-existent email', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]); // User not found

      const loginData = {
        email: 'nonexistent@example.com',
        password: 'AnyPass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return error for incorrect password', async () => {
      const hashedPassword = await bcrypt.hash('DifferentPass123!', 12);
      mockDbExecute.mockResolvedValueOnce([[{
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword
      }]]);

      const loginData = {
        email: 'test@example.com',
        password: 'WrongPass123!' // Different from hashed one
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return validation errors for invalid login data', async () => {
      const invalidLoginData = {
        email: 'invalid-email', // Invalid email
        password: '' // Empty password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidLoginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should return error for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Refresh token is required');
    });
  });
});
