/**
 * Integration tests for contacts endpoints
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../server'); // Assuming there's a server.js that exports the app
const db = require('../../config/db');
const Contact = require('../../models/Contact');

// Mock the server module to avoid actual server startup
jest.mock('../../server', () => {
  const express = require('express');
  const app = express();
  app.use(express.json());
  
  // Import and use contact routes
  const contactRoutes = require('../../routes/contacts');
  app.use('/api/contacts', contactRoutes);
  
  return app;
});

// Mock the database
jest.mock('../../config/db');

describe('Contacts API Integration Tests', () => {
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

  describe('GET /api/contacts', () => {
    it('should retrieve user\'s contacts with valid token', async () => {
      const mockContacts = [
        { id: 1, contact_user_id: 2, username: 'friend', is_favorite: true }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockContacts]);

      const response = await request(require('../../server'))
        .get('/api/contacts')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toHaveProperty('username', 'friend');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(require('../../server'))
        .get('/api/contacts')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for missing token', async () => {
      const response = await request(require('../../server'))
        .get('/api/contacts')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/contacts/:id', () => {
    it('should retrieve a specific contact', async () => {
      const mockContact = { id: 1, contact_user_id: 2, username: 'friend', nickname: 'Best Friend' };
      
      mockDbExecute.mockResolvedValueOnce([[mockContact]]);

      const response = await request(require('../../server'))
        .get('/api/contacts/1')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data).toHaveProperty('username', 'friend');
    });

    it('should return 404 if contact not found', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]); // Contact not found

      const response = await request(require('../../server'))
        .get('/api/contacts/999')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Contact not found');
    });
  });

  describe('POST /api/contacts', () => {
    it('should add a new contact successfully', async () => {
      const contactData = {
        contact_user_id: 2,
        nickname: 'My Friend'
      };
      
      // Mock: check if contact already exists (return empty array)
      // Then mock the insert
      mockDbExecute
        .mockResolvedValueOnce([[]]) // Check if contact exists
        .mockResolvedValueOnce([{ insertId: 123 }]) // Insert contact
        .mockResolvedValueOnce([[{ id: 2, username: 'friend', avatar: null }]]); // Get contact details

      const response = await request(require('../../server'))
        .post('/api/contacts')
        .set('Authorization', `Bearer ${validToken}`)
        .send(contactData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('contact_user_id', 2);
      expect(response.body.data).toHaveProperty('nickname', 'My Friend');
    });

    it('should return 409 if contact already exists', async () => {
      const contactData = {
        contact_user_id: 2,
        nickname: 'My Friend'
      };
      
      mockDbExecute.mockResolvedValueOnce([[{ id: 1 }]]); // Contact already exists

      const response = await request(require('../../server'))
        .post('/api/contacts')
        .set('Authorization', `Bearer ${validToken}`)
        .send(contactData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('This user is already in your contacts');
    });

    it('should return 400 if trying to add self as contact', async () => {
      const contactData = {
        contact_user_id: 1, // Same as current user
        nickname: 'Myself'
      };

      const response = await request(require('../../server'))
        .post('/api/contacts')
        .set('Authorization', `Bearer ${validToken}`)
        .send(contactData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot add yourself as a contact');
    });

    it('should return validation errors for invalid input', async () => {
      const invalidContactData = {
        contact_user_id: 'not-a-number', // Invalid type
        nickname: 123 // Invalid type
      };

      const response = await request(require('../../server'))
        .post('/api/contacts')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidContactData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      expect(Array.isArray(response.body.errors)).toBe(true);
    });
  });

  describe('PUT /api/contacts/:id', () => {
    it('should update a contact successfully', async () => {
      const updateData = {
        nickname: 'Updated Nickname',
        is_favorite: true
      };
      
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 1, user_id: 1 }]]) // Check if contact belongs to user
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Update contact
        .mockResolvedValueOnce([[{ id: 1, contact_user_id: 2, nickname: 'Updated Nickname' }]]); // Get updated contact

      const response = await request(require('../../server'))
        .put('/api/contacts/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('nickname', 'Updated Nickname');
      expect(response.body.data).toHaveProperty('is_favorite', true);
    });

    it('should toggle favorite status', async () => {
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 1, user_id: 1 }]]) // Check if contact belongs to user
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Update contact
        .mockResolvedValueOnce([[{ id: 1, contact_user_id: 2, is_favorite: true }]]); // Get updated contact

      const response = await request(require('../../server'))
        .put('/api/contacts/1/favorite')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ is_favorite: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('is_favorite', true);
    });

    it('should block/unblock a contact', async () => {
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 1, user_id: 1 }]]) // Check if contact belongs to user
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Update contact
        .mockResolvedValueOnce([[{ id: 1, contact_user_id: 2, is_blocked: true }]]); // Get updated contact

      const response = await request(require('../../server'))
        .put('/api/contacts/1/block')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ is_blocked: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('is_blocked', true);
    });

    it('should return 404 if contact not found', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]); // Contact not found

      const response = await request(require('../../server'))
        .put('/api/contacts/999')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ nickname: 'New Nickname' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Contact not found');
    });

    it('should return 403 if trying to update someone else\'s contact', async () => {
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 1, user_id: 2 }]]); // Contact belongs to another user

      const response = await request(require('../../server'))
        .put('/api/contacts/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ nickname: 'New Nickname' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You can only modify your own contacts');
    });
  });

  describe('DELETE /api/contacts/:id', () => {
    it('should delete a contact successfully', async () => {
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 1, user_id: 1 }]]) // Check if contact belongs to user
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Delete contact

      const response = await request(require('../../server'))
        .delete('/api/contacts/1')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Contact removed successfully');
    });

    it('should return 404 if contact not found', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]); // Contact not found

      const response = await request(require('../../server'))
        .delete('/api/contacts/999')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Contact not found');
    });

    it('should return 403 if trying to delete someone else\'s contact', async () => {
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 1, user_id: 2 }]]); // Contact belongs to another user

      const response = await request(require('../../server'))
        .delete('/api/contacts/1')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You can only modify your own contacts');
    });
  });

  describe('GET /api/contacts/blocked', () => {
    it('should retrieve blocked contacts', async () => {
      const mockBlockedContacts = [
        { id: 1, contact_user_id: 3, username: 'blocked_user' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockBlockedContacts]);

      const response = await request(require('../../server'))
        .get('/api/contacts/blocked')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty('username', 'blocked_user');
    });
  });

  describe('GET /api/contacts/favorites', () => {
    it('should retrieve favorite contacts', async () => {
      const mockFavoriteContacts = [
        { id: 1, contact_user_id: 2, username: 'favorite_friend' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockFavoriteContacts]);

      const response = await request(require('../../server'))
        .get('/api/contacts/favorites')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty('username', 'favorite_friend');
    });
  });

  describe('GET /api/contacts/mutual', () => {
    it('should retrieve mutual contacts', async () => {
      const mockMutualContacts = [
        { id: 1, contact_user_id: 2, username: 'mutual_friend' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMutualContacts]);

      const response = await request(require('../../server'))
        .get('/api/contacts/mutual')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty('username', 'mutual_friend');
    });
  });

  describe('GET /api/contacts/search', () => {
    it('should search contacts successfully', async () => {
      const mockResults = [
        { id: 1, contact_user_id: 2, username: 'search_result' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockResults]);

      const response = await request(require('../../server'))
        .get('/api/contacts/search?q=searchTerm')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty('username', 'search_result');
    });

    it('should return 400 if no search query provided', async () => {
      const response = await request(require('../../server'))
        .get('/api/contacts/search')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Search query is required');
    });
  });
});

// Additional tests for contact-specific functionality
describe('Additional Contacts API Tests', () => {
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

  describe('Contact relationship endpoints', () => {
    it('should get contact suggestions', async () => {
      const mockSuggestions = [
        { id: 2, username: 'suggested_user', email: 'suggested@example.com' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockSuggestions]);

      const response = await request(require('../../server'))
        .get('/api/contacts/suggestions')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle contact requests', async () => {
      // This would depend on the specific implementation for contact requests
      // which might involve pending requests, accept/deny flows, etc.
    });
  });
});