const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const { contactValidation } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Apply authentication to all routes
router.use(verifyToken);

// Get all contacts
router.get('/', asyncHandler(async (req, res) => {
  const { includeBlocked } = req.query;
  const contacts = await Contact.findByUserId(req.user.id, {
    includeBlocked: includeBlocked === 'true'
  });
  
  res.json({
    success: true,
    data: contacts
  });
}));

// Get favorite contacts
router.get('/favorites', asyncHandler(async (req, res) => {
  const favorites = await Contact.getFavorites(req.user.id);
  
  res.json({
    success: true,
    data: favorites
  });
}));

// Get blocked contacts
router.get('/blocked', asyncHandler(async (req, res) => {
  const blocked = await Contact.getBlocked(req.user.id);
  
  res.json({
    success: true,
    data: blocked
  });
}));

// Search contacts
router.get('/search', asyncHandler(async (req, res) => {
  const { query } = req.query;
  
  if (!query || query.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters'
    });
  }
  
  const contacts = await Contact.search(req.user.id, query);
  
  res.json({
    success: true,
    data: contacts
  });
}));

// Get a specific contact
router.get('/:contactId', asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.contactId, req.user.id);
  
  if (!contact) {
    return res.status(404).json({
      success: false,
      message: 'Contact not found'
    });
  }
  
  res.json({
    success: true,
    data: contact
  });
}));

// Add a new contact
router.post('/', contactValidation.add, asyncHandler(async (req, res) => {
  const { contact_user_id, nickname } = req.body;
  
  // Check if user exists
  const user = await User.findById(contact_user_id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // Check if contact already exists
  const exists = await Contact.exists(req.user.id, contact_user_id);
  if (exists) {
    return res.status(409).json({
      success: false,
      message: 'Contact already exists'
    });
  }
  
  // Cannot add yourself
  if (req.user.id === contact_user_id) {
    return res.status(400).json({
      success: false,
      message: 'Cannot add yourself as a contact'
    });
  }
  
  const contact = await Contact.create(req.user.id, {
    contact_user_id,
    nickname
  });
  
  // Return with user info
  const fullContact = await Contact.findById(contact.id, req.user.id);
  
  res.status(201).json({
    success: true,
    message: 'Contact added successfully',
    data: fullContact
  });
}));

// Update a contact
router.put('/:contactId', contactValidation.update, asyncHandler(async (req, res) => {
  const { nickname, is_blocked, is_favorite } = req.body;
  
  const contact = await Contact.findById(req.params.contactId, req.user.id);
  if (!contact) {
    return res.status(404).json({
      success: false,
      message: 'Contact not found'
    });
  }
  
  const updated = await Contact.update(req.params.contactId, req.user.id, {
    nickname,
    is_blocked,
    is_favorite
  });
  
  if (!updated) {
    return res.status(400).json({
      success: false,
      message: 'No changes made'
    });
  }
  
  const updatedContact = await Contact.findById(req.params.contactId, req.user.id);
  
  res.json({
    success: true,
    message: 'Contact updated successfully',
    data: updatedContact
  });
}));

// Delete a contact
router.delete('/:contactId', asyncHandler(async (req, res) => {
  const deleted = await Contact.delete(req.params.contactId, req.user.id);
  
  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: 'Contact not found'
    });
  }
  
  res.json({
    success: true,
    message: 'Contact deleted successfully'
  });
}));

// Toggle favorite
router.post('/:contactId/favorite', asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.contactId, req.user.id);
  if (!contact) {
    return res.status(404).json({
      success: false,
      message: 'Contact not found'
    });
  }
  
  await Contact.toggleFavorite(req.params.contactId, req.user.id);
  
  res.json({
    success: true,
    message: contact.is_favorite ? 'Removed from favorites' : 'Added to favorites'
  });
}));

// Block a user
router.post('/block/:userId', asyncHandler(async (req, res) => {
  const targetUserId = parseInt(req.params.userId);
  
  if (req.user.id === targetUserId) {
    return res.status(400).json({
      success: false,
      message: 'Cannot block yourself'
    });
  }
  
  // Check if user exists
  const user = await User.findById(targetUserId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  await Contact.setBlocked(req.user.id, targetUserId, true);
  
  res.json({
    success: true,
    message: 'User blocked successfully'
  });
}));

// Unblock a user
router.post('/unblock/:userId', asyncHandler(async (req, res) => {
  const targetUserId = parseInt(req.params.userId);
  
  await Contact.setBlocked(req.user.id, targetUserId, false);
  
  res.json({
    success: true,
    message: 'User unblocked successfully'
  });
}));

// Search users to add as contacts
router.get('/users/search', asyncHandler(async (req, res) => {
  const { query } = req.query;
  
  if (!query || query.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Search query must be at least 2 characters'
    });
  }
  
  const users = await User.search(query, req.user.id);
  
  // Check which users are already contacts
  const contacts = await Contact.findByUserId(req.user.id, { includeBlocked: true });
  const contactIds = new Set(contacts.map(c => c.contact_user_id));
  
  const usersWithContactStatus = users.map(user => ({
    ...user,
    is_contact: contactIds.has(user.id)
  }));
  
  res.json({
    success: true,
    data: usersWithContactStatus
  });
}));

module.exports = router;
