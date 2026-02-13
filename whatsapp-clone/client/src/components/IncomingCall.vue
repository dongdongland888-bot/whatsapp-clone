<template>
  <Transition name="incoming-slide">
    <div v-if="hasIncomingCall" class="incoming-call-overlay">
      <div class="incoming-call-card">
        <!-- 来电者头像 -->
        <div class="caller-avatar">
          <div class="avatar-ring">
            <img :src="caller?.avatar || '/default-avatar.png'" :alt="caller?.username" />
          </div>
        </div>
        
        <!-- 来电信息 -->
        <div class="caller-info">
          <h2>{{ caller?.username || 'Unknown' }}</h2>
          <p class="call-type">
            <i :class="callType === 'video' ? 'icon-video' : 'icon-phone'"></i>
            {{ callType === 'video' ? 'Incoming video call' : 'Incoming voice call' }}
          </p>
        </div>
        
        <!-- 操作按钮 -->
        <div class="call-actions">
          <!-- 拒绝 -->
          <button class="action-btn decline" @click="declineCall" title="Decline">
            <i class="icon-phone-end"></i>
            <span>Decline</span>
          </button>
          
          <!-- 接听 -->
          <button class="action-btn accept" @click="acceptCall" title="Accept">
            <i :class="callType === 'video' ? 'icon-video' : 'icon-phone'"></i>
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script>
import { computed } from 'vue';
import { useStore } from 'vuex';

export default {
  name: 'IncomingCall',
  setup() {
    const store = useStore();
    
    const hasIncomingCall = computed(() => store.getters['call/hasIncomingCall']);
    const caller = computed(() => store.state.call.caller);
    const callType = computed(() => store.state.call.callType);
    
    const acceptCall = () => {
      store.dispatch('call/answerCall');
    };
    
    const declineCall = () => {
      store.dispatch('call/rejectCall', 'declined');
    };
    
    return {
      hasIncomingCall,
      caller,
      callType,
      acceptCall,
      declineCall
    };
  }
};
</script>

<style lang="scss" scoped>
.incoming-call-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
  backdrop-filter: blur(10px);
}

.incoming-call-card {
  text-align: center;
  padding: 40px;
  max-width: 320px;
  width: 100%;
}

.caller-avatar {
  margin-bottom: 24px;
  
  .avatar-ring {
    position: relative;
    display: inline-block;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    overflow: hidden;
    
    &::before,
    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 3px solid rgba(0, 168, 132, 0.5);
      transform: translate(-50%, -50%);
      animation: ring-pulse 2s ease-out infinite;
    }
    
    &::after {
      animation-delay: 1s;
    }
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      position: relative;
      z-index: 1;
      border-radius: 50%;
      border: 3px solid #00a884;
    }
  }
}

@keyframes ring-pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.8);
    opacity: 0;
  }
}

.caller-info {
  margin-bottom: 40px;
  
  h2 {
    color: #fff;
    font-size: 28px;
    font-weight: 500;
    margin-bottom: 8px;
  }
  
  .call-type {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 16px;
    
    i {
      font-size: 18px;
    }
  }
}

.call-actions {
  display: flex;
  justify-content: center;
  gap: 60px;
  
  .action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    background: none;
    border: none;
    cursor: pointer;
    transition: transform 0.2s;
    
    &:hover {
      transform: scale(1.1);
    }
    
    &:active {
      transform: scale(0.95);
    }
    
    i {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: #fff;
    }
    
    span {
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
    }
    
    &.decline i {
      background: #ff4444;
      
      &:hover {
        background: #ff2222;
      }
    }
    
    &.accept i {
      background: #00a884;
      
      &:hover {
        background: #069f7d;
      }
    }
  }
}

// Transition
.incoming-slide-enter-active,
.incoming-slide-leave-active {
  transition: all 0.4s ease;
}

.incoming-slide-enter-from {
  opacity: 0;
  transform: translateY(-100%);
}

.incoming-slide-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

// Icons
.icon-video::before { content: "📹"; }
.icon-phone::before { content: "📞"; }
.icon-phone-end::before { content: "📞"; }
</style>
