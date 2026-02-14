/**
 * Integration tests for messages endpoints
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../server'); // Assuming there's a server.js that exports the app
const db = require('../../config/db');
const Message = require('../../models/Message');

// Mock the server module to avoid actual server startup
jest.mock('../../server', () => {
  const express = require('express');
  const app = express();
  app.use(express.json());
  
  // Import and use message routes
  const messageRoutes = require('../../routes/messages');
  app.use('/api/messages', messageRoutes);
  
  return app;
});

// Mock the database
jest.mock('../../config/db');

describe('Messages API Integration Tests', () => {
  let mockDbExecute;
  let validToken;

  beforeEach(() => {
    mockDbExecute = jest.fn();
    db.execute = mockDbExecute;
    jest.clearAllMocks();
    
    // Create a valid JWT token for testing
    validToken = jwt.sign(
      { id: 1, email: 'test@example.com', username: 'testuser' },
      process.env.JWT_SECRET || 'test-secret'
    );
  });

  describe('GET /api/messages/:userId', () => {
    it('should retrieve messages for a user with valid token', async () => {
      const mockMessages = [
        { id: 1, content: 'Hello', sender_id: 2, receiver_id: 1, created_at: new Date() }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMessages]);

      const response = await request(require('../../server'))
        .get('/api/messages/1')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('content', 'Hello');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(require('../../server'))
        .get('/api/messages/1')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid token.');
    });

    it('should return 401 for missing token', async () => {
      const response = await request(require('../../server'))
        .get('/api/messages/1')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access denied. No token provided.');
    });
  });

  describe('GET /api/messages/chat/:otherUserId', () => {
    it('should retrieve chat history between two users', async () => {
      const mockMessages = [
        { id: 1, content: 'Hello', sender_id: 1, receiver_id: 2 },
        { id: 2, content: 'Hi there', sender_id: 2, receiver_id: 1 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMessages]);

      const response = await request(require('../../server'))
        .get('/api/messages/chat/2')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(require('../../server'))
        .get('/api/messages/chat/2')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/messages/group/:groupId', () => {
    it('should retrieve messages for a group', async () => {
      const mockMessages = [
        { id: 1, content: 'Group message', sender_id: 1, group_id: 5 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMessages]);

      const response = await request(require('../../server'))
        .get('/api/messages/group/5')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty('content', 'Group message');
    });
  });

  describe('POST /api/messages', () => {
    it('should send a new message successfully', async () => {
      const messageData = {
        receiver_id: 2,
        content: 'Hello, how are you?',
        message_type: 'text'
      };
      
      mockDbExecute
        .mockResolvedValueOnce([{ insertId: 123 }]) // Insert message
        .mockResolvedValueOnce([[{ id: 1, username: 'sender', avatar: null }]]); // Get sender info

      const response = await request(require('../../server'))
        .post('/api/messages')
        .set('Authorization', `Bearer ${validToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('content', 'Hello, how are you?');
      expect(response.body.data).toHaveProperty('status', 'sent');
    });

    it('should send a group message', async () => {
      const messageData = {
        group_id: 5,
        content: 'Group announcement',
        message_type: 'text'
      };
      
      mockDbExecute
        .mockResolvedValueOnce([{ insertId: 124 }]) // Insert message
        .mockResolvedValueOnce([[{ id: 1, username: 'sender', avatar: null }]]); // Get sender info

      const response = await request(require('../../server'))
        .post('/api/messages')
        .set('Authorization', `Bearer ${validToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('content', 'Group announcement');
    });

    it('should return validation errors for invalid message data', async () => {
      const invalidMessageData = {
        receiver_id: 'not-a-number', // Invalid type
        content: '', // Empty content
        message_type: 'invalid-type' // Invalid type
      };

      const response = await request(require('../../server'))
        .post('/api/messages')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidMessageData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });

    it('should return 401 for invalid token when sending message', async () => {
      const messageData = {
        receiver_id: 2,
        content: 'Hello',
        message_type: 'text'
      };

      const response = await request(require('../../server'))
        .post('/api/messages')
        .set('Authorization', 'Bearer invalid-token')
        .send(messageData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/messages/:id', () => {
    it('should edit an existing message', async () => {
      const editData = { content: 'Updated message content' };
      
      // Mock that the message exists and belongs to the user
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 1, sender_id: 1 }]]) // Find message
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Update message

      const response = await request(require('../../server'))
        .put('/api/messages/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send(editData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Message updated successfully');
    });

    it('should return 403 if user tries to edit someone else\'s message', async () => {
      const editData = { content: 'Updated message content' };
      
      // Mock that the message exists but belongs to someone else
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 1, sender_id: 2 }]]); // Message belongs to user 2

      const response = await request(require('../../server'))
        .put('/api/messages/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send(editData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You can only edit your own messages');
    });

    it('should return 404 if message not found', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]); // Message not found

      const response = await request(require('../../server'))
        .put('/api/messages/999')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ content: 'Updated content' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Message not found');
    });
  });

  describe('DELETE /api/messages/:id', () => {
    it('should delete a message for the sender only', async () => {
      // Mock that the message exists and belongs to the user
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 1, sender_id: 1 }]]) // Find message
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Update message as soft delete

      const response = await request(require('../../server'))
        .delete('/api/messages/1')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Message deleted successfully');
    });

    it('should delete a message for everyone', async () => {
      // Mock that the message exists and belongs to the user
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 1, sender_id: 1 }]]) // Find message
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Update message as soft delete for everyone

      const response = await request(require('../../server'))
        .delete('/api/messages/1?forEveryone=true')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Message deleted for everyone');
    });

    it('should return 403 if user tries to delete someone else\'s message', async () => {
      // Mock that the message exists but belongs to someone else
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 1, sender_id: 2 }]]); // Message belongs to user 2

      const response = await request(require('../../server'))
        .delete('/api/messages/1')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You can only delete your own messages');
    });
  });

  describe('GET /api/messages/search', () => {
    it('should search messages successfully', async () => {
      const mockResults = [
        { id: 1, content: 'Found message with search term', sender_name: 'testuser' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockResults]);

      const response = await request(require('../../server'))
        .get('/api/messages/search?q=searchTerm')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty('content');
    });

    it('should return 400 if no search query provided', async () => {
      const response = await request(require('../../server'))
        .get('/api/messages/search')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Search query is required');
    });
  });

  describe('GET /api/messages/conversations', () => {
    it('should retrieve recent conversations', async () => {
      const mockConversations = [
        { contact_id: 2, username: 'otheruser', last_message: 'Hi there' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockConversations]);

      const response = await request(require('../../server'))
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty('username', 'otheruser');
    });
  });

  describe('POST /api/messages/:id/read-receipt', () => {
    it('should mark messages as delivered/read', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 2 }]); // Update status

      const response = await request(require('../../server'))
        .post('/api/messages/1/read-receipt')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ status: 'read' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Read receipt updated successfully');
    });
  });
});