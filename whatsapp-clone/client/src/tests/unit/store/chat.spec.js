/**
 * Tests for Chat Vuex Store Module
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import chatModule from '@/store/modules/chat';

// Mock socket.io-client
vi.mock('socket.io-client', () => ({
  default: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn()
  }))
}));

describe('Chat Store Module', () => {
  let state;

  beforeEach(() => {
    // Fresh state for each test
    state = {
      socket: null,
      messages: [],
      activeChat: null,
      contacts: [],
      isTyping: false,
      typingUsers: [],
      onlineUsers: new Set(),
      loading: false,
      error: null
    };

    vi.clearAllMocks();
  });

  describe('Mutations', () => {
    describe('SET_SOCKET', () => {
      it('should set socket', () => {
        const mockSocket = { id: 'socket-123' };
        chatModule.mutations.SET_SOCKET(state, mockSocket);
        
        expect(state.socket).toBe(mockSocket);
      });
    });

    describe('SET_MESSAGES', () => {
      it('should set messages array', () => {
        const messages = [
          { id: 1, content: 'Hello' },
          { id: 2, content: 'World' }
        ];
        chatModule.mutations.SET_MESSAGES(state, messages);
        
        expect(state.messages).toEqual(messages);
      });

      it('should replace existing messages', () => {
        state.messages = [{ id: 0, content: 'Old' }];
        const newMessages = [{ id: 1, content: 'New' }];
        
        chatModule.mutations.SET_MESSAGES(state, newMessages);
        
        expect(state.messages).toEqual(newMessages);
      });
    });

    describe('ADD_MESSAGE', () => {
      it('should add a new message', () => {
        const message = { id: 1, content: 'Hello' };
        chatModule.mutations.ADD_MESSAGE(state, message);
        
        expect(state.messages).toContainEqual(message);
      });

      it('should not add duplicate message by id', () => {
        state.messages = [{ id: 1, content: 'Hello' }];
        const duplicate = { id: 1, content: 'Hello again' };
        
        chatModule.mutations.ADD_MESSAGE(state, duplicate);
        
        expect(state.messages.length).toBe(1);
      });

      it('should not add duplicate message by tempId', () => {
        state.messages = [{ tempId: 'temp-1', content: 'Hello' }];
        const duplicate = { tempId: 'temp-1', content: 'Hello again' };
        
        chatModule.mutations.ADD_MESSAGE(state, duplicate);
        
        expect(state.messages.length).toBe(1);
      });
    });

    describe('UPDATE_MESSAGE', () => {
      it('should update message by id', () => {
        state.messages = [{ id: 1, content: 'Old', status: 'sending' }];
        
        chatModule.mutations.UPDATE_MESSAGE(state, {
          messageId: 1,
          updates: { content: 'Updated', status: 'sent' }
        });
        
        expect(state.messages[0].content).toBe('Updated');
        expect(state.messages[0].status).toBe('sent');
      });

      it('should update message by tempId', () => {
        state.messages = [{ tempId: 'temp-1', content: 'Old' }];
        
        chatModule.mutations.UPDATE_MESSAGE(state, {
          messageId: 'temp-1',
          updates: { id: 1, content: 'Updated' }
        });
        
        expect(state.messages[0].id).toBe(1);
        expect(state.messages[0].content).toBe('Updated');
      });

      it('should do nothing if message not found', () => {
        state.messages = [{ id: 1, content: 'Original' }];
        
        chatModule.mutations.UPDATE_MESSAGE(state, {
          messageId: 999,
          updates: { content: 'Updated' }
        });
        
        expect(state.messages[0].content).toBe('Original');
      });
    });

    describe('UPDATE_MESSAGE_STATUS', () => {
      it('should update message status', () => {
        state.messages = [{ id: 1, status: 'sending' }];
        
        chatModule.mutations.UPDATE_MESSAGE_STATUS(state, {
          messageId: 1,
          status: 'delivered'
        });
        
        expect(state.messages[0].status).toBe('delivered');
      });

      it('should do nothing if message not found', () => {
        state.messages = [{ id: 1, status: 'sent' }];
        
        chatModule.mutations.UPDATE_MESSAGE_STATUS(state, {
          messageId: 999,
          status: 'delivered'
        });
        
        expect(state.messages[0].status).toBe('sent');
      });
    });

    describe('UPDATE_MESSAGES_READ', () => {
      it('should mark all messages from sender as read', () => {
        state.messages = [
          { id: 1, sender_id: 2, status: 'delivered' },
          { id: 2, sender_id: 2, status: 'sent' },
          { id: 3, sender_id: 3, status: 'delivered' }
        ];
        
        const readAt = new Date().toISOString();
        chatModule.mutations.UPDATE_MESSAGES_READ(state, {
          senderId: 2,
          readAt
        });
        
        expect(state.messages[0].status).toBe('read');
        expect(state.messages[1].status).toBe('read');
        expect(state.messages[2].status).toBe('delivered'); // Different sender
      });

      it('should not update already read messages', () => {
        const originalReadAt = '2024-01-01T00:00:00Z';
        state.messages = [{ id: 1, sender_id: 2, status: 'read', read_at: originalReadAt }];
        
        chatModule.mutations.UPDATE_MESSAGES_READ(state, {
          senderId: 2,
          readAt: new Date().toISOString()
        });
        
        expect(state.messages[0].read_at).toBe(originalReadAt);
      });
    });

    describe('SET_ACTIVE_CHAT', () => {
      it('should set active chat', () => {
        const contact = { id: 1, name: 'John' };
        chatModule.mutations.SET_ACTIVE_CHAT(state, contact);
        
        expect(state.activeChat).toEqual(contact);
      });
    });

    describe('SET_CONTACTS', () => {
      it('should set contacts', () => {
        const contacts = [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' }
        ];
        chatModule.mutations.SET_CONTACTS(state, contacts);
        
        expect(state.contacts).toEqual(contacts);
      });
    });

    describe('Typing Users', () => {
      it('should add typing user', () => {
        chatModule.mutations.ADD_TYPING_USER(state, {
          roomId: 'room-1',
          userId: 1,
          userName: 'John'
        });
        
        expect(state.typingUsers).toHaveLength(1);
        expect(state.typingUsers[0]).toEqual({
          roomId: 'room-1',
          userId: 1,
          userName: 'John'
        });
      });

      it('should not add duplicate typing user', () => {
        chatModule.mutations.ADD_TYPING_USER(state, {
          roomId: 'room-1',
          userId: 1,
          userName: 'John'
        });
        chatModule.mutations.ADD_TYPING_USER(state, {
          roomId: 'room-1',
          userId: 1,
          userName: 'John'
        });
        
        expect(state.typingUsers).toHaveLength(1);
      });

      it('should remove typing user', () => {
        state.typingUsers = [
          { roomId: 'room-1', userId: 1, userName: 'John' },
          { roomId: 'room-1', userId: 2, userName: 'Jane' }
        ];
        
        chatModule.mutations.REMOVE_TYPING_USER(state, {
          roomId: 'room-1',
          userId: 1
        });
        
        expect(state.typingUsers).toHaveLength(1);
        expect(state.typingUsers[0].userId).toBe(2);
      });
    });

    describe('Online Users', () => {
      it('should set user online', () => {
        chatModule.mutations.SET_USER_ONLINE(state, 1);
        
        expect(state.onlineUsers.has(1)).toBe(true);
      });

      it('should set user offline', () => {
        state.onlineUsers.add(1);
        
        chatModule.mutations.SET_USER_OFFLINE(state, 1);
        
        expect(state.onlineUsers.has(1)).toBe(false);
      });
    });

    describe('Loading and Error', () => {
      it('should set loading', () => {
        chatModule.mutations.SET_LOADING(state, true);
        expect(state.loading).toBe(true);
        
        chatModule.mutations.SET_LOADING(state, false);
        expect(state.loading).toBe(false);
      });

      it('should set error', () => {
        chatModule.mutations.SET_ERROR(state, 'Something went wrong');
        expect(state.error).toBe('Something went wrong');
        
        chatModule.mutations.SET_ERROR(state, null);
        expect(state.error).toBeNull();
      });
    });

    describe('DELETE_MESSAGE', () => {
      it('should delete message by id', () => {
        state.messages = [
          { id: 1, content: 'First' },
          { id: 2, content: 'Second' }
        ];
        
        chatModule.mutations.DELETE_MESSAGE(state, 1);
        
        expect(state.messages).toHaveLength(1);
        expect(state.messages[0].id).toBe(2);
      });

      it('should do nothing if message not found', () => {
        state.messages = [{ id: 1, content: 'First' }];
        
        chatModule.mutations.DELETE_MESSAGE(state, 999);
        
        expect(state.messages).toHaveLength(1);
      });
    });

    describe('PREPEND_MESSAGES', () => {
      it('should prepend messages to existing array', () => {
        state.messages = [{ id: 3, content: 'Recent' }];
        const olderMessages = [
          { id: 1, content: 'Old 1' },
          { id: 2, content: 'Old 2' }
        ];
        
        chatModule.mutations.PREPEND_MESSAGES(state, olderMessages);
        
        expect(state.messages).toHaveLength(3);
        expect(state.messages[0].id).toBe(1);
        expect(state.messages[2].id).toBe(3);
      });
    });
  });

  describe('Getters', () => {
    describe('currentMessages', () => {
      it('should return messages', () => {
        state.messages = [{ id: 1 }, { id: 2 }];
        
        expect(chatModule.getters.currentMessages(state)).toEqual(state.messages);
      });
    });

    describe('activeContact', () => {
      it('should return active chat', () => {
        state.activeChat = { id: 1, name: 'John' };
        
        expect(chatModule.getters.activeContact(state)).toEqual(state.activeChat);
      });
    });

    describe('allContacts', () => {
      it('should return contacts', () => {
        state.contacts = [{ id: 1 }, { id: 2 }];
        
        expect(chatModule.getters.allContacts(state)).toEqual(state.contacts);
      });
    });

    describe('typingUsersInRoom', () => {
      it('should return typing users for specific room', () => {
        state.typingUsers = [
          { roomId: 'room-1', userId: 1, userName: 'John' },
          { roomId: 'room-1', userId: 2, userName: 'Jane' },
          { roomId: 'room-2', userId: 3, userName: 'Bob' }
        ];
        
        const typingInRoom1 = chatModule.getters.typingUsersInRoom(state)('room-1');
        
        expect(typingInRoom1).toEqual(['John', 'Jane']);
      });

      it('should return empty array for room with no typing users', () => {
        state.typingUsers = [];
        
        const typingInRoom1 = chatModule.getters.typingUsersInRoom(state)('room-1');
        
        expect(typingInRoom1).toEqual([]);
      });
    });

    describe('isUserOnline', () => {
      it('should return true for online user', () => {
        state.onlineUsers.add(1);
        
        expect(chatModule.getters.isUserOnline(state)(1)).toBe(true);
      });

      it('should return false for offline user', () => {
        expect(chatModule.getters.isUserOnline(state)(1)).toBe(false);
      });
    });

    describe('isLoading', () => {
      it('should return loading state', () => {
        state.loading = true;
        expect(chatModule.getters.isLoading(state)).toBe(true);
        
        state.loading = false;
        expect(chatModule.getters.isLoading(state)).toBe(false);
      });
    });

    describe('hasError', () => {
      it('should return error', () => {
        state.error = 'Error message';
        expect(chatModule.getters.hasError(state)).toBe('Error message');
        
        state.error = null;
        expect(chatModule.getters.hasError(state)).toBeNull();
      });
    });
  });

  describe('Module Configuration', () => {
    it('should be namespaced', () => {
      expect(chatModule.namespaced).toBe(true);
    });
  });
});
