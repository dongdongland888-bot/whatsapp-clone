/**
 * Test utilities and helpers for integration tests
 */
const jwt = require('jsonwebtoken');

/**
 * Generate a valid JWT token for testing
 */
const generateTestToken = (user = { id: 1, email: 'test@test.com', username: 'testuser' }) => {
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
};

/**
 * Create mock request object
 */
const mockRequest = (overrides = {}) => {
  return {
    headers: {},
    body: {},
    params: {},
    query: {},
    user: null,
    ...overrides
  };
};

/**
 * Create mock response object
 */
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.type = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Create test user data
 */
const createTestUser = (overrides = {}) => ({
  username: `testuser${Date.now()}`,
  email: `test${Date.now()}@example.com`,
  password: 'TestPass123',
  ...overrides
});

/**
 * Create test message data
 */
const createTestMessage = (overrides = {}) => ({
  content: 'Test message content',
  message_type: 'text',
  ...overrides
});

/**
 * Wait for a specified time
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  generateTestToken,
  mockRequest,
  mockResponse,
  createTestUser,
  createTestMessage,
  wait
};
