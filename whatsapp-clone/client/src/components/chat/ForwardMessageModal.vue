<template>
  <Transition name="modal-fade">
    <div v-if="show" class="forward-modal-overlay" @click.self="close">
      <div class="forward-modal">
        <!-- Header -->
        <div class="modal-header">
          <button class="back-btn" @click="close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
          </button>
          <div class="header-title">
            <h3>Forward to</h3>
            <span class="selected-count" v-if="selectedContacts.length > 0">
              {{ selectedContacts.length }} selected
            </span>
          </div>
        </div>

        <!-- Search -->
        <div class="search-section">
          <div class="search-input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              v-model="searchQuery"
              type="text"
              placeholder="Search contacts..."
              @input="filterContacts"
            />
          </div>
        </div>

        <!-- Selected Contacts Pills -->
        <Transition name="slide-down">
          <div v-if="selectedContacts.length > 0" class="selected-pills">
            <div 
              v-for="contact in selectedContacts"
              :key="contact.id"
              class="contact-pill"
            >
              <img :src="contact.avatar || '/default-avatar.png'" :alt="contact.username" />
              <span>{{ contact.username }}</span>
              <button class="remove-btn" @click="toggleContact(contact)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        </Transition>

        <!-- Frequent Contacts -->
        <div v-if="frequentContacts.length > 0 && !searchQuery" class="frequent-section">
          <h4 class="section-title">Frequently Contacted</h4>
          <div class="frequent-list">
            <button 
              v-for="contact in frequentContacts"
              :key="contact.id"
              :class="['frequent-item', { selected: isSelected(contact) }]"
              @click="toggleContact(contact)"
            >
              <div class="contact-avatar">
                <img :src="contact.avatar || '/default-avatar.png'" :alt="contact.username" />
                <span v-if="isSelected(contact)" class="check-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
              </div>
              <span class="contact-name">{{ contact.username }}</span>
            </button>
          </div>
        </div>

        <!-- All Contacts -->
        <div class="contacts-section">
          <h4 class="section-title">{{ searchQuery ? 'Search Results' : 'All Contacts' }}</h4>
          <div class="contacts-list" ref="contactsList">
            <div 
              v-for="contact in filteredContacts"
              :key="contact.id"
              :class="['contact-item', { selected: isSelected(contact) }]"
              @click="toggleContact(contact)"
            >
              <div class="contact-avatar">
                <img :src="contact.avatar || '/default-avatar.png'" :alt="contact.username" />
                <span v-if="contact.online" class="online-indicator"></span>
              </div>
              <div class="contact-info">
                <span class="contact-name">{{ contact.username }}</span>
                <span class="contact-status">{{ contact.status || 'Hey there! I am using WhatsApp' }}</span>
              </div>
              <div class="check-circle" :class="{ checked: isSelected(contact) }">
                <svg v-if="isSelected(contact)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>

            <!-- Empty state -->
            <div v-if="filteredContacts.length === 0" class="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <p>No contacts found</p>
            </div>
          </div>
        </div>

        <!-- Groups Section -->
        <div v-if="groups.length > 0 && !searchQuery" class="groups-section">
          <h4 class="section-title">Groups</h4>
          <div class="groups-list">
            <div 
              v-for="group in groups"
              :key="'group-' + group.id"
              :class="['contact-item group-item', { selected: isGroupSelected(group) }]"
              @click="toggleGroup(group)"
            >
              <div class="contact-avatar group-avatar">
                <img :src="group.avatar || '/default-group.png'" :alt="group.name" />
              </div>
              <div class="contact-info">
                <span class="contact-name">{{ group.name }}</span>
                <span class="contact-status">{{ group.members_count }} members</span>
              </div>
              <div class="check-circle" :class="{ checked: isGroupSelected(group) }">
                <svg v-if="isGroupSelected(group)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Message Preview -->
        <div class="message-preview">
          <div class="preview-header">
            <span>{{ messages.length }} message{{ messages.length !== 1 ? 's' : '' }} to forward</span>
          </div>
          <div class="preview-content">
            <div 
              v-for="msg in messages.slice(0, 3)"
              :key="msg.id"
              class="preview-message"
            >
              <span class="msg-type" v-if="msg.message_type !== 'text'">
                {{ getTypeIcon(msg.message_type) }}
              </span>
              <span class="msg-text">{{ truncateText(msg.content, 50) }}</span>
            </div>
            <div v-if="messages.length > 3" class="more-messages">
              +{{ messages.length - 3 }} more message{{ messages.length - 3 !== 1 ? 's' : '' }}
            </div>
          </div>
        </div>

        <!-- Footer / Send Button -->
        <div class="modal-footer">
          <button 
            class="forward-btn"
            :disabled="selectedContacts.length === 0 && selectedGroups.length === 0"
            @click="forwardMessages"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import axios from 'axios';

export default {
  name: 'ForwardMessageModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    messages: {
      type: Array,
      required: true
    }
  },
  emits: ['close', 'forwarded'],
  setup(props, { emit }) {
    const store = useStore();
    
    // State
    const searchQuery = ref('');
    const contacts = ref([]);
    const groups = ref([]);
    const selectedContacts = ref([]);
    const selectedGroups = ref([]);
    const loading = ref(false);
    
    // Computed
    const frequentContacts = computed(() => {
      // Get most recent contacts from conversations
      return contacts.value.slice(0, 5);
    });
    
    const filteredContacts = computed(() => {
      if (!searchQuery.value) return contacts.value;
      
      const query = searchQuery.value.toLowerCase();
      return contacts.value.filter(c => 
        c.username.toLowerCase().includes(query) ||
        (c.status && c.status.toLowerCase().includes(query))
      );
    });
    
    // Methods
    const loadContacts = async () => {
      try {
        const token = store.state.auth?.token;
        const response = await axios.get('/api/contacts', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        contacts.value = response.data.data || [];
      } catch (error) {
        console.error('Error loading contacts:', error);
      }
    };
    
    const loadGroups = async () => {
      try {
        const token = store.state.auth?.token;
        const response = await axios.get('/api/groups', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        groups.value = response.data.data || [];
      } catch (error) {
        console.error('Error loading groups:', error);
      }
    };
    
    const isSelected = (contact) => {
      return selectedContacts.value.some(c => c.id === contact.id);
    };
    
    const isGroupSelected = (group) => {
      return selectedGroups.value.some(g => g.id === group.id);
    };
    
    const toggleContact = (contact) => {
      const index = selectedContacts.value.findIndex(c => c.id === contact.id);
      if (index === -1) {
        selectedContacts.value.push(contact);
      } else {
        selectedContacts.value.splice(index, 1);
      }
    };
    
    const toggleGroup = (group) => {
      const index = selectedGroups.value.findIndex(g => g.id === group.id);
      if (index === -1) {
        selectedGroups.value.push(group);
      } else {
        selectedGroups.value.splice(index, 1);
      }
    };
    
    const filterContacts = () => {
      // Filtering is handled by computed property
    };
    
    const getTypeIcon = (type) => {
      const icons = {
        image: '📷',
        video: '🎬',
        audio: '🎵',
        document: '📄'
      };
      return icons[type] || '📎';
    };
    
    const truncateText = (text, maxLength) => {
      if (!text) return 'Media message';
      return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
    };
    
    const forwardMessages = async () => {
      if (selectedContacts.value.length === 0 && selectedGroups.value.length === 0) return;
      
      loading.value = true;
      
      try {
        const token = store.state.auth?.token;
        const messageIds = props.messages.map(m => m.id);
        const receiverIds = selectedContacts.value.map(c => c.id);
        const groupIds = selectedGroups.value.map(g => g.id);
        
        await axios.post('/api/messages/forward', {
          messageIds,
          receiverIds,
          groupIds
        }, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        emit('forwarded', {
          messages: props.messages,
          contacts: selectedContacts.value,
          groups: selectedGroups.value
        });
        
        close();
      } catch (error) {
        console.error('Error forwarding messages:', error);
        // Could show error toast here
      } finally {
        loading.value = false;
      }
    };
    
    const close = () => {
      searchQuery.value = '';
      selectedContacts.value = [];
      selectedGroups.value = [];
      emit('close');
    };
    
    // Watch for modal open
    watch(() => props.show, (newVal) => {
      if (newVal) {
        loadContacts();
        loadGroups();
      }
    });
    
    return {
      searchQuery,
      contacts,
      groups,
      selectedContacts,
      selectedGroups,
      loading,
      frequentContacts,
      filteredContacts,
      isSelected,
      isGroupSelected,
      toggleContact,
      toggleGroup,
      filterContacts,
      getTypeIcon,
      truncateText,
      forwardMessages,
      close
    };
  }
};
</script>

<style lang="scss" scoped>
.forward-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.forward-modal {
  background: var(--bg-primary, #fff);
  border-radius: 12px;
  width: 100%;
  max-width: 450px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  
  .modal-header {
    display: flex;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--border-light, #e9edef);
    
    .back-btn {
      padding: 8px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--icon-primary, #54656f);
      border-radius: 50%;
      margin-right: 8px;
      
      &:hover {
        background: var(--bg-hover, rgba(0, 0, 0, 0.05));
      }
    }
    
    .header-title {
      flex: 1;
      
      h3 {
        margin: 0;
        font-size: 18px;
        color: var(--text-primary, #111b21);
      }
      
      .selected-count {
        font-size: 13px;
        color: var(--text-secondary, #667781);
      }
    }
  }
  
  .search-section {
    padding: 8px 16px;
    
    .search-input-wrapper {
      display: flex;
      align-items: center;
      background: var(--bg-input, #f0f2f5);
      border-radius: 8px;
      padding: 0 12px;
      
      svg {
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
    }
  }
  
  .selected-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 16px;
    background: var(--bg-secondary, #f0f2f5);
    
    .contact-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      background: var(--bg-primary, #fff);
      border-radius: 20px;
      padding: 4px 8px 4px 4px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      
      img {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        object-fit: cover;
      }
      
      span {
        font-size: 13px;
        color: var(--text-primary, #111b21);
      }
      
      .remove-btn {
        padding: 2px;
        background: none;
        border: none;
        cursor: pointer;
        color: var(--icon-secondary, #8696a0);
        display: flex;
        
        &:hover {
          color: var(--text-primary, #111b21);
        }
      }
    }
  }
  
  .section-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--primary, #00a884);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 12px 16px 8px;
    margin: 0;
  }
  
  .frequent-section {
    .frequent-list {
      display: flex;
      gap: 12px;
      padding: 0 16px 12px;
      overflow-x: auto;
      
      &::-webkit-scrollbar {
        display: none;
      }
      
      .frequent-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 8px;
        background: none;
        border: none;
        cursor: pointer;
        border-radius: 8px;
        transition: background 0.2s;
        
        &:hover {
          background: var(--bg-hover, rgba(0, 0, 0, 0.05));
        }
        
        &.selected {
          background: var(--primary-light, #e7f8f5);
        }
        
        .contact-avatar {
          position: relative;
          width: 48px;
          height: 48px;
          
          img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
          }
          
          .check-badge {
            position: absolute;
            bottom: -2px;
            right: -2px;
            width: 20px;
            height: 20px;
            background: var(--primary, #00a884);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid var(--bg-primary, #fff);
            
            svg {
              stroke: #fff;
            }
          }
        }
        
        .contact-name {
          font-size: 12px;
          color: var(--text-primary, #111b21);
          max-width: 64px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }
  
  .contacts-section,
  .groups-section {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    
    .contacts-list,
    .groups-list {
      flex: 1;
      overflow-y: auto;
      max-height: 200px;
    }
  }
  
  .contact-item {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    cursor: pointer;
    transition: background 0.2s;
    
    &:hover {
      background: var(--bg-hover, rgba(0, 0, 0, 0.05));
    }
    
    &.selected {
      background: var(--primary-light, #e7f8f5);
    }
    
    .contact-avatar {
      position: relative;
      width: 40px;
      height: 40px;
      margin-right: 12px;
      flex-shrink: 0;
      
      img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
      }
      
      .online-indicator {
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 10px;
        height: 10px;
        background: #4caf50;
        border-radius: 50%;
        border: 2px solid var(--bg-primary, #fff);
      }
      
      &.group-avatar img {
        border-radius: 8px;
      }
    }
    
    .contact-info {
      flex: 1;
      min-width: 0;
      
      .contact-name {
        display: block;
        font-size: 15px;
        color: var(--text-primary, #111b21);
        font-weight: 500;
      }
      
      .contact-status {
        display: block;
        font-size: 13px;
        color: var(--text-secondary, #667781);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    
    .check-circle {
      width: 22px;
      height: 22px;
      border: 2px solid var(--border-light, #d1d7db);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      
      &.checked {
        background: var(--primary, #00a884);
        border-color: var(--primary, #00a884);
        
        svg {
          stroke: #fff;
        }
      }
    }
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: var(--text-secondary, #667781);
    
    svg {
      margin-bottom: 12px;
      color: var(--icon-secondary, #8696a0);
    }
    
    p {
      margin: 0;
      font-size: 14px;
    }
  }
  
  .message-preview {
    border-top: 1px solid var(--border-light, #e9edef);
    padding: 12px 16px;
    background: var(--bg-secondary, #f0f2f5);
    
    .preview-header {
      font-size: 12px;
      color: var(--text-secondary, #667781);
      margin-bottom: 8px;
    }
    
    .preview-content {
      .preview-message {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 0;
        font-size: 13px;
        color: var(--text-primary, #111b21);
        
        .msg-type {
          flex-shrink: 0;
        }
        
        .msg-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
      
      .more-messages {
        font-size: 12px;
        color: var(--text-tertiary, #8696a0);
        padding-top: 4px;
      }
    }
  }
  
  .modal-footer {
    padding: 12px 16px;
    border-top: 1px solid var(--border-light, #e9edef);
    
    .forward-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      background: var(--primary, #00a884);
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
      
      &:hover:not(:disabled) {
        background: var(--primary-dark, #017561);
      }
      
      &:disabled {
        background: var(--bg-tertiary, #d1d7db);
        cursor: not-allowed;
      }
    }
  }
}

// Transitions
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
  
  .forward-modal {
    transition: transform 0.3s ease;
  }
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  
  .forward-modal {
    transform: scale(0.95);
  }
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  max-height: 0;
  padding: 0 16px;
}

// Dark mode
.dark-mode .forward-modal {
  background: #202c33;
  
  .modal-header {
    border-bottom-color: #2a3942;
    
    .header-title h3 {
      color: #e9edef;
    }
  }
  
  .search-section .search-input-wrapper {
    background: #2a3942;
    
    input {
      color: #e9edef;
    }
  }
  
  .selected-pills {
    background: #182229;
    
    .contact-pill {
      background: #2a3942;
      
      span {
        color: #e9edef;
      }
    }
  }
  
  .contact-item {
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    
    &.selected {
      background: rgba(0, 168, 132, 0.1);
    }
    
    .contact-info {
      .contact-name {
        color: #e9edef;
      }
    }
    
    .check-circle {
      border-color: #3b4a54;
    }
  }
  
  .message-preview {
    background: #182229;
    border-top-color: #2a3942;
    
    .preview-content .preview-message .msg-text {
      color: #e9edef;
    }
  }
  
  .modal-footer {
    border-top-color: #2a3942;
  }
}
</style>
