/**
 * Unit tests for Message model
 */
const Message = require('../../models/Message');
const db = require('../../config/db');

// Mock the database
jest.mock('../../config/db');

describe('Message Model', () => {
  let mockDbExecute;

  beforeEach(() => {
    mockDbExecute = jest.fn();
    db.execute = mockDbExecute;
    jest.clearAllMocks();
  });

  describe('findByUserId', () => {
    it('should retrieve messages for a user', async () => {
      const mockMessages = [
        { id: 1, content: 'Hello', sender_id: 1, receiver_id: 2 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMessages]);

      const messages = await Message.findByUserId(1);

      expect(mockDbExecute).toHaveBeenCalledWith(expect.stringContaining('WHERE (m.sender_id = ? OR m.receiver_id = ?)'), [1, 1, 50, 0]);
      expect(messages).toEqual(mockMessages);
    });
  });

  describe('getChatHistory', () => {
    it('should retrieve chat history between two users', async () => {
      const mockMessages = [
        { id: 1, content: 'Hello', sender_id: 1, receiver_id: 2 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMessages]);

      const messages = await Message.getChatHistory(1, 2);

      expect(mockDbExecute).toHaveBeenCalledWith(expect.stringContaining('WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))'), [1, 2, 2, 1, 50, 0]);
      expect(messages).toEqual(mockMessages.reverse());
    });

    it('should retrieve chat history with before parameter', async () => {
      const mockMessages = [
        { id: 1, content: 'Hello', sender_id: 1, receiver_id: 2 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMessages]);

      const messages = await Message.getChatHistory(1, 2, { before: 100 });

      expect(mockDbExecute).toHaveBeenCalledWith(expect.stringContaining('AND m.id < ?'), [1, 2, 2, 1, 100, 50, 0]);
      expect(messages).toEqual(mockMessages.reverse());
    });
  });

  describe('getGroupMessages', () => {
    it('should retrieve messages for a group', async () => {
      const mockMessages = [
        { id: 1, content: 'Hello in group', sender_id: 1, group_id: 5 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMessages]);

      const messages = await Message.getGroupMessages(5);

      expect(mockDbExecute).toHaveBeenCalledWith(expect.stringContaining('WHERE m.group_id = ?'), [5, 50, 0]);
      expect(messages).toEqual(mockMessages.reverse());
    });

    it('should retrieve group messages with before parameter', async () => {
      const mockMessages = [
        { id: 1, content: 'Hello in group', sender_id: 1, group_id: 5 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMessages]);

      const messages = await Message.getGroupMessages(5, { before: 100 });

      expect(mockDbExecute).toHaveBeenCalledWith(expect.stringContaining('AND m.id < ?'), [5, 100, 50, 0]);
      expect(messages).toEqual(mockMessages.reverse());
    });
  });

  describe('create', () => {
    it('should create a new message', async () => {
      const messageData = {
        sender_id: 1,
        receiver_id: 2,
        content: 'Hello world',
        message_type: 'text',
        media_id: null,
        reply_to_id: null,
        is_forwarded: false
      };
      
      const mockInsertResult = { insertId: 123 };
      mockDbExecute.mockResolvedValueOnce([mockInsertResult]);

      const newMessage = await Message.create(messageData);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO messages'),
        [1, 2, null, 'Hello world', 'text', null, null, false]
      );
      expect(newMessage.id).toBe(123);
      expect(newMessage.sender_id).toBe(1);
      expect(newMessage.receiver_id).toBe(2);
      expect(newMessage.content).toBe('Hello world');
      expect(newMessage.status).toBe('sent');
    });

    it('should create a group message', async () => {
      const messageData = {
        sender_id: 1,
        group_id: 5,
        content: 'Hello group',
        message_type: 'text'
      };
      
      const mockInsertResult = { insertId: 124 };
      mockDbExecute.mockResolvedValueOnce([mockInsertResult]);

      const newMessage = await Message.create(messageData);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO messages'),
        [1, null, 5, 'Hello group', 'text', null, null, false]
      );
      expect(newMessage.id).toBe(124);
      expect(newMessage.sender_id).toBe(1);
      expect(newMessage.group_id).toBe(5);
      expect(newMessage.status).toBe('sent');
    });
  });

  describe('updateStatus', () => {
    it('should update message status to delivered', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await Message.updateStatus(1, 'delivered');

      expect(mockDbExecute).toHaveBeenCalledWith(
        'UPDATE messages SET status = ?, delivered_at = NOW() WHERE id = ?',
        ['delivered', 1]
      );
      expect(result).toBe(true);
    });

    it('should update message status to read', async () => {
      mockDbExecute
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await Message.updateStatus(1, 'read', 2);

      expect(mockDbExecute).toHaveBeenNthCalledWith(1,
        'UPDATE messages SET status = ?, read_at = NOW() WHERE id = ?',
        ['read', 1]
      );
      expect(mockDbExecute).toHaveBeenNthCalledWith(2,
        'INSERT IGNORE INTO message_read_status (message_id, user_id) VALUES (?, ?)',
        [1, 2]
      );
      expect(result).toBe(true);
    });
  });

  describe('markAsDelivered', () => {
    it('should mark multiple messages as delivered', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 2 }]);

      const result = await Message.markAsDelivered([1, 2, 3], 2);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE messages'),
        [...[1, 2, 3], 2]
      );
      expect(result).toBe(2);
    });

    it('should return if no message IDs provided', async () => {
      const result = await Message.markAsDelivered([], 2);

      expect(mockDbExecute).not.toHaveBeenCalled();
      expect(result).toBe(undefined);
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 2 }]);

      const result = await Message.markAsRead(1, 2);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE messages'),
        [1, 2]
      );
      expect(result).toBe(2);
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread message counts', async () => {
      const mockCounts = [
        { sender_id: 2, count: 3 },
        { sender_id: 3, count: 1 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockCounts]);

      const counts = await Message.getUnreadCount(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT sender_id'),
        [1]
      );
      expect(counts).toEqual(mockCounts);
    });
  });

  describe('edit', () => {
    it('should edit a message', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await Message.edit(1, 1, 'Updated content');

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE messages'),
        ['Updated content', 1, 1]
      );
      expect(result).toBe(true);
    });

    it('should return false if no rows were affected', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const result = await Message.edit(1, 1, 'Updated content');

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should soft delete a message for everyone', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await Message.delete(1, 1, true);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE messages'),
        [true, 1, 1]
      );
      expect(result).toBe(true);
    });

    it('should soft delete a message for sender only', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await Message.delete(1, 1, false);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE messages'),
        [false, 1, 1]
      );
      expect(result).toBe(true);
    });
  });

  describe('findById', () => {
    it('should find a message by ID', async () => {
      const mockMessage = { id: 1, content: 'Hello', sender_id: 1, sender_name: 'John' };
      
      mockDbExecute.mockResolvedValueOnce([[mockMessage]]);

      const message = await Message.findById(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT m.*'),
        [1]
      );
      expect(message).toEqual(mockMessage);
    });
  });

  describe('search', () => {
    it('should search messages by content', async () => {
      const mockResults = [
        { id: 1, content: 'Hello world', sender_name: 'John' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockResults]);

      const results = await Message.search(1, 'hello');

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE (m.sender_id = ? OR m.receiver_id = ?)'),
        [1, 1, '%hello%', 20, 0]
      );
      expect(results).toEqual(mockResults);
    });
  });

  describe('getRecentConversations', () => {
    it('should get recent conversations for a user', async () => {
      const mockConversations = [
        { contact_id: 2, username: 'Jane', last_message: 'Hi there' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockConversations]);

      const conversations = await Message.getRecentConversations(1);

      expect(mockDbExecute).toHaveBeenCalledWith(expect.stringContaining('ORDER BY m.created_at DESC'), [1, 1, 1, 1, 1, 20]);
      expect(conversations).toEqual(mockConversations);
    });
  });
});
