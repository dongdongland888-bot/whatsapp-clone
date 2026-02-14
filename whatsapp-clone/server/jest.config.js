module.exports = {
  testEnvironment: 'node',
  rootDir: '..',
  testMatch: [
    '<rootDir>/server/tests/**/*.test.js',
    '<rootDir>/server/tests/**/*.spec.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/server/tests/setup.js'],
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/tests/**',
    '!server/config/**',
    '!server/uploads/**'
  ],
  coverageDirectory: 'coverage/server',
  coverageReporters: ['text', 'lcov', 'html'],
  modulePathIgnorePatterns: ['<rootDir>/client/'],
  testTimeout: 10000,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
