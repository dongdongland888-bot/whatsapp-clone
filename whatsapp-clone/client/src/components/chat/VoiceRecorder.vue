<template>
  <div class="voice-recorder">
    <!-- 录音按钮 (默认状态) -->
    <button 
      v-if="!isRecording && !hasRecording"
      class="record-btn"
      @mousedown="startRecording"
      @touchstart.prevent="startRecording"
      title="Hold to record"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
    </button>

    <!-- 录音中状态 -->
    <div v-if="isRecording" class="recording-ui">
      <!-- 取消按钮 -->
      <button class="cancel-btn" @click="cancelRecording" title="Cancel">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- 录音指示器 -->
      <div class="recording-indicator">
        <div class="recording-dot"></div>
        <span class="recording-time">{{ formatDuration(recordingDuration) }}</span>
      </div>

      <!-- 波形可视化 -->
      <div class="waveform-visualizer">
        <div 
          v-for="(level, index) in audioLevels" 
          :key="index"
          class="level-bar"
          :style="{ height: level + 'px' }"
        ></div>
      </div>

      <!-- 停止录音按钮 -->
      <button class="stop-btn" @click="stopRecording" title="Stop recording">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2"/>
        </svg>
      </button>
    </div>

    <!-- 录音预览状态 -->
    <div v-if="hasRecording && !isRecording" class="preview-ui">
      <!-- 删除按钮 -->
      <button class="delete-btn" @click="deleteRecording" title="Delete">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
        </svg>
      </button>

      <!-- 播放控制 -->
      <div class="playback-controls">
        <button class="play-btn" @click="togglePlayback">
          <svg v-if="!isPlaying" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        </button>

        <!-- 进度条 -->
        <div class="progress-container" @click="seekAudio">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: playbackProgress + '%' }"></div>
          </div>
          <div 
            class="progress-handle" 
            :style="{ left: playbackProgress + '%' }"
          ></div>
        </div>

        <span class="duration">{{ formatDuration(isPlaying ? currentTime : recordingDuration) }}</span>
      </div>

      <!-- 发送按钮 -->
      <button 
        class="send-btn" 
        @click="sendRecording" 
        :disabled="uploading"
        title="Send"
      >
        <svg v-if="!uploading" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
        <div v-else class="spinner"></div>
      </button>
    </div>

    <!-- 隐藏的 audio 元素 -->
    <audio 
      ref="audioPlayer"
      @timeupdate="updateProgress"
      @ended="onPlaybackEnded"
    />

    <!-- 错误提示 -->
    <transition name="fade">
      <div v-if="error" class="error-toast">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>{{ error }}</span>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, computed, onUnmounted } from 'vue';
import axios from 'axios';

export default {
  name: 'VoiceRecorder',
  props: {
    // 最大录音时长 (秒)
    maxDuration: {
      type: Number,
      default: 60
    }
  },
  emits: ['send', 'recording-start', 'recording-stop', 'error'],
  setup(props, { emit }) {
    // 状态
    const isRecording = ref(false);
    const hasRecording = ref(false);
    const isPlaying = ref(false);
    const uploading = ref(false);
    const error = ref('');
    
    // 录音相关
    const mediaRecorder = ref(null);
    const audioChunks = ref([]);
    const audioBlob = ref(null);
    const audioUrl = ref('');
    const recordingDuration = ref(0);
    const recordingInterval = ref(null);
    const audioLevels = ref(new Array(20).fill(5));
    const analyser = ref(null);
    const audioContext = ref(null);
    
    // 播放相关
    const audioPlayer = ref(null);
    const currentTime = ref(0);
    const playbackProgress = computed(() => {
      if (recordingDuration.value === 0) return 0;
      return (currentTime.value / recordingDuration.value) * 100;
    });

    // 格式化时长
    const formatDuration = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // 开始录音
    const startRecording = async () => {
      try {
        // 请求麦克风权限
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        // 创建音频分析器
        audioContext.value = new (window.AudioContext || window.webkitAudioContext)();
        analyser.value = audioContext.value.createAnalyser();
        const source = audioContext.value.createMediaStreamSource(stream);
        source.connect(analyser.value);
        analyser.value.fftSize = 64;
        
        // 创建 MediaRecorder
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : 'audio/mp4';
        
        mediaRecorder.value = new MediaRecorder(stream, { mimeType });
        audioChunks.value = [];
        
        mediaRecorder.value.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.value.push(event.data);
          }
        };
        
        mediaRecorder.value.onstop = () => {
          // 创建 Blob
          audioBlob.value = new Blob(audioChunks.value, { type: mimeType });
          audioUrl.value = URL.createObjectURL(audioBlob.value);
          
          // 设置音频播放器
          if (audioPlayer.value) {
            audioPlayer.value.src = audioUrl.value;
          }
          
          hasRecording.value = true;
          
          // 停止所有轨道
          stream.getTracks().forEach(track => track.stop());
        };
        
        // 开始录音
        mediaRecorder.value.start(100);
        isRecording.value = true;
        recordingDuration.value = 0;
        
        // 开始计时
        recordingInterval.value = setInterval(() => {
          recordingDuration.value++;
          updateAudioLevels();
          
          // 检查最大时长
          if (recordingDuration.value >= props.maxDuration) {
            stopRecording();
          }
        }, 1000);
        
        // 开始音频可视化
        visualize();
        
        emit('recording-start');
        error.value = '';
        
      } catch (err) {
        console.error('Recording error:', err);
        
        if (err.name === 'NotAllowedError') {
          error.value = 'Microphone permission denied';
        } else if (err.name === 'NotFoundError') {
          error.value = 'No microphone found';
        } else {
          error.value = 'Failed to start recording';
        }
        
        emit('error', error.value);
        
        // 清除错误提示
        setTimeout(() => {
          error.value = '';
        }, 3000);
      }
    };

    // 更新音频可视化
    const visualize = () => {
      if (!isRecording.value || !analyser.value) return;
      
      const dataArray = new Uint8Array(analyser.value.frequencyBinCount);
      analyser.value.getByteFrequencyData(dataArray);
      
      // 更新音频级别
      const levels = [];
      const step = Math.floor(dataArray.length / 20);
      for (let i = 0; i < 20; i++) {
        const value = dataArray[i * step];
        levels.push(Math.max(5, (value / 255) * 30));
      }
      audioLevels.value = levels;
      
      requestAnimationFrame(visualize);
    };

    // 更新音频级别 (简化版)
    const updateAudioLevels = () => {
      const levels = audioLevels.value.map(() => Math.random() * 25 + 5);
      audioLevels.value = levels;
    };

    // 停止录音
    const stopRecording = () => {
      if (mediaRecorder.value && mediaRecorder.value.state !== 'inactive') {
        mediaRecorder.value.stop();
      }
      
      isRecording.value = false;
      
      if (recordingInterval.value) {
        clearInterval(recordingInterval.value);
        recordingInterval.value = null;
      }
      
      if (audioContext.value) {
        audioContext.value.close();
        audioContext.value = null;
      }
      
      emit('recording-stop');
    };

    // 取消录音
    const cancelRecording = () => {
      stopRecording();
      deleteRecording();
    };

    // 删除录音
    const deleteRecording = () => {
      hasRecording.value = false;
      audioBlob.value = null;
      recordingDuration.value = 0;
      currentTime.value = 0;
      
      if (audioUrl.value) {
        URL.revokeObjectURL(audioUrl.value);
        audioUrl.value = '';
      }
      
      if (audioPlayer.value) {
        audioPlayer.value.pause();
        audioPlayer.value.src = '';
      }
      
      isPlaying.value = false;
    };

    // 切换播放
    const togglePlayback = () => {
      if (!audioPlayer.value) return;
      
      if (isPlaying.value) {
        audioPlayer.value.pause();
      } else {
        audioPlayer.value.play();
      }
      
      isPlaying.value = !isPlaying.value;
    };

    // 更新播放进度
    const updateProgress = () => {
      if (audioPlayer.value) {
        currentTime.value = audioPlayer.value.currentTime;
      }
    };

    // 播放结束
    const onPlaybackEnded = () => {
      isPlaying.value = false;
      currentTime.value = 0;
    };

    // 跳转播放位置
    const seekAudio = (event) => {
      if (!audioPlayer.value || !recordingDuration.value) return;
      
      const rect = event.currentTarget.getBoundingClientRect();
      const percent = (event.clientX - rect.left) / rect.width;
      const time = percent * recordingDuration.value;
      
      audioPlayer.value.currentTime = time;
      currentTime.value = time;
    };

    // 发送录音
    const sendRecording = async () => {
      if (!audioBlob.value || uploading.value) return;
      
      uploading.value = true;
      
      try {
        // 创建 FormData
        const formData = new FormData();
        const fileName = `voice_${Date.now()}.webm`;
        formData.append('file', audioBlob.value, fileName);
        
        // 上传到服务器
        const response = await axios.post('/api/media/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        if (response.data.success) {
          // 发送消息
          emit('send', {
            media: response.data.data,
            duration: recordingDuration.value,
            type: 'audio'
          });
          
          // 清理
          deleteRecording();
        }
        
      } catch (err) {
        console.error('Upload error:', err);
        error.value = 'Failed to send voice message';
        emit('error', error.value);
        
        setTimeout(() => {
          error.value = '';
        }, 3000);
      } finally {
        uploading.value = false;
      }
    };

    // 清理
    onUnmounted(() => {
      if (recordingInterval.value) {
        clearInterval(recordingInterval.value);
      }
      if (audioUrl.value) {
        URL.revokeObjectURL(audioUrl.value);
      }
      if (audioContext.value) {
        audioContext.value.close();
      }
    });

    return {
      isRecording,
      hasRecording,
      isPlaying,
      uploading,
      error,
      recordingDuration,
      audioLevels,
      audioPlayer,
      currentTime,
      playbackProgress,
      formatDuration,
      startRecording,
      stopRecording,
      cancelRecording,
      deleteRecording,
      togglePlayback,
      updateProgress,
      onPlaybackEnded,
      seekAudio,
      sendRecording
    };
  }
};
</script>

<style lang="scss" scoped>
.voice-recorder {
  display: flex;
  align-items: center;
  
  // 录音按钮
  .record-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: none;
    border: none;
    color: #54656f;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    
    &:hover {
      background: rgba(0, 0, 0, 0.05);
      color: #00a884;
    }
    
    &:active {
      background: #00a884;
      color: white;
      transform: scale(1.1);
    }
  }
  
  // 录音中 UI
  .recording-ui {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background: #f0f2f5;
    border-radius: 24px;
    animation: slideIn 0.2s ease;
    
    .cancel-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: none;
      border: none;
      color: #667781;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #ea4335;
      }
    }
    
    .recording-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .recording-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #ea4335;
        animation: pulse 1s infinite;
      }
      
      .recording-time {
        font-size: 14px;
        color: #111b21;
        font-variant-numeric: tabular-nums;
        min-width: 40px;
      }
    }
    
    .waveform-visualizer {
      display: flex;
      align-items: center;
      gap: 2px;
      height: 30px;
      
      .level-bar {
        width: 3px;
        background: #00a884;
        border-radius: 2px;
        transition: height 0.1s;
      }
    }
    
    .stop-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #ea4335;
      border: none;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &:hover {
        background: #d33426;
      }
    }
  }
  
  // 预览 UI
  .preview-ui {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #f0f2f5;
    border-radius: 24px;
    animation: slideIn 0.2s ease;
    
    .delete-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: none;
      border: none;
      color: #667781;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #ea4335;
      }
    }
    
    .playback-controls {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      
      .play-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #00a884;
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        
        &:hover {
          background: #06cf9c;
        }
        
        svg {
          margin-left: 2px;
        }
      }
      
      .progress-container {
        flex: 1;
        height: 30px;
        display: flex;
        align-items: center;
        cursor: pointer;
        position: relative;
        min-width: 100px;
        
        .progress-bar {
          width: 100%;
          height: 4px;
          background: #d1d7db;
          border-radius: 2px;
          overflow: hidden;
          
          .progress-fill {
            height: 100%;
            background: #00a884;
            transition: width 0.1s linear;
          }
        }
        
        .progress-handle {
          position: absolute;
          width: 12px;
          height: 12px;
          background: #00a884;
          border-radius: 50%;
          transform: translateX(-50%);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
      }
      
      .duration {
        font-size: 12px;
        color: #667781;
        min-width: 35px;
        text-align: right;
      }
    }
    
    .send-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #00a884;
      border: none;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &:hover:not(:disabled) {
        background: #06cf9c;
      }
      
      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
      
      .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
    }
  }
  
  // 错误提示
  .error-toast {
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: #ea4335;
    color: white;
    padding: 10px 16px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 1000;
  }
}

// 动画
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 深色模式
.dark-mode .voice-recorder {
  .record-btn {
    color: #aebac1;
    
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  }
  
  .recording-ui,
  .preview-ui {
    background: #2a3942;
    
    .recording-indicator .recording-time,
    .playback-controls .duration {
      color: #e9edef;
    }
    
    .cancel-btn,
    .delete-btn {
      color: #8696a0;
      
      &:hover {
        background: rgba(255, 255, 255, 0.05);
      }
    }
    
    .progress-container .progress-bar {
      background: #3b4a54;
    }
  }
}
</style>
