<template>
  <div class="chat-container">
    <!-- Chat Header -->
    <div class="chat-header">
      <div class="contact-info">
        <button class="btn btn-icon back-btn" @click="goBack">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="avatar" @click="openProfile">
          <img :src="activeChat?.avatar || '/default-avatar.png'" alt="Avatar" />
          <span v-if="isOnline" class="online-indicator"></span>
        </div>
        <div class="info" @click="openProfile">
          <h3>{{ activeChat?.username || 'Select a chat' }}</h3>
          <p v-if="typingUsers.length > 0" class="typing-text">
            {{ typingText }}
          </p>
          <p v-else-if="isOnline">Online</p>
          <p v-else>Last seen {{ lastSeenText }}</p>
        </div>
      </div>
      <div class="header-actions">
        <button @click="startVoiceCall" class="btn btn-icon" title="Voice Call">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
          </svg>
        </button>
        <button @click="startVideoCall" class="btn btn-icon" title="Video Call">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </button>
        <button @click="toggleSearchMessages" class="btn btn-icon" title="Search">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
        <button @click="toggleMenu" class="btn btn-icon" title="Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="6" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="12" cy="18" r="2"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Search Messages Panel -->
    <transition name="slide-down">
      <div v-if="showSearchMessages" class="search-messages-panel">
        <div class="search-input-wrapper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input 
            v-model="searchMessagesQuery" 
            type="text" 
            placeholder="Search messages..."
            @input="searchMessages"
            ref="searchInput"
          />
          <button class="btn btn-icon" @click="toggleSearchMessages">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div v-if="searchResults.length > 0" class="search-results">
          <span class="results-count">{{ searchResults.length }} messages found</span>
          <button class="btn btn-icon" @click="navigateSearchResult(-1)" :disabled="currentSearchIndex <= 0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
          <span>{{ currentSearchIndex + 1 }} / {{ searchResults.length }}</span>
          <button class="btn btn-icon" @click="navigateSearchResult(1)" :disabled="currentSearchIndex >= searchResults.length - 1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
      </div>
    </transition>

    <!-- Reply Preview Bar -->
    <transition name="slide-down">
      <div v-if="replyingTo" class="reply-bar">
        <div class="reply-content">
          <div class="reply-indicator"></div>
          <div class="reply-info">
            <span class="reply-sender">
              {{ replyingTo.sender_id === currentUser?.id ? 'You' : replyingTo.sender_name }}
            </span>
            <p class="reply-text">{{ getReplyPreviewText(replyingTo) }}</p>
          </div>
        </div>
        <button class="btn btn-icon close-reply" @click="cancelReply">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </transition>

    <!-- Messages Area -->
    <div 
      class="messages-area" 
      ref="messagesArea"
      @scroll="handleScroll"
    >
      <!-- Load More Messages -->
      <div v-if="hasMoreMessages" class="load-more">
        <button @click="loadMoreMessages" :disabled="loadingMore" class="btn btn-load-more">
          {{ loadingMore ? 'Loading...' : 'Load earlier messages' }}
        </button>
      </div>

      <!-- Date Dividers and Messages -->
      <template v-for="(group, date) in groupedMessages" :key="date">
        <div class="date-divider">
          <span>{{ formatDateDivider(date) }}</span>
        </div>
        
        <MessageBubble
          v-for="message in group"
          :key="message.id"
          :message="message"
          :current-user-id="currentUser?.id"
          :is-group-chat="false"
          :show-sender-name="false"
          :is-selected="selectedMessages.includes(message.id)"
          @reply="handleReply"
          @forward="handleForward"
          @edit="handleEdit"
          @delete="handleDelete"
          @scroll-to="scrollToMessage"
          @select="toggleMessageSelection"
          :id="'message-' + message.id"
        />
      </template>

      <!-- Scroll to Bottom Button -->
      <transition name="fade">
        <button 
          v-if="showScrollButton"
          class="scroll-to-bottom-btn"
          @click="scrollToBottom"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
        </button>
      </transition>
    </div>

    <!-- Message Input Area -->
    <div class="message-input-area">
      <div class="input-row">
        <!-- Media Uploader -->
        <MediaUploader 
          @send-media="handleSendMedia"
          @upload-error="handleUploadError"
        />

        <!-- Emoji Picker -->
        <EmojiPicker @select="insertEmoji" />

        <!-- Message Input -->
        <div class="input-wrapper">
          <textarea 
            ref="messageInput"
            v-model="newMessage" 
            placeholder="Type a message..."
            @keydown="handleKeyDown"
            @input="handleInput"
            @focus="handleFocus"
            @blur="handleBlur"
            rows="1"
          ></textarea>
        </div>

        <!-- Voice Recorder or Send Button -->
        <VoiceRecorder 
          v-if="!newMessage.trim() && !showSendButton"
          @send="handleSendVoice"
          @recording-start="handleRecordingStart"
          @recording-stop="handleRecordingStop"
          @error="handleRecordingError"
        />
        
        <button 
          v-else
          @click="sendMessage"
          class="btn btn-send"
          :disabled="!newMessage.trim()"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Edit Message Modal -->
    <transition name="fade">
      <div v-if="editingMessage" class="edit-modal" @click.self="cancelEdit">
        <div class="edit-container">
          <div class="edit-header">
            <h3>Edit Message</h3>
            <button class="btn btn-icon" @click="cancelEdit">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="edit-content">
            <textarea 
              v-model="editedContent"
              ref="editInput"
              rows="4"
            ></textarea>
          </div>
          <div class="edit-actions">
            <button class="btn btn-cancel" @click="cancelEdit">Cancel</button>
            <button class="btn btn-save" @click="saveEdit" :disabled="!editedContent.trim()">
              Save
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Delete Confirmation Modal -->
    <transition name="fade">
      <div v-if="deletingMessage" class="delete-modal" @click.self="cancelDelete">
        <div class="delete-container">
          <h3>Delete Message?</h3>
          <p>This action cannot be undone.</p>
          <div class="delete-actions">
            <button class="btn btn-cancel" @click="cancelDelete">Cancel</button>
            <button class="btn btn-delete" @click="confirmDelete">Delete</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import MessageBubble from '../components/chat/MessageBubble.vue';
import EmojiPicker from '../components/chat/EmojiPicker.vue';
import VoiceRecorder from '../components/chat/VoiceRecorder.vue';
import MediaUploader from '../components/chat/MediaUploader.vue';

export default {
  name: 'Chat',
  components: {
    MessageBubble,
    EmojiPicker,
    VoiceRecorder,
    MediaUploader
  },
  setup() {
    const store = useStore();
    const route = useRoute();
    const router = useRouter();
    
    // Refs
    const messagesArea = ref(null);
    const messageInput = ref(null);
    const searchInput = ref(null);
    const editInput = ref(null);
    
    // Message state
    const newMessage = ref('');
    const showSendButton = ref(false);
    const replyingTo = ref(null);
    const editingMessage = ref(null);
    const editedContent = ref('');
    const deletingMessage = ref(null);
    const selectedMessages = ref([]);
    
    // UI state
    const showSearchMessages = ref(false);
    const searchMessagesQuery = ref('');
    const searchResults = ref([]);
    const currentSearchIndex = ref(0);
    const showScrollButton = ref(false);
    const unreadCount = ref(0);
    const loadingMore = ref(false);
    const hasMoreMessages = ref(true);
    
    // Typing state
    const typingTimeout = ref(null);
    const isTypingLocally = ref(false);
    const typingUsers = ref([]);
    
    // Computed
    const activeChat = computed(() => store.getters['chat/activeContact']);
    const messages = computed(() => store.getters['chat/currentMessages'] || []);
    const currentUser = computed(() => store.getters['auth/currentUser']);
    const isOnline = computed(() => activeChat.value?.online || false);
    
    const lastSeenText = computed(() => {
      if (!activeChat.value?.last_seen) return 'recently';
      const lastSeen = new Date(activeChat.value.last_seen);
      const now = new Date();
      const diff = now - lastSeen;
      
      if (diff < 60000) return 'just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
      if (diff < 86400000) return lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return lastSeen.toLocaleDateString();
    });
    
    const typingText = computed(() => {
      if (typingUsers.value.length === 0) return '';
      if (typingUsers.value.length === 1) return `${typingUsers.value[0]} is typing...`;
      return `${typingUsers.value.length} people are typing...`;
    });
    
    // Group messages by date
    const groupedMessages = computed(() => {
      const groups = {};
      for (const message of messages.value) {
        const date = new Date(message.created_at).toDateString();
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(message);
      }
      return groups;
    });
    
    // Format date divider
    const formatDateDivider = (dateStr) => {
      const date = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString(undefined, { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
      }
    };
    
    // Get reply preview text
    const getReplyPreviewText = (message) => {
      if (message.message_type !== 'text') {
        const typeLabels = {
          image: '📷 Photo',
          video: '🎬 Video',
          audio: '🎤 Voice message',
          document: '📄 Document'
        };
        return typeLabels[message.message_type] || 'Media';
      }
      const content = message.content || '';
      return content.length > 60 ? content.slice(0, 60) + '...' : content;
    };
    
    // Navigation
    const goBack = () => {
      router.push('/');
    };
    
    const openProfile = () => {
      // TODO: Open contact profile
      console.log('Open profile');
    };
    
    // Scroll handling
    const scrollToBottom = async (smooth = true) => {
      await nextTick();
      if (messagesArea.value) {
        messagesArea.value.scrollTo({
          top: messagesArea.value.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
      showScrollButton.value = false;
      unreadCount.value = 0;
    };
    
    const handleScroll = () => {
      if (!messagesArea.value) return;
      
      const { scrollTop, scrollHeight, clientHeight } = messagesArea.value;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      showScrollButton.value = !isAtBottom;
      
      // Load more when at top
      if (scrollTop < 50 && !loadingMore.value && hasMoreMessages.value) {
        // loadMoreMessages();
      }
    };
    
    const scrollToMessage = (messageId) => {
      const element = document.getElementById(`message-${messageId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight');
        setTimeout(() => element.classList.remove('highlight'), 2000);
      }
    };
    
    // Message sending
    const sendMessage = async () => {
      if (!newMessage.value.trim()) return;
      
      const messageData = {
        receiver_id: activeChat.value?.id,
        content: newMessage.value.trim(),
        type: 'text',
        reply_to_id: replyingTo.value?.id || null
      };
      
      try {
        await store.dispatch('chat/sendMessage', messageData);
        newMessage.value = '';
        replyingTo.value = null;
        scrollToBottom();
        resizeTextarea();
        stopTypingIndicator();
      } catch (error) {
        console.error('Send message error:', error);
      }
    };
    
    // Handle key events
    const handleKeyDown = (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    };
    
    // Input handling
    const handleInput = () => {
      resizeTextarea();
      startTypingIndicator();
    };
    
    const resizeTextarea = () => {
      if (!messageInput.value) return;
      messageInput.value.style.height = 'auto';
      const newHeight = Math.min(messageInput.value.scrollHeight, 120);
      messageInput.value.style.height = newHeight + 'px';
    };
    
    // Typing indicator
    const startTypingIndicator = () => {
      if (!isTypingLocally.value) {
        isTypingLocally.value = true;
        store.dispatch('chat/startTyping', {
          roomId: getRoomId(),
          userId: currentUser.value?.id,
          userName: currentUser.value?.username
        });
      }
      
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value);
      }
      
      typingTimeout.value = setTimeout(stopTypingIndicator, 2000);
    };
    
    const stopTypingIndicator = () => {
      if (isTypingLocally.value) {
        isTypingLocally.value = false;
        store.dispatch('chat/stopTyping', {
          roomId: getRoomId(),
          userId: currentUser.value?.id
        });
      }
      
      if (typingTimeout.value) {
        clearTimeout(typingTimeout.value);
        typingTimeout.value = null;
      }
    };
    
    const handleFocus = () => {
      showSendButton.value = !!newMessage.value.trim();
    };
    
    const handleBlur = () => {
      setTimeout(() => {
        if (!newMessage.value.trim()) {
          showSendButton.value = false;
        }
      }, 200);
    };
    
    // Get room ID
    const getRoomId = () => {
      return `chat_${Math.min(currentUser.value?.id, activeChat.value?.id)}_${Math.max(currentUser.value?.id, activeChat.value?.id)}`;
    };
    
    // Insert emoji
    const insertEmoji = (emoji) => {
      const textarea = messageInput.value;
      if (!textarea) {
        newMessage.value += emoji;
        return;
      }
      
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = newMessage.value;
      
      newMessage.value = text.slice(0, start) + emoji + text.slice(end);
      
      nextTick(() => {
        textarea.focus();
        const newPos = start + emoji.length;
        textarea.setSelectionRange(newPos, newPos);
        resizeTextarea();
      });
    };
    
    // Reply handling
    const handleReply = (message) => {
      replyingTo.value = message;
      messageInput.value?.focus();
    };
    
    const cancelReply = () => {
      replyingTo.value = null;
    };
    
    // Edit handling
    const handleEdit = (message) => {
      editingMessage.value = message;
      editedContent.value = message.content;
      nextTick(() => {
        editInput.value?.focus();
      });
    };
    
    const cancelEdit = () => {
      editingMessage.value = null;
      editedContent.value = '';
    };
    
    const saveEdit = async () => {
      if (!editedContent.value.trim() || !editingMessage.value) return;
      
      try {
        await store.dispatch('chat/editMessage', {
          messageId: editingMessage.value.id,
          content: editedContent.value.trim()
        });
        cancelEdit();
      } catch (error) {
        console.error('Edit message error:', error);
      }
    };
    
    // Delete handling
    const handleDelete = (message) => {
      deletingMessage.value = message;
    };
    
    const cancelDelete = () => {
      deletingMessage.value = null;
    };
    
    const confirmDelete = async () => {
      if (!deletingMessage.value) return;
      
      try {
        await store.dispatch('chat/deleteMessage', deletingMessage.value.id);
        cancelDelete();
      } catch (error) {
        console.error('Delete message error:', error);
      }
    };
    
    // Forward handling
    const handleForward = (message) => {
      // TODO: Open forward modal
      console.log('Forward message:', message);
    };
    
    // Selection handling
    const toggleMessageSelection = (messageId) => {
      const index = selectedMessages.value.indexOf(messageId);
      if (index === -1) {
        selectedMessages.value.push(messageId);
      } else {
        selectedMessages.value.splice(index, 1);
      }
    };
    
    // Media handling
    const handleSendMedia = async ({ media, caption, type }) => {
      try {
        for (const mediaItem of media) {
          await store.dispatch('chat/sendMessage', {
            receiver_id: activeChat.value?.id,
            content: caption || '',
            type: type,
            media_url: mediaItem.url,
            media_type: mediaItem.mimeType,
            media_name: mediaItem.fileName,
            file_size: mediaItem.fileSize,
            reply_to_id: replyingTo.value?.id || null
          });
        }
        replyingTo.value = null;
        scrollToBottom();
      } catch (error) {
        console.error('Send media error:', error);
      }
    };
    
    const handleUploadError = ({ error }) => {
      console.error('Upload error:', error);
      // TODO: Show toast notification
    };
    
    // Voice handling
    const handleSendVoice = async ({ media, duration }) => {
      try {
        await store.dispatch('chat/sendMessage', {
          receiver_id: activeChat.value?.id,
          content: '',
          type: 'audio',
          media_url: media.url,
          media_type: 'audio/webm',
          duration: duration,
          reply_to_id: replyingTo.value?.id || null
        });
        replyingTo.value = null;
        scrollToBottom();
      } catch (error) {
        console.error('Send voice error:', error);
      }
    };
    
    const handleRecordingStart = () => {
      // Visual feedback
    };
    
    const handleRecordingStop = () => {
      // Visual feedback
    };
    
    const handleRecordingError = (error) => {
      console.error('Recording error:', error);
    };
    
    // Call handling
    const startVoiceCall = () => {
      store.dispatch('chat/startCall', {
        userToCall: activeChat.value?.id,
        type: 'voice'
      });
    };
    
    const startVideoCall = () => {
      store.dispatch('chat/startCall', {
        userToCall: activeChat.value?.id,
        type: 'video'
      });
    };
    
    // Search messages
    const toggleSearchMessages = () => {
      showSearchMessages.value = !showSearchMessages.value;
      if (showSearchMessages.value) {
        nextTick(() => searchInput.value?.focus());
      } else {
        searchMessagesQuery.value = '';
        searchResults.value = [];
      }
    };
    
    const searchMessages = () => {
      if (!searchMessagesQuery.value.trim()) {
        searchResults.value = [];
        return;
      }
      
      const query = searchMessagesQuery.value.toLowerCase();
      searchResults.value = messages.value.filter(msg => 
        msg.content?.toLowerCase().includes(query)
      );
      currentSearchIndex.value = searchResults.value.length > 0 ? searchResults.value.length - 1 : 0;
      
      if (searchResults.value.length > 0) {
        scrollToMessage(searchResults.value[currentSearchIndex.value].id);
      }
    };
    
    const navigateSearchResult = (direction) => {
      const newIndex = currentSearchIndex.value + direction;
      if (newIndex >= 0 && newIndex < searchResults.value.length) {
        currentSearchIndex.value = newIndex;
        scrollToMessage(searchResults.value[newIndex].id);
      }
    };
    
    // Load more messages
    const loadMoreMessages = async () => {
      if (loadingMore.value || !hasMoreMessages.value) return;
      
      loadingMore.value = true;
      try {
        const oldestMessage = messages.value[0];
        const result = await store.dispatch('chat/fetchMoreMessages', {
          chatId: route.params.id,
          before: oldestMessage?.id
        });
        hasMoreMessages.value = result.hasMore;
      } catch (error) {
        console.error('Load more error:', error);
      } finally {
        loadingMore.value = false;
      }
    };
    
    // Menu toggle
    const toggleMenu = () => {
      // TODO: Show dropdown menu
      console.log('Toggle menu');
    };
    
    // Watch for new messages
    watch(messages, (newMessages, oldMessages) => {
      if (newMessages.length > (oldMessages?.length || 0)) {
        const newMessage = newMessages[newMessages.length - 1];
        const isOwnMessage = newMessage.sender_id === currentUser.value?.id;
        
        if (isOwnMessage || !showScrollButton.value) {
          scrollToBottom();
        } else {
          unreadCount.value++;
        }
      }
    }, { deep: true });
    
    // Lifecycle
    onMounted(async () => {
      if (route.params.id) {
        store.dispatch('chat/joinChat', getRoomId());
        await store.dispatch('chat/fetchMessages', route.params.id);
        scrollToBottom(false);
      }
    });
    
    onUnmounted(() => {
      stopTypingIndicator();
      if (route.params.id) {
        store.dispatch('chat/leaveChat', getRoomId());
      }
    });
    
    return {
      // Refs
      messagesArea,
      messageInput,
      searchInput,
      editInput,
      
      // State
      newMessage,
      showSendButton,
      replyingTo,
      editingMessage,
      editedContent,
      deletingMessage,
      selectedMessages,
      showSearchMessages,
      searchMessagesQuery,
      searchResults,
      currentSearchIndex,
      showScrollButton,
      unreadCount,
      loadingMore,
      hasMoreMessages,
      typingUsers,
      
      // Computed
      activeChat,
      messages,
      currentUser,
      isOnline,
      lastSeenText,
      typingText,
      groupedMessages,
      
      // Methods
      formatDateDivider,
      getReplyPreviewText,
      goBack,
      openProfile,
      scrollToBottom,
      handleScroll,
      scrollToMessage,
      sendMessage,
      handleKeyDown,
      handleInput,
      handleFocus,
      handleBlur,
      insertEmoji,
      handleReply,
      cancelReply,
      handleEdit,
      cancelEdit,
      saveEdit,
      handleDelete,
      cancelDelete,
      confirmDelete,
      handleForward,
      toggleMessageSelection,
      handleSendMedia,
      handleUploadError,
      handleSendVoice,
      handleRecordingStart,
      handleRecordingStop,
      handleRecordingError,
      startVoiceCall,
      startVideoCall,
      toggleSearchMessages,
      searchMessages,
      navigateSearchResult,
      loadMoreMessages,
      toggleMenu
    };
  }
};
</script>

<style lang="scss" scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-chat);
  transition: background-color var(--transition-normal);
  
  .chat-header {
    padding: 10px 16px;
    background-color: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border-light);
    flex-shrink: 0;
    
    .contact-info {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      
      .back-btn {
        display: none;
        margin-right: 8px;
        
        @media (max-width: 767px) {
          display: flex;
        }
      }
      
      .avatar {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-full);
        overflow: hidden;
        margin-right: 12px;
        cursor: pointer;
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
          width: 10px;
          height: 10px;
          background: var(--status-online);
          border: 2px solid var(--bg-secondary);
          border-radius: var(--radius-full);
        }
      }
      
      .info {
        flex: 1;
        min-width: 0;
        cursor: pointer;
        
        h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--text-primary);
        }
        
        p {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary);
        }
        
        .typing-text {
          color: var(--status-typing);
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
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--icon-primary);
        transition: background-color var(--transition-fast);
        
        &:hover {
          background-color: var(--bg-hover);
        }
      }
    }
  }
  
  .search-messages-panel {
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-light);
    padding: 8px 16px;
    
    .search-input-wrapper {
      display: flex;
      align-items: center;
      background: var(--bg-input);
      border-radius: var(--radius-md);
      padding: 0 12px;
      
      input {
        flex: 1;
        border: none;
        padding: 10px 8px;
        font-size: 14px;
        outline: none;
        background: transparent;
        color: var(--text-primary);
        
        &::placeholder {
          color: var(--text-tertiary);
        }
      }
      
      svg {
        color: var(--icon-secondary);
      }
    }
    
    .search-results {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding-top: 8px;
      font-size: 13px;
      color: var(--text-secondary);
      
      .btn-icon {
        padding: 4px;
        
        &:disabled {
          opacity: 0.4;
        }
      }
    }
  }
  
  .reply-bar {
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-light);
    padding: 8px 16px;
    display: flex;
    align-items: center;
    
    .reply-content {
      flex: 1;
      display: flex;
      align-items: stretch;
      background: var(--bg-input);
      border-radius: var(--radius-md);
      overflow: hidden;
      
      .reply-indicator {
        width: 4px;
        background: var(--primary);
      }
      
      .reply-info {
        padding: 8px 12px;
        
        .reply-sender {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--primary);
        }
        
        .reply-text {
          margin: 2px 0 0;
          font-size: 13px;
          color: var(--text-secondary);
        }
      }
    }
    
    .close-reply {
      margin-left: 8px;
    }
  }
  
  .messages-area {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-chat);
    background-image: var(--bg-chat-pattern);
    background-repeat: repeat;
    background-size: 300px;
    position: relative;
    
    .load-more {
      text-align: center;
      padding: 10px 0 20px;
      
      .btn-load-more {
        background: var(--msg-system-bg);
        border: none;
        padding: 8px 16px;
        border-radius: var(--radius-xl);
        font-size: 13px;
        color: var(--primary);
        cursor: pointer;
        box-shadow: var(--shadow-sm);
        transition: background-color var(--transition-fast);
        
        &:hover:not(:disabled) {
          background: var(--bg-primary);
        }
        
        &:disabled {
          opacity: 0.6;
        }
      }
    }
    
    .date-divider {
      text-align: center;
      margin: 16px 0;
      
      span {
        background: var(--msg-system-bg);
        padding: 6px 12px;
        border-radius: var(--radius-md);
        font-size: 12px;
        color: var(--text-secondary);
        box-shadow: var(--shadow-sm);
      }
    }
    
    .scroll-to-bottom-btn {
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 40px;
      height: 40px;
      border-radius: var(--radius-full);
      background: var(--bg-primary);
      border: none;
      box-shadow: var(--shadow-md);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--icon-primary);
      transition: background-color var(--transition-fast);
      
      &:hover {
        background: var(--bg-tertiary);
      }
      
      .unread-badge {
        position: absolute;
        top: -6px;
        right: -6px;
        background: var(--primary);
        color: var(--text-light);
        font-size: 12px;
        min-width: 20px;
        height: 20px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
      }
    }
  }
  
  .message-input-area {
    background: var(--bg-secondary);
    padding: 10px 16px;
    flex-shrink: 0;
    
    @media (max-width: 767px) {
      padding-bottom: calc(var(--safe-area-inset-bottom) + 10px);
    }
    
    .input-row {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      
      .input-wrapper {
        flex: 1;
        background: var(--bg-input);
        border-radius: var(--radius-md);
        
        textarea {
          width: 100%;
          border: none;
          padding: 10px 14px;
          font-size: 15px;
          line-height: 1.4;
          resize: none;
          outline: none;
          max-height: 120px;
          border-radius: var(--radius-md);
          background: transparent;
          color: var(--text-primary);
          
          &::placeholder {
            color: var(--text-tertiary);
          }
        }
      }
      
      .btn-send {
        width: 44px;
        height: 44px;
        border-radius: var(--radius-full);
        background: var(--primary);
        border: none;
        color: var(--text-light);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: background-color var(--transition-fast);
        
        &:hover:not(:disabled) {
          background: var(--primary-light);
        }
        
        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }
  }
  
  // Modals
  .edit-modal,
  .delete-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--bg-modal-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
  }
  
  .edit-container {
    background: var(--bg-primary);
    border-radius: var(--radius-lg);
    width: 90%;
    max-width: 400px;
    overflow: hidden;
    
    .edit-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-light);
      
      h3 {
        margin: 0;
        font-size: 18px;
        color: var(--text-primary);
      }
      
      .btn-icon {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--icon-primary);
      }
    }
    
    .edit-content {
      padding: 20px;
      
      textarea {
        width: 100%;
        border: 1px solid var(--border-light);
        border-radius: var(--radius-md);
        padding: 12px;
        font-size: 15px;
        resize: none;
        outline: none;
        background: var(--bg-input);
        color: var(--text-primary);
        
        &:focus {
          border-color: var(--primary);
        }
      }
    }
    
    .edit-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 12px 20px 20px;
      
      .btn {
        padding: 10px 20px;
        border-radius: var(--radius-xl);
        font-size: 14px;
        cursor: pointer;
        transition: all var(--transition-fast);
        
        &.btn-cancel {
          background: var(--bg-tertiary);
          border: none;
          color: var(--text-secondary);
          
          &:hover {
            background: var(--border-light);
          }
        }
        
        &.btn-save {
          background: var(--primary);
          border: none;
          color: var(--text-light);
          
          &:hover:not(:disabled) {
            background: var(--primary-dark);
          }
          
          &:disabled {
            opacity: 0.5;
          }
        }
      }
    }
  }
  
  .delete-container {
    background: var(--bg-primary);
    border-radius: var(--radius-lg);
    padding: 24px;
    width: 90%;
    max-width: 320px;
    text-align: center;
    
    h3 {
      margin: 0 0 8px;
      font-size: 18px;
      color: var(--text-primary);
    }
    
    p {
      margin: 0 0 20px;
      color: var(--text-secondary);
      font-size: 14px;
    }
    
    .delete-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      
      .btn {
        padding: 10px 24px;
        border-radius: var(--radius-xl);
        font-size: 14px;
        cursor: pointer;
        transition: all var(--transition-fast);
        
        &.btn-cancel {
          background: var(--bg-tertiary);
          border: none;
          color: var(--text-secondary);
          
          &:hover {
            background: var(--border-light);
          }
        }
        
        &.btn-delete {
          background: var(--status-error);
          border: none;
          color: var(--text-light);
          
          &:hover {
            opacity: 0.9;
          }
        }
      }
    }
  }
}

// Animations
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all var(--transition-normal);
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-normal);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// Message highlight animation
:deep(.highlight) {
  animation: highlightPulse 2s ease;
}

@keyframes highlightPulse {
  0%, 100% {
    background: transparent;
  }
  50% {
    background: var(--bg-active);
  }
}

// Mobile responsive
@media (max-width: 767px) {
  .chat-container {
    .chat-header {
      .header-actions {
        .btn-icon:not(:last-child) {
          display: none;
        }
        
        // Show only important actions on mobile
        .btn-icon[title="Video Call"],
        .btn-icon[title="Menu"] {
          display: flex;
        }
      }
    }
  }
}
</style>
