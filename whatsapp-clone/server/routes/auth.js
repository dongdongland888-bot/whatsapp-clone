const express = require('express');
const router = express.Router();
const User = require('../models/User');
const {
  verifyToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} = require('../middleware/auth');
const { authValidation, userValidation } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Register route
router.post('/register', authValidation.register, asyncHandler(async (req, res) => {
  const { username, email, password, phone } = req.body;

  // Check if email exists
  const emailExists = await User.emailExists(email);
  if (emailExists) {
    return res.status(409).json({
      success: false,
      message: 'This email is already registered'
    });
  }

  // Check if username exists
  const usernameExists = await User.usernameExists(username);
  if (usernameExists) {
    return res.status(409).json({
      success: false,
      message: 'This username is already taken'
    });
  }

  // Create user (password is hashed in the model)
  const newUser = await User.create({
    username,
    email,
    password,
    phone
  });

  // Generate tokens
  const accessToken = generateAccessToken(newUser);
  const refreshToken = generateRefreshToken(newUser);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar,
        status_message: newUser.status_message
      },
      accessToken,
      refreshToken
    }
  });
}));

// Login route
router.post('/login', authValidation.login, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email (includes password)
  const user = await User.findByEmail(email);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Verify password
  const isValid = await User.verifyPassword(password, user.password);
  if (!isValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  // Update online status
  await User.setOnlineStatus(user.id, true);

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Get user preferences
  const preferences = await User.getPreferences(user.id);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        status_message: user.status_message,
        preferences
      },
      accessToken,
      refreshToken
    }
  });
}));

// Refresh token
router.post('/refresh-token', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
      code: 'REFRESH_TOKEN_INVALID'
    });
  }

  // Get user
  const user = await User.findById(decoded.id);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'User not found'
    });
  }

  // Generate new tokens
  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    }
  });
}));

// Logout
router.post('/logout', verifyToken, asyncHandler(async (req, res) => {
  // Update online status
  await User.updateLastSeen(req.user.id);

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// Get current user profile
router.get('/profile', verifyToken, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  const preferences = await User.getPreferences(user.id);

  res.json({
    success: true,
    data: {
      user: {
        ...user,
        preferences
      }
    }
  });
}));

// Update profile
router.put('/profile', verifyToken, userValidation.update, asyncHandler(async (req, res) => {
  const { username, avatar, status_message, phone } = req.body;

  // Check if username is taken by another user
  if (username) {
    const usernameExists = await User.usernameExists(username, req.user.id);
    if (usernameExists) {
      return res.status(409).json({
        success: false,
        message: 'This username is already taken'
      });
    }
  }

  const updated = await User.update(req.user.id, {
    username,
    avatar,
    status_message,
    phone
  });

  if (!updated) {
    return res.status(400).json({
      success: false,
      message: 'No changes made'
    });
  }

  const user = await User.findById(req.user.id);

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user }
  });
}));

// Update password
router.put('/password', verifyToken, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password and new password are required'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters'
    });
  }

  // Get user with password
  const user = await User.findByIdWithPassword(req.user.id);
  
  // Verify current password
  const isValid = await User.verifyPassword(currentPassword, user.password);
  if (!isValid) {
    return res.status(401).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Update password
  await User.updatePassword(req.user.id, newPassword);

  res.json({
    success: true,
    message: 'Password updated successfully'
  });
}));

// Get user preferences
router.get('/preferences', verifyToken, asyncHandler(async (req, res) => {
  const preferences = await User.getPreferences(req.user.id);

  res.json({
    success: true,
    data: preferences
  });
}));

// Update user preferences
router.put('/preferences', verifyToken, userValidation.updatePreferences, asyncHandler(async (req, res) => {
  const updated = await User.updatePreferences(req.user.id, req.body);

  if (!updated) {
    return res.status(400).json({
      success: false,
      message: 'No changes made'
    });
  }

  const preferences = await User.getPreferences(req.user.id);

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: preferences
  });
}));

// Search users
router.get('/users/search', verifyToken, asyncHandler(async (req, res) => {
  const { query } = req.query;

  if (!query || query.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters'
    });
  }

  const users = await User.search(query, req.user.id, 20);

  res.json({
    success: true,
    data: users
  });
}));

// Get user by ID (public profile)
router.get('/users/:userId', verifyToken, asyncHandler(async (req, res) => {
  const user = await User.findById(parseInt(req.params.userId));

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Return limited public info
  res.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      status_message: user.status_message,
      is_online: user.is_online,
      last_seen: user.last_seen
    }
  });
}));

// Delete account
router.delete('/account', verifyToken, asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required to delete account'
    });
  }

  // Verify password
  const user = await User.findByIdWithPassword(req.user.id);
  const isValid = await User.verifyPassword(password, user.password);
  
  if (!isValid) {
    return res.status(401).json({
      success: false,
      message: 'Incorrect password'
    });
  }

  // Delete user (cascade will handle related data)
  await User.delete(req.user.id);

  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
}));

module.exports = router;
