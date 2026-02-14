<template>
  <Transition name="modal-fade">
    <div v-if="show" class="delete-modal-overlay" @click.self="close">
      <div class="delete-modal">
        <div class="modal-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </div>
        
        <h3>Delete {{ messages.length > 1 ? `${messages.length} messages` : 'message' }}?</h3>
        
        <div class="delete-options">
          <!-- Delete for me only -->
          <button 
            class="option-btn"
            :class="{ selected: deleteOption === 'me' }"
            @click="deleteOption = 'me'"
          >
            <div class="radio-circle" :class="{ checked: deleteOption === 'me' }">
              <span v-if="deleteOption === 'me'"></span>
            </div>
            <div class="option-content">
              <span class="option-title">Delete for me</span>
              <span class="option-desc">Only you won't see this message</span>
            </div>
          </button>
          
          <!-- Delete for everyone (if allowed) -->
          <button 
            v-if="canDeleteForEveryone"
            class="option-btn"
            :class="{ selected: deleteOption === 'everyone' }"
            @click="deleteOption = 'everyone'"
          >
            <div class="radio-circle" :class="{ checked: deleteOption === 'everyone' }">
              <span v-if="deleteOption === 'everyone'"></span>
            </div>
            <div class="option-content">
              <span class="option-title">Delete for everyone</span>
              <span class="option-desc">This message will be deleted for all participants</span>
            </div>
          </button>
          
          <!-- Time limit warning -->
          <div v-if="!canDeleteForEveryone && isSender" class="time-warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>You can only delete messages for everyone within 1 hour of sending</span>
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="btn btn-cancel" @click="close">Cancel</button>
          <button 
            class="btn btn-delete" 
            @click="confirmDelete"
            :disabled="!deleteOption"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { useStore } from 'vuex';

export default {
  name: 'DeleteMessageModal',
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
  emits: ['close', 'delete'],
  setup(props, { emit }) {
    const store = useStore();
    
    const deleteOption = ref('');
    const currentUserId = computed(() => store.state.auth?.user?.id);
    
    // Check if all messages are from current user
    const isSender = computed(() => {
      return props.messages.every(m => m.sender_id === currentUserId.value);
    });
    
    // Check if messages can be deleted for everyone (within 1 hour)
    const canDeleteForEveryone = computed(() => {
      if (!isSender.value) return false;
      
      const ONE_HOUR = 60 * 60 * 1000;
      const now = Date.now();
      
      return props.messages.every(m => {
        const messageTime = new Date(m.created_at).getTime();
        return now - messageTime < ONE_HOUR;
      });
    });
    
    // Reset option when modal opens
    watch(() => props.show, (newVal) => {
      if (newVal) {
        deleteOption.value = '';
      }
    });
    
    const close = () => {
      deleteOption.value = '';
      emit('close');
    };
    
    const confirmDelete = () => {
      if (!deleteOption.value) return;
      
      emit('delete', {
        messages: props.messages,
        forEveryone: deleteOption.value === 'everyone'
      });
      
      close();
    };
    
    return {
      deleteOption,
      isSender,
      canDeleteForEveryone,
      close,
      confirmDelete
    };
  }
};
</script>

<style lang="scss" scoped>
.delete-modal-overlay {
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

.delete-modal {
  background: var(--bg-primary, #fff);
  border-radius: 12px;
  width: 100%;
  max-width: 360px;
  padding: 24px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  
  .modal-icon {
    margin-bottom: 16px;
    
    svg {
      color: #dc3545;
    }
  }
  
  h3 {
    margin: 0 0 20px;
    font-size: 18px;
    color: var(--text-primary, #111b21);
  }
  
  .delete-options {
    text-align: left;
    margin-bottom: 20px;
    
    .option-btn {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      width: 100%;
      padding: 12px;
      background: none;
      border: 1px solid var(--border-light, #e9edef);
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 8px;
      text-align: left;
      transition: all 0.2s;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      &:hover {
        background: var(--bg-hover, rgba(0, 0, 0, 0.02));
      }
      
      &.selected {
        border-color: var(--primary, #00a884);
        background: var(--primary-light, #e7f8f5);
      }
      
      .radio-circle {
        width: 20px;
        height: 20px;
        border: 2px solid var(--border-light, #d1d7db);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-top: 2px;
        
        &.checked {
          border-color: var(--primary, #00a884);
          
          span {
            width: 10px;
            height: 10px;
            background: var(--primary, #00a884);
            border-radius: 50%;
          }
        }
      }
      
      .option-content {
        flex: 1;
        
        .option-title {
          display: block;
          font-size: 15px;
          font-weight: 500;
          color: var(--text-primary, #111b21);
          margin-bottom: 2px;
        }
        
        .option-desc {
          display: block;
          font-size: 13px;
          color: var(--text-secondary, #667781);
        }
      }
    }
    
    .time-warning {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px;
      background: #fff8e1;
      border-radius: 8px;
      font-size: 13px;
      color: #f57c00;
      
      svg {
        flex-shrink: 0;
        margin-top: 1px;
      }
    }
  }
  
  .modal-actions {
    display: flex;
    gap: 12px;
    
    .btn {
      flex: 1;
      padding: 12px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      
      &.btn-cancel {
        background: var(--bg-secondary, #f0f2f5);
        border: none;
        color: var(--text-primary, #111b21);
        
        &:hover {
          background: var(--bg-tertiary, #e9edef);
        }
      }
      
      &.btn-delete {
        background: #dc3545;
        border: none;
        color: #fff;
        
        &:hover:not(:disabled) {
          background: #c82333;
        }
        
        &:disabled {
          background: var(--bg-tertiary, #d1d7db);
          cursor: not-allowed;
        }
      }
    }
  }
}

// Transitions
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
  
  .delete-modal {
    transition: transform 0.3s ease;
  }
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  
  .delete-modal {
    transform: scale(0.95);
  }
}

// Dark mode
.dark-mode .delete-modal {
  background: #202c33;
  
  h3 {
    color: #e9edef;
  }
  
  .delete-options {
    .option-btn {
      border-color: #3b4a54;
      
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      &.selected {
        background: rgba(0, 168, 132, 0.1);
      }
      
      .radio-circle {
        border-color: #3b4a54;
      }
      
      .option-content {
        .option-title {
          color: #e9edef;
        }
      }
    }
    
    .time-warning {
      background: rgba(245, 124, 0, 0.1);
    }
  }
  
  .modal-actions {
    .btn.btn-cancel {
      background: #2a3942;
      color: #e9edef;
      
      &:hover {
        background: #3b4a54;
      }
    }
  }
}
</style>
