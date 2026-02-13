<template>
  <div id="app" :class="{ 'dark-mode': isDark }">
    <div v-if="isLoggedIn" class="app-container">
      <!-- Mobile overlay when sidebar is visible -->
      <transition name="fade">
        <div 
          v-if="showMobileSidebar && isMobile" 
          class="sidebar-overlay"
          @click="closeMobileSidebar"
        ></div>
      </transition>
      
      <!-- Sidebar -->
      <Sidebar 
        :class="{ 'sidebar-visible': showMobileSidebar || !isMobile }"
        @close="closeMobileSidebar"
      />
      
      <!-- Main Content -->
      <div class="main-content">
        <router-view 
          @open-sidebar="openMobileSidebar"
        />
      </div>
    </div>
    <div v-else class="auth-container">
      <Auth />
    </div>
    
    <!-- Video Call Components (全局) -->
    <VideoCall />
    <IncomingCall />
    
    <!-- Global Toast Container -->
    <transition-group name="slide-up" tag="div" class="toast-container">
      <Toast
        v-for="toast in toasts"
        :key="toast.id"
        :type="toast.type"
        :message="toast.message"
        :duration="toast.duration"
        @close="removeToast(toast.id)"
      />
    </transition-group>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, provide } from 'vue';
import { useStore } from 'vuex';
import { useTheme } from './composables/useTheme';
import { useNotifications } from './composables/useNotifications';
import Sidebar from './components/Sidebar.vue';
import Auth from './components/Auth.vue';
import VideoCall from './components/VideoCall.vue';
import IncomingCall from './components/IncomingCall.vue';
import Toast from './components/common/Toast.vue';

export default {
  name: 'App',
  components: {
    Sidebar,
    Auth,
    VideoCall,
    IncomingCall,
    Toast
  },
  setup() {
    const store = useStore();
    const { actualTheme, isDark, initTheme } = useTheme();
    const { requestPermission, showMessageNotification, showCallNotification } = useNotifications();
    
    // Mobile state
    const isMobile = ref(window.innerWidth < 768);
    const showMobileSidebar = ref(true);
    
    // Toast notifications
    const toasts = ref([]);
    let toastId = 0;
    
    const addToast = (message, type = 'info', duration = 3000) => {
      const id = ++toastId;
      toasts.value.push({ id, message, type, duration });
      
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
      
      return id;
    };
    
    const removeToast = (id) => {
      const index = toasts.value.findIndex(t => t.id === id);
      if (index !== -1) {
        toasts.value.splice(index, 1);
      }
    };
    
    // Provide toast functions to children
    provide('toast', { addToast, removeToast });
    
    const isLoggedIn = computed(() => store.state.auth.isLoggedIn);
    
    // Mobile sidebar handlers
    const openMobileSidebar = () => {
      showMobileSidebar.value = true;
    };
    
    const closeMobileSidebar = () => {
      if (isMobile.value) {
        showMobileSidebar.value = false;
      }
    };
    
    // Handle resize
    const handleResize = () => {
      isMobile.value = window.innerWidth < 768;
      if (!isMobile.value) {
        showMobileSidebar.value = true;
      }
    };
    
    // Setup socket event listeners
    const setupSocketListeners = () => {
      const socket = store.state.chat?.socket;
      if (!socket) return;
      
      // 收到来电
      socket.on('incoming-call', (data) => {
        store.dispatch('call/handleIncomingCall', data);
        
        // Show notification
        showCallNotification(
          data.callerName || 'Unknown',
          data.callType || 'video',
          { callerId: data.callerId }
        );
      });
      
      // 通话被接听
      socket.on('call-answered', (data) => {
        store.dispatch('call/handleCallAnswered', data);
      });
      
      // 通话被拒绝
      socket.on('call-declined', (data) => {
        store.dispatch('call/handleCallDeclined', data);
        addToast('Call was declined', 'info');
      });
      
      // 通话结束
      socket.on('call-ended', (data) => {
        store.dispatch('call/handleCallEnded', data);
      });
      
      // ICE candidate
      socket.on('ice-candidate', (data) => {
        store.dispatch('call/handleIceCandidate', data);
      });
      
      // 通话初始化确认
      socket.on('call-initiated', (data) => {
        store.dispatch('call/handleCallInitiated', data);
      });
      
      // 通话失败
      socket.on('call-failed', (data) => {
        store.dispatch('call/handleCallFailed', data);
        addToast('Call failed: ' + (data.reason || 'Unknown error'), 'error');
      });
      
      // New message notification
      socket.on('new-message', (data) => {
        // Don't show notification for own messages or if app is focused
        if (data.senderId === store.getters['auth/currentUser']?.id) return;
        if (document.hasFocus()) return;
        
        showMessageNotification(
          data.senderName || 'New message',
          data.content || 'You have a new message',
          { chatId: data.chatId, senderId: data.senderId }
        );
      });
      
      // Connection status
      socket.on('connect', () => {
        addToast('Connected', 'success', 2000);
      });
      
      socket.on('disconnect', () => {
        addToast('Disconnected. Trying to reconnect...', 'warning', 0);
      });
      
      socket.on('reconnect', () => {
        removeToast(toasts.value.find(t => t.message.includes('Disconnected'))?.id);
        addToast('Reconnected', 'success', 2000);
      });
    };
    
    // Lifecycle
    onMounted(async () => {
      // Initialize theme
      initTheme();
      
      // Request notification permission
      await requestPermission();
      
      // Setup socket listeners
      setupSocketListeners();
      
      // Handle resize
      window.addEventListener('resize', handleResize);
      
      // Handle visibility change for notifications
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          // Clear any pending notifications when app becomes visible
        }
      });
    });
    
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
    });
    
    return {
      isLoggedIn,
      isDark: computed(() => isDark()),
      isMobile,
      showMobileSidebar,
      toasts,
      openMobileSidebar,
      closeMobileSidebar,
      removeToast
    };
  }
};
</script>

<style lang="scss">
#app {
  font-family: var(--font-family);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  overflow: hidden;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  
  .app-container {
    display: flex;
    height: 100%;
    position: relative;
    
    // Sidebar overlay for mobile
    .sidebar-overlay {
      position: fixed;
      inset: 0;
      background-color: var(--bg-modal-overlay);
      z-index: calc(var(--z-sticky) - 1);
    }
    
    // Sidebar positioning
    :deep(.sidebar) {
      // Desktop: always visible
      @media (min-width: 768px) {
        position: relative;
        transform: none;
      }
      
      // Mobile: slide from left
      @media (max-width: 767px) {
        position: fixed;
        left: 0;
        top: 0;
        bottom: 0;
        z-index: var(--z-sticky);
        width: 100%;
        max-width: 400px;
        transform: translateX(-100%);
        transition: transform var(--transition-normal);
        
        &.sidebar-visible {
          transform: translateX(0);
        }
      }
    }
    
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      background-color: var(--bg-secondary);
      min-width: 0;
      position: relative;
      
      // Empty state when no chat selected
      &:empty::after {
        content: 'Select a chat to start messaging';
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--text-secondary);
        font-size: var(--font-size-lg);
      }
    }
  }
  
  .auth-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: var(--bg-secondary);
    padding: 20px;
  }
  
  // Toast container
  .toast-container {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-toast);
    display: flex;
    flex-direction: column-reverse;
    gap: 8px;
    pointer-events: none;
    
    > * {
      pointer-events: auto;
    }
    
    @media (max-width: 767px) {
      bottom: calc(var(--safe-area-inset-bottom) + 20px);
      left: 20px;
      right: 20px;
      transform: none;
    }
  }
}

// Global dark mode transition
html {
  transition: background-color var(--transition-normal);
}

// Prevent FOUC
html:not([data-theme]) {
  visibility: hidden;
}

html[data-theme] {
  visibility: visible;
}
</style>
