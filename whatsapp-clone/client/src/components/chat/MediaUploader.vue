<template>
  <div class="media-uploader">
    <!-- 上传按钮触发器 -->
    <div class="upload-trigger" @click="toggleMenu" ref="triggerRef">
      <slot name="trigger">
        <button class="btn btn-icon" title="Attach">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
      </slot>
    </div>

    <!-- 上传菜单 -->
    <transition name="slide-up">
      <div v-if="showMenu" class="upload-menu" ref="menuRef">
        <div 
          v-for="option in uploadOptions" 
          :key="option.type"
          class="upload-option"
          @click="selectOption(option)"
        >
          <div class="option-icon" :style="{ backgroundColor: option.color }">
            <component :is="option.icon" />
          </div>
          <span class="option-label">{{ option.label }}</span>
        </div>
      </div>
    </transition>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInput"
      type="file"
      :accept="acceptTypes"
      :multiple="allowMultiple"
      @change="handleFileSelect"
      style="display: none"
    />

    <!-- 预览模态框 -->
    <transition name="fade">
      <div v-if="showPreview" class="preview-modal" @click.self="closePreview">
        <div class="preview-container">
          <div class="preview-header">
            <h3>{{ previewTitle }}</h3>
            <button class="btn btn-icon close-btn" @click="closePreview">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="preview-content">
            <!-- 图片预览 -->
            <div v-if="selectedType === 'image'" class="image-preview">
              <div 
                v-for="(file, index) in selectedFiles" 
                :key="index"
                class="preview-item"
              >
                <img :src="file.preview" :alt="file.name" />
                <button class="remove-btn" @click="removeFile(index)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            <!-- 视频预览 -->
            <div v-else-if="selectedType === 'video'" class="video-preview">
              <video 
                v-for="(file, index) in selectedFiles" 
                :key="index"
                :src="file.preview" 
                controls
              />
            </div>

            <!-- 文档预览 -->
            <div v-else-if="selectedType === 'document'" class="document-preview">
              <div 
                v-for="(file, index) in selectedFiles" 
                :key="index"
                class="document-item"
              >
                <div class="document-icon">
                  <component :is="getDocumentIcon(file.type)" />
                </div>
                <div class="document-info">
                  <span class="document-name">{{ file.name }}</span>
                  <span class="document-size">{{ formatFileSize(file.size) }}</span>
                </div>
                <button class="remove-btn" @click="removeFile(index)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- 说明文字输入 -->
          <div class="preview-caption">
            <input
              v-model="caption"
              type="text"
              placeholder="Add a caption..."
              @keypress.enter="sendMedia"
            />
          </div>

          <div class="preview-actions">
            <button class="btn btn-cancel" @click="closePreview">Cancel</button>
            <button 
              class="btn btn-send" 
              @click="sendMedia"
              :disabled="uploading"
            >
              <span v-if="uploading">
                <svg class="spinner" width="20" height="20" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4" stroke-linecap="round">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                  </circle>
                </svg>
                Sending...
              </span>
              <span v-else>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                Send
              </span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 上传进度 -->
    <transition name="fade">
      <div v-if="uploading && !showPreview" class="upload-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: uploadProgress + '%' }"></div>
        </div>
        <span class="progress-text">{{ uploadProgress }}%</span>
      </div>
    </transition>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, h } from 'vue';
import axios from 'axios';

// 图标组件
const ImageIcon = () => h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'white', 'stroke-width': 2 }, [
  h('rect', { x: 3, y: 3, width: 18, height: 18, rx: 2, ry: 2 }),
  h('circle', { cx: 8.5, cy: 8.5, r: 1.5 }),
  h('polyline', { points: '21 15 16 10 5 21' })
]);

const VideoIcon = () => h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'white', 'stroke-width': 2 }, [
  h('polygon', { points: '23 7 16 12 23 17 23 7' }),
  h('rect', { x: 1, y: 5, width: 15, height: 14, rx: 2, ry: 2 })
]);

const DocumentIcon = () => h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'white', 'stroke-width': 2 }, [
  h('path', { d: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' }),
  h('polyline', { points: '14 2 14 8 20 8' }),
  h('line', { x1: 16, y1: 13, x2: 8, y2: 13 }),
  h('line', { x1: 16, y1: 17, x2: 8, y2: 17 }),
  h('polyline', { points: '10 9 9 9 8 9' })
]);

const PdfIcon = () => h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [
  h('path', { d: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z' }),
  h('text', { x: 8, y: 16, 'font-size': 6, fill: 'currentColor', stroke: 'none' }, 'PDF')
]);

export default {
  name: 'MediaUploader',
  props: {
    // 允许的文件类型: 'all', 'image', 'video', 'document'
    allowedTypes: {
      type: Array,
      default: () => ['image', 'video', 'document']
    },
    // 是否允许多文件上传
    allowMultiple: {
      type: Boolean,
      default: true
    },
    // 最大文件大小 (MB)
    maxFileSize: {
      type: Number,
      default: 64
    },
    // 最大文件数量
    maxFiles: {
      type: Number,
      default: 10
    }
  },
  emits: ['upload-complete', 'upload-error', 'send-media'],
  setup(props, { emit }) {
    const showMenu = ref(false);
    const showPreview = ref(false);
    const selectedType = ref('');
    const selectedFiles = ref([]);
    const acceptTypes = ref('');
    const caption = ref('');
    const uploading = ref(false);
    const uploadProgress = ref(0);
    const fileInput = ref(null);
    const triggerRef = ref(null);
    const menuRef = ref(null);

    // 上传选项配置
    const uploadOptions = computed(() => {
      const options = [];
      
      if (props.allowedTypes.includes('image')) {
        options.push({
          type: 'image',
          label: 'Photos',
          icon: ImageIcon,
          color: '#7C3AED',
          accept: 'image/jpeg,image/png,image/gif,image/webp'
        });
      }
      
      if (props.allowedTypes.includes('video')) {
        options.push({
          type: 'video',
          label: 'Videos',
          icon: VideoIcon,
          color: '#EC4899',
          accept: 'video/mp4,video/webm,video/quicktime'
        });
      }
      
      if (props.allowedTypes.includes('document')) {
        options.push({
          type: 'document',
          label: 'Documents',
          icon: DocumentIcon,
          color: '#3B82F6',
          accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar'
        });
      }
      
      return options;
    });

    // 预览标题
    const previewTitle = computed(() => {
      const count = selectedFiles.value.length;
      const type = selectedType.value;
      
      if (count === 1) {
        return `Send ${type}`;
      }
      return `Send ${count} ${type}s`;
    });

    // 切换菜单显示
    const toggleMenu = () => {
      showMenu.value = !showMenu.value;
    };

    // 选择上传选项
    const selectOption = (option) => {
      selectedType.value = option.type;
      acceptTypes.value = option.accept;
      showMenu.value = false;
      
      // 触发文件选择
      if (fileInput.value) {
        fileInput.value.accept = option.accept;
        fileInput.value.click();
      }
    };

    // 处理文件选择
    const handleFileSelect = async (event) => {
      const files = Array.from(event.target.files);
      
      if (files.length === 0) return;
      
      // 验证文件
      const validFiles = [];
      for (const file of files) {
        // 检查文件大小
        if (file.size > props.maxFileSize * 1024 * 1024) {
          emit('upload-error', {
            file: file.name,
            error: `File exceeds ${props.maxFileSize}MB limit`
          });
          continue;
        }
        
        // 检查文件数量
        if (validFiles.length >= props.maxFiles) {
          emit('upload-error', {
            error: `Maximum ${props.maxFiles} files allowed`
          });
          break;
        }
        
        // 创建预览
        const preview = await createPreview(file);
        validFiles.push({
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          preview
        });
      }
      
      if (validFiles.length > 0) {
        selectedFiles.value = validFiles;
        showPreview.value = true;
      }
      
      // 重置 input
      event.target.value = '';
    };

    // 创建文件预览
    const createPreview = (file) => {
      return new Promise((resolve) => {
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        } else {
          resolve(null);
        }
      });
    };

    // 移除文件
    const removeFile = (index) => {
      selectedFiles.value.splice(index, 1);
      if (selectedFiles.value.length === 0) {
        closePreview();
      }
    };

    // 关闭预览
    const closePreview = () => {
      showPreview.value = false;
      selectedFiles.value = [];
      caption.value = '';
      selectedType.value = '';
    };

    // 发送媒体
    const sendMedia = async () => {
      if (selectedFiles.value.length === 0 || uploading.value) return;
      
      uploading.value = true;
      uploadProgress.value = 0;
      
      try {
        const uploadedMedia = [];
        
        for (let i = 0; i < selectedFiles.value.length; i++) {
          const fileData = selectedFiles.value[i];
          const formData = new FormData();
          formData.append('file', fileData.file);
          
          const response = await axios.post('/api/media/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
              const fileProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              uploadProgress.value = Math.round(((i * 100) + fileProgress) / selectedFiles.value.length);
            }
          });
          
          if (response.data.success) {
            uploadedMedia.push(response.data.data);
          }
        }
        
        // 触发发送事件
        emit('send-media', {
          media: uploadedMedia,
          caption: caption.value,
          type: selectedType.value
        });
        
        emit('upload-complete', uploadedMedia);
        closePreview();
        
      } catch (error) {
        console.error('Upload error:', error);
        emit('upload-error', {
          error: error.response?.data?.message || 'Upload failed'
        });
      } finally {
        uploading.value = false;
        uploadProgress.value = 0;
      }
    };

    // 格式化文件大小
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // 获取文档图标
    const getDocumentIcon = (mimeType) => {
      if (mimeType.includes('pdf')) {
        return PdfIcon;
      }
      return DocumentIcon;
    };

    // 点击外部关闭菜单
    const handleClickOutside = (event) => {
      if (showMenu.value && 
          menuRef.value && 
          !menuRef.value.contains(event.target) &&
          !triggerRef.value.contains(event.target)) {
        showMenu.value = false;
      }
    };

    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });

    return {
      showMenu,
      showPreview,
      selectedType,
      selectedFiles,
      acceptTypes,
      caption,
      uploading,
      uploadProgress,
      fileInput,
      triggerRef,
      menuRef,
      uploadOptions,
      previewTitle,
      toggleMenu,
      selectOption,
      handleFileSelect,
      removeFile,
      closePreview,
      sendMedia,
      formatFileSize,
      getDocumentIcon
    };
  }
};
</script>

<style lang="scss" scoped>
.media-uploader {
  position: relative;
  
  .upload-trigger {
    .btn-icon {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      color: #54656f;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &:hover {
        background-color: rgba(0, 0, 0, 0.05);
      }
    }
  }
  
  .upload-menu {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: 10px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
    padding: 12px;
    min-width: 160px;
    z-index: 100;
    
    .upload-option {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      cursor: pointer;
      border-radius: 8px;
      transition: background-color 0.2s;
      
      &:hover {
        background-color: #f0f2f5;
      }
      
      .option-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
      }
      
      .option-label {
        font-size: 14px;
        color: #111b21;
      }
    }
  }
  
  .preview-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    
    .preview-container {
      background: #111b21;
      border-radius: 12px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      
      .preview-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #2a3942;
        
        h3 {
          color: white;
          margin: 0;
          font-size: 18px;
        }
        
        .close-btn {
          background: none;
          border: none;
          color: #aebac1;
          cursor: pointer;
          padding: 4px;
          
          &:hover {
            color: white;
          }
        }
      }
      
      .preview-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        
        .image-preview {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 12px;
          
          .preview-item {
            position: relative;
            aspect-ratio: 1;
            border-radius: 8px;
            overflow: hidden;
            
            img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            
            .remove-btn {
              position: absolute;
              top: 8px;
              right: 8px;
              background: rgba(0, 0, 0, 0.6);
              border: none;
              border-radius: 50%;
              width: 28px;
              height: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              color: white;
              
              &:hover {
                background: rgba(0, 0, 0, 0.8);
              }
            }
          }
        }
        
        .video-preview {
          video {
            width: 100%;
            max-height: 400px;
            border-radius: 8px;
          }
        }
        
        .document-preview {
          .document-item {
            display: flex;
            align-items: center;
            background: #2a3942;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 8px;
            
            .document-icon {
              width: 48px;
              height: 48px;
              background: #00a884;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-right: 12px;
              color: white;
            }
            
            .document-info {
              flex: 1;
              
              .document-name {
                display: block;
                color: white;
                font-size: 14px;
                margin-bottom: 4px;
                word-break: break-all;
              }
              
              .document-size {
                color: #8696a0;
                font-size: 12px;
              }
            }
            
            .remove-btn {
              background: none;
              border: none;
              color: #8696a0;
              cursor: pointer;
              padding: 4px;
              
              &:hover {
                color: white;
              }
            }
          }
        }
      }
      
      .preview-caption {
        padding: 12px 20px;
        border-top: 1px solid #2a3942;
        
        input {
          width: 100%;
          background: #2a3942;
          border: none;
          border-radius: 8px;
          padding: 12px 16px;
          color: white;
          font-size: 14px;
          
          &::placeholder {
            color: #8696a0;
          }
          
          &:focus {
            outline: none;
          }
        }
      }
      
      .preview-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 20px;
        border-top: 1px solid #2a3942;
        
        .btn {
          padding: 10px 24px;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          
          &.btn-cancel {
            background: transparent;
            border: 1px solid #8696a0;
            color: #8696a0;
            
            &:hover {
              background: rgba(255, 255, 255, 0.05);
            }
          }
          
          &.btn-send {
            background: #00a884;
            border: none;
            color: white;
            
            &:hover:not(:disabled) {
              background: #06cf9c;
            }
            
            &:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }
            
            .spinner {
              animation: spin 1s linear infinite;
            }
          }
        }
      }
    }
  }
  
  .upload-progress {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: #111b21;
    padding: 12px 20px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    
    .progress-bar {
      width: 200px;
      height: 4px;
      background: #2a3942;
      border-radius: 2px;
      overflow: hidden;
      
      .progress-fill {
        height: 100%;
        background: #00a884;
        transition: width 0.3s;
      }
    }
    
    .progress-text {
      color: white;
      font-size: 12px;
      min-width: 35px;
    }
  }
}

// 动画
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.2s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

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
</style>
