import axios from 'axios';

const state = {
  groups: [],
  currentGroup: null,
  loading: false,
  error: null
};

const mutations = {
  SET_GROUPS(state, groups) {
    state.groups = groups;
  },
  ADD_GROUP(state, group) {
    state.groups.push(group);
  },
  SET_CURRENT_GROUP(state, group) {
    state.currentGroup = group;
  },
  UPDATE_GROUP(state, updatedGroup) {
    const index = state.groups.findIndex(g => g.id === updatedGroup.id);
    if (index !== -1) {
      state.groups.splice(index, 1, updatedGroup);
    }
  },
  REMOVE_GROUP(state, groupId) {
    state.groups = state.groups.filter(g => g.id !== groupId);
  },
  SET_LOADING(state, loading) {
    state.loading = loading;
  },
  SET_ERROR(state, error) {
    state.error = error;
  }
};

const actions = {
  async fetchGroups({ commit, rootState }) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);
    
    try {
      const response = await axios.get('/api/groups', {
        headers: {
          'Authorization': `Bearer ${rootState.auth?.token}`
        }
      });
      
      commit('SET_GROUPS', response.data.groups || []);
      return response.data.groups;
    } catch (error) {
      console.error('Error fetching groups:', error);
      commit('SET_ERROR', 'Failed to load groups');
      commit('SET_GROUPS', []);
      return [];
    } finally {
      commit('SET_LOADING', false);
    }
  },
  
  async fetchUserGroups({ commit, rootState }, userId) {
    commit('SET_LOADING', true);
    
    try {
      const response = await axios.get(`/api/groups/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${rootState.auth?.token}`
        }
      });
      
      commit('SET_GROUPS', response.data.groups || []);
      return response.data.groups;
    } catch (error) {
      console.error('Error fetching user groups:', error);
      commit('SET_GROUPS', []);
      return [];
    } finally {
      commit('SET_LOADING', false);
    }
  },
  
  async createGroup({ commit, rootState }, groupData) {
    commit('SET_LOADING', true);
    commit('SET_ERROR', null);
    
    try {
      const response = await axios.post('/api/groups', {
        ...groupData,
        creator_id: rootState.auth?.user?.id
      }, {
        headers: {
          'Authorization': `Bearer ${rootState.auth?.token}`
        }
      });
      
      commit('ADD_GROUP', response.data.data);
      return { success: true, group: response.data.data };
    } catch (error) {
      console.error('Error creating group:', error);
      const message = error.response?.data?.message || 'Failed to create group';
      commit('SET_ERROR', message);
      return { success: false, message };
    } finally {
      commit('SET_LOADING', false);
    }
  },
  
  async addMemberToGroup({ commit, dispatch, rootState }, { groupId, userId }) {
    try {
      await axios.post(`/api/groups/${groupId}/users/${userId}`, {}, {
        headers: {
          'Authorization': `Bearer ${rootState.auth?.token}`
        }
      });
      
      // Refresh group data
      dispatch('fetchGroups');
      return { success: true };
    } catch (error) {
      console.error('Error adding member to group:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to add member' };
    }
  },
  
  async removeMemberFromGroup({ commit, dispatch, rootState }, { groupId, userId }) {
    try {
      await axios.delete(`/api/groups/${groupId}/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${rootState.auth?.token}`
        }
      });
      
      // Refresh group data
      dispatch('fetchGroups');
      return { success: true };
    } catch (error) {
      console.error('Error removing member from group:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to remove member' };
    }
  },
  
  async getGroupMembers({ rootState }, groupId) {
    try {
      const response = await axios.get(`/api/groups/${groupId}/members`, {
        headers: {
          'Authorization': `Bearer ${rootState.auth?.token}`
        }
      });
      
      return response.data.members || [];
    } catch (error) {
      console.error('Error getting group members:', error);
      return [];
    }
  },
  
  async leaveGroup({ commit, rootState }, groupId) {
    try {
      await axios.delete(`/api/groups/${groupId}/leave`, {
        headers: {
          'Authorization': `Bearer ${rootState.auth?.token}`
        }
      });
      
      commit('REMOVE_GROUP', groupId);
      return { success: true };
    } catch (error) {
      console.error('Error leaving group:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to leave group' };
    }
  }
};

const getters = {
  allGroups: state => state.groups,
  currentGroup: state => state.currentGroup,
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
