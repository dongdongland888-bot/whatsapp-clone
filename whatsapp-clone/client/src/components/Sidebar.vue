<template>
  <div class="sidebar">
    <!-- User Profile Header -->
    <div class="sidebar-header">
      <div class="user-profile" @click="goToProfile">
        <div class="avatar">
          <img :src="currentUser?.avatar || '/default-avatar.png'" alt="Avatar" />
        </div>
      </div>
      <div class="header-actions">
        <button @click="openCommunities" class="btn btn-icon" title="Communities">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87"/>
            <path d="M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </button>
        <button @click="openStatus" class="btn btn-icon" title="Status">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </button>
        <button @click="openNewChat" class="btn btn-icon" title="New Chat">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            <line x1="12" y1="8" x2="12" y2="14"/>
            <line x1="9" y1="11" x2="15" y2="11"/>
          </svg>
        </button>
        <div class="menu-container" ref="menuContainer">
          <button @click="toggleMenu" class="btn btn-icon" title="Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="6" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="18" r="2"/>
            </svg>
          </button>
          <transition name="fade">
            <div v-if="showMenu" class="dropdown-menu">
              <div class="menu-item" @click="openNewGroup">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                  <path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
                <span>New Group</span>
              </div>
              <div class="menu-item" @click="openStarredMessages">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <span>Starred Messages</span>
              </div>
              <div class="menu-item" @click="openSettings">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
                <span>Settings</span>
              </div>
              <div class="menu-item" @click="toggleTheme">
                <svg v-if="isDarkMode" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                </svg>
                <span>{{ isDarkMode ? 'Light Mode' : 'Dark Mode' }}</span>
              </div>
              <div class="menu-divider"></div>
              <div class="menu-item danger" @click="logout">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Logout</span>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="sidebar-nav">
      <div 
        v-for="tab in tabs" 
        :key="tab.name"
        :class="['nav-item', { active: activeTab === tab.name }]"
        @click="switchTab(tab.name)"
      >
        <div class="nav-icon">
          <component :is="tab.icon" />
          <span v-if="tab.badge" class="badge">{{ tab.badge }}</span>
        </div>
        <span class="nav-label">{{ tab.label }}</span>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="search-bar">
      <div class="search-input-wrapper">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input 
          type="text" 
          placeholder="Search or start new chat" 
          v-model="searchQuery"
          @focus="isSearching = true"
          @blur="onSearchBlur"
        />
        <button v-if="searchQuery" class="btn btn-icon clear-btn" @click="clearSearch">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <button v-if="!isSearching" class="btn btn-icon filter-btn" @click="toggleFilter">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
      </button>
    </div>

    <!-- Filter Chips -->
    <transition name="slide-down">
      <div v-if="showFilters" class="filter-chips">
        <button 
          :class="['chip', { active: activeFilter === 'all' }]"
          @click="setFilter('all')"
        >
          All
        </button>
        <button 
          :class="['chip', { active: activeFilter === 'unread' }]"
          @click="setFilter('unread')"
        >
          Unread
        </button>
        <button 
          :class="['chip', { active: activeFilter === 'groups' }]"
          @click="setFilter('groups')"
        >
          Groups
        </button>
      </div>
    </transition>

    <!-- Tab Content -->
    <div class="tab-content">
      <!-- Chats Tab -->
      <div v-show="activeTab === 'chats'" class="chats-list">
        <div v-if="filteredContacts.length === 0" class="empty-state">
          <p v-if="searchQuery">No chats found for "{{ searchQuery }}"</p>
          <p v-else>No chats yet</p>
        </div>
        <div 
          v-for="contact in filteredContacts" 
          :key="contact.id"
          :class="['chat-item', { active: activeChat && activeChat.id === contact.id }]"
          @click="openChat(contact)"
        >
          <div class="avatar">
            <img :src="contact.avatar || '/default-avatar.png'" alt="Avatar" />
            <span v-if="contact.online" class="online-indicator"></span>
          </div>
          <div class="chat-info">
            <div class="chat-header">
              <h4>{{ contact.username }}</h4>
              <span :class="['timestamp', { unread: contact.unreadCount }]">
                {{ formatDate(contact.lastSeen) }}
              </span>
            </div>
            <div class="chat-preview">
              <span v-if="contact.isTyping" class="typing">typing...</span>
              <p v-else>
                <span v-if="contact.lastMessageSent" class="sent-indicator">
                  <svg width="16" height="16" viewBox="0 0 16 15" fill="currentColor">
                    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.32.32 0 0 0-.484.033l-.378.458a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.509z"/>
                    <path d="M1.499 6.41a.32.32 0 0 1 .484-.033l.358.325a.32.32 0 0 0 .484-.033l3.645-4.671a.366.366 0 0 1 .51-.064l.478.373a.365.365 0 0 1 .064.508L3.877 10.52a.32.32 0 0 1-.484.033l-1.87-1.787a.418.418 0 0 1-.036-.542l.012-.016z"/>
                  </svg>
                </span>
                {{ contact.lastMessage || 'No messages yet' }}
              </p>
              <span v-if="contact.unreadCount" class="unread-badge">{{ contact.unreadCount }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Communities Tab -->
      <div v-show="activeTab === 'communities'" class="communities-list">
        <div 
          v-for="group in filteredGroups" 
          :key="group.id"
          :class="['group-item', { active: activeGroup && activeGroup.id === group.id }]"
          @click="openGroup(group)"
        >
          <div class="avatar">
            <img :src="group.avatar || '/default-group.png'" alt="Group Avatar" />
          </div>
          <div class="group-info">
            <h4>{{ group.name }}</h4>
            <p>{{ group.member_count }} members</p>
          </div>
        </div>
        <div v-if="filteredGroups.length === 0" class="empty-state">
          <p>No groups yet</p>
          <button class="btn btn-link" @click="openNewGroup">Create a group</button>
        </div>
      </div>

      <!-- Calls Tab -->
      <div v-show="activeTab === 'calls'" class="calls-tab">
        <div class="calls-header">
          <button class="btn btn-link" @click="goToCallHistory">
            View all calls
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
        <div class="calls-list">
          <div 
            v-for="call in recentCalls" 
            :key="call.id"
            class="call-item"
            @click="viewCallDetails(call)"
          >
            <div class="avatar">
              <img :src="call.contact.avatar || '/default-avatar.png'" alt="Avatar" />
            </div>
            <div class="call-info">
              <h4 :class="{ missed: call.status === 'missed' }">{{ call.contact.username }}</h4>
              <div class="call-details">
                <span :class="['call-icon', call.direction]">
                  <svg v-if="call.direction === 'incoming'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="17 12 7 12"/>
                    <polyline points="12 7 7 12 12 17"/>
                  </svg>
                  <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="7 12 17 12"/>
                    <polyline points="12 17 17 12 12 7"/>
                  </svg>
                </span>
                <span>{{ formatDate(call.timestamp) }}</span>
              </div>
            </div>
            <button class="btn btn-icon call-btn" @click.stop="makeCall(call.contact, call.type)">
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
        <div v-if="recentCalls.length === 0" class="empty-state">
          <p>No recent calls</p>
        </div>
      </div>

      <!-- Contacts Tab -->
      <div v-show="activeTab === 'contacts'" class="contacts-tab">
        <div class="contacts-header">
          <button class="btn btn-link" @click="goToContacts">
            Manage contacts
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
        <div class="contacts-list-preview">
          <div 
            v-for="contact in previewContacts"
            :key="contact.id"
            class="contact-item"
            @click="openChat(contact)"
          >
            <div class="avatar">
              <img :src="contact.avatar || '/default-avatar.png'" alt="Avatar" />
              <span v-if="contact.online" class="online-indicator"></span>
            </div>
            <div class="contact-info">
              <h4>{{ contact.username }}</h4>
              <p>{{ contact.status || 'Hey there!' }}</p>
            </div>
          </div>
        </div>
        <div v-if="previewContacts.length === 0" class="empty-state">
          <p>No contacts yet</p>
          <button class="btn btn-link" @click="goToContacts">Add contacts</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, onMounted, onUnmounted, h } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import { useTheme } from '../composables/useTheme';

// Icon components
const ChatIcon = () => h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('path', { d: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' })
]);

const CommunityIcon = () => h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('path', { d: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' }),
  h('circle', { cx: 9, cy: 7, r: 4 }),
  h('path', { d: 'M23 21v-2a4 4 0 00-3-3.87' }),
  h('path', { d: 'M16 3.13a4 4 0 010 7.75' })
]);

const PhoneIcon = () => h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('path', { d: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z' })
]);

const ContactIcon = () => h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('path', { d: 'M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2' }),
  h('circle', { cx: 8.5, cy: 7, r: 4 }),
  h('line', { x1: 20, y1: 8, x2: 20, y2: 14 }),
  h('line', { x1: 23, y1: 11, x2: 17, y2: 11 })
]);

export default {
  name: 'Sidebar',
  emits: ['close'],
  setup(props, { emit }) {
    const store = useStore();
    const router = useRouter();
    const { actualTheme, toggleTheme: themeToggle, isDark } = useTheme();
    
    // Theme state
    const isDarkMode = computed(() => isDark());
    
    // State
    const activeTab = ref('chats');
    const searchQuery = ref('');
    const isSearching = ref(false);
    const showFilters = ref(false);
    const activeFilter = ref('all');
    const showMenu = ref(false);
    const menuContainer = ref(null);
    
    // Tab configuration with icons
    const tabs = computed(() => [
      { name: 'chats', label: 'Chats', icon: ChatIcon, badge: unreadTotal.value || null },
      { name: 'communities', label: 'Groups', icon: CommunityIcon },
      { name: 'calls', label: 'Calls', icon: PhoneIcon },
      { name: 'contacts', label: 'Contacts', icon: ContactIcon }
    ]);
    
    // Store getters
    const currentUser = computed(() => store.getters['auth/currentUser'] || { username: 'User' });
    const activeChat = computed(() => store.getters['chat/activeContact']);
    const activeGroup = computed(() => null);
    
    // Mock data
    const mockContacts = ref([
      { id: 1, username: 'John Doe', avatar: null, lastMessage: 'Hey, how are you?', lastSeen: new Date(), online: true, unreadCount: 2 },
      { id: 2, username: 'Jane Smith', avatar: null, lastMessage: 'See you tomorrow!', lastSeen: new Date(Date.now() - 3600000), lastMessageSent: true },
      { id: 3, username: 'Bob Johnson', avatar: null, lastMessage: 'Thanks for the help', lastSeen: new Date(Date.now() - 86400000), online: true },
      { id: 4, username: 'Alice Williams', avatar: null, lastMessage: 'Sounds good!', lastSeen: new Date(Date.now() - 172800000), unreadCount: 5 },
      { id: 5, username: 'Charlie Brown', avatar: null, isTyping: true, lastSeen: new Date() }
    ]);
    
    const mockGroups = ref([
      { id: 1, name: 'Family Group', avatar: null, member_count: 8 },
      { id: 2, name: 'Work Team', avatar: null, member_count: 12 },
      { id: 3, name: 'Friends Hangout', avatar: null, member_count: 6 }
    ]);
    
    const mockCalls = ref([
      { id: 1, contact: mockContacts.value[0], type: 'voice', direction: 'outgoing', status: 'completed', timestamp: new Date(Date.now() - 3600000) },
      { id: 2, contact: mockContacts.value[1], type: 'video', direction: 'incoming', status: 'missed', timestamp: new Date(Date.now() - 7200000) },
      { id: 3, contact: mockContacts.value[2], type: 'voice', direction: 'incoming', status: 'completed', timestamp: new Date(Date.now() - 86400000) }
    ]);
    
    // Computed
    const unreadTotal = computed(() => {
      return mockContacts.value.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    });
    
    const filteredContacts = computed(() => {
      let result = mockContacts.value;
      
      // Apply search
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(c => c.username.toLowerCase().includes(query));
      }
      
      // Apply filter
      if (activeFilter.value === 'unread') {
        result = result.filter(c => c.unreadCount > 0);
      } else if (activeFilter.value === 'groups') {
        result = []; // Groups are in separate tab
      }
      
      return result;
    });
    
    const filteredGroups = computed(() => {
      if (!searchQuery.value) return mockGroups.value;
      const query = searchQuery.value.toLowerCase();
      return mockGroups.value.filter(g => g.name.toLowerCase().includes(query));
    });
    
    const recentCalls = computed(() => mockCalls.value.slice(0, 5));
    
    const previewContacts = computed(() => mockContacts.value.slice(0, 5));
    
    // Methods
    const switchTab = (tabName) => {
      activeTab.value = tabName;
      showFilters.value = false;
    };
    
    const openChat = (contact) => {
      store.commit('chat/SET_ACTIVE_CHAT', contact);
      router.push(`/chat/${contact.id}`);
    };
    
    const openGroup = (group) => {
      router.push(`/groups/${group.id}`);
    };
    
    const goToProfile = () => {
      router.push('/profile');
    };
    
    const goToCallHistory = () => {
      router.push('/calls');
    };
    
    const goToContacts = () => {
      router.push('/contacts');
    };
    
    const logout = () => {
      store.dispatch('auth/logout');
      router.push('/login');
      showMenu.value = false;
    };
    
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      const now = new Date();
      const diff = now - d;
      
      // Today
      if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      
      // Yesterday
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }
      
      // Within a week
      if (diff < 7 * 24 * 60 * 60 * 1000) {
        return d.toLocaleDateString([], { weekday: 'short' });
      }
      
      // Older
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };
    
    const toggleMenu = () => {
      showMenu.value = !showMenu.value;
    };
    
    const toggleFilter = () => {
      showFilters.value = !showFilters.value;
    };
    
    const setFilter = (filter) => {
      activeFilter.value = filter;
    };
    
    const clearSearch = () => {
      searchQuery.value = '';
    };
    
    const onSearchBlur = () => {
      setTimeout(() => {
        if (!searchQuery.value) {
          isSearching.value = false;
        }
      }, 200);
    };
    
    // Menu items actions
    const openNewChat = () => {
      // TODO: Open new chat dialog
      console.log('Open new chat');
    };
    
    const openNewGroup = () => {
      router.push('/groups/new');
      showMenu.value = false;
    };
    
    const openCommunities = () => {
      activeTab.value = 'communities';
    };
    
    const openStatus = () => {
      // TODO: Open status view
      console.log('Open status');
    };
    
    const openStarredMessages = () => {
      // TODO: Open starred messages
      console.log('Open starred messages');
      showMenu.value = false;
    };
    
    const openSettings = () => {
      router.push('/profile');
      showMenu.value = false;
    };
    
    const toggleTheme = () => {
      themeToggle();
      showMenu.value = false;
    };
    
    const viewCallDetails = (call) => {
      router.push('/calls');
    };
    
    const makeCall = (contact, type) => {
      store.dispatch('chat/startCall', {
        userToCall: contact.id,
        type: type
      });
    };
    
    // Click outside handler for menu
    const handleClickOutside = (event) => {
      if (showMenu.value && menuContainer.value && !menuContainer.value.contains(event.target)) {
        showMenu.value = false;
      }
    };
    
    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
      store.dispatch('groups/fetchGroups');
    });
    
    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });
    
    return {
      activeTab,
      searchQuery,
      isSearching,
      showFilters,
      activeFilter,
      showMenu,
      menuContainer,
      tabs,
      currentUser,
      activeChat,
      activeGroup,
      filteredContacts,
      filteredGroups,
      recentCalls,
      previewContacts,
      isDarkMode,
      switchTab,
      openChat,
      openGroup,
      goToProfile,
      goToCallHistory,
      goToContacts,
      logout,
      formatDate,
      toggleMenu,
      toggleFilter,
      setFilter,
      clearSearch,
      onSearchBlur,
      openNewChat,
      openNewGroup,
      openCommunities,
      openStatus,
      openStarredMessages,
      openSettings,
      toggleTheme,
      viewCallDetails,
      makeCall
    };
  }
};
</script>

<style lang="scss" scoped>
.sidebar {
  width: 30%;
  min-width: 300px;
  max-width: 400px;
  background-color: var(--bg-primary);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  transition: background-color var(--transition-normal), border-color var(--transition-normal);
  
  @media (max-width: 767px) {
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }
  
  .sidebar-header {
    padding: 10px 16px;
    background-color: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    .user-profile {
      cursor: pointer;
      
      .avatar {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-full);
        overflow: hidden;
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
    }
    
    .header-actions {
      display: flex;
      gap: 4px;
      
      .btn-icon {
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: var(--radius-full);
        color: var(--icon-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color var(--transition-fast);
        
        &:hover {
          background-color: var(--bg-hover);
        }
      }
      
      .menu-container {
        position: relative;
        
        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: var(--bg-dropdown);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          min-width: 200px;
          padding: 8px 0;
          z-index: var(--z-dropdown);
          
          .menu-item {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 12px 20px;
            cursor: pointer;
            color: var(--text-primary);
            font-size: 14px;
            transition: background-color var(--transition-fast);
            
            &:hover {
              background: var(--bg-hover);
            }
            
            &.danger {
              color: var(--status-error);
            }
            
            svg {
              flex-shrink: 0;
            }
          }
          
          .menu-divider {
            height: 1px;
            background: var(--border-light);
            margin: 4px 0;
          }
        }
      }
    }
  }
  
  .sidebar-nav {
    display: flex;
    border-bottom: 1px solid var(--border-light);
    background: var(--bg-secondary);
    
    .nav-item {
      flex: 1;
      padding: 12px 0 10px;
      text-align: center;
      cursor: pointer;
      position: relative;
      color: var(--text-secondary);
      transition: color var(--transition-fast);
      
      &:hover {
        color: var(--primary);
      }
      
      &.active {
        color: var(--primary);
        
        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 20%;
          right: 20%;
          height: 3px;
          background-color: var(--primary);
          border-radius: 3px 3px 0 0;
        }
      }
      
      .nav-icon {
        position: relative;
        display: inline-flex;
        margin-bottom: 2px;
        
        .badge {
          position: absolute;
          top: -6px;
          right: -10px;
          background: var(--primary);
          color: var(--text-light);
          font-size: 11px;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
        }
      }
      
      .nav-label {
        display: block;
        font-size: 11px;
        margin-top: 2px;
      }
    }
  }
  
  .search-bar {
    padding: 8px 12px;
    background-color: var(--bg-secondary);
    display: flex;
    gap: 8px;
    
    .search-input-wrapper {
      flex: 1;
      display: flex;
      align-items: center;
      background: var(--bg-input);
      border-radius: var(--radius-md);
      padding: 0 12px;
      
      svg {
        color: var(--icon-secondary);
        flex-shrink: 0;
      }
      
      input {
        flex: 1;
        border: none;
        padding: 9px 12px;
        font-size: 14px;
        outline: none;
        background: transparent;
        color: var(--text-primary);
        
        &::placeholder {
          color: var(--text-tertiary);
        }
      }
      
      .clear-btn {
        padding: 4px;
        margin: -4px;
        background: none;
        border: none;
        color: var(--text-tertiary);
        cursor: pointer;
        transition: color var(--transition-fast);
        
        &:hover {
          color: var(--icon-primary);
        }
      }
    }
    
    .filter-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: var(--radius-full);
      color: var(--icon-primary);
      transition: background-color var(--transition-fast);
      
      &:hover {
        background: var(--bg-hover);
      }
    }
  }
  
  .filter-chips {
    display: flex;
    gap: 8px;
    padding: 0 12px 10px;
    background: var(--bg-secondary);
    
    .chip {
      padding: 6px 14px;
      border-radius: var(--radius-xl);
      border: none;
      background: var(--bg-input);
      color: var(--text-secondary);
      font-size: 13px;
      cursor: pointer;
      transition: all var(--transition-fast);
      
      &:hover {
        background: var(--bg-tertiary);
      }
      
      &.active {
        background: var(--msg-sent-bg);
        color: var(--primary);
      }
    }
  }
  
  .tab-content {
    flex: 1;
    overflow-y: auto;
    
    .empty-state {
      padding: 40px 20px;
      text-align: center;
      color: var(--text-secondary);
      
      p {
        margin: 0 0 12px;
      }
      
      .btn-link {
        background: none;
        border: none;
        color: var(--primary);
        font-size: 14px;
        cursor: pointer;
        
        &:hover {
          text-decoration: underline;
        }
      }
    }
    
    .chats-list, .communities-list {
      .chat-item, .group-item {
        display: flex;
        align-items: center;
        padding: 10px 16px;
        cursor: pointer;
        border-bottom: 1px solid var(--border-light);
        transition: background-color var(--transition-fast);
        
        &:hover {
          background-color: var(--bg-hover);
        }
        
        &.active {
          background-color: var(--bg-active);
        }
        
        .avatar {
          width: 50px;
          height: 50px;
          border-radius: var(--radius-full);
          overflow: hidden;
          margin-right: 14px;
          position: relative;
          flex-shrink: 0;
          
          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          .online-indicator {
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 12px;
            height: 12px;
            background: var(--status-online);
            border: 2px solid var(--bg-primary);
            border-radius: var(--radius-full);
          }
        }
        
        .chat-info, .group-info {
          flex: 1;
          min-width: 0;
          
          .chat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2px;
            
            h4 {
              font-size: 16px;
              margin: 0;
              font-weight: 500;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              color: var(--text-primary);
            }
            
            .timestamp {
              font-size: 12px;
              color: var(--text-secondary);
              flex-shrink: 0;
              margin-left: 8px;
              
              &.unread {
                color: var(--primary);
              }
            }
          }
          
          .chat-preview {
            display: flex;
            align-items: center;
            
            .typing {
              color: var(--status-typing);
              font-size: 14px;
            }
            
            p {
              margin: 0;
              font-size: 14px;
              color: var(--text-secondary);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              flex: 1;
              
              .sent-indicator {
                color: var(--tick-read);
                margin-right: 2px;
                vertical-align: middle;
              }
            }
            
            .unread-badge {
              background: var(--primary);
              color: var(--text-light);
              font-size: 12px;
              min-width: 20px;
              height: 20px;
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 0 6px;
              margin-left: 8px;
              flex-shrink: 0;
            }
          }
          
          h4 {
            font-size: 16px;
            margin: 0 0 2px;
            font-weight: 500;
            color: var(--text-primary);
          }
          
          p {
            margin: 0;
            font-size: 14px;
            color: var(--text-secondary);
          }
        }
      }
    }
    
    .calls-tab, .contacts-tab {
      .calls-header, .contacts-header {
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-light);
        
        .btn-link {
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          color: var(--primary);
          font-size: 14px;
          cursor: pointer;
          padding: 0;
          
          &:hover {
            text-decoration: underline;
          }
        }
      }
      
      .calls-list, .contacts-list-preview {
        .call-item, .contact-item {
          display: flex;
          align-items: center;
          padding: 10px 16px;
          cursor: pointer;
          border-bottom: 1px solid var(--border-light);
          transition: background-color var(--transition-fast);
          
          &:hover {
            background-color: var(--bg-hover);
          }
          
          .avatar {
            width: 50px;
            height: 50px;
            border-radius: var(--radius-full);
            overflow: hidden;
            margin-right: 14px;
            position: relative;
            flex-shrink: 0;
            
            img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            
            .online-indicator {
              position: absolute;
              bottom: 2px;
              right: 2px;
              width: 12px;
              height: 12px;
              background: var(--status-online);
              border: 2px solid var(--bg-primary);
              border-radius: var(--radius-full);
            }
          }
          
          .call-info, .contact-info {
            flex: 1;
            min-width: 0;
            
            h4 {
              margin: 0 0 4px;
              font-size: 16px;
              font-weight: 500;
              color: var(--text-primary);
              
              &.missed {
                color: var(--status-error);
              }
            }
            
            .call-details {
              display: flex;
              align-items: center;
              gap: 6px;
              color: var(--text-secondary);
              font-size: 13px;
              
              .call-icon {
                &.incoming svg {
                  color: var(--primary);
                }
                &.outgoing svg {
                  color: var(--text-secondary);
                }
              }
            }
            
            p {
              margin: 0;
              font-size: 14px;
              color: var(--text-secondary);
            }
          }
          
          .call-btn {
            background: none;
            border: none;
            padding: 8px;
            border-radius: var(--radius-full);
            color: var(--primary);
            cursor: pointer;
            transition: background-color var(--transition-fast);
            
            &:hover {
              background: var(--bg-active);
            }
          }
        }
      }
    }
  }
}

// Animations
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-fast);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all var(--transition-normal);
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
