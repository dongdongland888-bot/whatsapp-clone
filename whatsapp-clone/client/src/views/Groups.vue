<template>
  <div class="groups-container">
    <div class="groups-header">
      <h2>Communities</h2>
      <button @click="showCreateModal = true" class="btn btn-primary">
        <i class="icon-add"></i> New Community
      </button>
    </div>

    <div class="groups-list">
      <div 
        v-for="group in groups" 
        :key="group.id"
        class="group-item"
        @click="openGroup(group)"
      >
        <div class="group-avatar">
          <img :src="group.avatar || '/default-group.png'" alt="Group Avatar" />
        </div>
        <div class="group-info">
          <h3>{{ group.name }}</h3>
          <p>{{ group.member_count }} members • {{ group.description || 'No description' }}</p>
        </div>
        <div class="group-actions">
          <i class="icon-chevron-right"></i>
        </div>
      </div>
    </div>

    <!-- Create Group Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Create New Community</h3>
          <button @click="showCreateModal = false" class="btn-close">
            <i class="icon-close"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label for="groupName">Community Name</label>
            <input 
              type="text" 
              id="groupName" 
              v-model="newGroup.name"
              placeholder="Enter community name"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="groupDescription">Description (Optional)</label>
            <textarea 
              id="groupDescription" 
              v-model="newGroup.description"
              placeholder="Enter community description"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="groupAvatar">Avatar (Optional)</label>
            <input 
              type="file" 
              id="groupAvatar" 
              @change="handleFileUpload"
              accept="image/*"
            />
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="showCreateModal = false" class="btn btn-secondary">Cancel</button>
          <button @click="createGroup" class="btn btn-primary" :disabled="!newGroup.name">
            Create Community
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
  name: 'Groups',
  setup() {
    const store = useStore();
    const router = useRouter();
    
    const showCreateModal = ref(false);
    const newGroup = ref({
      name: '',
      description: '',
      avatar: null
    });
    
    const groups = computed(() => store.getters['groups/allGroups']);
    const currentUser = computed(() => store.getters['auth/currentUser']);
    
    const createGroup = async () => {
      if (!newGroup.value.name) return;
      
      const groupData = {
        name: newGroup.value.name,
        description: newGroup.value.description,
        avatar: newGroup.value.avatar
      };
      
      const result = await store.dispatch('groups/createGroup', groupData);
      
      if (result.success) {
        showCreateModal.value = false;
        resetForm();
        // Reload groups
        await store.dispatch('groups/fetchUserGroups', currentUser.value.id);
      } else {
        alert(result.message || 'Failed to create group');
      }
    };
    
    const openGroup = (group) => {
      router.push(`/groups/${group.id}`);
    };
    
    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
        // In a real app, we would upload the file to a server
        // For now, we'll just store the file reference
        newGroup.value.avatar = file;
      }
    };
    
    const resetForm = () => {
      newGroup.value = {
        name: '',
        description: '',
        avatar: null
      };
    };
    
    onMounted(async () => {
      // Load user's groups
      await store.dispatch('groups/fetchUserGroups', currentUser.value.id);
    });
    
    return {
      showCreateModal,
      newGroup,
      groups,
      createGroup,
      openGroup,
      handleFileUpload
    };
  }
};
</script>

<style lang="scss" scoped>
.groups-container {
  padding: 20px;
  
  .groups-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    h2 {
      margin: 0;
      color: #333;
    }
    
    .btn-primary {
      background-color: #00a884;
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      
      &:hover {
        background-color: #069f7d;
      }
      
      i {
        margin-right: 5px;
      }
    }
  }
  
  .groups-list {
    .group-item {
      display: flex;
      align-items: center;
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 8px;
      
      &:hover {
        background-color: #f0f2f5;
      }
      
      .group-avatar {
        width: 50px;
        height: 50px;
        border-radius: 10px;
        overflow: hidden;
        margin-right: 15px;
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
      
      .group-info {
        flex: 1;
        
        h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 500;
        }
        
        p {
          margin: 0;
          font-size: 14px;
          color: #667781;
        }
      }
      
      .group-actions {
        color: #667781;
      }
    }
  }
  
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    
    .modal-content {
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      
      .modal-header {
        padding: 20px;
        border-bottom: 1px solid #f0f2f5;
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        h3 {
          margin: 0;
        }
        
        .btn-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #667781;
          
          &:hover {
            color: #333;
          }
        }
      }
      
      .modal-body {
        padding: 20px;
        
        .form-group {
          margin-bottom: 20px;
          
          label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: #333;
          }
          
          input, textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            
            &:focus {
              outline: none;
              border-color: #00a884;
            }
          }
          
          textarea {
            min-height: 100px;
            resize: vertical;
          }
        }
      }
      
      .modal-footer {
        padding: 20px;
        border-top: 1px solid #f0f2f5;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          
          &.btn-secondary {
            background-color: #f0f2f5;
            color: #333;
            
            &:hover {
              background-color: #e0e2e5;
            }
          }
          
          &.btn-primary {
            background-color: #00a884;
            color: white;
            
            &:hover:not(:disabled) {
              background-color: #069f7d;
            }
            
            &:disabled {
              background-color: #cccccc;
              cursor: not-allowed;
            }
          }
        }
      }
    }
  }
}
</style>