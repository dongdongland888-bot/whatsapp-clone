/**
 * Unit tests for Call model
 */
const Call = require('../../models/Call');
const db = require('../../config/db');

// Mock the database
jest.mock('../../config/db');

describe('Call Model', () => {
  let mockDbExecute;

  beforeEach(() => {
    mockDbExecute = jest.fn();
    db.execute = mockDbExecute;
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new call record', async () => {
      const callData = {
        caller_id: 1,
        receiver_id: 2,
        call_type: 'voice'
      };
      
      const mockInsertResult = { insertId: 123 };
      mockDbExecute.mockResolvedValueOnce([mockInsertResult]);

      const newCall = await Call.create(callData);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'INSERT INTO calls (caller_id, receiver_id, call_type, status, started_at) VALUES (?, ?, ?, \'ringing\', NOW())',
        [1, 2, 'voice']
      );
      expect(newCall).toEqual({
        id: 123,
        caller_id: 1,
        receiver_id: 2,
        call_type: 'voice',
        status: 'ringing',
        started_at: expect.any(Date)
      });
    });
  });

  describe('findById', () => {
    it('should find a call by ID', async () => {
      const mockCall = { id: 1, caller_id: 1, receiver_id: 2, call_type: 'voice', status: 'ringing' };
      
      mockDbExecute.mockResolvedValueOnce([[mockCall]]);

      const call = await Call.findById(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'SELECT * FROM calls WHERE id = ?',
        [1]
      );
      expect(call).toEqual(mockCall);
    });
  });

  describe('updateStatus', () => {
    it('should update call status', async () => {
      await Call.updateStatus(1, 'connected');

      expect(mockDbExecute).toHaveBeenCalledWith(
        'UPDATE calls SET status = ? WHERE id = ?',
        ['connected', 1]
      );
    });
  });

  describe('endCall', () => {
    it('should end a call and calculate duration', async () => {
      const startedAt = new Date(Date.now() - 120000); // 2 minutes ago
      mockDbExecute
        .mockResolvedValueOnce([[{ started_at: startedAt }]]) // select call
        .mockResolvedValueOnce([{}]); // update call

      const result = await Call.endCall(1);

      expect(mockDbExecute).toHaveBeenNthCalledWith(1,
        'SELECT started_at FROM calls WHERE id = ?',
        [1]
      );
      expect(mockDbExecute).toHaveBeenNthCalledWith(2,
        'UPDATE calls SET ended_at = NOW(), duration = ?, status = "ended" WHERE id = ?',
        [expect.any(Number), 1] // Duration should be around 120 seconds
      );
      expect(result).toEqual({
        id: 1,
        duration: expect.any(Number),
        ended_at: expect.any(Date)
      });
    });

    it('should return null if call does not exist', async () => {
      mockDbExecute.mockResolvedValueOnce([[]]);

      const result = await Call.endCall(999);

      expect(result).toBeNull();
    });
  });

  describe('getCallHistory', () => {
    it('should retrieve call history for a user', async () => {
      const mockCalls = [
        { id: 1, caller_id: 1, receiver_id: 2, call_type: 'voice', status: 'ended' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockCalls]);

      const calls = await Call.getCallHistory(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.caller_id = ? OR c.receiver_id = ? ORDER BY c.started_at DESC LIMIT ?'),
        [1, 1, 50]
      );
      expect(calls).toEqual(mockCalls);
    });

    it('should retrieve call history with custom limit', async () => {
      const mockCalls = [
        { id: 1, caller_id: 1, receiver_id: 2, call_type: 'voice', status: 'ended' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockCalls]);

      const calls = await Call.getCallHistory(1, 10);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.caller_id = ? OR c.receiver_id = ? ORDER BY c.started_at DESC LIMIT ?'),
        [1, 1, 10]
      );
      expect(calls).toEqual(mockCalls);
    });
  });

  describe('getCallsBetweenUsers', () => {
    it('should retrieve calls between two users', async () => {
      const mockCalls = [
        { id: 1, caller_id: 1, receiver_id: 2, call_type: 'video', status: 'ended' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockCalls]);

      const calls = await Call.getCallsBetweenUsers(1, 2);

      expect(mockDbExecute).toHaveBeenCalledWith(
        'SELECT * FROM calls WHERE (caller_id = ? AND receiver_id = ?) OR (caller_id = ? AND receiver_id = ?) ORDER BY started_at DESC LIMIT ?',
        [1, 2, 2, 1, 20]
      );
      expect(calls).toEqual(mockCalls);
    });
  });

  describe('getMissedCalls', () => {
    it('should retrieve missed calls for a user', async () => {
      const mockCalls = [
        { id: 1, caller_id: 2, receiver_id: 1, status: 'missed' }
      ];
      
      mockDbExecute.mockResolvedValueOnce([mockCalls]);

      const calls = await Call.getMissedCalls(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE c.receiver_id = ? AND c.status IN (\'missed\', \'declined\') ORDER BY c.started_at DESC'),
        [1]
      );
      expect(calls).toEqual(mockCalls);
    });
  });

  describe('getCallStats', () => {
    it('should retrieve call statistics for a user', async () => {
      const mockStats = {
        total_calls: 10,
        outgoing_calls: 6,
        incoming_calls: 4,
        total_duration: 1200, // 20 minutes in seconds
        video_calls: 3,
        voice_calls: 7
      };
      
      mockDbExecute.mockResolvedValueOnce([mockStats]);

      const stats = await Call.getCallStats(1);

      expect(mockDbExecute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE caller_id = ? OR receiver_id = ?'),
        [1, 1, 1, 1]
      );
      expect(stats).toEqual(mockStats);
    });
  });
});