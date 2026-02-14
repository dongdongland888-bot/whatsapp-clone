/**
 * Integration tests for calls endpoints
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('express');
const db = require('../../config/db');

// Mock the database
jest.mock('../../config/db');

// Create a minimal test app for call routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Import call routes
  const callRoutes = require('../../routes/calls');
  
  app.use('/api/calls', callRoutes);
  
  return app;
};

describe('Calls API Integration Tests', () => {
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

  describe('GET /api/calls/history', () => {
    it('should retrieve call history with valid token', async () => {
      const mockCalls = [
        { id: 1, caller_id: 1, receiver_id: 2, call_type: 'voice', status: 'ended', duration: 120 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockCalls]);

      const response = await request(app)
        .get('/api/calls/history')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/calls/history')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .get('/api/calls/history')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/calls/initiate', () => {
    it('should initiate a voice call', async () => {
      const callData = {
        receiver_id: 2,
        call_type: 'voice'
      };
      
      // Mock: User exists, no ongoing call, insert call
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 2, username: 'receiver' }]]) // findById for receiver
        .mockResolvedValueOnce([[]]) // getOngoing check
        .mockResolvedValueOnce([{ insertId: 123 }]); // insert call

      const response = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${validToken}`)
        .send(callData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('call_type', 'voice');
    });

    it('should initiate a video call', async () => {
      const callData = {
        receiver_id: 2,
        call_type: 'video'
      };
      
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 2, username: 'receiver' }]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{ insertId: 124 }]);

      const response = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${validToken}`)
        .send(callData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('call_type', 'video');
    });

    it('should return 400 for invalid call type', async () => {
      const callData = {
        receiver_id: 2,
        call_type: 'invalid'
      };

      const response = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${validToken}`)
        .send(callData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when missing receiver_id', async () => {
      const callData = {
        call_type: 'voice'
      };

      const response = await request(app)
        .post('/api/calls/initiate')
        .set('Authorization', `Bearer ${validToken}`)
        .send(callData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/calls/:id/status', () => {
    it('should update call status to answered', async () => {
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 1, receiver_id: 1, status: 'ringing' }]]) // Find call
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Update status

      const response = await request(app)
        .put('/api/calls/1/status')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ status: 'answered' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 if call not found', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]); // Call not found

      const response = await request(app)
        .put('/api/calls/999/status')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ status: 'answered' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .put('/api/calls/1/status')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/calls/:id/end', () => {
    it('should end an ongoing call', async () => {
      const startedAt = new Date(Date.now() - 120000); // 2 minutes ago
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 1, caller_id: 1, receiver_id: 2, started_at: startedAt }]]) // Find call
        .mockResolvedValueOnce([[{ started_at: startedAt }]]) // endCall gets started_at
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Update call
        .mockResolvedValueOnce([[{ id: 1, duration: 120 }]]); // Get updated call

      const response = await request(app)
        .post('/api/calls/1/end')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 if call not found', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]); // Call not found

      const response = await request(app)
        .post('/api/calls/999/end')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/calls/stats', () => {
    it('should retrieve call statistics', async () => {
      const mockStats = [{
        call_type: 'voice',
        status: 'ended',
        count: 5,
        total_duration: 600
      }];
      
      mockDbExecute.mockResolvedValueOnce([mockStats]);

      const response = await request(app)
        .get('/api/calls/stats')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totals');
    });
  });

  describe('GET /api/calls/contact/:contactId', () => {
    it('should retrieve calls with a specific contact', async () => {
      const mockCalls = [
        { id: 1, caller_id: 1, receiver_id: 2, call_type: 'voice' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockCalls]);

      const response = await request(app)
        .get('/api/calls/contact/2')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/calls/:callId', () => {
    it('should retrieve a specific call', async () => {
      const mockCall = { id: 1, caller_id: 1, receiver_id: 2, call_type: 'voice' };
      
      mockDbExecute.mockResolvedValueOnce([[mockCall]]);

      const response = await request(app)
        .get('/api/calls/1')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', 1);
    });

    it('should return 404 if call not found', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .get('/api/calls/999')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
