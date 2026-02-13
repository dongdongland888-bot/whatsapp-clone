import { ref, onMounted, onUnmounted, computed } from 'vue';

// Singleton state for notifications
const permission = ref('default');
const isSupported = ref(false);
const activeNotifications = ref([]);
let notificationSound = null;

// Initialize support check
if (typeof window !== 'undefined') {
  isSupported.value = 'Notification' in window;
  if (isSupported.value) {
    permission.value = Notification.permission;
  }
}

// Load notification sound
const loadNotificationSound = () => {
  if (!notificationSound && typeof Audio !== 'undefined') {
    try {
      notificationSound = new Audio('/notification.mp3');
      notificationSound.volume = 0.5;
    } catch (e) {
      console.warn('Could not load notification sound:', e);
    }
  }
};

export function useNotifications() {
  // Request notification permission
  const requestPermission = async () => {
    if (!isSupported.value) {
      console.warn('Notifications are not supported in this browser');
      return false;
    }
    
    if (permission.value === 'granted') {
      return true;
    }
    
    if (permission.value === 'denied') {
      console.warn('Notification permission was denied. User must enable it in browser settings.');
      return false;
    }
    
    try {
      const result = await Notification.requestPermission();
      permission.value = result;
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };
  
  // Play notification sound
  const playSound = () => {
    loadNotificationSound();
    if (notificationSound) {
      notificationSound.currentTime = 0;
      notificationSound.play().catch(() => {
        // Autoplay might be blocked
      });
    }
  };
  
  // Show notification
  const showNotification = (title, options = {}) => {
    if (!isSupported.value || permission.value !== 'granted') {
      return null;
    }
    
    // Don't show if document is visible and focused
    if (document.visibilityState === 'visible' && document.hasFocus() && !options.force) {
      return null;
    }
    
    const defaultOptions = {
      icon: '/logo.png',
      badge: '/badge.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      silent: false,
      timestamp: Date.now(),
      ...options
    };
    
    try {
      const notification = new Notification(title, defaultOptions);
      
      // Track active notifications
      activeNotifications.value.push(notification);
      
      // Play sound unless silent
      if (!defaultOptions.silent) {
        playSound();
      }
      
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();
        
        // Remove from active notifications
        const index = activeNotifications.value.indexOf(notification);
        if (index > -1) {
          activeNotifications.value.splice(index, 1);
        }
        
        if (options.onClick) {
          options.onClick(event);
        }
      };
      
      notification.onclose = () => {
        const index = activeNotifications.value.indexOf(notification);
        if (index > -1) {
          activeNotifications.value.splice(index, 1);
        }
        
        if (options.onClose) {
          options.onClose();
        }
      };
      
      notification.onerror = (error) => {
        console.error('Notification error:', error);
        if (options.onError) {
          options.onError(error);
        }
      };
      
      // Auto close after timeout if not interactive
      if (!defaultOptions.requireInteraction) {
        const timeout = options.timeout || 5000;
        setTimeout(() => {
          notification.close();
        }, timeout);
      }
      
      return notification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      return null;
    }
  };
  
  // Show message notification
  const showMessageNotification = (sender, message, options = {}) => {
    const truncatedMessage = typeof message === 'string' 
      ? (message.length > 100 ? message.substring(0, 100) + '...' : message)
      : 'You have a new message';
    
    return showNotification(`New message from ${sender}`, {
      body: truncatedMessage,
      tag: `message-${options.chatId || Date.now()}`,
      renotify: true,
      data: {
        type: 'message',
        chatId: options.chatId,
        senderId: options.senderId
      },
      onClick: () => {
        // Navigate to chat if handler provided
        if (options.onNavigate && options.chatId) {
          options.onNavigate(options.chatId);
        }
      },
      ...options
    });
  };
  
  // Show call notification
  const showCallNotification = (caller, callType, options = {}) => {
    return showNotification(`Incoming ${callType} call`, {
      body: `${caller} is calling you`,
      tag: 'incoming-call',
      requireInteraction: true,
      vibrate: [500, 200, 500, 200, 500],
      data: {
        type: 'call',
        callType,
        callerId: options.callerId
      },
      onClick: () => {
        if (options.onAnswer) {
          options.onAnswer();
        }
      },
      ...options
    });
  };
  
  // Show status notification (typing, online, etc.)
  const showStatusNotification = (title, body, options = {}) => {
    return showNotification(title, {
      body,
      tag: `status-${options.userId || 'general'}`,
      silent: true,
      timeout: 3000,
      ...options
    });
  };
  
  // Close notification by tag
  const closeNotification = (tag) => {
    activeNotifications.value
      .filter(n => n.tag === tag)
      .forEach(n => n.close());
  };
  
  // Close all notifications
  const closeAllNotifications = () => {
    activeNotifications.value.forEach(n => n.close());
    activeNotifications.value = [];
  };
  
  // Check if notifications are enabled
  const isEnabled = computed(() => {
    return isSupported.value && permission.value === 'granted';
  });
  
  // Check if permission is pending
  const isPending = computed(() => {
    return isSupported.value && permission.value === 'default';
  });
  
  // Check if permission is denied
  const isDenied = computed(() => {
    return isSupported.value && permission.value === 'denied';
  });
  
  // Cleanup on unmount
  onUnmounted(() => {
    // Close all notifications when component unmounts
    // closeAllNotifications();
  });
  
  return {
    permission,
    isSupported,
    isEnabled,
    isPending,
    isDenied,
    activeNotifications: computed(() => activeNotifications.value.length),
    requestPermission,
    showNotification,
    showMessageNotification,
    showCallNotification,
    showStatusNotification,
    closeNotification,
    closeAllNotifications,
    playSound
  };
}

// Service worker push subscription helper
export function usePushSubscription() {
  const subscription = ref(null);
  const isSubscribed = ref(false);
  const isLoading = ref(false);
  const error = ref(null);
  
  const subscribe = async (vapidPublicKey) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported');
      error.value = 'Push notifications are not supported in this browser';
      return null;
    }
    
    isLoading.value = true;
    error.value = null;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      let existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        subscription.value = existingSubscription;
        isSubscribed.value = true;
        return existingSubscription;
      }
      
      // Subscribe with VAPID key
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      
      subscription.value = newSubscription;
      isSubscribed.value = true;
      
      return newSubscription;
    } catch (err) {
      console.error('Failed to subscribe to push notifications:', err);
      error.value = err.message || 'Failed to subscribe';
      return null;
    } finally {
      isLoading.value = false;
    }
  };
  
  const unsubscribe = async () => {
    if (!subscription.value) return true;
    
    isLoading.value = true;
    error.value = null;
    
    try {
      await subscription.value.unsubscribe();
      subscription.value = null;
      isSubscribed.value = false;
      return true;
    } catch (err) {
      console.error('Failed to unsubscribe from push notifications:', err);
      error.value = err.message || 'Failed to unsubscribe';
      return false;
    } finally {
      isLoading.value = false;
    }
  };
  
  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator)) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        subscription.value = existingSubscription;
        isSubscribed.value = true;
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  };
  
  // Check subscription status on mount
  onMounted(() => {
    checkSubscription();
  });
  
  return {
    subscription,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    checkSubscription
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// Export a notification settings helper
export function useNotificationSettings() {
  const soundEnabled = ref(localStorage.getItem('notification-sound') !== 'false');
  const vibrationEnabled = ref(localStorage.getItem('notification-vibration') !== 'false');
  const previewEnabled = ref(localStorage.getItem('notification-preview') !== 'false');
  
  const setSoundEnabled = (enabled) => {
    soundEnabled.value = enabled;
    localStorage.setItem('notification-sound', enabled);
  };
  
  const setVibrationEnabled = (enabled) => {
    vibrationEnabled.value = enabled;
    localStorage.setItem('notification-vibration', enabled);
  };
  
  const setPreviewEnabled = (enabled) => {
    previewEnabled.value = enabled;
    localStorage.setItem('notification-preview', enabled);
  };
  
  return {
    soundEnabled,
    vibrationEnabled,
    previewEnabled,
    setSoundEnabled,
    setVibrationEnabled,
    setPreviewEnabled
  };
}
