/**
 * Integration tests for messages endpoints
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('express');
const db = require('../../config/db');

// Mock the database
jest.mock('../../config/db');

// Create a minimal test app for message routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Import auth middleware and message routes
  const { verifyToken } = require('../../middleware/auth');
  const messageRoutes = require('../../routes/messages');
  
  app.use('/api/messages', messageRoutes);
  
  return app;
};

describe('Messages API Integration Tests', () => {
  let app;
  let mockDbExecute;
  let validToken;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    mockDbExecute = jest.fn();
    db.execute = mockDbExecute;
    jest.clearAllMocks();
    
    // Create a valid JWT token for testing
    validToken = jwt.sign(
      { id: 1, email: 'test@example.com', username: 'testuser' },
      process.env.JWT_SECRET || 'test-jwt-secret',
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/messages/conversations', () => {
    it('should retrieve recent conversations with valid token', async () => {
      const mockConversations = [
        { contact_id: 2, username: 'otheruser', last_message: 'Hi there', unread_count: 1 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockConversations]);

      const response = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .get('/api/messages/conversations')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/messages/chat/:otherUserId', () => {
    it('should retrieve chat history between two users', async () => {
      const mockMessages = [
        { id: 1, content: 'Hello', sender_id: 1, receiver_id: 2 },
        { id: 2, content: 'Hi there', sender_id: 2, receiver_id: 1 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMessages]);

      const response = await request(app)
        .get('/api/messages/chat/2')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/messages/group/:groupId', () => {
    it('should retrieve messages for a group', async () => {
      const mockMessages = [
        { id: 1, content: 'Group message', sender_id: 1, group_id: 5 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMessages]);

      const response = await request(app)
        .get('/api/messages/group/5')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/messages/search', () => {
    it('should search messages successfully', async () => {
      const mockResults = [
        { id: 1, content: 'Found message with search term', sender_name: 'testuser' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockResults]);

      const response = await request(app)
        .get('/api/messages/search?query=searchTerm')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 400 if search query is too short', async () => {
      const response = await request(app)
        .get('/api/messages/search?query=a')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/messages/unread', () => {
    it('should get unread message counts', async () => {
      const mockCounts = [
        { sender_id: 2, count: 3 },
        { sender_id: 3, count: 1 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockCounts]);

      const response = await request(app)
        .get('/api/messages/unread')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('by_sender');
    });
  });
});
