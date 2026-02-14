/**
 * Unit tests for Contact model
 */
const Contact = require('../../models/Contact');
const db = require('../../config/db');

// Mock the database
jest.mock('../../config/db');

describe('Contact Model', () => {
  let mockDbExecute;

  beforeEach(() => {
    mockDbExecute = jest.fn();
    db.execute = mockDbExecute;
    jest.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('should retrieve contacts for a user', async () => {
      const mockContacts = [
        { id: 1, contact_user_id: 2, username: 'jane_doe' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockContacts]);

      const contacts = await Contact.findByUserId(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.user_id = ?'),
        [1]
      );
      expect(contacts).toEqual(mockContacts);
    });

    it('should retrieve contacts including blocked ones when specified', async () => {
      const mockContacts = [
        { id: 1, contact_user_id: 2, username: 'jane_doe', is_blocked: true }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockContacts]);

      const contacts = await Contact.findByUserId(1, { includeBlocked: true });

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.user_id = ?'),
        [1]
      );
      expect(contacts).toEqual(mockContacts);
    });
  });

  describe('findById', () => {
    it('should find a specific contact by ID', async () => {
      const mockContact = { id: 1, contact_user_id: 2, username: 'jane_doe' };
      
      mockDbExecute.mockResolvedValueOnce([[mockContact]]);

      const contact = await Contact.findById(1, 5);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.id = ? AND c.user_id = ?'),
        [1, 5]
      );
      expect(contact).toEqual(mockContact);
    });
  });

  describe('exists', () => {
    it('should return true if contact exists', async () => {
      mockDbExecute.mockResolvedValueOnce([[{ id: 1 }]]);

      const exists = await Contact.exists(1, 2);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'SELECT id FROM contacts WHERE user_id = ? AND contact_user_id = ?',
        [1, 2]
      );
      expect(exists).toBe(true);
    });

    it('should return false if contact does not exist', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]);

      const exists = await Contact.exists(1, 999);

      expect(exists).toBe(false);
    });
  });

  describe('create', () => {
    it('should create a new contact', async () => {
      const contactData = {
        contact_user_id: 2,
        nickname: 'Jane'
      };
      
      const mockInsertResult = { insertId: 123 };
      mockDbExecute.mockResolvedValueOnce([mockInsertResult]);

      const newContact = await Contact.create(1, contactData);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'INSERT INTO contacts (user_id, contact_user_id, nickname) VALUES (?, ?, ?)',
        [1, 2, 'Jane']
      );
      expect(newContact).toEqual({
        id: 123,
        user_id: 1,
        contact_user_id: 2,
        nickname: 'Jane',
        is_blocked: false,
        is_favorite: false,
        created_at: expect.any(Date)
      });
    });

    it('should throw error when trying to add self as contact', async () => {
      await expect(Contact.create(1, { contact_user_id: 1 })).rejects.toThrow('Cannot add yourself as a contact');
    });
  });

  describe('update', () => {
    it('should update allowed fields for a contact', async () => {
      const updateData = {
        nickname: 'Updated Jane',
        is_blocked: true
      };
      
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await Contact.update(1, 5, updateData);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'UPDATE contacts SET nickname = ?, is_blocked = ? WHERE id = ? AND user_id = ?',
        ['Updated Jane', true, 1, 5]
      );
      expect(result).toBe(true);
    });

    it('should return false if no updates are provided', async () => {
      const result = await Contact.update(1, 5, {});

      expect(result).toBe(false);
      expect(mockDbExecute).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a contact', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await Contact.delete(1, 5);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'DELETE FROM contacts WHERE id = ? AND user_id = ?',
        [1, 5]
      );
      expect(result).toBe(true);
    });
  });

  describe('setBlocked', () => {
    it('should block an existing contact', async () => {
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await Contact.setBlocked(1, 2, true);

      expect(mockDbExecute).toHaveBeenNthCalledWith(1,
        'SELECT id FROM contacts WHERE user_id = ? AND contact_user_id = ?',
        [1, 2]
      );
      expect(mockDbExecute).toHaveBeenNthCalledWith(2,
        'UPDATE contacts SET is_blocked = ? WHERE user_id = ? AND contact_user_id = ?',
        [true, 1, 2]
      );
      expect(result).toBe(true);
    });

    it('should unblock an existing contact', async () => {
      mockDbExecute
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await Contact.setBlocked(1, 2, false);

      expect(mockDbExecute).toHaveBeenNthCalledWith(2,
        'UPDATE contacts SET is_blocked = ? WHERE user_id = ? AND contact_user_id = ?',
        [false, 1, 2]
      );
      expect(result).toBe(true);
    });

    it('should create a blocked contact entry if not exists', async () => {
      mockDbExecute
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([{}]);

      const result = await Contact.setBlocked(1, 2, true);

      expect(mockDbExecute).toHaveBeenNthCalledWith(1,
        'SELECT id FROM contacts WHERE user_id = ? AND contact_user_id = ?',
        [1, 2]
      );
      expect(mockDbExecute).toHaveBeenNthCalledWith(2,
        'INSERT INTO contacts (user_id, contact_user_id, is_blocked) VALUES (?, ?, TRUE)',
        [1, 2]
      );
      expect(result).toBe(true);
    });

    it('should return false when unblocking non-existent contact', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]);

      const result = await Contact.setBlocked(1, 2, false);

      expect(result).toBe(false);
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle favorite status', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await Contact.toggleFavorite(1, 5);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'UPDATE contacts SET is_favorite = NOT is_favorite WHERE id = ? AND user_id = ?',
        [1, 5]
      );
      expect(result).toBe(true);
    });
  });

  describe('getBlocked', () => {
    it('should retrieve blocked contacts', async () => {
      const mockContacts = [
        { id: 1, contact_user_id: 2, username: 'blocked_user' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockContacts]);

      const contacts = await Contact.getBlocked(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('is_blocked = TRUE'),
        [1]
      );
      expect(contacts).toEqual(mockContacts);
    });
  });

  describe('getFavorites', () => {
    it('should retrieve favorite contacts', async () => {
      const mockContacts = [
        { id: 1, contact_user_id: 2, username: 'favorite_user' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockContacts]);

      const contacts = await Contact.getFavorites(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('is_favorite = TRUE'),
        [1]
      );
      expect(contacts).toEqual(mockContacts);
    });
  });

  describe('isBlocked', () => {
    it('should return true if contact is blocked', async () => {
      mockDbExecute.mockResolvedValueOnce([[{ id: 1 }]]);

      const isBlocked = await Contact.isBlocked(1, 2);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'SELECT id FROM contacts WHERE user_id = ? AND contact_user_id = ? AND is_blocked = TRUE',
        [1, 2]
      );
      expect(isBlocked).toBe(true);
    });

    it('should return false if contact is not blocked', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]);

      const isBlocked = await Contact.isBlocked(1, 2);

      expect(isBlocked).toBe(false);
    });
  });

  describe('getMutualContacts', () => {
    it('should retrieve mutual contacts', async () => {
      const mockContacts = [
        { id: 1, contact_user_id: 2, username: 'mutual_friend' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockContacts]);

      const contacts = await Contact.getMutualContacts(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('JOIN contacts c2'),
        [1]
      );
      expect(contacts).toEqual(mockContacts);
    });
  });

  describe('search', () => {
    it('should search contacts by query', async () => {
      const mockResults = [
        { id: 1, contact_user_id: 2, username: 'jane_doe' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockResults]);

      const results = await Contact.search(1, 'jane');

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.user_id = ?'),
        [1, '%jane%', '%jane%', '%jane%']
      );
      expect(results).toEqual(mockResults);
    });
  });
});
