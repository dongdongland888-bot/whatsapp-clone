/**
 * API Service
 * Centralized API client with interceptors and error handling
 */

import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      const { status } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect
          localStorage.removeItem('token');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;
        case 403:
          console.error('Access forbidden');
          break;
        case 404:
          console.error('Resource not found');
          break;
        case 500:
          console.error('Server error');
          break;
      }
    } else if (error.request) {
      // Network error
      console.error('Network error - no response received');
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

// Messages API
export const messagesAPI = {
  getMessages: (userId, params = {}) => api.get('/messages', { params: { userId, ...params } }),
  sendMessage: (data) => api.post('/messages', data),
  editMessage: (messageId, content) => api.put(`/messages/${messageId}`, { content }),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
  markAsRead: (messageId) => api.put(`/messages/${messageId}/read`),
  searchMessages: (query, params = {}) => api.get('/messages/search', { params: { query, ...params } })
};

// Contacts API
export const contactsAPI = {
  getContacts: () => api.get('/contacts'),
  searchContacts: (query) => api.get('/contacts/search', { params: { query } }),
  addContact: (userId) => api.post('/contacts', { userId }),
  removeContact: (userId) => api.delete(`/contacts/${userId}`),
  blockContact: (userId) => api.post(`/contacts/${userId}/block`),
  unblockContact: (userId) => api.delete(`/contacts/${userId}/block`)
};

// Groups API
export const groupsAPI = {
  getGroups: () => api.get('/groups'),
  createGroup: (data) => api.post('/groups', data),
  getGroup: (groupId) => api.get(`/groups/${groupId}`),
  updateGroup: (groupId, data) => api.put(`/groups/${groupId}`, data),
  deleteGroup: (groupId) => api.delete(`/groups/${groupId}`),
  getGroupMembers: (groupId) => api.get(`/groups/${groupId}/members`),
  addMember: (groupId, userId) => api.post(`/groups/${groupId}/users/${userId}`),
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/users/${userId}`),
  leaveGroup: (groupId) => api.delete(`/groups/${groupId}/leave`)
};

// Media API
export const mediaAPI = {
  uploadMedia: (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return api.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getMedia: (mediaId) => api.get(`/media/${mediaId}`),
  deleteMedia: (mediaId) => api.delete(`/media/${mediaId}`)
};

// Calls API
export const callsAPI = {
  getCallHistory: (params = {}) => api.get('/calls/history', { params }),
  getCall: (callId) => api.get(`/calls/${callId}`),
  initiateCall: (data) => api.post('/calls/initiate', data),
  endCall: (callId) => api.post(`/calls/${callId}/end`)
};

// Status/Story API
export const statusAPI = {
  getStatuses: () => api.get('/status'),
  createStatus: (data) => api.post('/status', data),
  deleteStatus: (statusId) => api.delete(`/status/${statusId}`),
  viewStatus: (statusId) => api.post(`/status/${statusId}/view`)
};

// Settings API
export const settingsAPI = {
  getSettings: () => api.get('/settings'),
  updateSettings: (data) => api.put('/settings', data),
  getNotificationSettings: () => api.get('/settings/notifications'),
  updateNotificationSettings: (data) => api.put('/settings/notifications', data),
  getPrivacySettings: () => api.get('/settings/privacy'),
  updatePrivacySettings: (data) => api.put('/settings/privacy', data)
};

// Export the base instance for custom requests
export default api;
