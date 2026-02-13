<template>
  <div :class="['loading-spinner', sizeClass]" :style="colorStyle">
    <svg viewBox="0 0 24 24" class="spinner-svg">
      <circle 
        cx="12" 
        cy="12" 
        r="10" 
        fill="none" 
        stroke="currentColor" 
        :stroke-width="strokeWidth"
        stroke-dasharray="31.4"
        stroke-dashoffset="10"
        stroke-linecap="round"
      />
    </svg>
    <span v-if="label" class="spinner-label">{{ label }}</span>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'LoadingSpinner',
  props: {
    size: {
      type: String,
      default: 'md',
      validator: (value) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(value)
    },
    color: {
      type: String,
      default: null // Will use CSS variable
    },
    label: {
      type: String,
      default: null
    }
  },
  setup(props) {
    const sizeClass = computed(() => `spinner-${props.size}`);
    
    const colorStyle = computed(() => {
      if (props.color) {
        return { color: props.color };
      }
      return {};
    });
    
    const strokeWidth = computed(() => {
      const widths = { xs: 3, sm: 2.5, md: 2, lg: 2, xl: 1.5 };
      return widths[props.size] || 2;
    });
    
    return {
      sizeClass,
      colorStyle,
      strokeWidth
    };
  }
};
</script>

<style scoped>
.loading-spinner {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--primary, #00a884);
}

.spinner-svg {
  animation: spin 1s linear infinite;
}

.spinner-xs .spinner-svg {
  width: 16px;
  height: 16px;
}

.spinner-sm .spinner-svg {
  width: 20px;
  height: 20px;
}

.spinner-md .spinner-svg {
  width: 32px;
  height: 32px;
}

.spinner-lg .spinner-svg {
  width: 48px;
  height: 48px;
}

.spinner-xl .spinner-svg {
  width: 64px;
  height: 64px;
}

.spinner-label {
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #54656f);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
