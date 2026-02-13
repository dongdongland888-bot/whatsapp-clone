<template>
  <Transition name="call-fade">
    <div v-if="isInCall || isRinging" class="video-call-container">
      <!-- 远程视频 (全屏背景) -->
      <div class="remote-video-wrapper">
        <video
          ref="remoteVideo"
          class="remote-video"
          :class="{ 'video-off': !remoteStream }"
          autoplay
          playsinline
        ></video>
        
        <!-- 远程视频关闭时的占位 -->
        <div v-if="!remoteStream || status === 'connecting'" class="video-placeholder">
          <div class="avatar-large">
            <img :src="callPartner?.avatar || '/default-avatar.png'" :alt="callPartner?.username" />
          </div>
          <h2>{{ callPartner?.username || 'Unknown' }}</h2>
          <p class="call-status-text">{{ callStatusText }}</p>
        </div>
      </div>

      <!-- 本地视频 (小窗) -->
      <Transition name="pip-slide">
        <div 
          v-if="localStream && isVideoEnabled" 
          class="local-video-wrapper"
          :class="{ 'dragging': isDragging }"
          @mousedown="startDrag"
          @touchstart="startDrag"
        >
          <video
            ref="localVideo"
            class="local-video"
            autoplay
            playsinline
            muted
          ></video>
          <div class="pip-label">You</div>
        </div>
      </Transition>

      <!-- 顶部信息栏 -->
      <div class="call-header">
        <div class="call-info">
          <span class="encryption-badge">
            <i class="icon-lock"></i>
            End-to-end encrypted
          </span>
        </div>
        <div class="call-timer" v-if="status === 'connected'">
          {{ formattedDuration }}
        </div>
      </div>

      <!-- 通话状态显示 -->
      <Transition name="status-fade">
        <div v-if="status !== 'connected'" class="call-status-overlay">
          <div class="status-content">
            <div class="pulse-ring" v-if="status === 'ringing' || status === 'connecting'">
              <div class="avatar-medium">
                <img :src="callPartner?.avatar || '/default-avatar.png'" :alt="callPartner?.username" />
              </div>
            </div>
            <h3>{{ callPartner?.username }}</h3>
            <p>{{ callStatusText }}</p>
          </div>
        </div>
      </Transition>

      <!-- 底部控制栏 -->
      <div class="call-controls">
        <div class="controls-row">
          <!-- 静音 -->
          <button 
            class="control-btn"
            :class="{ 'active': !isAudioEnabled }"
            @click="toggleAudio"
            :title="isAudioEnabled ? 'Mute' : 'Unmute'"
          >
            <i :class="isAudioEnabled ? 'icon-mic' : 'icon-mic-off'"></i>
            <span>{{ isAudioEnabled ? 'Mute' : 'Unmute' }}</span>
          </button>

          <!-- 关闭摄像头 -->
          <button 
            v-if="callType === 'video'"
            class="control-btn"
            :class="{ 'active': !isVideoEnabled }"
            @click="toggleVideo"
            :title="isVideoEnabled ? 'Camera off' : 'Camera on'"
          >
            <i :class="isVideoEnabled ? 'icon-video' : 'icon-video-off'"></i>
            <span>{{ isVideoEnabled ? 'Camera' : 'Camera' }}</span>
          </button>

          <!-- 切换摄像头 -->
          <button 
            v-if="callType === 'video' && isVideoEnabled"
            class="control-btn"
            @click="switchCamera"
            title="Switch camera"
          >
            <i class="icon-switch-camera"></i>
            <span>Flip</span>
          </button>

          <!-- 扬声器 -->
          <button 
            class="control-btn"
            :class="{ 'active': isSpeakerOn }"
            @click="toggleSpeaker"
            :title="isSpeakerOn ? 'Speaker off' : 'Speaker on'"
          >
            <i :class="isSpeakerOn ? 'icon-speaker' : 'icon-speaker-off'"></i>
            <span>Speaker</span>
          </button>
        </div>

        <!-- 挂断按钮 -->
        <button class="end-call-btn" @click="endCall" title="End call">
          <i class="icon-phone-end"></i>
        </button>
      </div>

      <!-- 连接质量指示器 -->
      <div v-if="status === 'connected'" class="connection-quality">
        <div class="quality-bars" :class="connectionQuality">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';

export default {
  name: 'VideoCall',
  setup() {
    const store = useStore();
    
    // Refs for video elements
    const localVideo = ref(null);
    const remoteVideo = ref(null);
    
    // Drag state for PiP
    const isDragging = ref(false);
    const dragOffset = ref({ x: 0, y: 0 });
    
    // Computed properties from store
    const status = computed(() => store.state.call.status);
    const callType = computed(() => store.state.call.callType);
    const isVideoEnabled = computed(() => store.state.call.isVideoEnabled);
    const isAudioEnabled = computed(() => store.state.call.isAudioEnabled);
    const isSpeakerOn = computed(() => store.state.call.isSpeakerOn);
    const localStream = computed(() => store.state.call.localStream);
    const remoteStream = computed(() => store.state.call.remoteStream);
    const callPartner = computed(() => store.getters['call/callPartner']);
    const formattedDuration = computed(() => store.getters['call/formattedDuration']);
    const callStatusText = computed(() => store.getters['call/callStatusText']);
    const isInCall = computed(() => store.getters['call/isInCall']);
    const isRinging = computed(() => store.getters['call/isRinging']);
    
    // Connection quality (mock for now)
    const connectionQuality = computed(() => {
      const iceState = store.state.call.iceConnectionState;
      if (iceState === 'connected' || iceState === 'completed') return 'good';
      if (iceState === 'checking') return 'medium';
      return 'poor';
    });
    
    // Watch for stream changes and attach to video elements
    watch(localStream, (stream) => {
      if (localVideo.value && stream) {
        localVideo.value.srcObject = stream;
      }
    }, { immediate: true });
    
    watch(remoteStream, (stream) => {
      if (remoteVideo.value && stream) {
        remoteVideo.value.srcObject = stream;
      }
    }, { immediate: true });
    
    // Control functions
    const toggleAudio = () => {
      store.dispatch('call/toggleAudio');
    };
    
    const toggleVideo = () => {
      store.dispatch('call/toggleVideo');
    };
    
    const switchCamera = () => {
      store.dispatch('call/switchCamera');
    };
    
    const toggleSpeaker = () => {
      store.dispatch('call/toggleSpeaker');
    };
    
    const endCall = () => {
      store.dispatch('call/endCall');
    };
    
    // PiP drag functionality
    const startDrag = (e) => {
      isDragging.value = true;
      const touch = e.touches ? e.touches[0] : e;
      const rect = e.target.closest('.local-video-wrapper').getBoundingClientRect();
      dragOffset.value = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
      
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', stopDrag);
      document.addEventListener('touchmove', onDrag);
      document.addEventListener('touchend', stopDrag);
    };
    
    const onDrag = (e) => {
      if (!isDragging.value) return;
      const touch = e.touches ? e.touches[0] : e;
      const wrapper = document.querySelector('.local-video-wrapper');
      if (wrapper) {
        const x = touch.clientX - dragOffset.value.x;
        const y = touch.clientY - dragOffset.value.y;
        wrapper.style.left = `${x}px`;
        wrapper.style.top = `${y}px`;
        wrapper.style.right = 'auto';
        wrapper.style.bottom = 'auto';
      }
    };
    
    const stopDrag = () => {
      isDragging.value = false;
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('touchmove', onDrag);
      document.removeEventListener('touchend', stopDrag);
    };
    
    // Cleanup on unmount
    onUnmounted(() => {
      stopDrag();
    });
    
    return {
      localVideo,
      remoteVideo,
      isDragging,
      status,
      callType,
      isVideoEnabled,
      isAudioEnabled,
      isSpeakerOn,
      localStream,
      remoteStream,
      callPartner,
      formattedDuration,
      callStatusText,
      isInCall,
      isRinging,
      connectionQuality,
      toggleAudio,
      toggleVideo,
      switchCamera,
      toggleSpeaker,
      endCall,
      startDrag
    };
  }
};
</script>

<style lang="scss" scoped>
.video-call-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 9999;
  display: flex;
  flex-direction: column;
}

// Remote video (fullscreen background)
.remote-video-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  
  .remote-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    
    &.video-off {
      display: none;
    }
  }
  
  .video-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    
    .avatar-large {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      overflow: hidden;
      margin-bottom: 20px;
      border: 3px solid rgba(255, 255, 255, 0.2);
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
    
    h2 {
      color: #fff;
      font-size: 24px;
      margin-bottom: 8px;
    }
    
    .call-status-text {
      color: rgba(255, 255, 255, 0.7);
      font-size: 16px;
    }
  }
}

// Local video (PiP)
.local-video-wrapper {
  position: absolute;
  top: 80px;
  right: 20px;
  width: 120px;
  height: 160px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  cursor: move;
  z-index: 10;
  
  &.dragging {
    opacity: 0.8;
  }
  
  .local-video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1); // Mirror effect
  }
  
  .pip-label {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 10px;
  }
}

// Call header
.call-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), transparent);
  z-index: 5;
  
  .encryption-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 12px;
    
    i {
      font-size: 14px;
    }
  }
  
  .call-timer {
    color: #fff;
    font-size: 16px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
}

// Call status overlay
.call-status-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  
  .status-content {
    text-align: center;
    
    .pulse-ring {
      position: relative;
      display: inline-block;
      margin-bottom: 20px;
      
      &::before,
      &::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.3);
        transform: translate(-50%, -50%);
        animation: pulse 2s ease-out infinite;
      }
      
      &::after {
        animation-delay: 1s;
      }
      
      .avatar-medium {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        overflow: hidden;
        border: 2px solid rgba(255, 255, 255, 0.3);
        
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
    }
    
    h3 {
      color: #fff;
      font-size: 20px;
      margin-bottom: 8px;
    }
    
    p {
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
    }
  }
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

// Call controls
.call-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 30px 20px 40px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  
  .controls-row {
    display: flex;
    gap: 20px;
  }
  
  .control-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.15);
    border: none;
    border-radius: 50%;
    width: 56px;
    height: 56px;
    cursor: pointer;
    transition: all 0.2s;
    
    i {
      font-size: 24px;
      color: #fff;
    }
    
    span {
      position: absolute;
      bottom: -20px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.8);
      white-space: nowrap;
    }
    
    &:hover {
      background: rgba(255, 255, 255, 0.25);
    }
    
    &.active {
      background: rgba(255, 255, 255, 0.95);
      
      i {
        color: #333;
      }
    }
    
    // Hide span text, use title only
    span {
      display: none;
    }
  }
  
  .end-call-btn {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: #ff4444;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    
    i {
      font-size: 28px;
      color: #fff;
    }
    
    &:hover {
      background: #ff2222;
      transform: scale(1.05);
    }
  }
}

// Connection quality indicator
.connection-quality {
  position: absolute;
  top: 20px;
  right: 160px;
  z-index: 10;
  
  .quality-bars {
    display: flex;
    gap: 2px;
    align-items: flex-end;
    
    span {
      width: 4px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 2px;
      
      &:nth-child(1) { height: 8px; }
      &:nth-child(2) { height: 12px; }
      &:nth-child(3) { height: 16px; }
    }
    
    &.good span {
      background: #4caf50;
    }
    
    &.medium {
      span:nth-child(1),
      span:nth-child(2) {
        background: #ffc107;
      }
    }
    
    &.poor {
      span:nth-child(1) {
        background: #f44336;
      }
    }
  }
}

// Transitions
.call-fade-enter-active,
.call-fade-leave-active {
  transition: opacity 0.3s ease;
}

.call-fade-enter-from,
.call-fade-leave-to {
  opacity: 0;
}

.pip-slide-enter-active,
.pip-slide-leave-active {
  transition: all 0.3s ease;
}

.pip-slide-enter-from,
.pip-slide-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

.status-fade-enter-active,
.status-fade-leave-active {
  transition: opacity 0.5s ease;
}

.status-fade-enter-from,
.status-fade-leave-to {
  opacity: 0;
}

// Icons (using emoji as fallback)
.icon-lock::before { content: "🔒"; }
.icon-mic::before { content: "🎤"; }
.icon-mic-off::before { content: "🔇"; }
.icon-video::before { content: "📹"; }
.icon-video-off::before { content: "📷"; }
.icon-switch-camera::before { content: "🔄"; }
.icon-speaker::before { content: "🔊"; }
.icon-speaker-off::before { content: "🔈"; }
.icon-phone-end::before { content: "📞"; }
</style>
