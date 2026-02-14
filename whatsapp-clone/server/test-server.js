/**
 * Test server for integration tests
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Middleware
const { errorHandler } = require('./middleware/errorHandler');
const { verifyToken } = require('./middleware/auth');

// Routes
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const contactRoutes = require('./routes/contacts');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const mediaRoutes = require('./routes/media');
const callRoutes = require('./routes/calls');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', verifyToken, messageRoutes);  // Protected routes
app.use('/api/contacts', verifyToken, contactRoutes);  // Protected routes
app.use('/api/users', verifyToken, userRoutes);        // Protected routes
app.use('/api/groups', verifyToken, groupRoutes);      // Protected routes
app.use('/api/media', verifyToken, mediaRoutes);       // Protected routes
app.use('/api/calls', verifyToken, callRoutes);        // Protected routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Catch-all route for 404s
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
    code: 'NOT_FOUND'
  });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;