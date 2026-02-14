/**
 * Integration tests for API health check endpoint
 * This is a simple test to verify the test setup works
 */
const request = require('supertest');
const express = require('express');

// Create a minimal test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  // Simple echo endpoint
  app.post('/api/echo', (req, res) => {
    res.json({
      received: req.body
    });
  });
  
  return app;
};

describe('API Health Check', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /api/health', () => {
    it('should return 200 and health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('POST /api/echo', () => {
    it('should echo the request body', async () => {
      const testData = { message: 'Hello World', number: 42 };

      const response = await request(app)
        .post('/api/echo')
        .send(testData)
        .expect(200);

      expect(response.body.received).toEqual(testData);
    });

    it('should handle empty body', async () => {
      const response = await request(app)
        .post('/api/echo')
        .send({})
        .expect(200);

      expect(response.body.received).toEqual({});
    });
  });
});
