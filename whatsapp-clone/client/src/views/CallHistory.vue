<template>
  <div class="call-history-page">
    <!-- Header -->
    <div class="page-header">
      <h1>Calls</h1>
      <div class="header-actions">
        <button class="btn btn-icon" @click="toggleSearch" title="Search">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
        <button class="btn btn-icon" @click="startNewCall" title="New Call">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            <line x1="12" y1="5" x2="12" y2="11"/>
            <line x1="9" y1="8" x2="15" y2="8"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Search Bar -->
    <transition name="slide-down">
      <div v-if="showSearch" class="search-bar">
        <div class="search-input-wrapper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Search calls..."
            ref="searchInput"
          />
          <button v-if="searchQuery" class="btn btn-icon" @click="clearSearch">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </transition>

    <!-- Filter Tabs -->
    <div class="filter-tabs">
      <button 
        :class="['tab', { active: activeFilter === 'all' }]"
        @click="activeFilter = 'all'"
      >
        All
      </button>
      <button 
        :class="['tab', { active: activeFilter === 'missed' }]"
        @click="activeFilter = 'missed'"
      >
        Missed
      </button>
    </div>

    <!-- Calls List -->
    <div class="calls-list" v-if="filteredCalls.length > 0">
      <div 
        v-for="call in filteredCalls"
        :key="call.id"
        class="call-item"
        @click="viewCallDetails(call)"
      >
        <div class="avatar">
          <img :src="call.contact.avatar || '/default-avatar.png'" :alt="call.contact.username" />
        </div>
        
        <div class="call-info">
          <h4 :class="{ missed: call.status === 'missed' }">
            {{ call.contact.username }}
          </h4>
          <div class="call-details">
            <span :class="['call-direction', call.direction]">
              <svg v-if="call.direction === 'incoming'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="17 12 7 12"/>
                <polyline points="12 7 7 12 12 17"/>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="7 12 17 12"/>
                <polyline points="12 17 17 12 12 7"/>
              </svg>
            </span>
            <span class="call-time">{{ formatCallTime(call.timestamp) }}</span>
          </div>
        </div>

        <div class="call-actions">
          <button 
            class="btn btn-icon"
            @click.stop="initiateCall(call.contact, call.type)"
            :title="call.type === 'video' ? 'Video Call' : 'Voice Call'"
          >
            <svg v-if="call.type === 'video'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
        </svg>
      </div>
      <h3>No calls yet</h3>
      <p>{{ activeFilter === 'missed' ? 'No missed calls' : 'Start calling your friends and family' }}</p>
    </div>

    <!-- New Call Modal -->
    <transition name="fade">
      <div v-if="showNewCallModal" class="modal-overlay" @click.self="closeNewCallModal">
        <div class="new-call-modal">
          <div class="modal-header">
            <h2>New Call</h2>
            <button class="btn btn-icon" @click="closeNewCallModal">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="search-contacts">
            <input 
              v-model="contactSearchQuery"
              type="text"
              placeholder="Search contacts..."
            />
          </div>

          <div class="contacts-list">
            <div 
              v-for="contact in filteredContacts"
              :key="contact.id"
              class="contact-item"
            >
              <div class="avatar">
                <img :src="contact.avatar || '/default-avatar.png'" :alt="contact.username" />
              </div>
              <div class="contact-info">
                <h4>{{ contact.username }}</h4>
                <p>{{ contact.status || 'Available' }}</p>
              </div>
              <div class="call-buttons">
                <button 
                  class="btn btn-icon btn-call"
                  @click="initiateCall(contact, 'voice')"
                  title="Voice Call"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                </button>
                <button 
                  class="btn btn-icon btn-call"
                  @click="initiateCall(contact, 'video')"
                  title="Video Call"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Call Details Modal -->
    <transition name="fade">
      <div v-if="selectedCall" class="modal-overlay" @click.self="selectedCall = null">
        <div class="call-details-modal">
          <div class="modal-header">
            <h2>Call Info</h2>
            <button class="btn btn-icon" @click="selectedCall = null">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="contact-header">
            <div class="avatar large">
              <img :src="selectedCall.contact.avatar || '/default-avatar.png'" :alt="selectedCall.contact.username" />
            </div>
            <h3>{{ selectedCall.contact.username }}</h3>
            <p>{{ selectedCall.contact.phone || 'No phone number' }}</p>
          </div>

          <div class="call-log">
            <h4>Call history with {{ selectedCall.contact.username }}</h4>
            <div 
              v-for="log in getCallLogWithContact(selectedCall.contact.id)"
              :key="log.id"
              class="log-item"
            >
              <div class="log-icon" :class="log.status">
                <svg v-if="log.direction === 'incoming'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="17 12 7 12"/>
                  <polyline points="12 7 7 12 12 17"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="7 12 17 12"/>
                  <polyline points="12 17 17 12 12 7"/>
                </svg>
              </div>
              <div class="log-info">
                <span class="log-type">
                  {{ log.type === 'video' ? 'Video call' : 'Voice call' }}
                  <span v-if="log.status === 'missed'" class="missed-label">Missed</span>
                </span>
                <span class="log-time">{{ formatDetailedTime(log.timestamp) }}</span>
              </div>
              <span v-if="log.duration" class="log-duration">
                {{ formatDuration(log.duration) }}
              </span>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-action" @click="initiateCall(selectedCall.contact, 'voice')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
              </svg>
              Voice Call
            </button>
            <button class="btn btn-action" @click="initiateCall(selectedCall.contact, 'video')">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
              Video Call
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, computed, nextTick } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
  name: 'CallHistory',
  setup() {
    const store = useStore();
    const router = useRouter();

    // State
    const showSearch = ref(false);
    const searchQuery = ref('');
    const activeFilter = ref('all');
    const showNewCallModal = ref(false);
    const contactSearchQuery = ref('');
    const selectedCall = ref(null);
    const searchInput = ref(null);

    // Mock data - In real app, this would come from store
    const calls = ref([
      {
        id: 1,
        contact: { id: 1, username: 'John Doe', avatar: null, phone: '+1 234 567 8901' },
        type: 'voice',
        direction: 'outgoing',
        status: 'completed',
        timestamp: new Date(Date.now() - 3600000),
        duration: 325
      },
      {
        id: 2,
        contact: { id: 2, username: 'Jane Smith', avatar: null, phone: '+1 234 567 8902' },
        type: 'video',
        direction: 'incoming',
        status: 'missed',
        timestamp: new Date(Date.now() - 7200000),
        duration: 0
      },
      {
        id: 3,
        contact: { id: 3, username: 'Bob Johnson', avatar: null, phone: '+1 234 567 8903' },
        type: 'voice',
        direction: 'incoming',
        status: 'completed',
        timestamp: new Date(Date.now() - 86400000),
        duration: 180
      },
      {
        id: 4,
        contact: { id: 1, username: 'John Doe', avatar: null, phone: '+1 234 567 8901' },
        type: 'video',
        direction: 'outgoing',
        status: 'completed',
        timestamp: new Date(Date.now() - 172800000),
        duration: 450
      },
      {
        id: 5,
        contact: { id: 4, username: 'Alice Williams', avatar: null },
        type: 'voice',
        direction: 'incoming',
        status: 'missed',
        timestamp: new Date(Date.now() - 259200000),
        duration: 0
      }
    ]);

    const contacts = ref([
      { id: 1, username: 'John Doe', avatar: null, status: 'Hey there!' },
      { id: 2, username: 'Jane Smith', avatar: null, status: 'Busy' },
      { id: 3, username: 'Bob Johnson', avatar: null, status: 'Available' },
      { id: 4, username: 'Alice Williams', avatar: null, status: 'At work' },
      { id: 5, username: 'Charlie Brown', avatar: null, status: 'Online' }
    ]);

    // Computed
    const filteredCalls = computed(() => {
      let result = calls.value;
      
      // Filter by status
      if (activeFilter.value === 'missed') {
        result = result.filter(call => call.status === 'missed');
      }
      
      // Filter by search query
      if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(call => 
          call.contact.username.toLowerCase().includes(query)
        );
      }
      
      return result;
    });

    const filteredContacts = computed(() => {
      if (!contactSearchQuery.value.trim()) return contacts.value;
      
      const query = contactSearchQuery.value.toLowerCase();
      return contacts.value.filter(contact =>
        contact.username.toLowerCase().includes(query)
      );
    });

    // Methods
    const toggleSearch = () => {
      showSearch.value = !showSearch.value;
      if (showSearch.value) {
        nextTick(() => searchInput.value?.focus());
      } else {
        searchQuery.value = '';
      }
    };

    const clearSearch = () => {
      searchQuery.value = '';
    };

    const startNewCall = () => {
      showNewCallModal.value = true;
    };

    const closeNewCallModal = () => {
      showNewCallModal.value = false;
      contactSearchQuery.value = '';
    };

    const viewCallDetails = (call) => {
      selectedCall.value = call;
    };

    const initiateCall = (contact, type) => {
      console.log(`Starting ${type} call with ${contact.username}`);
      
      store.dispatch('chat/startCall', {
        userToCall: contact.id,
        type: type
      });
      
      closeNewCallModal();
      selectedCall.value = null;
    };

    const getCallLogWithContact = (contactId) => {
      return calls.value.filter(call => call.contact.id === contactId);
    };

    const formatCallTime = (timestamp) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      // Today
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      // Yesterday
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }
      
      // Within a week
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        return date.toLocaleDateString([], { weekday: 'short' });
      }
      
      // Older
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const formatDetailedTime = (timestamp) => {
      const date = new Date(timestamp);
      return date.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const formatDuration = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      
      if (mins >= 60) {
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return `${hours}h ${remainingMins}m`;
      }
      
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return {
      showSearch,
      searchQuery,
      activeFilter,
      showNewCallModal,
      contactSearchQuery,
      selectedCall,
      searchInput,
      calls,
      contacts,
      filteredCalls,
      filteredContacts,
      toggleSearch,
      clearSearch,
      startNewCall,
      closeNewCallModal,
      viewCallDetails,
      initiateCall,
      getCallLogWithContact,
      formatCallTime,
      formatDetailedTime,
      formatDuration
    };
  }
};
</script>

<style lang="scss" scoped>
.call-history-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f0f2f5;
  
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: #f0f2f5;
    
    h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 500;
    }
    
    .header-actions {
      display: flex;
      gap: 8px;
      
      .btn-icon {
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        color: #54656f;
        
        &:hover {
          background: rgba(0, 0, 0, 0.05);
        }
      }
    }
  }
  
  .search-bar {
    padding: 0 16px 12px;
    
    .search-input-wrapper {
      display: flex;
      align-items: center;
      background: white;
      border-radius: 8px;
      padding: 0 12px;
      
      svg {
        color: #54656f;
        flex-shrink: 0;
      }
      
      input {
        flex: 1;
        border: none;
        padding: 10px 12px;
        font-size: 14px;
        outline: none;
      }
      
      .btn-icon {
        padding: 4px;
        background: none;
        border: none;
        color: #54656f;
        cursor: pointer;
      }
    }
  }
  
  .filter-tabs {
    display: flex;
    padding: 0 16px 12px;
    gap: 8px;
    
    .tab {
      padding: 8px 16px;
      border-radius: 20px;
      border: none;
      background: transparent;
      color: #54656f;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: rgba(0, 0, 0, 0.05);
      }
      
      &.active {
        background: #d9fdd3;
        color: #00a884;
        font-weight: 500;
      }
    }
  }
  
  .calls-list {
    flex: 1;
    overflow-y: auto;
    background: white;
    
    .call-item {
      display: flex;
      align-items: center;
      padding: 12px 20px;
      cursor: pointer;
      border-bottom: 1px solid #f0f2f5;
      transition: background 0.2s;
      
      &:hover {
        background: #f5f6f6;
      }
      
      .avatar {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        overflow: hidden;
        margin-right: 15px;
        flex-shrink: 0;
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
      
      .call-info {
        flex: 1;
        min-width: 0;
        
        h4 {
          margin: 0 0 4px;
          font-size: 16px;
          font-weight: 500;
          
          &.missed {
            color: #ea4335;
          }
        }
        
        .call-details {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #667781;
          
          .call-direction {
            display: flex;
            align-items: center;
            
            &.incoming svg {
              color: #00a884;
            }
            
            &.outgoing svg {
              color: #667781;
            }
          }
        }
      }
      
      .call-actions {
        .btn-icon {
          background: none;
          border: none;
          padding: 10px;
          border-radius: 50%;
          color: #00a884;
          cursor: pointer;
          
          &:hover {
            background: rgba(0, 168, 132, 0.1);
          }
        }
      }
    }
  }
  
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    text-align: center;
    
    .empty-icon {
      width: 120px;
      height: 120px;
      background: #f0f2f5;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      
      svg {
        color: #aebac1;
      }
    }
    
    h3 {
      margin: 0 0 8px;
      font-size: 18px;
      color: #111b21;
    }
    
    p {
      margin: 0;
      font-size: 14px;
      color: #667781;
    }
  }
  
  // Modals
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .new-call-modal,
  .call-details-modal {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 400px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #e9edef;
      
      h2 {
        margin: 0;
        font-size: 18px;
      }
      
      .btn-icon {
        background: none;
        border: none;
        cursor: pointer;
        color: #54656f;
        padding: 4px;
      }
    }
    
    .search-contacts {
      padding: 12px 16px;
      border-bottom: 1px solid #e9edef;
      
      input {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid #e9edef;
        border-radius: 8px;
        font-size: 14px;
        outline: none;
        
        &:focus {
          border-color: #00a884;
        }
      }
    }
    
    .contacts-list {
      flex: 1;
      overflow-y: auto;
      
      .contact-item {
        display: flex;
        align-items: center;
        padding: 10px 16px;
        
        .avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: hidden;
          margin-right: 12px;
          
          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }
        
        .contact-info {
          flex: 1;
          
          h4 {
            margin: 0 0 2px;
            font-size: 15px;
            font-weight: 500;
          }
          
          p {
            margin: 0;
            font-size: 13px;
            color: #667781;
          }
        }
        
        .call-buttons {
          display: flex;
          gap: 8px;
          
          .btn-call {
            background: none;
            border: none;
            padding: 8px;
            border-radius: 50%;
            color: #00a884;
            cursor: pointer;
            
            &:hover {
              background: rgba(0, 168, 132, 0.1);
            }
          }
        }
      }
    }
  }
  
  .call-details-modal {
    .contact-header {
      padding: 24px;
      text-align: center;
      border-bottom: 1px solid #e9edef;
      
      .avatar.large {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        overflow: hidden;
        margin: 0 auto 12px;
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
      
      h3 {
        margin: 0 0 4px;
        font-size: 20px;
      }
      
      p {
        margin: 0;
        color: #667781;
        font-size: 14px;
      }
    }
    
    .call-log {
      padding: 16px;
      flex: 1;
      overflow-y: auto;
      
      h4 {
        margin: 0 0 12px;
        font-size: 13px;
        color: #667781;
        text-transform: uppercase;
      }
      
      .log-item {
        display: flex;
        align-items: center;
        padding: 10px 0;
        
        .log-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #f0f2f5;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
          color: #00a884;
          
          &.missed {
            color: #ea4335;
          }
        }
        
        .log-info {
          flex: 1;
          
          .log-type {
            display: block;
            font-size: 14px;
            
            .missed-label {
              color: #ea4335;
              font-size: 12px;
              margin-left: 6px;
            }
          }
          
          .log-time {
            font-size: 12px;
            color: #667781;
          }
        }
        
        .log-duration {
          font-size: 13px;
          color: #667781;
        }
      }
    }
    
    .modal-actions {
      display: flex;
      gap: 12px;
      padding: 16px;
      border-top: 1px solid #e9edef;
      
      .btn-action {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        border: none;
        border-radius: 24px;
        background: #00a884;
        color: white;
        font-size: 14px;
        cursor: pointer;
        
        &:hover {
          background: #06cf9c;
        }
      }
    }
  }
}

// Animations
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
