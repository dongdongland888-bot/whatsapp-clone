<template>
  <div 
    class="avatar"
    :class="[`avatar-${size}`, { 'avatar-online': showOnlineStatus && isOnline }]"
    :style="customStyle"
  >
    <img 
      v-if="src && !imageError" 
      :src="src" 
      :alt="alt || name"
      @error="handleImageError"
      class="avatar-image"
    />
    <div v-else class="avatar-fallback" :style="{ backgroundColor: fallbackColor }">
      {{ initials }}
    </div>
    
    <!-- Online indicator -->
    <span 
      v-if="showOnlineStatus" 
      class="online-indicator"
      :class="{ 'is-online': isOnline }"
    ></span>
    
    <!-- Badge -->
    <span v-if="badge" class="avatar-badge" :class="`badge-${badgePosition}`">
      {{ badge > 99 ? '99+' : badge }}
    </span>
  </div>
</template>

<script>
import { ref, computed } from 'vue';

export default {
  name: 'Avatar',
  props: {
    src: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: ''
    },
    alt: {
      type: String,
      default: ''
    },
    size: {
      type: String,
      default: 'md',
      validator: (value) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(value)
    },
    showOnlineStatus: {
      type: Boolean,
      default: false
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    badge: {
      type: [Number, String],
      default: 0
    },
    badgePosition: {
      type: String,
      default: 'bottom-right',
      validator: (value) => ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(value)
    },
    rounded: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const imageError = ref(false);
    
    // Generate initials from name
    const initials = computed(() => {
      if (!props.name) return '?';
      
      const parts = props.name.trim().split(/\s+/);
      if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
      }
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    });
    
    // Generate consistent fallback color based on name
    const fallbackColor = computed(() => {
      if (!props.name) return '#8696a0';
      
      const colors = [
        '#00a884', '#128c7e', '#25d366', '#075e54',
        '#34b7f1', '#0099ff', '#ff6b6b', '#feca57',
        '#48dbfb', '#1dd1a1', '#ff9ff3', '#54a0ff'
      ];
      
      let hash = 0;
      for (let i = 0; i < props.name.length; i++) {
        hash = props.name.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      return colors[Math.abs(hash) % colors.length];
    });
    
    // Custom style for border radius
    const customStyle = computed(() => ({
      borderRadius: props.rounded ? '50%' : 'var(--radius-md)'
    }));
    
    const handleImageError = () => {
      imageError.value = true;
    };
    
    return {
      imageError,
      initials,
      fallbackColor,
      customStyle,
      handleImageError
    };
  }
};
</script>

<style scoped>
.avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-tertiary);
}

/* Sizes */
.avatar-xs {
  width: 24px;
  height: 24px;
  font-size: 10px;
}

.avatar-sm {
  width: var(--avatar-sm);
  height: var(--avatar-sm);
  font-size: 12px;
}

.avatar-md {
  width: var(--avatar-md);
  height: var(--avatar-md);
  font-size: 14px;
}

.avatar-lg {
  width: var(--avatar-lg);
  height: var(--avatar-lg);
  font-size: 18px;
}

.avatar-xl {
  width: 80px;
  height: 80px;
  font-size: 28px;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  text-transform: uppercase;
}

/* Online Indicator */
.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid var(--bg-primary);
  background: var(--text-tertiary);
}

.online-indicator.is-online {
  background: var(--status-online);
}

.avatar-xs .online-indicator {
  width: 8px;
  height: 8px;
  border-width: 1px;
}

.avatar-sm .online-indicator {
  width: 10px;
  height: 10px;
}

.avatar-xl .online-indicator {
  width: 16px;
  height: 16px;
  border-width: 3px;
}

/* Badge */
.avatar-badge {
  position: absolute;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  background: var(--status-error);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-top-left {
  top: -4px;
  left: -4px;
}

.badge-top-right {
  top: -4px;
  right: -4px;
}

.badge-bottom-left {
  bottom: -4px;
  left: -4px;
}

.badge-bottom-right {
  bottom: -4px;
  right: -4px;
}
</style>
