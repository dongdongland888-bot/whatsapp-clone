/**
 * Integration tests for contacts endpoints
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('express');
const db = require('../../config/db');

// Mock the database
jest.mock('../../config/db');

// Create a minimal test app for contact routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Import contact routes
  const contactRoutes = require('../../routes/contacts');
  
  app.use('/api/contacts', contactRoutes);
  
  return app;
};

describe('Contacts API Integration Tests', () => {
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

  describe('GET /api/contacts', () => {
    it('should retrieve user\'s contacts with valid token', async () => {
      const mockContacts = [
        { id: 1, contact_user_id: 2, username: 'friend', is_favorite: true }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockContacts]);

      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/contacts/:id', () => {
    it('should retrieve a specific contact', async () => {
      const mockContact = { id: 1, contact_user_id: 2, username: 'friend', nickname: 'Best Friend' };
      
      mockDbExecute.mockResolvedValueOnce([[mockContact]]);

      const response = await request(app)
        .get('/api/contacts/1')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', 1);
    });

    it('should return 404 if contact not found', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .get('/api/contacts/999')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/contacts', () => {
    it('should add a new contact successfully', async () => {
      const contactData = {
        contact_user_id: 2,
        nickname: 'My Friend'
      };
      
      // Mock sequence:
      // 1. User.findById - check if user exists
      // 2. Contact.exists - check if contact already exists
      // 3. Contact.create - insert contact
      // 4. Contact.findById - get full contact info
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 2, username: 'friend' }]]) // User exists
        .mockResolvedValueOnce([[]]) // Contact doesn't exist
        .mockResolvedValueOnce([{ insertId: 123 }]) // Insert contact
        .mockResolvedValueOnce([[{ id: 123, contact_user_id: 2, username: 'friend', nickname: 'My Friend' }]]); // Get full contact

      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${validToken}`)
        .send(contactData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
    });

    it('should return 409 if contact already exists', async () => {
      const contactData = {
        contact_user_id: 2,
        nickname: 'My Friend'
      };
      
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 2, username: 'friend' }]]) // User exists
        .mockResolvedValueOnce([[{ id: 1 }]]); // Contact already exists

      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${validToken}`)
        .send(contactData)
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 if user to add does not exist', async () => {
      const contactData = {
        contact_user_id: 999,
        nickname: 'Unknown'
      };
      
      mockDbExecute.mockResolvedValueOnce([[]]); // User doesn't exist

      const response = await request(app)
        .post('/api/contacts')
        .set('Authorization', `Bearer ${validToken}`)
        .send(contactData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/contacts/:id', () => {
    it('should delete a contact successfully', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .delete('/api/contacts/1')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 if contact not found', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const response = await request(app)
        .delete('/api/contacts/999')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/contacts/favorites', () => {
    it('should retrieve favorite contacts', async () => {
      const mockFavorites = [
        { id: 1, contact_user_id: 2, username: 'bestfriend', is_favorite: true }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockFavorites]);

      const response = await request(app)
        .get('/api/contacts/favorites')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/contacts/blocked', () => {
    it('should retrieve blocked contacts', async () => {
      const mockBlocked = [
        { id: 1, contact_user_id: 3, username: 'blocked_user' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockBlocked]);

      const response = await request(app)
        .get('/api/contacts/blocked')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/contacts/search', () => {
    it('should search contacts', async () => {
      const mockResults = [
        { id: 1, contact_user_id: 2, username: 'john' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockResults]);

      const response = await request(app)
        .get('/api/contacts/search?query=john')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 400 if query is too short', async () => {
      const response = await request(app)
        .get('/api/contacts/search?query=j')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
