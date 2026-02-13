const { body, param, query, validationResult } = require('express-validator');

// Validation result handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Auth validation rules
const authValidation = {
  register: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6, max: 100 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('phone')
      .optional()
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Please provide a valid phone number'),
    handleValidationErrors
  ],
  login: [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    handleValidationErrors
  ]
};

// Message validation rules
const messageValidation = {
  send: [
    body('receiver_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid receiver ID'),
    body('group_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid group ID'),
    body('content')
      .if(body('message_type').not().equals('image'))
      .if(body('message_type').not().equals('video'))
      .if(body('message_type').not().equals('audio'))
      .if(body('message_type').not().equals('document'))
      .notEmpty()
      .withMessage('Message content is required for text messages')
      .isLength({ max: 10000 })
      .withMessage('Message is too long (max 10000 characters)'),
    body('message_type')
      .optional()
      .isIn(['text', 'image', 'video', 'audio', 'document', 'location', 'contact', 'sticker'])
      .withMessage('Invalid message type'),
    body('reply_to_id')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid reply message ID'),
    handleValidationErrors
  ],
  getChat: [
    param('userId')
      .isInt({ min: 1 })
      .withMessage('Invalid user ID'),
    param('otherUserId')
      .isInt({ min: 1 })
      .withMessage('Invalid other user ID'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a positive number'),
    handleValidationErrors
  ],
  updateStatus: [
    param('messageId')
      .isInt({ min: 1 })
      .withMessage('Invalid message ID'),
    body('status')
      .isIn(['delivered', 'read'])
      .withMessage('Status must be either "delivered" or "read"'),
    handleValidationErrors
  ]
};

// Group validation rules
const groupValidation = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Group name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description is too long (max 500 characters)'),
    body('members')
      .optional()
      .isArray()
      .withMessage('Members must be an array'),
    body('members.*')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Invalid member ID'),
    handleValidationErrors
  ],
  update: [
    param('groupId')
      .isInt({ min: 1 })
      .withMessage('Invalid group ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Group name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description is too long (max 500 characters)'),
    handleValidationErrors
  ],
  addMember: [
    param('groupId')
      .isInt({ min: 1 })
      .withMessage('Invalid group ID'),
    param('userId')
      .isInt({ min: 1 })
      .withMessage('Invalid user ID'),
    handleValidationErrors
  ]
};

// Contact validation rules
const contactValidation = {
  add: [
    body('contact_user_id')
      .isInt({ min: 1 })
      .withMessage('Invalid contact user ID'),
    body('nickname')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Nickname is too long (max 50 characters)'),
    handleValidationErrors
  ],
  update: [
    param('contactId')
      .isInt({ min: 1 })
      .withMessage('Invalid contact ID'),
    body('nickname')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Nickname is too long (max 50 characters)'),
    body('is_blocked')
      .optional()
      .isBoolean()
      .withMessage('is_blocked must be a boolean'),
    body('is_favorite')
      .optional()
      .isBoolean()
      .withMessage('is_favorite must be a boolean'),
    handleValidationErrors
  ]
};

// Media validation rules
const mediaValidation = {
  upload: [
    body('file_type')
      .isIn(['image', 'video', 'audio', 'document'])
      .withMessage('Invalid file type'),
    handleValidationErrors
  ]
};

// User validation rules
const userValidation = {
  update: [
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('status_message')
      .optional()
      .trim()
      .isLength({ max: 139 })
      .withMessage('Status message is too long (max 139 characters)'),
    handleValidationErrors
  ],
  updatePreferences: [
    body('theme')
      .optional()
      .isIn(['light', 'dark', 'system'])
      .withMessage('Invalid theme'),
    body('notification_sound')
      .optional()
      .isBoolean()
      .withMessage('notification_sound must be a boolean'),
    body('notification_preview')
      .optional()
      .isBoolean()
      .withMessage('notification_preview must be a boolean'),
    body('read_receipts')
      .optional()
      .isBoolean()
      .withMessage('read_receipts must be a boolean'),
    body('last_seen_visible')
      .optional()
      .isBoolean()
      .withMessage('last_seen_visible must be a boolean'),
    body('language')
      .optional()
      .isLength({ min: 2, max: 10 })
      .withMessage('Invalid language code'),
    handleValidationErrors
  ]
};

module.exports = {
  handleValidationErrors,
  authValidation,
  messageValidation,
  groupValidation,
  contactValidation,
  mediaValidation,
  userValidation
};
