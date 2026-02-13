<template>
  <div 
    ref="containerRef"
    class="lazy-image-container"
    :class="{ 'loaded': isLoaded, 'error': hasError }"
  >
    <!-- Placeholder / Skeleton -->
    <div v-if="!isLoaded && !hasError" class="image-placeholder">
      <div class="skeleton-shimmer"></div>
      <span v-if="showLoadingText" class="loading-text">加载中...</span>
    </div>

    <!-- Error state -->
    <div v-if="hasError" class="image-error" @click="retry">
      <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <span class="error-text">加载失败</span>
      <span class="retry-text">点击重试</span>
    </div>

    <!-- Actual image -->
    <img
      v-show="isLoaded"
      ref="imageRef"
      :src="currentSrc"
      :alt="alt"
      :class="imageClass"
      @load="onLoad"
      @error="onError"
    />

    <!-- Thumbnail overlay for progressive loading -->
    <img
      v-if="thumbnail && !isLoaded && !hasError"
      :src="thumbnail"
      :alt="alt"
      class="thumbnail-preview"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  src: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    default: ''
  },
  alt: {
    type: String,
    default: ''
  },
  imageClass: {
    type: String,
    default: ''
  },
  rootMargin: {
    type: String,
    default: '100px'
  },
  threshold: {
    type: Number,
    default: 0.1
  },
  showLoadingText: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['load', 'error'])

const containerRef = ref(null)
const imageRef = ref(null)
const isVisible = ref(false)
const isLoaded = ref(false)
const hasError = ref(false)
const retryCount = ref(0)
const maxRetries = 3

let observer = null

const currentSrc = computed(() => {
  return isVisible.value ? props.src : ''
})

const onLoad = () => {
  isLoaded.value = true
  hasError.value = false
  emit('load')
}

const onError = () => {
  if (retryCount.value < maxRetries) {
    // Auto-retry with exponential backoff
    setTimeout(() => {
      retryCount.value++
      isVisible.value = false
      requestAnimationFrame(() => {
        isVisible.value = true
      })
    }, Math.pow(2, retryCount.value) * 1000)
  } else {
    hasError.value = true
    emit('error')
  }
}

const retry = () => {
  retryCount.value = 0
  hasError.value = false
  isLoaded.value = false
  isVisible.value = true
}

onMounted(() => {
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isVisible.value = true
            observer.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: props.rootMargin,
        threshold: props.threshold
      }
    )

    if (containerRef.value) {
      observer.observe(containerRef.value)
    }
  } else {
    // Fallback for browsers without IntersectionObserver
    isVisible.value = true
  }
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})

// Reset when src changes
watch(() => props.src, () => {
  isLoaded.value = false
  hasError.value = false
  retryCount.value = 0
})
</script>

<style scoped>
.lazy-image-container {
  position: relative;
  overflow: hidden;
  background: var(--color-bg-secondary, #f0f2f5);
  border-radius: var(--radius-md, 8px);
  min-height: 100px;
}

.image-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.skeleton-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.loading-text {
  position: relative;
  z-index: 1;
  font-size: 12px;
  color: var(--color-text-secondary, #667781);
}

.image-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.image-error:hover {
  background: rgba(0, 0, 0, 0.05);
}

.error-icon {
  width: 32px;
  height: 32px;
  color: var(--color-text-secondary, #667781);
}

.error-text {
  font-size: 12px;
  color: var(--color-text-secondary, #667781);
}

.retry-text {
  font-size: 11px;
  color: var(--color-primary, #00a884);
}

.thumbnail-preview {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(10px);
  transform: scale(1.1);
}

.lazy-image-container img:not(.thumbnail-preview) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.lazy-image-container.loaded img:not(.thumbnail-preview) {
  opacity: 1;
}
</style>
