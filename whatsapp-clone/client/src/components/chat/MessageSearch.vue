<template>
  <div class="message-search-container" :class="{ expanded: isExpanded }">
    <!-- 搜索输入区域 -->
    <div class="search-header">
      <div class="search-input-wrapper">
        <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input 
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          :placeholder="placeholder"
          @input="handleSearch"
          @keydown.enter="performSearch"
          @keydown.escape="close"
          @focus="onFocus"
        />
        <button v-if="searchQuery" class="clear-btn" @click="clearSearch">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <button class="close-btn" @click="close">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <!-- 搜索过滤器 -->
    <div v-if="showFilters" class="search-filters">
      <button 
        v-for="filter in filters"
        :key="filter.value"
        :class="['filter-btn', { active: activeFilter === filter.value }]"
        @click="setFilter(filter.value)"
      >
        <span class="filter-icon">{{ filter.icon }}</span>
        <span class="filter-label">{{ filter.label }}</span>
      </button>
    </div>

    <!-- 搜索结果区域 -->
    <div v-if="isExpanded" class="search-results">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <span>Searching...</span>
      </div>

      <!-- 无结果 -->
      <div v-else-if="searchQuery && !loading && results.length === 0" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>No messages found for "{{ searchQuery }}"</p>
        <span class="hint">Try different keywords or check the spelling</span>
      </div>

      <!-- 搜索结果列表 -->
      <div v-else-if="results.length > 0" class="results-list">
        <div class="results-header">
          <span class="results-count">{{ results.length }} message{{ results.length !== 1 ? 's' : '' }} found</span>
          <div class="navigation-buttons" v-if="currentIndex >= 0">
            <button 
              class="nav-btn"
              :disabled="currentIndex <= 0"
              @click="navigatePrev"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </button>
            <span class="nav-index">{{ currentIndex + 1 }} / {{ results.length }}</span>
            <button 
              class="nav-btn"
              :disabled="currentIndex >= results.length - 1"
              @click="navigateNext"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="results-scroll">
          <div 
            v-for="(result, index) in results"
            :key="result.id"
            :class="['result-item', { active: index === currentIndex }]"
            @click="selectResult(index)"
          >
            <div class="result-avatar">
              <img :src="result.sender_avatar || '/default-avatar.png'" :alt="result.sender_name" />
            </div>
            <div class="result-content">
              <div class="result-header">
                <span class="sender-name">{{ result.sender_name }}</span>
                <span class="result-time">{{ formatDate(result.created_at) }}</span>
              </div>
              <p class="result-text" v-html="highlightText(result.content, searchQuery)"></p>
            </div>
            <div v-if="result.message_type !== 'text'" class="result-type-badge">
              {{ getTypeBadge(result.message_type) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 最近搜索 -->
      <div v-else-if="recentSearches.length > 0" class="recent-searches">
        <div class="section-header">
          <span>Recent Searches</span>
          <button class="clear-all-btn" @click="clearRecentSearches">Clear all</button>
        </div>
        <div class="recent-list">
          <button 
            v-for="(search, index) in recentSearches"
            :key="index"
            class="recent-item"
            @click="useRecentSearch(search)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>{{ search }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import axios from 'axios';

export default {
  name: 'MessageSearch',
  props: {
    placeholder: {
      type: String,
      default: 'Search messages...'
    },
    chatId: {
      type: [Number, String],
      default: null
    },
    showFilters: {
      type: Boolean,
      default: true
    },
    autoFocus: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'select-message', 'search-results'],
  setup(props, { emit }) {
    const store = useStore();
    
    // State
    const searchInput = ref(null);
    const searchQuery = ref('');
    const results = ref([]);
    const loading = ref(false);
    const isExpanded = ref(false);
    const currentIndex = ref(-1);
    const activeFilter = ref('all');
    const recentSearches = ref([]);
    
    // Debounce timer
    let searchTimer = null;
    
    // Filters configuration
    const filters = [
      { value: 'all', label: 'All', icon: '📝' },
      { value: 'text', label: 'Text', icon: '💬' },
      { value: 'image', label: 'Photos', icon: '📷' },
      { value: 'video', label: 'Videos', icon: '🎬' },
      { value: 'document', label: 'Files', icon: '📄' },
      { value: 'audio', label: 'Audio', icon: '🎵' }
    ];
    
    // Load recent searches from localStorage
    const loadRecentSearches = () => {
      const saved = localStorage.getItem('recentMessageSearches');
      if (saved) {
        try {
          recentSearches.value = JSON.parse(saved);
        } catch (e) {
          recentSearches.value = [];
        }
      }
    };
    
    // Save recent search
    const saveRecentSearch = (query) => {
      if (!query.trim()) return;
      
      // Remove duplicate and add to front
      const filtered = recentSearches.value.filter(s => s !== query);
      recentSearches.value = [query, ...filtered].slice(0, 5);
      
      localStorage.setItem('recentMessageSearches', JSON.stringify(recentSearches.value));
    };
    
    // Clear recent searches
    const clearRecentSearches = () => {
      recentSearches.value = [];
      localStorage.removeItem('recentMessageSearches');
    };
    
    // Use a recent search
    const useRecentSearch = (search) => {
      searchQuery.value = search;
      performSearch();
    };
    
    // Handle search input
    const handleSearch = () => {
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
      
      searchTimer = setTimeout(() => {
        if (searchQuery.value.length >= 2) {
          performSearch();
        } else if (searchQuery.value.length === 0) {
          results.value = [];
          currentIndex.value = -1;
        }
      }, 300);
    };
    
    // Perform actual search
    const performSearch = async () => {
      if (!searchQuery.value.trim()) return;
      
      loading.value = true;
      
      try {
        const token = store.state.auth?.token;
        const params = new URLSearchParams({
          query: searchQuery.value,
          limit: 50
        });
        
        if (activeFilter.value !== 'all') {
          params.append('type', activeFilter.value);
        }
        
        if (props.chatId) {
          params.append('chatId', props.chatId);
        }
        
        const response = await axios.get(`/api/messages/search?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        results.value = response.data.data || [];
        currentIndex.value = results.value.length > 0 ? 0 : -1;
        
        // Emit results for parent component
        emit('search-results', results.value);
        
        // Save to recent searches
        saveRecentSearch(searchQuery.value);
        
        // Navigate to first result if found
        if (results.value.length > 0) {
          selectResult(0);
        }
      } catch (error) {
        console.error('Search error:', error);
        results.value = [];
      } finally {
        loading.value = false;
      }
    };
    
    // Set filter
    const setFilter = (filter) => {
      activeFilter.value = filter;
      if (searchQuery.value.length >= 2) {
        performSearch();
      }
    };
    
    // Select a result
    const selectResult = (index) => {
      currentIndex.value = index;
      const result = results.value[index];
      if (result) {
        emit('select-message', result);
      }
    };
    
    // Navigate to previous result
    const navigatePrev = () => {
      if (currentIndex.value > 0) {
        selectResult(currentIndex.value - 1);
      }
    };
    
    // Navigate to next result
    const navigateNext = () => {
      if (currentIndex.value < results.value.length - 1) {
        selectResult(currentIndex.value + 1);
      }
    };
    
    // Clear search
    const clearSearch = () => {
      searchQuery.value = '';
      results.value = [];
      currentIndex.value = -1;
      searchInput.value?.focus();
    };
    
    // Close search
    const close = () => {
      isExpanded.value = false;
      emit('close');
    };
    
    // On focus
    const onFocus = () => {
      isExpanded.value = true;
    };
    
    // Format date
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now - date;
      
      // Same day
      if (diff < 86400000 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      // Yesterday
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.getDate() === yesterday.getDate()) {
        return 'Yesterday';
      }
      
      // This week
      if (diff < 604800000) {
        return date.toLocaleDateString([], { weekday: 'short' });
      }
      
      // Older
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };
    
    // Highlight matching text
    const highlightText = (text, query) => {
      if (!text || !query) return text;
      
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      return text.replace(regex, '<mark>$1</mark>');
    };
    
    // Get type badge
    const getTypeBadge = (type) => {
      const badges = {
        image: '📷',
        video: '🎬',
        audio: '🎵',
        document: '📄'
      };
      return badges[type] || '📎';
    };
    
    // Keyboard navigation
    const handleKeyDown = (e) => {
      if (!isExpanded.value) return;
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          navigatePrev();
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigateNext();
          break;
        case 'Enter':
          if (currentIndex.value >= 0) {
            selectResult(currentIndex.value);
          }
          break;
      }
    };
    
    // Focus search input
    const focus = () => {
      searchInput.value?.focus();
    };
    
    // Lifecycle
    onMounted(() => {
      loadRecentSearches();
      document.addEventListener('keydown', handleKeyDown);
      
      if (props.autoFocus) {
        setTimeout(() => focus(), 100);
      }
    });
    
    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeyDown);
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
    });
    
    return {
      searchInput,
      searchQuery,
      results,
      loading,
      isExpanded,
      currentIndex,
      activeFilter,
      recentSearches,
      filters,
      handleSearch,
      performSearch,
      setFilter,
      selectResult,
      navigatePrev,
      navigateNext,
      clearSearch,
      close,
      onFocus,
      formatDate,
      highlightText,
      getTypeBadge,
      clearRecentSearches,
      useRecentSearch,
      focus
    };
  }
};
</script>

<style lang="scss" scoped>
.message-search-container {
  background: var(--bg-primary, #fff);
  border-bottom: 1px solid var(--border-light, #e9edef);
  
  &.expanded {
    position: relative;
  }
  
  .search-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    
    .search-input-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      background: var(--bg-input, #f0f2f5);
      border-radius: 8px;
      padding: 0 12px;
      
      .search-icon {
        color: var(--icon-secondary, #8696a0);
        flex-shrink: 0;
      }
      
      input {
        flex: 1;
        border: none;
        background: none;
        padding: 10px 8px;
        font-size: 14px;
        color: var(--text-primary, #111b21);
        outline: none;
        
        &::placeholder {
          color: var(--text-tertiary, #8696a0);
        }
      }
      
      .clear-btn {
        padding: 4px;
        background: none;
        border: none;
        cursor: pointer;
        color: var(--icon-secondary, #8696a0);
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        
        &:hover {
          background: var(--bg-hover, rgba(0, 0, 0, 0.05));
        }
      }
    }
    
    .close-btn {
      padding: 8px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--icon-primary, #54656f);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      
      &:hover {
        background: var(--bg-hover, rgba(0, 0, 0, 0.05));
      }
    }
  }
  
  .search-filters {
    display: flex;
    gap: 8px;
    padding: 0 16px 8px;
    overflow-x: auto;
    
    &::-webkit-scrollbar {
      display: none;
    }
    
    .filter-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      border: none;
      border-radius: 16px;
      background: var(--bg-secondary, #f0f2f5);
      color: var(--text-secondary, #667781);
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
      
      &:hover {
        background: var(--bg-tertiary, #e9edef);
      }
      
      &.active {
        background: var(--primary, #00a884);
        color: white;
      }
      
      .filter-icon {
        font-size: 14px;
      }
    }
  }
  
  .search-results {
    max-height: 400px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    
    .loading-state,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: var(--text-secondary, #667781);
      
      svg {
        margin-bottom: 16px;
        color: var(--icon-secondary, #8696a0);
      }
      
      p {
        margin: 0 0 4px;
        font-size: 14px;
      }
      
      .hint {
        font-size: 13px;
        color: var(--text-tertiary, #8696a0);
      }
    }
    
    .loading-state {
      .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid var(--border-light, #e9edef);
        border-top-color: var(--primary, #00a884);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 12px;
      }
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .results-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      border-bottom: 1px solid var(--border-light, #e9edef);
      
      .results-count {
        font-size: 13px;
        color: var(--text-secondary, #667781);
      }
      
      .navigation-buttons {
        display: flex;
        align-items: center;
        gap: 8px;
        
        .nav-btn {
          padding: 4px 8px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--icon-primary, #54656f);
          border-radius: 4px;
          
          &:hover:not(:disabled) {
            background: var(--bg-hover, rgba(0, 0, 0, 0.05));
          }
          
          &:disabled {
            opacity: 0.3;
            cursor: not-allowed;
          }
        }
        
        .nav-index {
          font-size: 12px;
          color: var(--text-secondary, #667781);
          min-width: 60px;
          text-align: center;
        }
      }
    }
    
    .results-scroll {
      flex: 1;
      overflow-y: auto;
    }
    
    .result-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      cursor: pointer;
      transition: background 0.2s;
      
      &:hover {
        background: var(--bg-hover, rgba(0, 0, 0, 0.05));
      }
      
      &.active {
        background: var(--bg-active, #f0f2f5);
      }
      
      .result-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        overflow: hidden;
        flex-shrink: 0;
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
      
      .result-content {
        flex: 1;
        min-width: 0;
        
        .result-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2px;
          
          .sender-name {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-primary, #111b21);
          }
          
          .result-time {
            font-size: 12px;
            color: var(--text-tertiary, #8696a0);
          }
        }
        
        .result-text {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary, #667781);
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          
          :deep(mark) {
            background: #fef08a;
            color: inherit;
            padding: 0 2px;
            border-radius: 2px;
          }
        }
      }
      
      .result-type-badge {
        font-size: 16px;
        flex-shrink: 0;
      }
    }
    
    .recent-searches {
      padding: 12px 0;
      
      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px 8px;
        font-size: 13px;
        color: var(--text-secondary, #667781);
        
        .clear-all-btn {
          padding: 4px 8px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--primary, #00a884);
          font-size: 13px;
          
          &:hover {
            text-decoration: underline;
          }
        }
      }
      
      .recent-list {
        .recent-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 16px;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          color: var(--text-primary, #111b21);
          text-align: left;
          
          &:hover {
            background: var(--bg-hover, rgba(0, 0, 0, 0.05));
          }
          
          svg {
            color: var(--icon-secondary, #8696a0);
          }
        }
      }
    }
  }
}

// Dark mode support
.dark-mode .message-search-container {
  background: #202c33;
  border-bottom-color: #2a3942;
  
  .search-header {
    .search-input-wrapper {
      background: #2a3942;
      
      input {
        color: #e9edef;
        
        &::placeholder {
          color: #8696a0;
        }
      }
    }
  }
  
  .search-filters {
    .filter-btn {
      background: #2a3942;
      color: #8696a0;
      
      &:hover {
        background: #3b4a54;
      }
    }
  }
  
  .search-results {
    .results-header {
      border-bottom-color: #2a3942;
    }
    
    .result-item {
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      &.active {
        background: #2a3942;
      }
      
      .result-content {
        .result-header .sender-name {
          color: #e9edef;
        }
        
        .result-text {
          color: #8696a0;
        }
      }
    }
    
    .recent-searches {
      .recent-list .recent-item {
        color: #e9edef;
        
        &:hover {
          background: rgba(255, 255, 255, 0.05);
        }
      }
    }
  }
}
</style>
