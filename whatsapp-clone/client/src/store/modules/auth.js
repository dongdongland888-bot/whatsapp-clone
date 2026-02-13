import axios from 'axios';

const state = {
  user: null,
  token: localStorage.getItem('token'),
  isLoggedIn: !!localStorage.getItem('token')
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
      
      // Set default authorization header
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
      
      // Set default authorization header
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
      console.error('Error fetching profile:', error);
      // If token is invalid, logout user
      if (error.response.status === 401) {
        commit('LOGOUT');
      }
    }
  }
};

const getters = {
  currentUser: state => state.user,
  isAuthenticated: state => state.isLoggedIn
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};