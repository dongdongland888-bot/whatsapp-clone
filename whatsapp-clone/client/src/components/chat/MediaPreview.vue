<template>
  <div class="media-preview-component">
    <!-- 图片消息 -->
    <div v-if="type === 'image'" class="image-message" @click="openLightbox">
      <img 
        :src="thumbnailUrl || mediaUrl" 
        :alt="fileName"
        loading="lazy"
        @error="handleImageError"
      />
      <div v-if="!loaded" class="loading-placeholder">
        <div class="spinner"></div>
      </div>
      <!-- 下载图标 -->
      <div class="media-overlay" v-if="showOverlay">
        <button class="download-btn" @click.stop="downloadMedia">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
      </div>
    </div>

    <!-- 视频消息 -->
    <div v-else-if="type === 'video'" class="video-message">
      <div v-if="!playing" class="video-thumbnail" @click="playVideo">
        <img 
          v-if="thumbnailUrl" 
          :src="thumbnailUrl" 
          :alt="fileName"
        />
        <div class="play-button">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="white">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>
        <div class="video-duration" v-if="duration">
          {{ formatDuration(duration) }}
        </div>
      </div>
      <video 
        v-else
        ref="videoPlayer"
        :src="mediaUrl"
        controls
        autoplay
        @ended="playing = false"
      />
    </div>

    <!-- 音频消息 -->
    <div v-else-if="type === 'audio'" class="audio-message">
      <div class="audio-player">
        <button class="play-btn" @click="toggleAudio">
          <svg v-if="!audioPlaying" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        </button>
        
        <div class="audio-waveform">
          <div 
            class="waveform-bar" 
            v-for="(height, index) in waveformBars" 
            :key="index"
            :style="{ 
              height: height + 'px',
              backgroundColor: index < playedBars ? '#00a884' : '#8696a0'
            }"
          ></div>
        </div>
        
        <span class="audio-duration">{{ formatDuration(audioDuration) }}</span>
      </div>
      <audio 
        ref="audioPlayer"
        :src="mediaUrl"
        @timeupdate="updateAudioProgress"
        @ended="audioPlaying = false"
        @loadedmetadata="onAudioLoaded"
      />
    </div>

    <!-- 文档消息 -->
    <div v-else-if="type === 'document'" class="document-message" @click="downloadMedia">
      <div class="document-icon" :style="{ backgroundColor: getDocumentColor(mimeType) }">
        <span class="document-ext">{{ getExtension(fileName) }}</span>
      </div>
      <div class="document-info">
        <span class="document-name">{{ fileName }}</span>
        <span class="document-meta">
          {{ formatFileSize(fileSize) }}
          <span v-if="pages"> • {{ pages }} pages</span>
        </span>
      </div>
      <button class="download-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      </button>
    </div>

    <!-- 灯箱查看器 -->
    <teleport to="body">
      <transition name="fade">
        <div v-if="showLightbox" class="lightbox" @click.self="closeLightbox">
          <div class="lightbox-header">
            <div class="lightbox-info">
              <span class="sender-name">{{ senderName }}</span>
              <span class="send-time">{{ formatTime(sentAt) }}</span>
            </div>
            <div class="lightbox-actions">
              <button class="action-btn" @click="downloadMedia" title="Download">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
              </button>
              <button class="action-btn" @click="closeLightbox" title="Close">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          <div class="lightbox-content">
            <img :src="mediaUrl" :alt="fileName" />
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';

export default {
  name: 'MediaPreview',
  props: {
    // 媒体类型: 'image', 'video', 'audio', 'document'
    type: {
      type: String,
      required: true
    },
    // 媒体 URL
    mediaUrl: {
      type: String,
      required: true
    },
    // 缩略图 URL
    thumbnailUrl: {
      type: String,
      default: ''
    },
    // 文件名
    fileName: {
      type: String,
      default: 'file'
    },
    // 文件大小 (bytes)
    fileSize: {
      type: Number,
      default: 0
    },
    // MIME 类型
    mimeType: {
      type: String,
      default: ''
    },
    // 视频/音频时长 (秒)
    duration: {
      type: Number,
      default: 0
    },
    // 文档页数
    pages: {
      type: Number,
      default: 0
    },
    // 图片宽度
    width: {
      type: Number,
      default: 0
    },
    // 图片高度
    height: {
      type: Number,
      default: 0
    },
    // 发送者名称
    senderName: {
      type: String,
      default: ''
    },
    // 发送时间
    sentAt: {
      type: [String, Date],
      default: ''
    }
  },
  setup(props) {
    const loaded = ref(false);
    const showOverlay = ref(false);
    const showLightbox = ref(false);
    const playing = ref(false);
    const audioPlaying = ref(false);
    const audioDuration = ref(props.duration || 0);
    const audioProgress = ref(0);
    const videoPlayer = ref(null);
    const audioPlayer = ref(null);
    
    // 生成波形条
    const waveformBars = ref([]);
    const generateWaveform = () => {
      const bars = [];
      for (let i = 0; i < 30; i++) {
        bars.push(Math.random() * 20 + 5);
      }
      waveformBars.value = bars;
    };
    
    // 已播放的波形条数量
    const playedBars = computed(() => {
      return Math.floor(audioProgress.value * waveformBars.value.length);
    });

    // 格式化时长
    const formatDuration = (seconds) => {
      if (!seconds) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // 格式化文件大小
    const formatFileSize = (bytes) => {
      if (!bytes) return '';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    // 格式化时间
    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    };

    // 获取文件扩展名
    const getExtension = (filename) => {
      const ext = filename.split('.').pop().toUpperCase();
      return ext.length > 4 ? ext.slice(0, 4) : ext;
    };

    // 根据文档类型获取颜色
    const getDocumentColor = (mimeType) => {
      const colors = {
        'application/pdf': '#FF5722',
        'application/msword': '#2196F3',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '#2196F3',
        'application/vnd.ms-excel': '#4CAF50',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '#4CAF50',
        'application/vnd.ms-powerpoint': '#FF9800',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': '#FF9800',
        'text/plain': '#9E9E9E',
        'application/zip': '#795548',
        'application/x-rar-compressed': '#795548'
      };
      return colors[mimeType] || '#607D8B';
    };

    // 图片加载错误处理
    const handleImageError = (event) => {
      event.target.src = '/placeholder-image.png';
    };

    // 打开灯箱
    const openLightbox = () => {
      if (props.type === 'image') {
        showLightbox.value = true;
        document.body.style.overflow = 'hidden';
      }
    };

    // 关闭灯箱
    const closeLightbox = () => {
      showLightbox.value = false;
      document.body.style.overflow = '';
    };

    // 播放视频
    const playVideo = () => {
      playing.value = true;
    };

    // 切换音频播放
    const toggleAudio = () => {
      if (!audioPlayer.value) return;
      
      if (audioPlaying.value) {
        audioPlayer.value.pause();
      } else {
        audioPlayer.value.play();
      }
      audioPlaying.value = !audioPlaying.value;
    };

    // 更新音频进度
    const updateAudioProgress = () => {
      if (!audioPlayer.value) return;
      audioProgress.value = audioPlayer.value.currentTime / audioPlayer.value.duration;
    };

    // 音频加载完成
    const onAudioLoaded = () => {
      if (audioPlayer.value) {
        audioDuration.value = audioPlayer.value.duration;
      }
    };

    // 下载媒体
    const downloadMedia = async () => {
      try {
        const response = await fetch(props.mediaUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = props.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download error:', error);
        // 回退方案：直接打开链接
        window.open(props.mediaUrl, '_blank');
      }
    };

    // 键盘事件处理
    const handleKeydown = (e) => {
      if (e.key === 'Escape' && showLightbox.value) {
        closeLightbox();
      }
    };

    onMounted(() => {
      generateWaveform();
      document.addEventListener('keydown', handleKeydown);
      
      // 模拟图片加载
      if (props.type === 'image') {
        const img = new Image();
        img.onload = () => {
          loaded.value = true;
        };
        img.src = props.thumbnailUrl || props.mediaUrl;
      }
    });

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown);
      if (showLightbox.value) {
        document.body.style.overflow = '';
      }
    });

    return {
      loaded,
      showOverlay,
      showLightbox,
      playing,
      audioPlaying,
      audioDuration,
      audioProgress,
      videoPlayer,
      audioPlayer,
      waveformBars,
      playedBars,
      formatDuration,
      formatFileSize,
      formatTime,
      getExtension,
      getDocumentColor,
      handleImageError,
      openLightbox,
      closeLightbox,
      playVideo,
      toggleAudio,
      updateAudioProgress,
      onAudioLoaded,
      downloadMedia
    };
  }
};
</script>

<style lang="scss" scoped>
.media-preview-component {
  max-width: 330px;
  
  // 图片消息
  .image-message {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    
    img {
      width: 100%;
      display: block;
      min-height: 100px;
      background: #f0f2f5;
    }
    
    .loading-placeholder {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e9edef;
      
      .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #00a884;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
    }
    
    .media-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
      
      .download-btn {
        background: rgba(0, 0, 0, 0.5);
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: white;
        
        &:hover {
          background: rgba(0, 0, 0, 0.7);
        }
      }
    }
    
    &:hover .media-overlay {
      opacity: 1;
    }
  }
  
  // 视频消息
  .video-message {
    border-radius: 8px;
    overflow: hidden;
    
    .video-thumbnail {
      position: relative;
      cursor: pointer;
      
      img {
        width: 100%;
        display: block;
      }
      
      .play-button {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 64px;
        height: 64px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        
        svg {
          margin-left: 4px;
        }
      }
      
      .video-duration {
        position: absolute;
        bottom: 8px;
        right: 8px;
        background: rgba(0, 0, 0, 0.6);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 12px;
      }
    }
    
    video {
      width: 100%;
      display: block;
    }
  }
  
  // 音频消息
  .audio-message {
    .audio-player {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px;
      min-width: 200px;
      
      .play-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #00a884;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: white;
        flex-shrink: 0;
        
        &:hover {
          background: #06cf9c;
        }
        
        svg {
          margin-left: 2px;
        }
      }
      
      .audio-waveform {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 2px;
        height: 30px;
        
        .waveform-bar {
          width: 3px;
          border-radius: 2px;
          transition: background-color 0.1s;
        }
      }
      
      .audio-duration {
        font-size: 12px;
        color: #667781;
        min-width: 35px;
        text-align: right;
      }
    }
    
    audio {
      display: none;
    }
  }
  
  // 文档消息
  .document-message {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    cursor: pointer;
    
    &:hover {
      background: rgba(0, 0, 0, 0.08);
    }
    
    .document-icon {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      
      .document-ext {
        color: white;
        font-size: 10px;
        font-weight: bold;
      }
    }
    
    .document-info {
      flex: 1;
      min-width: 0;
      
      .document-name {
        display: block;
        font-size: 14px;
        color: #111b21;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .document-meta {
        font-size: 12px;
        color: #667781;
      }
    }
    
    .download-btn {
      background: none;
      border: none;
      color: #667781;
      cursor: pointer;
      padding: 8px;
      
      &:hover {
        color: #111b21;
      }
    }
  }
  
  // 灯箱
  .lightbox {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.95);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    
    .lightbox-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: rgba(0, 0, 0, 0.5);
      
      .lightbox-info {
        .sender-name {
          display: block;
          color: white;
          font-size: 16px;
          font-weight: 500;
        }
        
        .send-time {
          font-size: 13px;
          color: #8696a0;
        }
      }
      
      .lightbox-actions {
        display: flex;
        gap: 8px;
        
        .action-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          
          &:hover {
            background: rgba(255, 255, 255, 0.1);
          }
        }
      }
    }
    
    .lightbox-content {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow: auto;
      
      img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
    }
  }
}

// 动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// 深色模式
.dark-mode .media-preview-component {
  .document-message {
    background: rgba(255, 255, 255, 0.05);
    
    &:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    
    .document-info {
      .document-name {
        color: #e9edef;
      }
    }
  }
}
</style>
