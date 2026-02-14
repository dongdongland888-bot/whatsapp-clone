/**
 * Unit tests for validation middleware
 */
const { handleValidationErrors } = require('../../middleware/validation');
const { validationResult } = require('express-validator');

// Mock express-validator
jest.mock('express-validator', () => ({
  ...jest.requireActual('express-validator'),
  validationResult: jest.fn()
}));

describe('Validation Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('handleValidationErrors', () => {
    it('should call next if no validation errors', () => {
      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      handleValidationErrors(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should return 400 with validation errors if there are errors', () => {
      const mockErrors = [
        { path: 'email', msg: 'Please provide a valid email' },
        { path: 'password', msg: 'Password is required' }
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      });

      handleValidationErrors(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: [
          { field: 'email', message: 'Please provide a valid email' },
          { field: 'password', message: 'Password is required' }
        ]
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should format errors correctly', () => {
      const mockErrors = [
        { path: 'username', msg: 'Username must be between 3 and 50 characters' }
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      });

      handleValidationErrors(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [
            { field: 'username', message: 'Username must be between 3 and 50 characters' }
          ]
        })
      );
    });
  });
});
