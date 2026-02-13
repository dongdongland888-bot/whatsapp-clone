<template>
  <div 
    :class="['message-bubble', { 
      'sent': isSent, 
      'received': !isSent,
      'with-reply': hasReply,
      'selected': isSelected,
      'forwarded': message.is_forwarded
    }]"
    @contextmenu.prevent="showContextMenu"
    @click="handleClick"
  >
    <!-- 回复的消息预览 -->
    <div v-if="hasReply" class="reply-preview" @click.stop="scrollToReply">
      <div class="reply-bar"></div>
      <div class="reply-content">
        <span class="reply-sender">{{ replySenderName }}</span>
        <p class="reply-text">{{ replyPreviewText }}</p>
      </div>
    </div>

    <!-- 转发标签 -->
    <div v-if="message.is_forwarded" class="forwarded-label">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 8V4l8 8-8 8v-4H4V8h8z"/>
      </svg>
      <span>Forwarded</span>
    </div>

    <!-- 发送者名称 (群聊中显示) -->
    <div v-if="showSenderName && !isSent" class="sender-name" :style="{ color: senderColor }">
      {{ message.sender_name }}
    </div>

    <!-- 消息内容 -->
    <div class="message-body">
      <!-- 文本消息 -->
      <template v-if="message.message_type === 'text'">
        <p class="text-content" v-html="formattedContent"></p>
      </template>

      <!-- 媒体消息 -->
      <template v-else-if="['image', 'video', 'audio', 'document'].includes(message.message_type)">
        <MediaPreview
          :type="message.message_type"
          :media-url="message.media_url"
          :thumbnail-url="message.media_thumbnail"
          :file-name="message.media_name"
          :file-size="message.file_size"
          :mime-type="message.media_type"
          :duration="message.duration"
          :width="message.width"
          :height="message.height"
          :sender-name="message.sender_name"
          :sent-at="message.created_at"
        />
        <!-- 媒体说明文字 -->
        <p v-if="message.content" class="media-caption">{{ message.content }}</p>
      </template>

      <!-- 消息元信息 -->
      <div class="message-meta">
        <span v-if="message.is_edited" class="edited-label">edited</span>
        <span class="message-time">{{ formatTime(message.created_at) }}</span>
        <MessageStatus v-if="isSent" :status="message.status" />
      </div>
    </div>

    <!-- 右键菜单 -->
    <transition name="fade">
      <div 
        v-if="showMenu" 
        class="context-menu"
        :style="menuPosition"
        ref="menuRef"
      >
        <div class="menu-item" @click="replyToMessage">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 14 4 9 9 4"></polyline>
            <path d="M20 20v-7a4 4 0 00-4-4H4"></path>
          </svg>
          <span>Reply</span>
        </div>
        
        <div class="menu-item" @click="copyMessage" v-if="message.message_type === 'text'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
          </svg>
          <span>Copy</span>
        </div>
        
        <div class="menu-item" @click="forwardMessage">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 14 20 9 15 4"></polyline>
            <path d="M4 20v-7a4 4 0 014-4h12"></path>
          </svg>
          <span>Forward</span>
        </div>
        
        <div class="menu-item" @click="starMessage">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span>Star</span>
        </div>
        
        <template v-if="isSent">
          <div class="menu-divider"></div>
          
          <div class="menu-item" @click="editMessage" v-if="canEdit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            <span>Edit</span>
          </div>
          
          <div class="menu-item danger" @click="deleteMessage">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
            </svg>
            <span>Delete</span>
          </div>
        </template>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import MediaPreview from './MediaPreview.vue';
import MessageStatus from './MessageStatus.vue';

export default {
  name: 'MessageBubble',
  components: {
    MediaPreview,
    MessageStatus
  },
  props: {
    message: {
      type: Object,
      required: true
    },
    currentUserId: {
      type: Number,
      required: true
    },
    // 是否在群聊中
    isGroupChat: {
      type: Boolean,
      default: false
    },
    // 是否显示发送者名称
    showSenderName: {
      type: Boolean,
      default: false
    },
    // 选中状态
    isSelected: {
      type: Boolean,
      default: false
    }
  },
  emits: ['reply', 'forward', 'edit', 'delete', 'scroll-to', 'select'],
  setup(props, { emit }) {
    const showMenu = ref(false);
    const menuPosition = ref({ top: '0px', left: '0px' });
    const menuRef = ref(null);

    // 是否是自己发送的消息
    const isSent = computed(() => props.message.sender_id === props.currentUserId);

    // 是否有回复
    const hasReply = computed(() => !!props.message.reply_to_id);

    // 回复发送者名称
    const replySenderName = computed(() => {
      if (!props.message.reply_sender_id) return '';
      return props.message.reply_sender_id === props.currentUserId 
        ? 'You' 
        : props.message.reply_sender_name;
    });

    // 回复预览文本
    const replyPreviewText = computed(() => {
      const content = props.message.reply_content;
      if (!content) return 'Media';
      return content.length > 50 ? content.slice(0, 50) + '...' : content;
    });

    // 是否可以编辑 (15分钟内)
    const canEdit = computed(() => {
      if (props.message.message_type !== 'text') return false;
      const messageAge = Date.now() - new Date(props.message.created_at).getTime();
      return messageAge < 15 * 60 * 1000;
    });

    // 发送者颜色 (用于群聊)
    const senderColor = computed(() => {
      const colors = [
        '#00a884', '#7c3aed', '#ec4899', '#f97316', 
        '#3b82f6', '#06b6d4', '#84cc16', '#f43f5e'
      ];
      const hash = props.message.sender_id % colors.length;
      return colors[hash];
    });

    // 格式化内容 (链接、换行等)
    const formattedContent = computed(() => {
      let content = props.message.content || '';
      
      // 转义 HTML
      content = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      // 链接识别
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      content = content.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');
      
      // 换行
      content = content.replace(/\n/g, '<br>');
      
      // 粗体 *text*
      content = content.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
      
      // 斜体 _text_
      content = content.replace(/_([^_]+)_/g, '<em>$1</em>');
      
      // 删除线 ~text~
      content = content.replace(/~([^~]+)~/g, '<del>$1</del>');
      
      // 代码 `text`
      content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
      
      return content;
    });

    // 格式化时间
    const formatTime = (timestamp) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // 显示右键菜单
    const showContextMenu = (event) => {
      event.preventDefault();
      
      // 计算菜单位置
      const x = event.clientX;
      const y = event.clientY;
      
      menuPosition.value = {
        top: `${y}px`,
        left: `${x}px`
      };
      
      showMenu.value = true;
    };

    // 隐藏菜单
    const hideMenu = () => {
      showMenu.value = false;
    };

    // 点击消息
    const handleClick = () => {
      if (showMenu.value) {
        hideMenu();
      }
    };

    // 滚动到被回复的消息
    const scrollToReply = () => {
      if (props.message.reply_to_id) {
        emit('scroll-to', props.message.reply_to_id);
      }
    };

    // 回复消息
    const replyToMessage = () => {
      emit('reply', props.message);
      hideMenu();
    };

    // 复制消息
    const copyMessage = async () => {
      try {
        await navigator.clipboard.writeText(props.message.content);
        // 可以添加一个 toast 提示
      } catch (err) {
        console.error('Copy failed:', err);
      }
      hideMenu();
    };

    // 转发消息
    const forwardMessage = () => {
      emit('forward', props.message);
      hideMenu();
    };

    // 标星消息
    const starMessage = () => {
      // TODO: 实现标星功能
      hideMenu();
    };

    // 编辑消息
    const editMessage = () => {
      emit('edit', props.message);
      hideMenu();
    };

    // 删除消息
    const deleteMessage = () => {
      emit('delete', props.message);
      hideMenu();
    };

    // 点击外部关闭菜单
    const handleClickOutside = (event) => {
      if (showMenu.value && menuRef.value && !menuRef.value.contains(event.target)) {
        hideMenu();
      }
    };

    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('scroll', hideMenu, true);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('scroll', hideMenu, true);
    });

    return {
      showMenu,
      menuPosition,
      menuRef,
      isSent,
      hasReply,
      replySenderName,
      replyPreviewText,
      canEdit,
      senderColor,
      formattedContent,
      formatTime,
      showContextMenu,
      handleClick,
      scrollToReply,
      replyToMessage,
      copyMessage,
      forwardMessage,
      starMessage,
      editMessage,
      deleteMessage
    };
  }
};
</script>

<style lang="scss" scoped>
.message-bubble {
  max-width: 65%;
  margin-bottom: 2px;
  position: relative;
  
  &.received {
    align-self: flex-start;
    
    .message-body {
      background-color: white;
      border-radius: 0 8px 8px 8px;
      
      .text-content {
        color: #111b21;
      }
    }
    
    // 气泡尖角
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -8px;
      width: 0;
      height: 0;
      border-top: 8px solid white;
      border-left: 8px solid transparent;
    }
  }
  
  &.sent {
    align-self: flex-end;
    
    .message-body {
      background-color: #d9fdd3;
      border-radius: 8px 0 8px 8px;
    }
    
    // 气泡尖角
    &::after {
      content: '';
      position: absolute;
      top: 0;
      right: -8px;
      width: 0;
      height: 0;
      border-top: 8px solid #d9fdd3;
      border-right: 8px solid transparent;
    }
  }
  
  &.selected {
    .message-body {
      box-shadow: 0 0 0 2px #00a884;
    }
  }
  
  // 回复预览
  .reply-preview {
    display: flex;
    padding: 6px 12px 0;
    cursor: pointer;
    border-radius: 8px 8px 0 0;
    
    .reply-bar {
      width: 4px;
      background: #00a884;
      border-radius: 2px;
      margin-right: 8px;
      flex-shrink: 0;
    }
    
    .reply-content {
      flex: 1;
      min-width: 0;
      padding: 4px 0;
      
      .reply-sender {
        display: block;
        font-size: 12px;
        font-weight: 500;
        color: #00a884;
        margin-bottom: 2px;
      }
      
      .reply-text {
        margin: 0;
        font-size: 13px;
        color: #667781;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }
  
  // 转发标签
  .forwarded-label {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px 0;
    font-size: 12px;
    color: #667781;
    font-style: italic;
  }
  
  // 发送者名称
  .sender-name {
    padding: 4px 12px 0;
    font-size: 13px;
    font-weight: 500;
  }
  
  // 消息主体
  .message-body {
    padding: 6px 8px 6px 12px;
    position: relative;
    
    .text-content {
      margin: 0;
      font-size: 14.5px;
      line-height: 1.4;
      word-wrap: break-word;
      white-space: pre-wrap;
      
      :deep(a) {
        color: #039be5;
        text-decoration: none;
        
        &:hover {
          text-decoration: underline;
        }
      }
      
      :deep(code) {
        background: rgba(0, 0, 0, 0.06);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: monospace;
        font-size: 13px;
      }
    }
    
    .media-caption {
      margin: 8px 0 0;
      font-size: 14.5px;
      line-height: 1.4;
    }
    
    .message-meta {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
      margin-top: 2px;
      float: right;
      margin-left: 8px;
      
      .edited-label {
        font-size: 11px;
        color: #667781;
        font-style: italic;
      }
      
      .message-time {
        font-size: 11px;
        color: #667781;
      }
    }
  }
  
  // 右键菜单
  .context-menu {
    position: fixed;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
    min-width: 180px;
    padding: 8px 0;
    z-index: 1000;
    
    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      cursor: pointer;
      color: #111b21;
      font-size: 14px;
      
      &:hover {
        background: #f0f2f5;
      }
      
      &.danger {
        color: #ea4335;
      }
      
      svg {
        flex-shrink: 0;
      }
    }
    
    .menu-divider {
      height: 1px;
      background: #e9edef;
      margin: 4px 0;
    }
  }
}

// 动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 深色模式
.dark-mode .message-bubble {
  &.received {
    .message-body {
      background: #202c33;
      
      .text-content {
        color: #e9edef;
      }
    }
    
    &::before {
      border-top-color: #202c33;
    }
  }
  
  &.sent {
    .message-body {
      background: #005c4b;
    }
    
    &::after {
      border-top-color: #005c4b;
    }
  }
  
  .reply-preview {
    .reply-content {
      .reply-text {
        color: #8696a0;
      }
    }
  }
  
  .message-body {
    .text-content :deep(code) {
      background: rgba(255, 255, 255, 0.1);
    }
    
    .message-meta {
      .edited-label,
      .message-time {
        color: #8696a0;
      }
    }
  }
  
  .context-menu {
    background: #233138;
    
    .menu-item {
      color: #e9edef;
      
      &:hover {
        background: #182229;
      }
    }
    
    .menu-divider {
      background: #3b4a54;
    }
  }
}
</style>
