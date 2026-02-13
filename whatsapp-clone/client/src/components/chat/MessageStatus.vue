<template>
  <div class="message-status" :class="statusClass">
    <!-- Sending spinner -->
    <svg v-if="status === 'sending'" class="status-icon spinner-icon" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="31.4" stroke-dashoffset="10" />
    </svg>
    
    <!-- Single tick for sent -->
    <svg v-else-if="status === 'sent'" class="status-icon" viewBox="0 0 16 15" fill="currentColor">
      <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.32.32 0 0 0-.484.033l-.378.458a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.509z"/>
    </svg>
    
    <!-- Double tick for delivered/read -->
    <svg v-else-if="status === 'delivered' || status === 'read'" class="status-icon" viewBox="0 0 16 15" fill="currentColor">
      <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.32.32 0 0 0-.484.033l-.378.458a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.509z"/>
      <path d="M1.499 6.41a.32.32 0 0 1 .484-.033l.358.325a.32.32 0 0 0 .484-.033l3.645-4.671a.366.366 0 0 1 .51-.064l.478.373a.365.365 0 0 1 .064.508L3.877 10.52a.32.32 0 0 1-.484.033l-1.87-1.787a.418.418 0 0 1-.036-.542l.012-.016z"/>
    </svg>
    
    <!-- Failed icon -->
    <svg v-else-if="status === 'failed'" class="status-icon error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
    
    <!-- Time -->
    <span v-if="time && showTime" class="message-time">{{ formattedTime }}</span>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'MessageStatus',
  props: {
    status: {
      type: String,
      default: 'sent',
      validator: (value) => ['sending', 'sent', 'delivered', 'read', 'failed'].includes(value)
    },
    time: {
      type: [String, Date, Number],
      default: null
    },
    showTime: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const statusClass = computed(() => {
      return {
        'status-sending': props.status === 'sending',
        'status-sent': props.status === 'sent',
        'status-delivered': props.status === 'delivered',
        'status-read': props.status === 'read',
        'status-failed': props.status === 'failed'
      };
    });
    
    const formattedTime = computed(() => {
      if (!props.time) return '';
      
      const date = new Date(props.time);
      if (isNaN(date.getTime())) return '';
      
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
    });
    
    return {
      statusClass,
      formattedTime
    };
  }
};
</script>

<style scoped>
.message-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs, 11px);
  color: var(--text-tertiary, #8696a0);
}

.status-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* Sending animation */
.spinner-icon {
  animation: spin 1s linear infinite;
  color: var(--tick-sent, #8696a0);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Status colors */
.status-sending .status-icon {
  color: var(--tick-sent, #8696a0);
}

.status-sent .status-icon,
.status-delivered .status-icon {
  color: var(--tick-delivered, #8696a0);
}

.status-read .status-icon {
  color: var(--tick-read, #53bdeb);
}

.status-failed .status-icon {
  color: var(--status-error, #ea0038);
}

.error-icon {
  width: 14px;
  height: 14px;
}

.message-time {
  white-space: nowrap;
  font-size: inherit;
  line-height: 1;
}

/* Dark mode - inherit from CSS variables automatically */
[data-theme="dark"] .message-status {
  color: var(--text-tertiary);
}
</style>
