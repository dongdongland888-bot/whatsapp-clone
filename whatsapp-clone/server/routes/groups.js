const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const User = require('../models/User');

// Get all groups
router.get('/', async (req, res) => {
  try {
    const groups = await Group.findAll();
    res.json({ groups });
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's groups
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const groups = await Group.getGroupsByUserId(userId);
    res.json({ groups });
  } catch (error) {
    console.error('Get user groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new group
router.post('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Access denied' });
    }

    const { name, description, creator_id } = req.body;
    
    if (!name || !creator_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const group = await Group.create({
      name,
      description,
      creator_id
    });

    res.status(201).json({
      message: 'Group created successfully',
      data: group
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add user to group
router.post('/:groupId/users/:userId', async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    
    const success = await Group.addUserToGroup(parseInt(groupId), parseInt(userId));
    
    if (success) {
      res.json({ message: 'User added to group successfully' });
    } else {
      res.status(500).json({ message: 'Failed to add user to group' });
    }
  } catch (error) {
    console.error('Add user to group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove user from group
router.delete('/:groupId/users/:userId', async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    
    const success = await Group.removeUserFromGroup(parseInt(groupId), parseInt(userId));
    
    if (success) {
      res.json({ message: 'User removed from group successfully' });
    } else {
      res.status(500).json({ message: 'Failed to remove user from group' });
    }
  } catch (error) {
    console.error('Remove user from group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get group members
router.get('/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const members = await Group.getMembers(parseInt(groupId));
    res.json({ members });
  } catch (error) {
    console.error('Get group members error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;