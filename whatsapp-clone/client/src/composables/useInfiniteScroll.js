import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Infinite scroll composable for loading older messages
 * Triggers when user scrolls near the top of the container
 */
export function useInfiniteScroll(containerRef, loadMore, options = {}) {
  const {
    threshold = 100, // pixels from top to trigger load
    direction = 'up', // 'up' for chat (load older), 'down' for feeds
    debounceMs = 200
  } = options

  const isLoading = ref(false)
  const hasMore = ref(true)
  const error = ref(null)

  let debounceTimer = null
  let observer = null

  const handleScroll = async () => {
    if (isLoading.value || !hasMore.value) return

    const container = containerRef.value
    if (!container) return

    let shouldLoad = false

    if (direction === 'up') {
      // For chat: load when scrolled near top
      shouldLoad = container.scrollTop <= threshold
    } else {
      // For feeds: load when scrolled near bottom
      const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      shouldLoad = scrollBottom <= threshold
    }

    if (shouldLoad) {
      await triggerLoad()
    }
  }

  const triggerLoad = async () => {
    if (isLoading.value || !hasMore.value) return

    isLoading.value = true
    error.value = null

    try {
      const result = await loadMore()
      
      // If loadMore returns false or empty array, no more items
      if (result === false || (Array.isArray(result) && result.length === 0)) {
        hasMore.value = false
      }
    } catch (err) {
      error.value = err.message || 'Failed to load more'
      console.error('Infinite scroll error:', err)
    } finally {
      isLoading.value = false
    }
  }

  const debouncedScroll = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(handleScroll, debounceMs)
  }

  // Preserve scroll position when prepending items (for chat)
  const preserveScrollPosition = (callback) => {
    const container = containerRef.value
    if (!container) return callback()

    const previousHeight = container.scrollHeight
    const previousScroll = container.scrollTop

    callback()

    // Wait for DOM update
    requestAnimationFrame(() => {
      const newHeight = container.scrollHeight
      const heightDiff = newHeight - previousHeight
      container.scrollTop = previousScroll + heightDiff
    })
  }

  const reset = () => {
    hasMore.value = true
    error.value = null
    isLoading.value = false
  }

  onMounted(() => {
    const container = containerRef.value
    if (container) {
      container.addEventListener('scroll', debouncedScroll, { passive: true })
    }
  })

  onUnmounted(() => {
    const container = containerRef.value
    if (container) {
      container.removeEventListener('scroll', debouncedScroll)
    }
    if (debounceTimer) clearTimeout(debounceTimer)
  })

  return {
    isLoading,
    hasMore,
    error,
    reset,
    triggerLoad,
    preserveScrollPosition
  }
}
