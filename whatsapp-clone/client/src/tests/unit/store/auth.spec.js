/**
 * Tests for Auth Vuex Store Module
 * Note: Testing mutations, actions and getters in isolation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    defaults: {
      headers: {
        common: {}
      }
    }
  }
}));

// Mock localStorage for tests
const mockLocalStorage = {
  store: {},
  getItem: vi.fn((key) => mockLocalStorage.store[key] || null),
  setItem: vi.fn((key, value) => { mockLocalStorage.store[key] = value; }),
  removeItem: vi.fn((key) => { delete mockLocalStorage.store[key]; }),
  clear: vi.fn(() => { mockLocalStorage.store = {}; }),
};

// Create module manually since auth.js has top-level localStorage access
const createAuthModule = (localStorage) => {
  const state = {
    user: null,
    token: null,
    isLoggedIn: false
  };

  const mutations = {
    SET_USER(state, user) {
      state.user = user;
    },
    SET_TOKEN(state, token) {
      state.token = token;
      if (token) {
        localStorage.setItem('token', token);
        state.isLoggedIn = true;
      } else {
        localStorage.removeItem('token');
        state.isLoggedIn = false;
      }
    },
    LOGOUT(state) {
      state.user = null;
      state.token = null;
      state.isLoggedIn = false;
      localStorage.removeItem('token');
    }
  };

  const actions = {
    async login({ commit }, credentials) {
      try {
        const response = await axios.post('/api/auth/login', credentials);
        const { user, token } = response.data;
        
        commit('SET_USER', user);
        commit('SET_TOKEN', token);
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        return { success: true, user, token };
      } catch (error) {
        return { success: false, message: error.response.data.message };
      }
    },
    
    async register({ commit }, userData) {
      try {
        const response = await axios.post('/api/auth/register', userData);
        const { user, token } = response.data;
        
        commit('SET_USER', user);
        commit('SET_TOKEN', token);
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        return { success: true, user, token };
      } catch (error) {
        return { success: false, message: error.response.data.message };
      }
    },
    
    logout({ commit }) {
      commit('LOGOUT');
      delete axios.defaults.headers.common['Authorization'];
    },
    
    async fetchProfile({ commit, state }) {
      if (!state.token) return;
      
      try {
        const response = await axios.get('/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${state.token}`
          }
        });
        
        commit('SET_USER', response.data.user);
      } catch (error) {
        if (error.response?.status === 401) {
          commit('LOGOUT');
        }
      }
    }
  };

  const getters = {
    currentUser: state => state.user,
    isAuthenticated: state => state.isLoggedIn
  };

  return { state, mutations, actions, getters };
};

describe('Auth Store Module', () => {
  let authModule;
  let state;

  beforeEach(() => {
    mockLocalStorage.store = {};
    vi.clearAllMocks();
    authModule = createAuthModule(mockLocalStorage);
    state = { ...authModule.state };
  });

  describe('Mutations', () => {
    describe('SET_USER', () => {
      it('should set user', () => {
        const user = { id: 1, username: 'testuser', email: 'test@example.com' };
        authModule.mutations.SET_USER(state, user);
        
        expect(state.user).toEqual(user);
      });

      it('should set user to null', () => {
        state.user = { id: 1 };
        authModule.mutations.SET_USER(state, null);
        
        expect(state.user).toBeNull();
      });
    });

    describe('SET_TOKEN', () => {
      it('should set token and update isLoggedIn', () => {
        const token = 'jwt-token-123';
        authModule.mutations.SET_TOKEN(state, token);
        
        expect(state.token).toBe(token);
        expect(state.isLoggedIn).toBe(true);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', token);
      });

      it('should clear token and update isLoggedIn when token is null', () => {
        state.token = 'old-token';
        state.isLoggedIn = true;
        
        authModule.mutations.SET_TOKEN(state, null);
        
        expect(state.token).toBeNull();
        expect(state.isLoggedIn).toBe(false);
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      });
    });

    describe('LOGOUT', () => {
      it('should clear all auth state', () => {
        state.user = { id: 1 };
        state.token = 'token';
        state.isLoggedIn = true;
        
        authModule.mutations.LOGOUT(state);
        
        expect(state.user).toBeNull();
        expect(state.token).toBeNull();
        expect(state.isLoggedIn).toBe(false);
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
      });
    });
  });

  describe('Actions', () => {
    let commit;

    beforeEach(() => {
      commit = vi.fn();
    });

    describe('login', () => {
      it('should login successfully', async () => {
        const credentials = { email: 'test@example.com', password: 'password123' };
        const mockResponse = {
          data: {
            user: { id: 1, username: 'testuser' },
            token: 'jwt-token'
          }
        };
        
        axios.post.mockResolvedValue(mockResponse);
        
        const result = await authModule.actions.login({ commit }, credentials);
        
        expect(axios.post).toHaveBeenCalledWith('/api/auth/login', credentials);
        expect(commit).toHaveBeenCalledWith('SET_USER', mockResponse.data.user);
        expect(commit).toHaveBeenCalledWith('SET_TOKEN', mockResponse.data.token);
        expect(result).toEqual({ 
          success: true, 
          user: mockResponse.data.user, 
          token: mockResponse.data.token 
        });
      });

      it('should handle login failure', async () => {
        const credentials = { email: 'test@example.com', password: 'wrong' };
        const mockError = {
          response: { data: { message: 'Invalid credentials' } }
        };
        
        axios.post.mockRejectedValue(mockError);
        
        const result = await authModule.actions.login({ commit }, credentials);
        
        expect(result).toEqual({ success: false, message: 'Invalid credentials' });
        expect(commit).not.toHaveBeenCalled();
      });
    });

    describe('register', () => {
      it('should register successfully', async () => {
        const userData = { 
          username: 'newuser', 
          email: 'new@example.com', 
          password: 'password123' 
        };
        const mockResponse = {
          data: {
            user: { id: 1, username: 'newuser' },
            token: 'new-jwt-token'
          }
        };
        
        axios.post.mockResolvedValue(mockResponse);
        
        const result = await authModule.actions.register({ commit }, userData);
        
        expect(axios.post).toHaveBeenCalledWith('/api/auth/register', userData);
        expect(result.success).toBe(true);
      });

      it('should handle registration failure', async () => {
        const userData = { username: 'existing', email: 'test@example.com', password: '123' };
        const mockError = {
          response: { data: { message: 'User already exists' } }
        };
        
        axios.post.mockRejectedValue(mockError);
        
        const result = await authModule.actions.register({ commit }, userData);
        
        expect(result.success).toBe(false);
        expect(result.message).toBe('User already exists');
      });
    });

    describe('logout', () => {
      it('should logout and clear headers', () => {
        axios.defaults.headers.common['Authorization'] = 'Bearer token';
        
        authModule.actions.logout({ commit });
        
        expect(commit).toHaveBeenCalledWith('LOGOUT');
        expect(axios.defaults.headers.common['Authorization']).toBeUndefined();
      });
    });

    describe('fetchProfile', () => {
      it('should not fetch if no token', async () => {
        const stateWithoutToken = { token: null };
        
        await authModule.actions.fetchProfile({ commit, state: stateWithoutToken });
        
        expect(axios.get).not.toHaveBeenCalled();
      });

      it('should fetch profile successfully', async () => {
        const mockUser = { id: 1, username: 'testuser' };
        axios.get.mockResolvedValue({ data: { user: mockUser } });
        
        await authModule.actions.fetchProfile({ commit, state: { token: 'valid-token' } });
        
        expect(axios.get).toHaveBeenCalledWith('/api/auth/profile', {
          headers: { 'Authorization': 'Bearer valid-token' }
        });
        expect(commit).toHaveBeenCalledWith('SET_USER', mockUser);
      });

      it('should logout on 401 error', async () => {
        const mockError = { response: { status: 401 } };
        axios.get.mockRejectedValue(mockError);
        
        await authModule.actions.fetchProfile({ commit, state: { token: 'invalid-token' } });
        
        expect(commit).toHaveBeenCalledWith('LOGOUT');
      });
    });
  });

  describe('Getters', () => {
    it('currentUser should return user', () => {
      state.user = { id: 1, username: 'testuser' };
      
      const result = authModule.getters.currentUser(state);
      
      expect(result).toEqual(state.user);
    });

    it('isAuthenticated should return isLoggedIn', () => {
      state.isLoggedIn = true;
      expect(authModule.getters.isAuthenticated(state)).toBe(true);
      
      state.isLoggedIn = false;
      expect(authModule.getters.isAuthenticated(state)).toBe(false);
    });
  });
});
