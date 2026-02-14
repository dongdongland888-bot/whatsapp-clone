/**
 * Unit tests for User model
 */
const User = require('../../models/User');
const db = require('../../config/db');
const bcrypt = require('bcryptjs');

// Mock the database
jest.mock('../../config/db');

describe('User Model', () => {
  let mockDbExecute;

  beforeEach(() => {
    mockDbExecute = jest.fn();
    db.execute = mockDbExecute;
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should retrieve all users with default pagination', async () => {
      const mockUsers = [
        { id: 1, username: 'john_doe', email: 'john@example.com' },
        { id: 2, username: 'jane_doe', email: 'jane@example.com' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockUsers]);

      const users = await User.findAll();

      expect(mockDbExecute).toHaveBeenCalled();
      expect(users).toEqual(mockUsers);
    });

    it('should retrieve users with search parameter', async () => {
      const mockUsers = [{ id: 1, username: 'john_doe', email: 'john@example.com' }];
      
      mockDbExecute.mockResolvedValueOnce([mockUsers]);

      const users = await User.findAll({ search: 'john' });

      expect(mockDbExecute).toHaveBeenCalled();
      expect(users).toEqual(mockUsers);
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const mockUser = { id: 1, username: 'john_doe', email: 'john@example.com' };
      
      mockDbExecute.mockResolvedValueOnce([[mockUser]]);

      const user = await User.findById(1);

      expect(mockDbExecute).toHaveBeenCalled();
      expect(user).toEqual(mockUser);
    });

    it('should return undefined if user not found', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]);

      const user = await User.findById(999);

      expect(user).toBeUndefined();
    });
  });

  describe('findByIdWithPassword', () => {
    it('should find user by ID including password', async () => {
      const mockUser = { id: 1, username: 'john_doe', email: 'john@example.com', password: 'hashed_password' };
      
      mockDbExecute.mockResolvedValueOnce([[mockUser]]);

      const user = await User.findByIdWithPassword(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?',
        [1]
      );
      expect(user).toEqual(mockUser);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = { id: 1, username: 'john_doe', email: 'john@example.com' };
      
      mockDbExecute.mockResolvedValueOnce([[mockUser]]);

      const user = await User.findByEmail('john@example.com');

      expect(mockDbExecute).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = ?',
        ['john@example.com']
      );
      expect(user).toEqual(mockUser);
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      const mockUser = { id: 1, username: 'john_doe', email: 'john@example.com' };
      
      mockDbExecute.mockResolvedValueOnce([[mockUser]]);

      const user = await User.findByUsername('john_doe');

      expect(mockDbExecute).toHaveBeenCalled();
      expect(user).toEqual(mockUser);
    });
  });

  describe('findByPhone', () => {
    it('should find user by phone', async () => {
      const mockUser = { id: 1, username: 'john_doe', email: 'john@example.com', phone: '+1234567890' };
      
      mockDbExecute.mockResolvedValueOnce([[mockUser]]);

      const user = await User.findByPhone('+1234567890');

      expect(mockDbExecute).toHaveBeenCalled();
      expect(user).toEqual(mockUser);
    });
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        phone: '+1234567890',
        avatar: 'avatar.jpg'
      };
      
      const mockInsertResult = { insertId: 123 };
      mockDbExecute.mockResolvedValueOnce([mockInsertResult]).mockResolvedValueOnce([{}]);

      // Mock bcrypt hash
      const mockHash = jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_password');

      const newUser = await User.create(userData);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockDbExecute).toHaveBeenCalledTimes(2);
      expect(newUser).toEqual({
        id: 123,
        username: 'newuser',
        email: 'newuser@example.com',
        phone: '+1234567890',
        avatar: 'avatar.jpg',
        status_message: 'Hey there! I am using WhatsApp Clone',
        is_online: false,
        created_at: expect.any(Date)
      });

      mockHash.mockRestore();
    });
  });

  describe('update', () => {
    it('should update allowed fields for a user', async () => {
      const userData = {
        username: 'updated_username',
        avatar: 'new_avatar.jpg'
      };
      
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await User.update(1, userData);

      expect(mockDbExecute).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if no updates are provided', async () => {
      const result = await User.update(1, {});

      expect(result).toBe(false);
      expect(mockDbExecute).not.toHaveBeenCalled();
    });
  });

  describe('updatePassword', () => {
    it('should update user password with hashed value', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);
      const mockHash = jest.spyOn(bcrypt, 'hash').mockResolvedValue('new_hashed_password');

      const result = await User.updatePassword(1, 'newPassword123');

      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 12);
      expect(mockDbExecute).toHaveBeenCalled();
      expect(result).toBe(true);

      mockHash.mockRestore();
    });
  });

  describe('verifyPassword', () => {
    it('should verify password correctly', async () => {
      const mockCompare = jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const isValid = await User.verifyPassword('plainPassword', 'hashedPassword');

      expect(bcrypt.compare).toHaveBeenCalledWith('plainPassword', 'hashedPassword');
      expect(isValid).toBe(true);

      mockCompare.mockRestore();
    });
  });

  describe('setOnlineStatus', () => {
    it('should set user online status to true', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await User.setOnlineStatus(1, true);

      expect(mockDbExecute).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should set user online status to false', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await User.setOnlineStatus(1, false);

      expect(mockDbExecute).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('updateLastSeen', () => {
    it('should update last seen and set online to false', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await User.updateLastSeen(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'UPDATE users SET last_seen = NOW(), is_online = FALSE WHERE id = ?',
        [1]
      );
      expect(result).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await User.delete(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = ?',
        [1]
      );
      expect(result).toBe(true);
    });
  });

  describe('getPreferences', () => {
    it('should get user preferences', async () => {
      const mockPrefs = { theme: 'dark', notification_sound: 'default' };
      
      mockDbExecute.mockResolvedValueOnce([[mockPrefs]]);

      const prefs = await User.getPreferences(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'SELECT * FROM user_preferences WHERE user_id = ?',
        [1]
      );
      expect(prefs).toEqual(mockPrefs);
    });
  });

  describe('updatePreferences', () => {
    it('should update allowed preference fields', async () => {
      const preferences = {
        theme: 'dark',
        notification_sound: 'chime'
      };
      
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await User.updatePreferences(1, preferences);

      expect(mockDbExecute).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if no preferences to update', async () => {
      const result = await User.updatePreferences(1, {});

      expect(result).toBe(false);
      expect(mockDbExecute).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should search users by query', async () => {
      const mockUsers = [
        { id: 1, username: 'john_doe', email: 'john@example.com' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockUsers]);

      const users = await User.search('john', null, 20);

      expect(mockDbExecute).toHaveBeenCalled();
      expect(users).toEqual(mockUsers);
    });

    it('should search users excluding a specific user', async () => {
      const mockUsers = [
        { id: 2, username: 'john_smith', email: 'johnsmith@example.com' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockUsers]);

      const users = await User.search('john', 1, 20);

      expect(mockDbExecute).toHaveBeenCalled();
      expect(users).toEqual(mockUsers);
    });
  });

  describe('emailExists', () => {
    it('should return true if email exists', async () => {
      mockDbExecute.mockResolvedValueOnce([[{ id: 1 }]]);

      const exists = await User.emailExists('test@example.com');

      expect(mockDbExecute).toHaveBeenCalled();
      expect(exists).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]);

      const exists = await User.emailExists('test@example.com');

      expect(exists).toBe(false);
    });

    it('should exclude a specific user when checking if email exists', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]);

      const exists = await User.emailExists('test@example.com', 1);

      expect(mockDbExecute).toHaveBeenCalled();
      expect(exists).toBe(false);
    });
  });

  describe('usernameExists', () => {
    it('should return true if username exists', async () => {
      mockDbExecute.mockResolvedValueOnce([[{ id: 1 }]]);

      const exists = await User.usernameExists('testuser');

      expect(mockDbExecute).toHaveBeenCalled();
      expect(exists).toBe(true);
    });

    it('should return false if username does not exist', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]);

      const exists = await User.usernameExists('testuser');

      expect(exists).toBe(false);
    });

    it('should exclude a specific user when checking if username exists', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]);

      const exists = await User.usernameExists('testuser', 1);

      expect(mockDbExecute).toHaveBeenCalled();
      expect(exists).toBe(false);
    });
  });
});
