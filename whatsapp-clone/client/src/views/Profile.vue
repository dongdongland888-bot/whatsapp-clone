<template>
  <div class="profile-container">
    <div class="profile-header">
      <div class="profile-avatar">
        <img :src="currentUser.avatar || '/default-avatar.png'" alt="Avatar" />
        <div class="change-avatar" @click="changeAvatar">
          <i class="icon-camera"></i>
        </div>
      </div>
      <h2>{{ currentUser.username }}</h2>
      <p>{{ currentUser.email }}</p>
    </div>

    <!-- Settings Tabs -->
    <div class="settings-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon" v-html="tab.icon"></span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- General Settings -->
      <div v-if="activeTab === 'general'" class="profile-settings">
        <div class="setting-item">
          <div class="setting-label">Theme</div>
          <div class="setting-value">
            <select v-model="theme" @change="updateTheme">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-label">Language</div>
          <div class="setting-value">
            <select v-model="language">
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="es">Español</option>
            </select>
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

        <div class="setting-item">
          <div class="setting-label">Read Receipts</div>
          <div class="setting-value">
            <label class="switch">
              <input type="checkbox" v-model="readReceipts" />
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-label">Last Seen</div>
          <div class="setting-value">
            <label class="switch">
              <input type="checkbox" v-model="showLastSeen" />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Notifications Tab -->
      <div v-if="activeTab === 'notifications'">
        <NotificationSettings />
      </div>

      <!-- Account Tab -->
      <div v-if="activeTab === 'account'" class="account-settings">
        <div class="setting-section">
          <h4>Account Information</h4>
          
          <div class="setting-item">
            <div class="setting-label">Email</div>
            <div class="setting-value readonly">{{ currentUser.email }}</div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">Phone</div>
            <div class="setting-value readonly">{{ currentUser.phone || 'Not set' }}</div>
          </div>
          
          <div class="setting-item">
            <div class="setting-label">Member Since</div>
            <div class="setting-value readonly">{{ formatDate(currentUser.created_at) }}</div>
          </div>
        </div>

        <div class="setting-section">
          <h4>Security</h4>
          
          <button class="btn btn-outline" @click="changePassword">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Change Password
          </button>
          
          <button class="btn btn-outline" @click="enable2FA">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Two-Factor Authentication
          </button>
          
          <button class="btn btn-outline" @click="viewSessions">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            Active Sessions
          </button>
        </div>

        <div class="setting-section danger-zone">
          <h4>Danger Zone</h4>
          
          <button class="btn btn-danger-outline" @click="confirmDeleteAccount">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Delete Account
          </button>
        </div>
      </div>

      <!-- Storage Tab -->
      <div v-if="activeTab === 'storage'" class="storage-settings">
        <div class="storage-overview">
          <div class="storage-chart">
            <svg viewBox="0 0 36 36" class="circular-chart">
              <path class="circle-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path class="circle"
                :stroke-dasharray="`${storageUsedPercent}, 100`"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <text x="18" y="20.35" class="percentage">{{ storageUsedPercent }}%</text>
            </svg>
          </div>
          <div class="storage-info">
            <h4>Storage Used</h4>
            <p>{{ formatBytes(storageUsed) }} of {{ formatBytes(storageTotal) }}</p>
          </div>
        </div>

        <div class="storage-breakdown">
          <div class="storage-item">
            <div class="item-info">
              <span class="item-icon photos">📷</span>
              <span class="item-label">Photos</span>
            </div>
            <span class="item-size">{{ formatBytes(storageBreakdown.photos) }}</span>
          </div>
          
          <div class="storage-item">
            <div class="item-info">
              <span class="item-icon videos">🎬</span>
              <span class="item-label">Videos</span>
            </div>
            <span class="item-size">{{ formatBytes(storageBreakdown.videos) }}</span>
          </div>
          
          <div class="storage-item">
            <div class="item-info">
              <span class="item-icon audio">🎵</span>
              <span class="item-label">Audio</span>
            </div>
            <span class="item-size">{{ formatBytes(storageBreakdown.audio) }}</span>
          </div>
          
          <div class="storage-item">
            <div class="item-info">
              <span class="item-icon documents">📄</span>
              <span class="item-label">Documents</span>
            </div>
            <span class="item-size">{{ formatBytes(storageBreakdown.documents) }}</span>
          </div>
        </div>

        <button class="btn btn-outline clear-cache-btn" @click="clearCache">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Clear Cache
        </button>
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
import NotificationSettings from '@/components/NotificationSettings.vue';

export default {
  name: 'Profile',
  components: {
    NotificationSettings
  },
  setup() {
    const store = useStore();
    const router = useRouter();
    
    // Tab state
    const activeTab = ref('general');
    const tabs = [
      { 
        id: 'general', 
        label: 'General',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
      },
      { 
        id: 'notifications', 
        label: 'Notifications',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'
      },
      { 
        id: 'account', 
        label: 'Account',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
      },
      { 
        id: 'storage', 
        label: 'Storage',
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>'
      }
    ];
    
    // General settings
    const theme = ref('light');
    const language = ref('en');
    const notificationsEnabled = ref(true);
    const privacySetting = ref('everyone');
    const statusMessage = ref('');
    const readReceipts = ref(true);
    const showLastSeen = ref(true);
    
    // Storage info
    const storageUsed = ref(256 * 1024 * 1024); // Mock: 256MB
    const storageTotal = ref(1024 * 1024 * 1024); // Mock: 1GB
    const storageBreakdown = ref({
      photos: 120 * 1024 * 1024,
      videos: 80 * 1024 * 1024,
      audio: 30 * 1024 * 1024,
      documents: 26 * 1024 * 1024
    });
    
    const storageUsedPercent = computed(() => {
      return Math.round((storageUsed.value / storageTotal.value) * 100);
    });
    
    const currentUser = computed(() => store.getters['auth/currentUser'] || {});
    
    // Methods
    const updateTheme = () => {
      document.documentElement.setAttribute('data-theme', theme.value);
      localStorage.setItem('theme', theme.value);
    };
    
    const formatDate = (dateStr) => {
      if (!dateStr) return 'Unknown';
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };
    
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    const changeAvatar = () => {
      // TODO: Implement avatar change
      console.log('Change avatar');
    };
    
    const changePassword = () => {
      // TODO: Implement password change
      console.log('Change password');
    };
    
    const enable2FA = () => {
      // TODO: Implement 2FA
      console.log('Enable 2FA');
    };
    
    const viewSessions = () => {
      // TODO: Implement session viewer
      console.log('View sessions');
    };
    
    const confirmDeleteAccount = () => {
      if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        // TODO: Implement account deletion
        console.log('Delete account');
      }
    };
    
    const clearCache = () => {
      if (confirm('This will clear all cached data. Continue?')) {
        // TODO: Implement cache clearing
        console.log('Clear cache');
      }
    };
    
    const updateProfile = async () => {
      try {
        // In a real app, this would update the user profile in the backend
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
      // Load saved theme
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        theme.value = savedTheme;
      }
    });
    
    return {
      activeTab,
      tabs,
      theme,
      language,
      notificationsEnabled,
      privacySetting,
      statusMessage,
      readReceipts,
      showLastSeen,
      storageUsed,
      storageTotal,
      storageBreakdown,
      storageUsedPercent,
      currentUser,
      updateTheme,
      formatDate,
      formatBytes,
      changeAvatar,
      changePassword,
      enable2FA,
      viewSessions,
      confirmDeleteAccount,
      clearCache,
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
  
  .settings-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    overflow-x: auto;
    padding-bottom: 4px;
    
    .tab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border: none;
      border-radius: 20px;
      background: #f0f2f5;
      color: #54656f;
      font-size: 14px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
      
      &:hover {
        background: #e0e2e5;
      }
      
      &.active {
        background: #00a884;
        color: white;
        
        .tab-icon :deep(svg) {
          stroke: white;
        }
      }
      
      .tab-icon {
        display: flex;
        align-items: center;
        
        :deep(svg) {
          stroke: #54656f;
        }
      }
    }
  }
  
  .tab-content {
    min-height: 300px;
  }
  
  .profile-settings,
  .account-settings,
  .storage-settings {
    background: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .setting-section {
    margin-bottom: 24px;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    h4 {
      font-size: 14px;
      font-weight: 600;
      color: #00a884;
      text-transform: uppercase;
      margin: 0 0 16px;
    }
    
    &.danger-zone {
      h4 {
        color: #dc3545;
      }
    }
    
    .btn {
      width: 100%;
      margin-bottom: 12px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
  
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
      &.readonly {
        color: #667781;
        font-size: 14px;
      }
      
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
  
  .storage-overview {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-bottom: 24px;
    
    .storage-chart {
      width: 100px;
      height: 100px;
      
      .circular-chart {
        display: block;
        max-width: 100%;
        max-height: 100%;
        
        .circle-bg {
          fill: none;
          stroke: #f0f2f5;
          stroke-width: 3;
        }
        
        .circle {
          fill: none;
          stroke: #00a884;
          stroke-width: 3;
          stroke-linecap: round;
          animation: progress 1s ease-out forwards;
        }
        
        .percentage {
          fill: #333;
          font-size: 6px;
          text-anchor: middle;
          font-weight: 600;
        }
      }
    }
    
    .storage-info {
      h4 {
        margin: 0 0 4px;
        font-size: 16px;
        color: #333;
      }
      
      p {
        margin: 0;
        font-size: 14px;
        color: #667781;
      }
    }
  }
  
  @keyframes progress {
    0% {
      stroke-dasharray: 0 100;
    }
  }
  
  .storage-breakdown {
    .storage-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f0f2f5;
      
      &:last-child {
        border-bottom: none;
      }
      
      .item-info {
        display: flex;
        align-items: center;
        gap: 12px;
        
        .item-icon {
          font-size: 20px;
        }
        
        .item-label {
          font-size: 15px;
          color: #333;
        }
      }
      
      .item-size {
        font-size: 14px;
        color: #667781;
      }
    }
  }
  
  .clear-cache-btn {
    margin-top: 16px;
  }
  
  .btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    
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
    
    &.btn-outline {
      background: transparent;
      border: 1px solid #ddd;
      color: #333;
      
      &:hover {
        background: #f0f2f5;
      }
    }
    
    &.btn-danger-outline {
      background: transparent;
      border: 1px solid #dc3545;
      color: #dc3545;
      
      &:hover {
        background: #fff5f5;
      }
    }
  }
  
  .profile-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    
    .btn {
      flex: 1;
    }
  }
}

// Icon styles
.icon-camera::before { content: "📷"; }
</style>
