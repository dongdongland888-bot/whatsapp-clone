<template>
  <div 
    ref="containerRef" 
    class="virtual-list"
    @scroll="onScroll"
  >
    <!-- Top spacer -->
    <div :style="{ height: topSpacerHeight + 'px' }"></div>
    
    <!-- Visible items -->
    <div 
      v-for="item in visibleItems" 
      :key="item[keyField]"
      :data-index="item._virtualIndex"
      ref="itemRefs"
    >
      <slot :item="item" :index="item._virtualIndex"></slot>
    </div>
    
    <!-- Bottom spacer -->
    <div :style="{ height: bottomSpacerHeight + 'px' }"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  keyField: {
    type: String,
    default: 'id'
  },
  estimatedItemHeight: {
    type: Number,
    default: 60
  },
  bufferSize: {
    type: Number,
    default: 5 // Items to render above/below viewport
  },
  scrollBehavior: {
    type: String,
    default: 'auto' // 'auto' | 'smooth'
  }
})

const emit = defineEmits(['scroll', 'reachTop', 'reachBottom'])

const containerRef = ref(null)
const itemRefs = ref([])
const scrollTop = ref(0)
const containerHeight = ref(0)

// Store measured heights for each item
const itemHeights = ref(new Map())

// Calculate positions
const itemPositions = computed(() => {
  const positions = []
  let currentTop = 0
  
  for (let i = 0; i < props.items.length; i++) {
    const height = itemHeights.value.get(props.items[i][props.keyField]) || props.estimatedItemHeight
    positions.push({
      index: i,
      top: currentTop,
      height,
      bottom: currentTop + height
    })
    currentTop += height
  }
  
  return positions
})

const totalHeight = computed(() => {
  if (itemPositions.value.length === 0) return 0
  const lastItem = itemPositions.value[itemPositions.value.length - 1]
  return lastItem.bottom
})

// Find which items should be visible
const visibleRange = computed(() => {
  if (itemPositions.value.length === 0) {
    return { start: 0, end: 0 }
  }

  const viewportTop = scrollTop.value
  const viewportBottom = scrollTop.value + containerHeight.value

  // Binary search for start index
  let start = 0
  let end = itemPositions.value.length - 1

  while (start < end) {
    const mid = Math.floor((start + end) / 2)
    if (itemPositions.value[mid].bottom < viewportTop) {
      start = mid + 1
    } else {
      end = mid
    }
  }

  const startIndex = Math.max(0, start - props.bufferSize)

  // Find end index
  start = 0
  end = itemPositions.value.length - 1

  while (start < end) {
    const mid = Math.ceil((start + end) / 2)
    if (itemPositions.value[mid].top > viewportBottom) {
      end = mid - 1
    } else {
      start = mid
    }
  }

  const endIndex = Math.min(itemPositions.value.length - 1, end + props.bufferSize)

  return { start: startIndex, end: endIndex }
})

const visibleItems = computed(() => {
  const { start, end } = visibleRange.value
  return props.items.slice(start, end + 1).map((item, i) => ({
    ...item,
    _virtualIndex: start + i
  }))
})

const topSpacerHeight = computed(() => {
  if (visibleRange.value.start === 0 || itemPositions.value.length === 0) {
    return 0
  }
  return itemPositions.value[visibleRange.value.start].top
})

const bottomSpacerHeight = computed(() => {
  const { end } = visibleRange.value
  if (end >= itemPositions.value.length - 1 || itemPositions.value.length === 0) {
    return 0
  }
  return totalHeight.value - itemPositions.value[end].bottom
})

const onScroll = (e) => {
  scrollTop.value = e.target.scrollTop
  emit('scroll', {
    scrollTop: scrollTop.value,
    scrollHeight: e.target.scrollHeight,
    clientHeight: e.target.clientHeight
  })

  // Check if reached top or bottom
  if (scrollTop.value <= 50) {
    emit('reachTop')
  }
  if (scrollTop.value + containerHeight.value >= totalHeight.value - 50) {
    emit('reachBottom')
  }
}

// Measure actual item heights after render
const measureItems = () => {
  if (!itemRefs.value) return

  itemRefs.value.forEach((el) => {
    if (!el) return
    const index = parseInt(el.dataset.index)
    const item = props.items[index]
    if (item) {
      const height = el.getBoundingClientRect().height
      if (height > 0) {
        itemHeights.value.set(item[props.keyField], height)
      }
    }
  })
}

// Public methods
const scrollToIndex = (index, behavior = props.scrollBehavior) => {
  if (index < 0 || index >= props.items.length) return
  
  const position = itemPositions.value[index]
  if (position && containerRef.value) {
    containerRef.value.scrollTo({
      top: position.top,
      behavior
    })
  }
}

const scrollToBottom = (behavior = props.scrollBehavior) => {
  if (containerRef.value) {
    containerRef.value.scrollTo({
      top: totalHeight.value,
      behavior
    })
  }
}

const scrollToTop = (behavior = props.scrollBehavior) => {
  if (containerRef.value) {
    containerRef.value.scrollTo({
      top: 0,
      behavior
    })
  }
}

// Setup resize observer
let resizeObserver = null

onMounted(() => {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight

    resizeObserver = new ResizeObserver(() => {
      containerHeight.value = containerRef.value?.clientHeight || 0
      measureItems()
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

// Measure items when visible items change
watch(visibleItems, () => {
  nextTick(measureItems)
}, { flush: 'post' })

// Expose methods
defineExpose({
  scrollToIndex,
  scrollToBottom,
  scrollToTop,
  containerRef
})
</script>

<style scoped>
.virtual-list {
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  will-change: scroll-position;
}

/* Optimize scrolling performance */
.virtual-list > div {
  contain: layout style;
}
</style>
