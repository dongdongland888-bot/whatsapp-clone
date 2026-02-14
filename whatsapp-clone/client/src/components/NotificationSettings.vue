<template>
  <div class="notification-settings">
    <div class="settings-header">
      <h3>Notification Preferences</h3>
      <p class="description">Customize how you receive notifications</p>
    </div>

    <!-- Master Toggle -->
    <div class="setting-section">
      <div class="setting-item master-toggle">
        <div class="setting-info">
          <div class="setting-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div class="setting-text">
            <span class="label">Enable Notifications</span>
            <span class="sublabel">Master toggle for all notifications</span>
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.enabled" @change="saveSettings" />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <!-- Notification Types -->
    <div class="setting-section" :class="{ disabled: !settings.enabled }">
      <h4 class="section-title">Notification Types</h4>
      
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div class="setting-text">
            <span class="label">Message Notifications</span>
            <span class="sublabel">New messages from contacts</span>
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.messages" :disabled="!settings.enabled" @change="saveSettings" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div class="setting-text">
            <span class="label">Group Notifications</span>
            <span class="sublabel">Messages from group chats</span>
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.groups" :disabled="!settings.enabled" @change="saveSettings" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </div>
          <div class="setting-text">
            <span class="label">Call Notifications</span>
            <span class="sublabel">Incoming calls and missed calls</span>
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.calls" :disabled="!settings.enabled" @change="saveSettings" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div class="setting-text">
            <span class="label">Status Updates</span>
            <span class="sublabel">When contacts post new status</span>
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.status" :disabled="!settings.enabled" @change="saveSettings" />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <!-- Sound & Vibration -->
    <div class="setting-section" :class="{ disabled: !settings.enabled }">
      <h4 class="section-title">Sound & Vibration</h4>
      
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          </div>
          <div class="setting-text">
            <span class="label">Notification Sound</span>
            <span class="sublabel">Play sound for notifications</span>
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.sound" :disabled="!settings.enabled" @change="saveSettings" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="setting-item" v-if="settings.sound">
        <div class="setting-info">
          <div class="setting-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <div class="setting-text">
            <span class="label">Notification Tone</span>
          </div>
        </div>
        <select v-model="settings.tone" :disabled="!settings.enabled" @change="playTonePreview">
          <option value="default">Default</option>
          <option value="chime">Chime</option>
          <option value="bell">Bell</option>
          <option value="ping">Ping</option>
          <option value="pop">Pop</option>
          <option value="none">None</option>
        </select>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
              <line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
          </div>
          <div class="setting-text">
            <span class="label">Vibration</span>
            <span class="sublabel">Vibrate on notifications</span>
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.vibrate" :disabled="!settings.enabled" @change="saveSettings" />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <!-- Preview Settings -->
    <div class="setting-section" :class="{ disabled: !settings.enabled }">
      <h4 class="section-title">Preview</h4>
      
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <div class="setting-text">
            <span class="label">Show Preview</span>
            <span class="sublabel">Display message content in notifications</span>
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.showPreview" :disabled="!settings.enabled" @change="saveSettings" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M20.4 14.5L16 10 4 20"/>
            </svg>
          </div>
          <div class="setting-text">
            <span class="label">Show Media Thumbnails</span>
            <span class="sublabel">Show image/video previews</span>
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.showMedia" :disabled="!settings.enabled || !settings.showPreview" @change="saveSettings" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="setting-text">
            <span class="label">Show Sender Name</span>
            <span class="sublabel">Display who sent the message</span>
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.showSender" :disabled="!settings.enabled" @change="saveSettings" />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <!-- Quiet Hours -->
    <div class="setting-section" :class="{ disabled: !settings.enabled }">
      <h4 class="section-title">Quiet Hours</h4>
      
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </div>
          <div class="setting-text">
            <span class="label">Enable Quiet Hours</span>
            <span class="sublabel">Mute notifications during set hours</span>
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.quietHoursEnabled" :disabled="!settings.enabled" @change="saveSettings" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="time-range" v-if="settings.quietHoursEnabled && settings.enabled">
        <div class="time-input">
          <label>Start</label>
          <input type="time" v-model="settings.quietHoursStart" @change="saveSettings" />
        </div>
        <span class="time-separator">to</span>
        <div class="time-input">
          <label>End</label>
          <input type="time" v-model="settings.quietHoursEnd" @change="saveSettings" />
        </div>
      </div>

      <div class="setting-item" v-if="settings.quietHoursEnabled && settings.enabled">
        <div class="setting-info">
          <div class="setting-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div class="setting-text">
            <span class="label">Allow Urgent Messages</span>
            <span class="sublabel">Still notify for messages marked urgent</span>
          </div>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="settings.allowUrgent" @change="saveSettings" />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <!-- Test Notification -->
    <div class="setting-section">
      <button class="test-notification-btn" @click="sendTestNotification" :disabled="!settings.enabled">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        Send Test Notification
      </button>
    </div>

    <!-- Save Indicator -->
    <Transition name="fade">
      <div v-if="showSaveIndicator" class="save-indicator">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Settings saved
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import { usePushNotifications } from '@/composables/usePushNotifications';

export default {
  name: 'NotificationSettings',
  setup() {
    const { requestPermission, sendNotification } = usePushNotifications();
    
    const showSaveIndicator = ref(false);
    
    // Default settings
    const settings = reactive({
      enabled: true,
      messages: true,
      groups: true,
      calls: true,
      status: false,
      sound: true,
      tone: 'default',
      vibrate: true,
      showPreview: true,
      showMedia: true,
      showSender: true,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      allowUrgent: true
    });
    
    // Load settings from localStorage
    onMounted(() => {
      const savedSettings = localStorage.getItem('notificationSettings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          Object.assign(settings, parsed);
        } catch (e) {
          console.error('Error loading notification settings:', e);
        }
      }
    });
    
    // Save settings to localStorage
    const saveSettings = () => {
      localStorage.setItem('notificationSettings', JSON.stringify(settings));
      
      // Show save indicator
      showSaveIndicator.value = true;
      setTimeout(() => {
        showSaveIndicator.value = false;
      }, 2000);
    };
    
    // Play tone preview
    const playTonePreview = () => {
      if (settings.tone === 'none') return;
      
      // In a real app, you would play actual audio files
      // For now, we'll use the Web Audio API to generate a simple tone
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        // Different tones based on selection
        const frequencies = {
          default: 440,
          chime: 523,
          bell: 659,
          ping: 880,
          pop: 330
        };
        
        oscillator.frequency.value = frequencies[settings.tone] || 440;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        
        // Fade out
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        setTimeout(() => {
          oscillator.stop();
          ctx.close();
        }, 300);
      } catch (e) {
        console.error('Error playing tone preview:', e);
      }
      
      saveSettings();
    };
    
    // Send test notification
    const sendTestNotification = async () => {
      if (!settings.enabled) return;
      
      // Request permission if needed
      const permission = await requestPermission();
      if (permission !== 'granted') {
        alert('Please enable notification permissions in your browser settings.');
        return;
      }
      
      // Send a test notification
      sendNotification('Test Notification', {
        body: settings.showPreview ? 'This is a test message from WhatsApp Clone' : 'New message',
        icon: '/icon-192.png',
        badge: '/badge.png',
        tag: 'test-notification',
        renotify: true,
        silent: !settings.sound
      });
      
      // Vibrate if enabled
      if (settings.vibrate && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    };
    
    return {
      settings,
      showSaveIndicator,
      saveSettings,
      playTonePreview,
      sendTestNotification
    };
  }
};
</script>

<style lang="scss" scoped>
.notification-settings {
  padding: 20px;
  max-width: 500px;
  margin: 0 auto;
  
  .settings-header {
    margin-bottom: 24px;
    
    h3 {
      font-size: 20px;
      font-weight: 600;
      color: var(--text-primary, #111b21);
      margin: 0 0 4px;
    }
    
    .description {
      font-size: 14px;
      color: var(--text-secondary, #667781);
      margin: 0;
    }
  }
  
  .setting-section {
    background: var(--bg-primary, #fff);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
    transition: opacity 0.3s;
    
    &.disabled {
      opacity: 0.5;
      pointer-events: none;
    }
    
    .section-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--primary, #00a884);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 12px;
    }
  }
  
  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid var(--border-light, #e9edef);
    
    &:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    
    &:first-child {
      padding-top: 0;
    }
    
    &.master-toggle {
      padding: 0;
      
      .setting-icon {
        background: var(--primary, #00a884);
        
        svg {
          stroke: #fff;
        }
      }
    }
    
    .setting-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }
    
    .setting-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: var(--bg-secondary, #f0f2f5);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      
      svg {
        stroke: var(--icon-primary, #54656f);
      }
    }
    
    .setting-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      
      .label {
        font-size: 15px;
        font-weight: 500;
        color: var(--text-primary, #111b21);
      }
      
      .sublabel {
        font-size: 13px;
        color: var(--text-secondary, #667781);
      }
    }
    
    select {
      padding: 8px 12px;
      border: 1px solid var(--border-light, #e9edef);
      border-radius: 8px;
      font-size: 14px;
      color: var(--text-primary, #111b21);
      background: var(--bg-primary, #fff);
      cursor: pointer;
      
      &:focus {
        outline: none;
        border-color: var(--primary, #00a884);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
  
  .switch {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 28px;
    flex-shrink: 0;
    
    input {
      opacity: 0;
      width: 0;
      height: 0;
      
      &:checked + .slider {
        background-color: var(--primary, #00a884);
      }
      
      &:checked + .slider::before {
        transform: translateX(22px);
      }
      
      &:disabled + .slider {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
    
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--bg-tertiary, #d1d7db);
      transition: 0.3s;
      border-radius: 28px;
      
      &::before {
        position: absolute;
        content: "";
        height: 22px;
        width: 22px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
    }
  }
  
  .time-range {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    
    .time-input {
      display: flex;
      flex-direction: column;
      gap: 4px;
      
      label {
        font-size: 12px;
        color: var(--text-secondary, #667781);
      }
      
      input[type="time"] {
        padding: 8px 12px;
        border: 1px solid var(--border-light, #e9edef);
        border-radius: 8px;
        font-size: 14px;
        color: var(--text-primary, #111b21);
        
        &:focus {
          outline: none;
          border-color: var(--primary, #00a884);
        }
      }
    }
    
    .time-separator {
      color: var(--text-secondary, #667781);
      font-size: 14px;
      margin-top: 20px;
    }
  }
  
  .test-notification-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 20px;
    background: var(--bg-secondary, #f0f2f5);
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary, #111b21);
    cursor: pointer;
    transition: background 0.2s;
    
    &:hover:not(:disabled) {
      background: var(--bg-tertiary, #e9edef);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    svg {
      stroke: var(--icon-primary, #54656f);
    }
  }
  
  .save-indicator {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--primary, #00a884);
    color: white;
    padding: 10px 20px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    
    svg {
      stroke: white;
    }
  }
}

// Transitions
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// Dark mode support
.dark-mode .notification-settings {
  .settings-header {
    h3 {
      color: #e9edef;
    }
    
    .description {
      color: #8696a0;
    }
  }
  
  .setting-section {
    background: #202c33;
  }
  
  .setting-item {
    border-bottom-color: #2a3942;
    
    .setting-icon {
      background: #2a3942;
      
      svg {
        stroke: #8696a0;
      }
    }
    
    .setting-text {
      .label {
        color: #e9edef;
      }
      
      .sublabel {
        color: #8696a0;
      }
    }
    
    select {
      background: #2a3942;
      border-color: #3b4a54;
      color: #e9edef;
    }
  }
  
  .switch .slider {
    background-color: #3b4a54;
  }
  
  .time-range {
    .time-input {
      input[type="time"] {
        background: #2a3942;
        border-color: #3b4a54;
        color: #e9edef;
      }
    }
  }
  
  .test-notification-btn {
    background: #2a3942;
    color: #e9edef;
    
    &:hover:not(:disabled) {
      background: #3b4a54;
    }
  }
}
</style>
