<template>
  <div class="profile-container">
    <div class="profile-header">
      <div class="profile-avatar">
        <img :src="currentUser.avatar || '/default-avatar.png'" alt="Avatar" />
        <div class="change-avatar">
          <i class="icon-camera"></i>
        </div>
      </div>
      <h2>{{ currentUser.username }}</h2>
      <p>{{ currentUser.email }}</p>
    </div>

    <div class="profile-settings">
      <div class="setting-item">
        <div class="setting-label">Theme</div>
        <div class="setting-value">
          <select v-model="theme">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">Notifications</div>
        <div class="setting-value">
          <label class="switch">
            <input type="checkbox" v-model="notificationsEnabled" />
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">Privacy</div>
        <div class="setting-value">
          <select v-model="privacySetting">
            <option value="everyone">Everyone</option>
            <option value="contacts">My Contacts</option>
            <option value="nobody">Nobody</option>
          </select>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label">Status</div>
        <div class="setting-value">
          <textarea 
            v-model="statusMessage" 
            placeholder="Set your status..."
            maxlength="100"
          ></textarea>
        </div>
      </div>
    </div>

    <div class="profile-actions">
      <button @click="updateProfile" class="btn btn-primary">Save Changes</button>
      <button @click="logout" class="btn btn-secondary">Logout</button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
  name: 'Profile',
  setup() {
    const store = useStore();
    const router = useRouter();
    
    const theme = ref('light');
    const notificationsEnabled = ref(true);
    const privacySetting = ref('everyone');
    const statusMessage = ref('');
    
    const currentUser = computed(() => store.getters['auth/currentUser']);
    
    const updateProfile = async () => {
      try {
        // In a real app, this would update the user profile in the backend
        // For now, we'll just simulate the update
        
        // Dispatch action to update user profile
        // await store.dispatch('auth/updateProfile', {
        //   username: currentUser.value.username,
        //   avatar: currentUser.value.avatar,
        //   settings: {
        //     theme: theme.value,
        //     notifications: notificationsEnabled.value,
        //     privacy: privacySetting.value,
        //     status: statusMessage.value
        //   }
        // });
        
        alert('Profile updated successfully!');
      } catch (error) {
        console.error('Error updating profile:', error);
        alert('Error updating profile');
      }
    };
    
    const logout = () => {
      store.dispatch('auth/logout');
      router.push('/login');
    };
    
    onMounted(() => {
      // Load current settings
      // In a real app, we would fetch user settings from the backend
      // For now, we'll use default values
    });
    
    return {
      theme,
      notificationsEnabled,
      privacySetting,
      statusMessage,
      currentUser,
      updateProfile,
      logout
    };
  }
};
</script>

<style lang="scss" scoped>
.profile-container {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
  
  .profile-header {
    text-align: center;
    margin-bottom: 30px;
    
    .profile-avatar {
      position: relative;
      width: 120px;
      height: 120px;
      margin: 0 auto 15px;
      
      img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
      }
      
      .change-avatar {
        position: absolute;
        bottom: 0;
        right: 0;
        background-color: #00a884;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: 2px solid white;
        
        &:hover {
          background-color: #069f7d;
        }
      }
    }
    
    h2 {
      margin: 10px 0 5px;
      font-size: 24px;
      color: #333;
    }
    
    p {
      margin: 0;
      color: #667781;
    }
  }
  
  .profile-settings {
    background: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    
    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 0;
      border-bottom: 1px solid #f0f2f5;
      
      &:last-child {
        border-bottom: none;
      }
      
      .setting-label {
        font-weight: 500;
        color: #333;
      }
      
      .setting-value {
        select, textarea {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          
          &:focus {
            outline: none;
            border-color: #00a884;
          }
        }
        
        textarea {
          width: 200px;
          resize: vertical;
          min-height: 60px;
        }
        
        .switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
          
          input {
            opacity: 0;
            width: 0;
            height: 0;
          }
          
          .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 24px;
            
            &::before {
              position: absolute;
              content: "";
              height: 18px;
              width: 18px;
              left: 3px;
              bottom: 3px;
              background-color: white;
              transition: .4s;
              border-radius: 50%;
            }
          }
          
          input:checked + .slider {
            background-color: #00a884;
          }
          
          input:checked + .slider::before {
            transform: translateX(26px);
          }
        }
      }
    }
  }
  
  .profile-actions {
    display: flex;
    gap: 10px;
    
    .btn {
      flex: 1;
      padding: 12px;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      
      &.btn-primary {
        background-color: #00a884;
        color: white;
        
        &:hover {
          background-color: #069f7d;
        }
      }
      
      &.btn-secondary {
        background-color: #f0f2f5;
        color: #333;
        
        &:hover {
          background-color: #e0e2e5;
        }
      }
    }
  }
}
</style>