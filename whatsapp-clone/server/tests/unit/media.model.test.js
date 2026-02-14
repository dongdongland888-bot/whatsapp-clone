/**
 * Unit tests for Media model
 */
const Media = require('../../models/Media');
const db = require('../../config/db');

// Mock the database
jest.mock('../../config/db');
jest.mock('fs').promises;

describe('Media Model', () => {
  let mockDbExecute;
  let mockFsUnlink;

  beforeEach(() => {
    mockDbExecute = jest.fn();
    db.execute = mockDbExecute;
    mockFsUnlink = require('fs').promises.unlink = jest.fn().mockResolvedValue();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new media record', async () => {
      const mediaData = {
        uploader_id: 1,
        file_name: 'image123.jpg',
        original_name: 'photo.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 102400,
        file_path: '/uploads/image123.jpg',
        thumbnail_path: '/uploads/thumb_image123.jpg',
        duration: null,
        width: 800,
        height: 600
      };
      
      const mockInsertResult = { insertId: 123 };
      mockDbExecute.mockResolvedValueOnce([mockInsertResult]);

      const newMedia = await Media.create(mediaData);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO media'),
        [1, 'image123.jpg', 'photo.jpg', 'image', 'image/jpeg', 102400, '/uploads/image123.jpg', '/uploads/thumb_image123.jpg', null, 800, 600]
      );
      expect(newMedia).toEqual({
        id: 123,
        uploader_id: 1,
        file_name: 'image123.jpg',
        original_name: 'photo.jpg',
        file_type: 'image',
        mime_type: 'image/jpeg',
        file_size: 102400,
        file_path: '/uploads/image123.jpg',
        thumbnail_path: '/uploads/thumb_image123.jpg',
        duration: null,
        width: 800,
        height: 600,
        created_at: expect.any(Date)
      });
    });
  });

  describe('findById', () => {
    it('should find media by ID', async () => {
      const mockMedia = { id: 1, file_name: 'image123.jpg', uploader_id: 1 };
      
      mockDbExecute.mockResolvedValueOnce([[mockMedia]]);

      const media = await Media.findById(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'SELECT * FROM media WHERE id = ?',
        [1]
      );
      expect(media).toEqual(mockMedia);
    });
  });

  describe('findByUserId', () => {
    it('should retrieve media for a user', async () => {
      const mockMediaList = [
        { id: 1, file_name: 'image1.jpg', uploader_id: 1 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMediaList]);

      const media = await Media.findByUserId(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'SELECT * FROM media WHERE uploader_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [1, 50, 0]
      );
      expect(media).toEqual(mockMediaList);
    });

    it('should retrieve media for a user filtered by type', async () => {
      const mockMediaList = [
        { id: 1, file_name: 'image1.jpg', uploader_id: 1, file_type: 'image' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMediaList]);

      const media = await Media.findByUserId(1, { type: 'image' });

      expect(mockDbExecute).toHaveBeenCalledWith(
        'SELECT * FROM media WHERE uploader_id = ? AND file_type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [1, 'image', 50, 0]
      );
      expect(media).toEqual(mockMediaList);
    });
  });

  describe('getSharedMedia', () => {
    it('should retrieve media shared in a chat', async () => {
      const mockMediaList = [
        { id: 1, file_name: 'shared_image.jpg', sender_id: 1, message_date: new Date() }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMediaList]);

      const media = await Media.getSharedMedia(1, 2);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ((msg.sender_id = ? AND msg.receiver_id = ?) OR (msg.sender_id = ? AND msg.receiver_id = ?)) AND msg.is_deleted = FALSE ORDER BY msg.created_at DESC LIMIT ? OFFSET ?'),
        [1, 2, 2, 1, 50, 0]
      );
      expect(media).toEqual(mockMediaList);
    });

    it('should retrieve media shared in a chat filtered by type', async () => {
      const mockMediaList = [
        { id: 1, file_name: 'shared_video.mp4', sender_id: 1, message_date: new Date(), file_type: 'video' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMediaList]);

      const media = await Media.getSharedMedia(1, 2, { type: 'video' });

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('AND m.file_type = ? ORDER BY msg.created_at DESC LIMIT ? OFFSET ?'),
        [1, 2, 2, 1, 'video', 50, 0]
      );
      expect(media).toEqual(mockMediaList);
    });
  });

  describe('getGroupMedia', () => {
    it('should retrieve media shared in a group', async () => {
      const mockMediaList = [
        { id: 1, file_name: 'group_photo.jpg', sender_id: 1, sender_name: 'user1', message_date: new Date() }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMediaList]);

      const media = await Media.getGroupMedia(5);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE msg.group_id = ? AND msg.is_deleted = FALSE ORDER BY msg.created_at DESC LIMIT ? OFFSET ?'),
        [5, 50, 0]
      );
      expect(media).toEqual(mockMediaList);
    });

    it('should retrieve group media filtered by type', async () => {
      const mockMediaList = [
        { id: 1, file_name: 'group_doc.pdf', sender_id: 1, sender_name: 'user1', message_date: new Date(), file_type: 'document' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockMediaList]);

      const media = await Media.getGroupMedia(5, { type: 'document' });

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('AND m.file_type = ? ORDER BY msg.created_at DESC LIMIT ? OFFSET ?'),
        [5, 'document', 50, 0]
      );
      expect(media).toEqual(mockMediaList);
    });
  });

  describe('delete', () => {
    it('should delete media record and files', async () => {
      const mockMedia = {
        id: 1,
        file_path: '/uploads/test.jpg',
        thumbnail_path: '/uploads/thumb_test.jpg',
        uploader_id: 1
      };
      
      mockDbExecute
        .mockResolvedValueOnce([[mockMedia]]) // findById
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE query

      const result = await Media.delete(1, 1);

      expect(mockDbExecute).toHaveBeenNthCalledWith(1,
        'SELECT * FROM media WHERE id = ?',
        [1]
      );
      expect(mockFsUnlink).toHaveBeenCalledTimes(2);
      expect(mockFsUnlink).toHaveBeenCalledWith('/uploads/test.jpg');
      expect(mockFsUnlink).toHaveBeenCalledWith('/uploads/thumb_test.jpg');
      expect(mockDbExecute).toHaveBeenNthCalledWith(2,
        'DELETE FROM media WHERE id = ? AND uploader_id = ?',
        [1, 1]
      );
      expect(result).toBe(true);
    });

    it('should return false if media does not exist', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]); // findById returns empty

      const result = await Media.delete(1, 1);

      expect(result).toBe(false);
      expect(mockDbExecute).toHaveBeenCalledTimes(1);
    });

    it('should return false if user does not own the media', async () => {
      const mockMedia = {
        id: 1,
        file_path: '/uploads/test.jpg',
        thumbnail_path: '/uploads/thumb_test.jpg',
        uploader_id: 2 // Different user
      };
      
      mockDbExecute.mockResolvedValueOnce([[mockMedia]]); // findById

      const result = await Media.delete(1, 1); // Trying to delete as user 1

      expect(result).toBe(false);
      expect(mockDbExecute).toHaveBeenCalledTimes(1);
    });

    it('should continue deletion even if file removal fails', async () => {
      const mockMedia = {
        id: 1,
        file_path: '/uploads/test.jpg',
        thumbnail_path: null,
        uploader_id: 1
      };
      
      mockDbExecute
        .mockResolvedValueOnce([[mockMedia]]) // findById
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // DELETE query
      
      mockFsUnlink.mockRejectedValue(new Error('File not found'));

      const result = await Media.delete(1, 1);

      expect(mockFsUnlink).toHaveBeenCalledWith('/uploads/test.jpg');
      expect(mockDbExecute).toHaveBeenNthCalledWith(2,
        'DELETE FROM media WHERE id = ? AND uploader_id = ?',
        [1, 1]
      );
      expect(result).toBe(true);
    });
  });

  describe('getStorageUsage', () => {
    it('should retrieve storage usage for a user', async () => {
      const mockUsage = [
        { file_type: 'image', count: 5, total_size: 512000 },
        { file_type: 'video', count: 2, total_size: 2048000 }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockUsage]);

      const usage = await Media.getStorageUsage(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'SELECT file_type, COUNT(*) as count, SUM(file_size) as total_size FROM media WHERE uploader_id = ? GROUP BY file_type',
        [1]
      );
      expect(usage).toEqual({
        total: 2560000, // 512000 + 2048000
        by_type: {
          image: { count: 5, size: 512000 },
          video: { count: 2, size: 2048000 }
        }
      });
    });
  });

  describe('getFileType', () => {
    it('should determine correct file type from mime type', () => {
      expect(Media.getFileType('image/jpeg')).toBe('image');
      expect(Media.getFileType('image/png')).toBe('image');
      expect(Media.getFileType('video/mp4')).toBe('video');
      expect(Media.getFileType('audio/mpeg')).toBe('audio');
      expect(Media.getFileType('application/pdf')).toBe('document');
    });
  });

  describe('isValidFileType', () => {
    it('should validate file types correctly', () => {
      expect(Media.isValidFileType('image/jpeg')).toBe(true);
      expect(Media.isValidFileType('video/mp4')).toBe(true);
      expect(Media.isValidFileType('application/pdf')).toBe(true);
      expect(Media.isValidFileType('text/plain')).toBe(true);
      expect(Media.isValidFileType('application/octet-stream')).toBe(false);
    });

    it('should validate against specific allowed types', () => {
      expect(Media.isValidFileType('image/jpeg', ['image'])).toBe(true);
      expect(Media.isValidFileType('video/mp4', ['image'])).toBe(false);
      expect(Media.isValidFileType('application/pdf', ['document', 'image'])).toBe(true);
    });
  });

  describe('getMaxFileSize', () => {
    it('should return correct max file size by type', () => {
      expect(Media.getMaxFileSize('image')).toBe(16 * 1024 * 1024); // 16MB
      expect(Media.getMaxFileSize('video')).toBe(64 * 1024 * 1024); // 64MB
      expect(Media.getMaxFileSize('audio')).toBe(16 * 1024 * 1024); // 16MB
      expect(Media.getMaxFileSize('document')).toBe(100 * 1024 * 1024); // 100MB
      expect(Media.getMaxFileSize('unknown')).toBe(16 * 1024 * 1024); // Default
    });
  });
});