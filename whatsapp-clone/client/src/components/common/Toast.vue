<template>
  <teleport to="body">
    <transition-group name="toast" tag="div" class="toast-container">
      <div 
        v-for="toast in toasts"
        :key="toast.id"
        :class="['toast', `toast-${toast.type}`]"
      >
        <div class="toast-icon">
          <!-- Success -->
          <svg v-if="toast.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <!-- Error -->
          <svg v-else-if="toast.type === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <!-- Warning -->
          <svg v-else-if="toast.type === 'warning'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <!-- Info -->
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </div>
        <div class="toast-content">
          <p class="toast-message">{{ toast.message }}</p>
          <p v-if="toast.description" class="toast-description">{{ toast.description }}</p>
        </div>
        <button v-if="toast.dismissible !== false" class="toast-close" @click="removeToast(toast.id)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <!-- Progress bar -->
        <div v-if="toast.duration" class="toast-progress" :style="{ animationDuration: toast.duration + 'ms' }"></div>
      </div>
    </transition-group>
  </teleport>
</template>

<script>
import { ref, reactive } from 'vue';

// Global toast state
const toasts = reactive([]);
let toastId = 0;

// Toast manager
export const toast = {
  show(options) {
    const id = ++toastId;
    const toastItem = {
      id,
      type: options.type || 'info',
      message: options.message || '',
      description: options.description,
      duration: options.duration ?? 4000,
      dismissible: options.dismissible ?? true
    };
    
    toasts.push(toastItem);
    
    if (toastItem.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, toastItem.duration);
    }
    
    return id;
  },
  
  success(message, options = {}) {
    return this.show({ ...options, type: 'success', message });
  },
  
  error(message, options = {}) {
    return this.show({ ...options, type: 'error', message });
  },
  
  warning(message, options = {}) {
    return this.show({ ...options, type: 'warning', message });
  },
  
  info(message, options = {}) {
    return this.show({ ...options, type: 'info', message });
  },
  
  dismiss(id) {
    const index = toasts.findIndex(t => t.id === id);
    if (index > -1) {
      toasts.splice(index, 1);
    }
  },
  
  dismissAll() {
    toasts.splice(0, toasts.length);
  }
};

export default {
  name: 'Toast',
  setup() {
    const removeToast = (id) => {
      toast.dismiss(id);
    };
    
    return {
      toasts,
      removeToast
    };
  }
};
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-toast, 400);
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
  width: calc(100% - 32px);
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-panel, white);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-lg, 0 4px 16px rgba(0, 0, 0, 0.12));
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  border-left: 4px solid;
}

.toast-success {
  border-left-color: var(--wa-green, #25D366);
}

.toast-success .toast-icon {
  color: var(--wa-green, #25D366);
}

.toast-error {
  border-left-color: var(--status-error, #ea0038);
}

.toast-error .toast-icon {
  color: var(--status-error, #ea0038);
}

.toast-warning {
  border-left-color: var(--status-warning, #f59f00);
}

.toast-warning .toast-icon {
  color: var(--status-warning, #f59f00);
}

.toast-info {
  border-left-color: var(--tick-read, #53bdeb);
}

.toast-info .toast-icon {
  color: var(--tick-read, #53bdeb);
}

.toast-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-message {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #111b21);
  line-height: 1.4;
}

.toast-description {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary, #54656f);
  line-height: 1.4;
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 4px;
  margin: -4px -8px -4px 0;
  cursor: pointer;
  color: var(--text-tertiary, #8696a0);
  border-radius: var(--radius-sm, 4px);
  transition: all 0.15s ease;
}

.toast-close:hover {
  background: var(--bg-hover, rgba(0, 0, 0, 0.05));
  color: var(--text-primary, #111b21);
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: currentColor;
  opacity: 0.3;
  animation: toast-progress linear forwards;
}

@keyframes toast-progress {
  from { width: 100%; }
  to { width: 0%; }
}

/* Transitions */
.toast-enter-active {
  animation: toast-enter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-leave-active {
  animation: toast-exit 0.2s ease-out forwards;
}

.toast-move {
  transition: transform 0.3s ease;
}

@keyframes toast-enter {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toast-exit {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-10px) scale(0.9);
  }
}

/* Dark mode */
[data-theme="dark"] .toast {
  background: var(--bg-panel);
}
</style>
