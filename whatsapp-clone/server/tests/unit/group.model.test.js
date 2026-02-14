/**
 * Unit tests for Group model
 */
const Group = require('../../models/Group');
const db = require('../../config/db');

// Mock the database
jest.mock('../../config/db');

describe('Group Model', () => {
  let mockDbExecute;

  beforeEach(() => {
    mockDbExecute = jest.fn();
    db.execute = mockDbExecute;
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should retrieve all groups with member counts', async () => {
      const mockGroups = [
        { id: 1, name: 'Group 1', member_count: 5 },
        { id: 2, name: 'Group 2', member_count: 3 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockGroups]);

      const groups = await Group.findAll();

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN group_members gm')
      );
      expect(groups).toEqual(mockGroups);
    });
  });

  describe('findById', () => {
    it('should find a group by ID', async () => {
      const mockGroup = { id: 1, name: 'Test Group', description: 'A test group' };
      
      mockDbExecute.mockResolvedValueOnce([[mockGroup]]);

      const group = await Group.findById(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'SELECT * FROM groups WHERE id = ?',
        [1]
      );
      expect(group).toEqual(mockGroup);
    });
  });

  describe('create', () => {
    it('should create a new group and add creator as member', async () => {
      const groupData = {
        name: 'New Group',
        description: 'A new group',
        avatar: 'group-avatar.jpg',
        creator_id: 1
      };
      
      const mockInsertResult = { insertId: 123 };
      mockDbExecute
        .mockResolvedValueOnce([mockInsertResult])
        .mockResolvedValueOnce([{}]);

      const newGroup = await Group.create(groupData);

      expect(mockDbExecute).toHaveBeenNthCalledWith(1,
        'INSERT INTO groups (name, description, avatar, creator_id) VALUES (?, ?, ?, ?)',
        ['New Group', 'A new group', 'group-avatar.jpg', 1]
      );
      expect(mockDbExecute).toHaveBeenNthCalledWith(2,
        'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
        [123, 1]
      );
      expect(newGroup).toEqual({
        id: 123,
        name: 'New Group',
        description: 'A new group',
        avatar: 'group-avatar.jpg',
        creator_id: 1
      });
    });

    it('should create a group with default empty avatar if none provided', async () => {
      const groupData = {
        name: 'No Avatar Group',
        description: 'A group without avatar',
        creator_id: 1
      };
      
      const mockInsertResult = { insertId: 124 };
      mockDbExecute
        .mockResolvedValueOnce([mockInsertResult])
        .mockResolvedValueOnce([{}]);

      const newGroup = await Group.create(groupData);

      expect(mockDbExecute).toHaveBeenNthCalledWith(1,
        'INSERT INTO groups (name, description, avatar, creator_id) VALUES (?, ?, ?, ?)',
        ['No Avatar Group', 'A group without avatar', '', 1]
      );
    });
  });

  describe('addUserToGroup', () => {
    it('should add a user to a group', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await Group.addUserToGroup(1, 5);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
        [1, 5]
      );
      expect(result).toBe(true);
    });
  });

  describe('removeUserFromGroup', () => {
    it('should remove a user from a group', async () => {
      mockDbExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await Group.removeUserFromGroup(1, 5);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
        [1, 5]
      );
      expect(result).toBe(true);
    });
  });

  describe('getMembers', () => {
    it('should retrieve members of a group', async () => {
      const mockMembers = [
        { id: 1, username: 'user1', email: 'user1@example.com' },
        { id: 2, username: 'user2', email: 'user2@example.com' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMembers]);

      const members = await Group.getMembers(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('JOIN group_members gm'),
        [1]
      );
      expect(members).toEqual(mockMembers);
    });
  });

  describe('getGroupsByUserId', () => {
    it('should retrieve groups that a user belongs to', async () => {
      const mockGroups = [
        { id: 1, name: 'User Group 1', member_count: 3 },
        { id: 2, name: 'User Group 2', member_count: 5 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockGroups]);

      const groups = await Group.getGroupsByUserId(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE gm.user_id = ?'),
        [1]
      );
      expect(groups).toEqual(mockGroups);
    });
  });
});
