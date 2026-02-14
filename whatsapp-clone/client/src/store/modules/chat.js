import axios from 'axios';
import io from 'socket.io-client';

const state = {
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

const mutations = {
  SET_SOCKET(state, socket) {
    state.socket = socket;
  },
  SET_MESSAGES(state, messages) {
    state.messages = messages;
  },
  ADD_MESSAGE(state, message) {
    // Avoid duplicates
    const exists = state.messages.some(m => m.id === message.id || m.tempId === message.tempId);
    if (!exists) {
      state.messages.push(message);
    }
  },
  UPDATE_MESSAGE(state, { messageId, updates }) {
    const index = state.messages.findIndex(m => m.id === messageId || m.tempId === messageId);
    if (index !== -1) {
      state.messages[index] = { ...state.messages[index], ...updates };
    }
  },
  UPDATE_MESSAGE_STATUS(state, { messageId, status }) {
    const message = state.messages.find(m => m.id === messageId);
    if (message) {
      message.status = status;
    }
  },
  UPDATE_MESSAGES_READ(state, { senderId, readAt }) {
    // Mark all messages from sender as read
    state.messages.forEach(message => {
      if (message.sender_id === senderId && message.status !== 'read') {
        message.status = 'read';
        message.read_at = readAt;
      }
    });
  },
  SET_ACTIVE_CHAT(state, contact) {
    state.activeChat = contact;
  },
  SET_CONTACTS(state, contacts) {
    state.contacts = contacts;
  },
  SET_TYPING(state, isTyping) {
    state.isTyping = isTyping;
  },
  ADD_TYPING_USER(state, { roomId, userId, userName }) {
    const exists = state.typingUsers.some(u => u.roomId === roomId && u.userId === userId);
    if (!exists) {
      state.typingUsers.push({ roomId, userId, userName });
    }
  },
  REMOVE_TYPING_USER(state, { roomId, userId }) {
    state.typingUsers = state.typingUsers.filter(u => !(u.roomId === roomId && u.userId === userId));
  },
  SET_USER_ONLINE(state, userId) {
    state.onlineUsers.add(userId);
  },
  SET_USER_OFFLINE(state, userId) {
    state.onlineUsers.delete(userId);
  },
  SET_LOADING(state, loading) {
    state.loading = loading;
  },
  SET_ERROR(state, error) {
    state.error = error;
  },
  DELETE_MESSAGE(state, messageId) {
    const index = state.messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      state.messages.splice(index, 1);
    }
  },
  PREPEND_MESSAGES(state, messages) {
    state.messages = [...messages, ...state.messages];
  }
};

const actions = {
  initSocket({ commit, dispatch, rootState }) {
    const socket = io(process.env.VUE_APP_API_URL || 'http://localhost:5000', {
      auth: {
        token: rootState.auth?.token
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    commit('SET_SOCKET', socket);
    
    // Listen for incoming messages
    socket.on('receive-message', (message) => {
      commit('ADD_MESSAGE', message);
      
      // Mark as delivered
      if (message.sender_id !== rootState.auth?.user?.id) {
        socket.emit('message-delivered', { 
          messageId: message.id, 
          senderId: message.sender_id 
        });
      }
    });
    
    // Message sent confirmation
    socket.on('message-sent', ({ tempId, message }) => {
      commit('UPDATE_MESSAGE', { 
        messageId: tempId, 
        updates: { 
          ...message, 
          status: 'sent',
          tempId: undefined 
        } 
      });
    });
    
    // Message delivered
    socket.on('message-delivered-ack', ({ messageId }) => {
      commit('UPDATE_MESSAGE_STATUS', { messageId, status: 'delivered' });
    });
    
    // Message read
    socket.on('message-read-ack', ({ messageId }) => {
      commit('UPDATE_MESSAGE_STATUS', { messageId, status: 'read' });
    });
    
    // All messages read by receiver
    socket.on('messages-read', ({ senderId, readAt }) => {
      commit('UPDATE_MESSAGES_READ', { senderId, readAt });
    });
    
    // Listen for typing indicators
    socket.on('user-typing', (data) => {
      commit('ADD_TYPING_USER', data);
    });
    
    socket.on('user-stopped-typing', (data) => {
      commit('REMOVE_TYPING_USER', data);
    });
    
    // User online status
    socket.on('user-online', (userId) => {
      commit('SET_USER_ONLINE', userId);
    });
    
    socket.on('user-offline', (userId) => {
      commit('SET_USER_OFFLINE', userId);
    });
    
    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected');
      commit('SET_ERROR', null);
    });
    
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      commit('SET_ERROR', 'Connection failed');
    });
    
    // Listen for call events
    socket.on('call-user', (data) => {
      dispatch('handleIncomingCall', data);
    });
    
    socket.on('call-accepted', (signal) => {
      dispatch('handleCallAccepted', signal);
    });
    
    socket.on('call-ended', () => {
      dispatch('handleCallEnded');
    });
    
    return socket;
  },
  
  sendMessage({ state, commit, rootState }, messageData) {
    if (!state.socket) return Promise.reject(new Error('Socket not connected'));
    
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullMessage = {
      ...messageData,
      tempId,
      sender_id: rootState.auth?.user?.id,
      sender_name: rootState.auth?.user?.username,
      sender_avatar: rootState.auth?.user?.avatar,
      created_at: new Date().toISOString(),
      status: 'sending'
    };
    
    // Optimistic update
    commit('ADD_MESSAGE', fullMessage);
    
    return new Promise((resolve, reject) => {
      state.socket.emit('send-message', fullMessage, (response) => {
        if (response?.error) {
          commit('UPDATE_MESSAGE_STATUS', { messageId: tempId, status: 'failed' });
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
      
      // Fallback: update status to sent after timeout
      setTimeout(() => {
        const msg = state.messages.find(m => m.tempId === tempId);
        if (msg && msg.status === 'sending') {
          commit('UPDATE_MESSAGE_STATUS', { messageId: tempId, status: 'sent' });
        }
      }, 1000);
    });
  },
  
  joinChat({ state, commit }, roomId) {
    if (!state.socket) return;
    state.socket.emit('join-room', roomId);
  },
  
  leaveChat({ state }, roomId) {
    if (!state.socket) return;
    state.socket.emit('leave-room', roomId);
  },
  
  startTyping({ state }, data) {
    if (!state.socket) return;
    state.socket.emit('typing-start', data);
  },
  
  stopTyping({ state }, data) {
    if (!state.socket) return;
    state.socket.emit('typing-stop', data);
  },
  
  // Mark messages as read
  markMessagesAsRead({ state, rootState }, { senderId }) {
    if (!state.socket) return;
    
    state.socket.emit('mark-messages-read', {
      senderId,
      readerId: rootState.auth?.user?.id,
      readAt: new Date().toISOString()
    });
  },
  
  async fetchMessages({ commit, rootState }, userId) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);
    
    try {
      const response = await axios.get(`/api/messages?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${rootState.auth?.token}`
        }
      });
      
      commit('SET_MESSAGES', response.data.messages || []);
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      commit('SET_ERROR', 'Failed to load messages');
      throw error;
    } finally {
      commit('SET_LOADING', false);
    }
  },
  
  async fetchMoreMessages({ commit, rootState }, { chatId, before }) {
    try {
      const response = await axios.get(`/api/messages?userId=${chatId}&before=${before}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${rootState.auth?.token}`
        }
      });
      
      if (response.data.messages?.length > 0) {
        commit('PREPEND_MESSAGES', response.data.messages);
      }
      
      return { 
        hasMore: response.data.messages?.length >= 20,
        messages: response.data.messages 
      };
    } catch (error) {
      console.error('Error fetching more messages:', error);
      throw error;
    }
  },
  
  async editMessage({ state, commit, rootState }, { messageId, content }) {
    if (!state.socket) return Promise.reject(new Error('Socket not connected'));
    
    return new Promise((resolve, reject) => {
      state.socket.emit('edit-message', { 
        messageId, 
        content,
        editedAt: new Date().toISOString()
      }, (response) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          commit('UPDATE_MESSAGE', { 
            messageId, 
            updates: { 
              content, 
              edited: true,
              edited_at: new Date().toISOString() 
            } 
          });
          resolve(response);
        }
      });
    });
  },
  
  async deleteMessage({ state, commit }, payload) {
    if (!state.socket) return Promise.reject(new Error('Socket not connected'));
    
    // Support both simple messageId and { messageId, forEveryone } format
    const messageId = typeof payload === 'object' ? payload.messageId : payload;
    const forEveryone = typeof payload === 'object' ? payload.forEveryone : false;
    
    return new Promise((resolve, reject) => {
      state.socket.emit('delete-message', { messageId, forEveryone }, (response) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          commit('DELETE_MESSAGE', messageId);
          resolve(response);
        }
      });
    });
  },
  
  async startCall({ state, rootState }, callData) {
    if (!state.socket) return;
    
    const fullCallData = {
      ...callData,
      from: rootState.auth?.user?.id,
      name: rootState.auth?.user?.username
    };
    
    state.socket.emit('call-user', fullCallData);
  },
  
  acceptCall({ state }, signal) {
    if (!state.socket) return;
    state.socket.emit('accept-call', signal);
  },
  
  endCall({ state }, to) {
    if (!state.socket) return;
    state.socket.emit('end-call', { to });
  },
  
  handleIncomingCall({ commit }, data) {
    console.log('Incoming call from:', data.name);
  },
  
  handleCallAccepted({ commit }, signal) {
    console.log('Call accepted');
  },
  
  handleCallEnded({ commit }) {
    console.log('Call ended');
  },
  
  disconnect({ state, commit }) {
    if (state.socket) {
      state.socket.disconnect();
      commit('SET_SOCKET', null);
    }
  }
};

const getters = {
  currentMessages: state => state.messages,
  activeContact: state => state.activeChat,
  allContacts: state => state.contacts,
  typingUsersInRoom: (state) => (roomId) => {
    return state.typingUsers.filter(u => u.roomId === roomId).map(u => u.userName);
  },
  isUserOnline: (state) => (userId) => state.onlineUsers.has(userId),
  isLoading: state => state.loading,
  hasError: state => state.error
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};
