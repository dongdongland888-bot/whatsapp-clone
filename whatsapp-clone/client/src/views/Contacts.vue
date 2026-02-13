<template>
  <div class="contacts-page">
    <!-- Header -->
    <div class="page-header">
      <h1>Contacts</h1>
      <div class="header-actions">
        <button class="btn btn-icon" @click="toggleSearch" title="Search">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
        <button class="btn btn-icon" @click="openAddContact" title="Add Contact">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="8" x2="20" y2="14"/>
            <line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
        </button>
        <button class="btn btn-icon" @click="refreshContacts" title="Refresh">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ 'spin': refreshing }">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
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
            placeholder="Search contacts..."
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

    <!-- Quick Actions -->
    <div class="quick-actions">
      <div class="action-item" @click="openNewGroup">
        <div class="action-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/>
            <path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>
        <span>New Group</span>
      </div>
      <div class="action-item" @click="openNewBroadcast">
        <div class="action-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
          </svg>
        </div>
        <span>New Broadcast</span>
      </div>
    </div>

    <!-- Contacts List -->
    <div class="contacts-list" v-if="!loading">
      <!-- Grouped by letter -->
      <template v-for="(group, letter) in groupedContacts" :key="letter">
        <div class="letter-header">{{ letter }}</div>
        <div 
          v-for="contact in group"
          :key="contact.id"
          class="contact-item"
          @click="openContact(contact)"
        >
          <div class="avatar">
            <img :src="contact.avatar || '/default-avatar.png'" :alt="contact.username" />
            <span v-if="contact.online" class="online-dot"></span>
          </div>
          <div class="contact-info">
            <h4>{{ contact.username }}</h4>
            <p>{{ contact.status || 'Hey there! I am using WhatsApp' }}</p>
          </div>
        </div>
      </template>
      
      <!-- Empty state -->
      <div v-if="filteredContacts.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="8" x2="20" y2="14"/>
            <line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
        </div>
        <h3>{{ searchQuery ? 'No contacts found' : 'No contacts yet' }}</h3>
        <p>{{ searchQuery ? 'Try a different search term' : 'Add contacts to start chatting' }}</p>
        <button v-if="!searchQuery" class="btn btn-primary" @click="openAddContact">
          Add Contact
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="loading-state">
      <div class="spinner"></div>
      <p>Loading contacts...</p>
    </div>

    <!-- Contact Detail Modal -->
    <transition name="fade">
      <div v-if="selectedContact" class="modal-overlay" @click.self="closeContactDetail">
        <div class="contact-detail-modal">
          <div class="modal-header">
            <button class="btn btn-icon" @click="closeContactDetail">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="contact-header">
            <div class="avatar large">
              <img :src="selectedContact.avatar || '/default-avatar.png'" :alt="selectedContact.username" />
            </div>
            <h2>{{ selectedContact.username }}</h2>
            <p class="phone">{{ selectedContact.phone || 'No phone number' }}</p>
            <p class="status">{{ selectedContact.status || 'Hey there! I am using WhatsApp' }}</p>
          </div>

          <div class="action-buttons">
            <button class="btn btn-action" @click="startChat(selectedContact)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              Message
            </button>
            <button class="btn btn-action" @click="startVoiceCall(selectedContact)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
              </svg>
              Call
            </button>
            <button class="btn btn-action" @click="startVideoCall(selectedContact)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
              Video
            </button>
          </div>

          <div class="contact-details">
            <div class="detail-section">
              <h4>About</h4>
              <p>{{ selectedContact.about || selectedContact.status || 'No about info' }}</p>
            </div>
            
            <div class="detail-section" v-if="selectedContact.phone">
              <h4>Phone</h4>
              <p>{{ selectedContact.phone }}</p>
            </div>

            <div class="detail-section" v-if="selectedContact.email">
              <h4>Email</h4>
              <p>{{ selectedContact.email }}</p>
            </div>
          </div>

          <div class="danger-actions">
            <button class="btn btn-text danger" @click="blockContact(selectedContact)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              Block {{ selectedContact.username }}
            </button>
            <button class="btn btn-text danger" @click="deleteContact(selectedContact)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
              Delete Contact
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Add Contact Modal -->
    <transition name="fade">
      <div v-if="showAddModal" class="modal-overlay" @click.self="closeAddContact">
        <div class="add-contact-modal">
          <div class="modal-header">
            <h2>Add Contact</h2>
            <button class="btn btn-icon" @click="closeAddContact">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form @submit.prevent="addContact" class="add-contact-form">
            <div class="form-group">
              <label>Name</label>
              <input 
                v-model="newContact.name"
                type="text"
                placeholder="Contact name"
                required
              />
            </div>

            <div class="form-group">
              <label>Phone Number</label>
              <div class="phone-input">
                <select v-model="newContact.countryCode">
                  <option value="+1">🇺🇸 +1</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+86">🇨🇳 +86</option>
                  <option value="+852">🇭🇰 +852</option>
                  <option value="+81">🇯🇵 +81</option>
                  <option value="+82">🇰🇷 +82</option>
                  <option value="+91">🇮🇳 +91</option>
                </select>
                <input 
                  v-model="newContact.phone"
                  type="tel"
                  placeholder="Phone number"
                  required
                />
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-cancel" @click="closeAddContact">Cancel</button>
              <button type="submit" class="btn btn-save" :disabled="!newContact.name || !newContact.phone">
                Add Contact
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, computed, nextTick, onMounted } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

export default {
  name: 'Contacts',
  setup() {
    const store = useStore();
    const router = useRouter();

    // State
    const showSearch = ref(false);
    const searchQuery = ref('');
    const searchInput = ref(null);
    const loading = ref(false);
    const refreshing = ref(false);
    const selectedContact = ref(null);
    const showAddModal = ref(false);
    
    const newContact = ref({
      name: '',
      phone: '',
      countryCode: '+1'
    });

    // Mock data - In real app, this would come from store
    const contacts = ref([
      { id: 1, username: 'Alice Williams', avatar: null, phone: '+1 234 567 8901', status: 'Hey there!', online: true },
      { id: 2, username: 'Bob Johnson', avatar: null, phone: '+1 234 567 8902', status: 'Busy', online: false },
      { id: 3, username: 'Charlie Brown', avatar: null, phone: '+1 234 567 8903', status: 'At work', online: true },
      { id: 4, username: 'David Lee', avatar: null, phone: '+1 234 567 8904', status: 'Available', online: false },
      { id: 5, username: 'Eva Martinez', avatar: null, phone: '+1 234 567 8905', status: '🌟 Living my best life', online: true },
      { id: 6, username: 'Frank Wilson', avatar: null, phone: '+1 234 567 8906', online: false },
      { id: 7, username: 'Grace Taylor', avatar: null, phone: '+1 234 567 8907', status: 'On vacation 🏖️', online: false },
      { id: 8, username: 'Henry Garcia', avatar: null, phone: '+1 234 567 8908', online: true },
      { id: 9, username: 'Ivy Chen', avatar: null, phone: '+1 234 567 8909', status: 'Working from home', online: true },
      { id: 10, username: 'Jack Thompson', avatar: null, phone: '+1 234 567 8910', online: false },
    ]);

    // Computed
    const filteredContacts = computed(() => {
      if (!searchQuery.value.trim()) return contacts.value;
      
      const query = searchQuery.value.toLowerCase();
      return contacts.value.filter(contact =>
        contact.username.toLowerCase().includes(query) ||
        contact.phone?.includes(query)
      );
    });

    const groupedContacts = computed(() => {
      const groups = {};
      
      const sorted = [...filteredContacts.value].sort((a, b) => 
        a.username.localeCompare(b.username)
      );
      
      for (const contact of sorted) {
        const letter = contact.username[0].toUpperCase();
        if (!groups[letter]) {
          groups[letter] = [];
        }
        groups[letter].push(contact);
      }
      
      return groups;
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

    const refreshContacts = async () => {
      if (refreshing.value) return;
      
      refreshing.value = true;
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        // In real app: await store.dispatch('contacts/fetchContacts');
      } finally {
        refreshing.value = false;
      }
    };

    const openContact = (contact) => {
      selectedContact.value = contact;
    };

    const closeContactDetail = () => {
      selectedContact.value = null;
    };

    const openAddContact = () => {
      showAddModal.value = true;
    };

    const closeAddContact = () => {
      showAddModal.value = false;
      newContact.value = {
        name: '',
        phone: '',
        countryCode: '+1'
      };
    };

    const addContact = async () => {
      const contact = {
        id: Date.now(),
        username: newContact.value.name,
        phone: `${newContact.value.countryCode} ${newContact.value.phone}`,
        online: false
      };
      
      contacts.value.push(contact);
      closeAddContact();
      
      // In real app: await store.dispatch('contacts/addContact', contact);
    };

    const startChat = (contact) => {
      store.commit('chat/SET_ACTIVE_CHAT', contact);
      router.push(`/chat/${contact.id}`);
    };

    const startVoiceCall = (contact) => {
      store.dispatch('chat/startCall', {
        userToCall: contact.id,
        type: 'voice'
      });
      selectedContact.value = null;
    };

    const startVideoCall = (contact) => {
      store.dispatch('chat/startCall', {
        userToCall: contact.id,
        type: 'video'
      });
      selectedContact.value = null;
    };

    const blockContact = (contact) => {
      if (confirm(`Block ${contact.username}?`)) {
        // In real app: store.dispatch('contacts/blockContact', contact.id);
        console.log('Block contact:', contact.id);
        selectedContact.value = null;
      }
    };

    const deleteContact = (contact) => {
      if (confirm(`Delete ${contact.username} from your contacts?`)) {
        const index = contacts.value.findIndex(c => c.id === contact.id);
        if (index !== -1) {
          contacts.value.splice(index, 1);
        }
        // In real app: store.dispatch('contacts/deleteContact', contact.id);
        selectedContact.value = null;
      }
    };

    const openNewGroup = () => {
      router.push('/groups/new');
    };

    const openNewBroadcast = () => {
      console.log('Open new broadcast');
      // TODO: Implement broadcast feature
    };

    onMounted(async () => {
      loading.value = true;
      try {
        // Simulate loading
        await new Promise(resolve => setTimeout(resolve, 500));
        // In real app: await store.dispatch('contacts/fetchContacts');
      } finally {
        loading.value = false;
      }
    });

    return {
      showSearch,
      searchQuery,
      searchInput,
      loading,
      refreshing,
      selectedContact,
      showAddModal,
      newContact,
      contacts,
      filteredContacts,
      groupedContacts,
      toggleSearch,
      clearSearch,
      refreshContacts,
      openContact,
      closeContactDetail,
      openAddContact,
      closeAddContact,
      addContact,
      startChat,
      startVoiceCall,
      startVideoCall,
      blockContact,
      deleteContact,
      openNewGroup,
      openNewBroadcast
    };
  }
};
</script>

<style lang="scss" scoped>
.contacts-page {
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
        
        .spin {
          animation: spin 1s linear infinite;
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
  
  .quick-actions {
    display: flex;
    flex-direction: column;
    background: white;
    margin-bottom: 8px;
    
    .action-item {
      display: flex;
      align-items: center;
      padding: 12px 20px;
      cursor: pointer;
      transition: background 0.2s;
      
      &:hover {
        background: #f5f6f6;
      }
      
      .action-icon {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: #00a884;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 15px;
        
        svg {
          color: white;
        }
      }
      
      span {
        font-size: 16px;
        font-weight: 500;
      }
    }
  }
  
  .contacts-list {
    flex: 1;
    overflow-y: auto;
    background: white;
    
    .letter-header {
      padding: 8px 20px;
      background: #f0f2f5;
      font-size: 14px;
      color: #00a884;
      font-weight: 500;
      position: sticky;
      top: 0;
    }
    
    .contact-item {
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
        position: relative;
        flex-shrink: 0;
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .online-dot {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 12px;
          height: 12px;
          background: #31a24c;
          border: 2px solid white;
          border-radius: 50%;
        }
      }
      
      .contact-info {
        flex: 1;
        min-width: 0;
        
        h4 {
          margin: 0 0 4px;
          font-size: 16px;
          font-weight: 500;
        }
        
        p {
          margin: 0;
          font-size: 14px;
          color: #667781;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 40px;
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
        margin: 0 0 20px;
        font-size: 14px;
        color: #667781;
      }
      
      .btn-primary {
        background: #00a884;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 24px;
        font-size: 14px;
        cursor: pointer;
        
        &:hover {
          background: #06cf9c;
        }
      }
    }
  }
  
  .loading-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e9edef;
      border-top-color: #00a884;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }
    
    p {
      color: #667781;
      font-size: 14px;
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
  
  .contact-detail-modal {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 400px;
    max-height: 85vh;
    overflow-y: auto;
    
    .modal-header {
      display: flex;
      justify-content: flex-end;
      padding: 12px 16px;
      
      .btn-icon {
        background: none;
        border: none;
        cursor: pointer;
        color: #54656f;
        padding: 4px;
      }
    }
    
    .contact-header {
      text-align: center;
      padding: 0 24px 24px;
      
      .avatar.large {
        width: 100px;
        height: 100px;
        border-radius: 50%;
        overflow: hidden;
        margin: 0 auto 16px;
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
      
      h2 {
        margin: 0 0 4px;
        font-size: 22px;
      }
      
      .phone {
        margin: 0 0 4px;
        font-size: 14px;
        color: #667781;
      }
      
      .status {
        margin: 0;
        font-size: 14px;
        color: #00a884;
      }
    }
    
    .action-buttons {
      display: flex;
      justify-content: center;
      gap: 16px;
      padding: 0 24px 24px;
      
      .btn-action {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 12px 20px;
        border: none;
        border-radius: 12px;
        background: #f0f2f5;
        color: #00a884;
        font-size: 13px;
        cursor: pointer;
        
        &:hover {
          background: #e9edef;
        }
      }
    }
    
    .contact-details {
      padding: 0 24px;
      
      .detail-section {
        padding: 12px 0;
        border-top: 1px solid #e9edef;
        
        h4 {
          margin: 0 0 4px;
          font-size: 12px;
          color: #667781;
          text-transform: uppercase;
        }
        
        p {
          margin: 0;
          font-size: 15px;
          color: #111b21;
        }
      }
    }
    
    .danger-actions {
      padding: 16px 24px;
      border-top: 8px solid #f0f2f5;
      
      .btn-text {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        background: none;
        border: none;
        font-size: 15px;
        cursor: pointer;
        
        &.danger {
          color: #ea4335;
        }
      }
    }
  }
  
  .add-contact-modal {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 400px;
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
    
    .add-contact-form {
      padding: 20px;
      
      .form-group {
        margin-bottom: 20px;
        
        label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          color: #667781;
        }
        
        input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid #e9edef;
          border-radius: 8px;
          font-size: 15px;
          outline: none;
          
          &:focus {
            border-color: #00a884;
          }
        }
        
        .phone-input {
          display: flex;
          gap: 8px;
          
          select {
            padding: 12px;
            border: 1px solid #e9edef;
            border-radius: 8px;
            font-size: 15px;
            outline: none;
            background: white;
            
            &:focus {
              border-color: #00a884;
            }
          }
          
          input {
            flex: 1;
          }
        }
      }
      
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding-top: 12px;
        
        .btn {
          padding: 10px 24px;
          border-radius: 24px;
          font-size: 14px;
          cursor: pointer;
          
          &.btn-cancel {
            background: #f0f2f5;
            border: none;
            color: #54656f;
          }
          
          &.btn-save {
            background: #00a884;
            border: none;
            color: white;
            
            &:hover:not(:disabled) {
              background: #06cf9c;
            }
            
            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          }
        }
      }
    }
  }
}

// Animations
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

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
