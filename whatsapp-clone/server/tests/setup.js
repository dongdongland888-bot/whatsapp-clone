/**
 * Jest test setup file for server tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.PORT = '5001'; // Use different port for tests

// Mock console.error in tests to reduce noise
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: console.log, // Keep log for debugging
  info: console.info,
  debug: console.debug,
};

// Global test utilities
global.testUtils = {
  // Generate a random email for testing
  randomEmail: () => `test${Date.now()}@example.com`,
  
  // Generate a random username
  randomUsername: () => `user${Date.now()}`,
  
  // Wait helper
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
};

// Clean up after all tests
afterAll(async () => {
  // Close any open handles
  await new Promise(resolve => setTimeout(resolve, 100));
});
