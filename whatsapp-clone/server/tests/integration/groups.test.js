/**
 * Integration tests for groups endpoints
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('express');
const db = require('../../config/db');

// Mock the database
jest.mock('../../config/db');

// Create a minimal test app for group routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Import group routes
  const groupRoutes = require('../../routes/groups');
  
  app.use('/api/groups', groupRoutes);
  
  return app;
};

describe('Groups API Integration Tests', () => {
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

  describe('GET /api/groups', () => {
    it('should retrieve all groups', async () => {
      const mockGroups = [
        { id: 1, name: 'Test Group', member_count: 5 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockGroups]);

      const response = await request(app)
        .get('/api/groups')
        .expect(200);

      expect(response.body.groups).toBeDefined();
      expect(Array.isArray(response.body.groups)).toBe(true);
    });
  });

  describe('GET /api/groups/user/:userId', () => {
    it('should retrieve groups for a specific user', async () => {
      const mockGroups = [
        { id: 1, name: 'User Group', member_count: 3 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockGroups]);

      const response = await request(app)
        .get('/api/groups/user/1')
        .expect(200);

      expect(response.body.groups).toBeDefined();
      expect(Array.isArray(response.body.groups)).toBe(true);
    });
  });

  describe('POST /api/groups', () => {
    it('should create a new group successfully', async () => {
      const groupData = {
        name: 'New Group',
        description: 'A new group',
        creator_id: 1
      };
      
      mockDbExecute
        .mockResolvedValueOnce([{ insertId: 123 }]) // Insert group
        .mockResolvedValueOnce([{}]); // Add creator as member

      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${validToken}`)
        .send(groupData)
        .expect(201);

      expect(response.body.message).toBe('Group created successfully');
      expect(response.body.data).toHaveProperty('id');
    });

    it('should return 401 without token', async () => {
      const groupData = {
        name: 'New Group',
        creator_id: 1
      };

      const response = await request(app)
        .post('/api/groups')
        .send(groupData)
        .expect(401);

      expect(response.body.message).toBe('Access denied');
    });

    it('should return 400 for missing required fields', async () => {
      const groupData = {
        description: 'A group without name'
      };

      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${validToken}`)
        .send(groupData)
        .expect(400);

      expect(response.body.message).toBe('Missing required fields');
    });
  });

  describe('POST /api/groups/:groupId/users/:userId', () => {
    it('should add a user to a group', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .post('/api/groups/1/users/2')
        .expect(200);

      expect(response.body.message).toBe('User added to group successfully');
    });
  });

  describe('DELETE /api/groups/:groupId/users/:userId', () => {
    it('should remove a user from a group', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .delete('/api/groups/1/users/2')
        .expect(200);

      expect(response.body.message).toBe('User removed from group successfully');
    });
  });

  describe('GET /api/groups/:groupId/members', () => {
    it('should retrieve group members', async () => {
      const mockMembers = [
        { id: 1, username: 'user1', avatar: null },
        { id: 2, username: 'user2', avatar: null }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMembers]);

      const response = await request(app)
        .get('/api/groups/1/members')
        .expect(200);

      expect(response.body.members).toBeDefined();
      expect(Array.isArray(response.body.members)).toBe(true);
    });
  });
});
