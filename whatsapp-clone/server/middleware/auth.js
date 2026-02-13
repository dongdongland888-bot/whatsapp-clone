const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token middleware
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token format.'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to authenticate token.'
    });
  }
};

// Optional token verification (for routes that can work with or without auth)
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// Verify socket token
const verifySocketToken = (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }
    return next(new Error('Authentication error: Invalid token'));
  }
};

// Generate access token
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Generate refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh'
    );
  } catch (error) {
    return null;
  }
};

// Check if user owns resource middleware factory
const checkOwnership = (resourceIdParam, getOwnerId) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdParam];
      const ownerId = await getOwnerId(resourceId);
      
      if (ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource.'
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking resource ownership.'
      });
    }
  };
};

// Check if user is group admin
const checkGroupAdmin = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    
    const db = require('../config/db');
    const [rows] = await db.execute(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, userId]
    );
    
    if (rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group.'
      });
    }
    
    if (rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You must be an admin to perform this action.'
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking group permissions.'
    });
  }
};

// Check if user is blocked
const checkNotBlocked = async (req, res, next) => {
  try {
    const { receiver_id } = req.body;
    const senderId = req.user.id;
    
    if (!receiver_id) {
      return next();
    }
    
    const db = require('../config/db');
    const [rows] = await db.execute(
      `SELECT id FROM contacts 
       WHERE (user_id = ? AND contact_user_id = ? AND is_blocked = TRUE)
       OR (user_id = ? AND contact_user_id = ? AND is_blocked = TRUE)`,
      [receiver_id, senderId, senderId, receiver_id]
    );
    
    if (rows.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'Cannot send message. User has blocked you or you have blocked this user.'
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking block status.'
    });
  }
};

module.exports = {
  verifyToken,
  optionalAuth,
  verifySocketToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  checkOwnership,
  checkGroupAdmin,
  checkNotBlocked
};
