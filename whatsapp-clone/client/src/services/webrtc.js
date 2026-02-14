/**
 * WebRTC Service
 * 处理 WebRTC 连接、媒体流获取和信令交换
 */

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.pendingCandidates = [];
    
    // Event callbacks
    this.onLocalStream = null;
    this.onRemoteStream = null;
    this.onIceCandidate = null;
    this.onConnectionStateChange = null;
    this.onTrack = null;
    this.onNegotiationNeeded = null;
  }

  /**
   * 初始化本地媒体流
   * @param {boolean} video - 是否启用视频
   * @param {boolean} audio - 是否启用音频
   * @returns {Promise<MediaStream>}
   */
  async initLocalStream(video = true, audio = true) {
    try {
      const constraints = {
        video: video ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user'
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (this.onLocalStream) {
        this.onLocalStream(this.localStream);
      }
      
      return this.localStream;
    } catch (error) {
      console.error('Error getting local stream:', error);
      throw this.handleMediaError(error);
    }
  }

  /**
   * 处理媒体获取错误
   * @param {Error} error 
   * @returns {Error}
   */
  handleMediaError(error) {
    let message = 'Failed to access camera/microphone';
    
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        message = 'Camera/microphone permission denied. Please allow access in your browser settings.';
        break;
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        message = 'No camera or microphone found on this device.';
        break;
      case 'NotReadableError':
      case 'TrackStartError':
        message = 'Camera or microphone is already in use by another application.';
        break;
      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        message = 'Camera does not support the requested resolution.';
        break;
      case 'NotSupportedError':
        message = 'Your browser does not support WebRTC.';
        break;
      case 'TypeError':
        message = 'Invalid media constraints.';
        break;
      default:
        message = `Media error: ${error.message}`;
    }
    
    const customError = new Error(message);
    customError.originalError = error;
    return customError;
  }

  /**
   * 创建 RTCPeerConnection
   * @returns {RTCPeerConnection}
   */
  createPeerConnection() {
    if (this.peerConnection) {
      this.closePeerConnection();
    }

    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
    this.remoteStream = new MediaStream();
    this.pendingCandidates = [];

    // ICE candidate 事件
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    // ICE 连接状态变化
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('ICE connection state:', state);
      
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(state);
      }
    };

    // 连接状态变化
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('Connection state:', state);
    };

    // 接收远程轨道
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream.addTrack(track);
      });
      
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
      
      if (this.onTrack) {
        this.onTrack(event);
      }
    };

    // 重新协商
    this.peerConnection.onnegotiationneeded = () => {
      console.log('Negotiation needed');
      if (this.onNegotiationNeeded) {
        this.onNegotiationNeeded();
      }
    };

    // 添加本地轨道到连接
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    return this.peerConnection;
  }

  /**
   * 创建 Offer (发起方调用)
   * @returns {Promise<RTCSessionDescriptionInit>}
   */
  async createOffer() {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await this.peerConnection.setLocalDescription(offer);
      
      return offer;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  /**
   * 创建 Answer (接收方调用)
   * @returns {Promise<RTCSessionDescriptionInit>}
   */
  async createAnswer() {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      return answer;
    } catch (error) {
      console.error('Error creating answer:', error);
      throw error;
    }
  }

  /**
   * 设置远程描述 (SDP)
   * @param {RTCSessionDescriptionInit} description 
   */
  async setRemoteDescription(description) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(description)
      );
      
      // 添加之前缓存的 ICE candidates
      while (this.pendingCandidates.length > 0) {
        const candidate = this.pendingCandidates.shift();
        await this.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('Error setting remote description:', error);
      throw error;
    }
  }

  /**
   * 添加 ICE candidate
   * @param {RTCIceCandidateInit} candidate 
   */
  async addIceCandidate(candidate) {
    if (!this.peerConnection) {
      console.warn('Peer connection not initialized, caching candidate');
      this.pendingCandidates.push(candidate);
      return;
    }

    // 如果远程描述还没设置，缓存 candidate
    if (!this.peerConnection.remoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  /**
   * 切换本地视频开关
   * @param {boolean} enabled 
   */
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * 切换本地音频开关
   * @param {boolean} enabled 
   */
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * 切换摄像头 (前置/后置)
   */
  async switchCamera() {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    const currentFacingMode = videoTrack.getSettings().facingMode;
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: false
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // 替换本地流中的轨道
      this.localStream.removeTrack(videoTrack);
      this.localStream.addTrack(newVideoTrack);
      
      // 替换 peer connection 中的轨道
      if (this.peerConnection) {
        const sender = this.peerConnection.getSenders().find(
          s => s.track?.kind === 'video'
        );
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      videoTrack.stop();
      
      if (this.onLocalStream) {
        this.onLocalStream(this.localStream);
      }
    } catch (error) {
      console.error('Error switching camera:', error);
    }
  }

  /**
   * 获取当前连接统计信息
   * @returns {Promise<Object>}
   */
  async getStats() {
    if (!this.peerConnection) return null;

    const stats = await this.peerConnection.getStats();
    const result = {
      video: { bytesSent: 0, bytesReceived: 0 },
      audio: { bytesSent: 0, bytesReceived: 0 },
      connection: {}
    };

    stats.forEach(report => {
      if (report.type === 'outbound-rtp') {
        if (report.kind === 'video') {
          result.video.bytesSent = report.bytesSent;
        } else if (report.kind === 'audio') {
          result.audio.bytesSent = report.bytesSent;
        }
      } else if (report.type === 'inbound-rtp') {
        if (report.kind === 'video') {
          result.video.bytesReceived = report.bytesReceived;
        } else if (report.kind === 'audio') {
          result.audio.bytesReceived = report.bytesReceived;
        }
      } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        result.connection = {
          localCandidateType: report.localCandidateType,
          remoteCandidateType: report.remoteCandidateType,
          roundTripTime: report.currentRoundTripTime
        };
      }
    });

    return result;
  }

  /**
   * 获取详细的连接质量统计信息
   * @returns {Promise<Object>}
   */
  async getDetailedStats() {
    if (!this.peerConnection) return null;

    const stats = await this.peerConnection.getStats();
    const result = {
      video: {
        bytesSent: 0,
        bytesReceived: 0,
        packetsSent: 0,
        packetsReceived: 0,
        packetsLost: 0,
        jitter: 0,
        frameWidth: 0,
        frameHeight: 0,
        framesPerSecond: 0
      },
      audio: {
        bytesSent: 0,
        bytesReceived: 0,
        packetsSent: 0,
        packetsReceived: 0,
        packetsLost: 0,
        jitter: 0
      },
      connection: {
        localCandidateType: null,
        remoteCandidateType: null,
        roundTripTime: 0,
        availableOutgoingBitrate: 0,
        availableIncomingBitrate: 0
      },
      timestamp: Date.now()
    };

    stats.forEach(report => {
      if (report.type === 'outbound-rtp') {
        if (report.kind === 'video') {
          result.video.bytesSent = report.bytesSent || 0;
          result.video.packetsSent = report.packetsSent || 0;
          result.video.frameWidth = report.frameWidth || 0;
          result.video.frameHeight = report.frameHeight || 0;
          result.video.framesPerSecond = report.framesPerSecond || 0;
        } else if (report.kind === 'audio') {
          result.audio.bytesSent = report.bytesSent || 0;
          result.audio.packetsSent = report.packetsSent || 0;
        }
      } else if (report.type === 'inbound-rtp') {
        if (report.kind === 'video') {
          result.video.bytesReceived = report.bytesReceived || 0;
          result.video.packetsReceived = report.packetsReceived || 0;
          result.video.packetsLost = report.packetsLost || 0;
          result.video.jitter = report.jitter || 0;
        } else if (report.kind === 'audio') {
          result.audio.bytesReceived = report.bytesReceived || 0;
          result.audio.packetsReceived = report.packetsReceived || 0;
          result.audio.packetsLost = report.packetsLost || 0;
          result.audio.jitter = report.jitter || 0;
        }
      } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        result.connection = {
          localCandidateType: report.localCandidateType,
          remoteCandidateType: report.remoteCandidateType,
          roundTripTime: report.currentRoundTripTime || 0,
          availableOutgoingBitrate: report.availableOutgoingBitrate || 0,
          availableIncomingBitrate: report.availableIncomingBitrate || 0
        };
      }
    });

    return result;
  }

  /**
   * 计算网络质量评分 (0-100)
   * @param {Object} stats - 来自 getDetailedStats 的统计数据
   * @returns {Object} - { score, level: 'excellent'|'good'|'fair'|'poor' }
   */
  calculateNetworkQuality(stats) {
    if (!stats) return { score: 0, level: 'poor' };

    let score = 100;

    // RTT 评估 (理想 < 100ms)
    const rtt = stats.connection.roundTripTime * 1000; // 转换为毫秒
    if (rtt > 300) score -= 40;
    else if (rtt > 200) score -= 25;
    else if (rtt > 100) score -= 10;

    // 丢包率评估
    const totalPacketsReceived = stats.video.packetsReceived + stats.audio.packetsReceived;
    const totalPacketsLost = stats.video.packetsLost + stats.audio.packetsLost;
    const packetLossRate = totalPacketsReceived > 0 
      ? (totalPacketsLost / (totalPacketsReceived + totalPacketsLost)) * 100 
      : 0;
    
    if (packetLossRate > 10) score -= 40;
    else if (packetLossRate > 5) score -= 25;
    else if (packetLossRate > 2) score -= 10;

    // Jitter 评估 (理想 < 30ms)
    const maxJitter = Math.max(stats.video.jitter, stats.audio.jitter) * 1000;
    if (maxJitter > 100) score -= 20;
    else if (maxJitter > 50) score -= 10;
    else if (maxJitter > 30) score -= 5;

    // 确保分数在 0-100 之间
    score = Math.max(0, Math.min(100, score));

    // 确定质量级别
    let level;
    if (score >= 80) level = 'excellent';
    else if (score >= 60) level = 'good';
    else if (score >= 40) level = 'fair';
    else level = 'poor';

    return { score, level, rtt, packetLossRate, jitter: maxJitter };
  }

  /**
   * 开始屏幕共享
   * @returns {Promise<MediaStream>}
   */
  async startScreenShare() {
    try {
      // 检查浏览器是否支持屏幕共享
      if (!navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing is not supported in your browser');
      }

      // 获取屏幕流
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // 保存原始视频轨道以便恢复
      const originalVideoTrack = this.localStream?.getVideoTracks()[0];
      this._originalVideoTrack = originalVideoTrack;

      // 获取屏幕视频轨道
      const screenVideoTrack = screenStream.getVideoTracks()[0];

      // 监听屏幕共享停止事件（用户点击浏览器的停止共享按钮）
      screenVideoTrack.onended = () => {
        this.stopScreenShare();
        if (this.onScreenShareEnded) {
          this.onScreenShareEnded();
        }
      };

      // 替换 peer connection 中的视频轨道
      if (this.peerConnection) {
        const sender = this.peerConnection.getSenders().find(
          s => s.track?.kind === 'video'
        );
        if (sender) {
          await sender.replaceTrack(screenVideoTrack);
        }
      }

      // 更新本地流
      if (this.localStream && originalVideoTrack) {
        this.localStream.removeTrack(originalVideoTrack);
        this.localStream.addTrack(screenVideoTrack);
      }

      this._isScreenSharing = true;
      this._screenStream = screenStream;

      // 触发回调
      if (this.onScreenShareStarted) {
        this.onScreenShareStarted(screenStream);
      }

      return screenStream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      
      // 处理用户取消的情况
      if (error.name === 'NotAllowedError') {
        throw new Error('Screen sharing permission denied');
      }
      
      throw error;
    }
  }

  /**
   * 停止屏幕共享
   */
  async stopScreenShare() {
    if (!this._isScreenSharing) return;

    try {
      // 停止屏幕流的所有轨道
      if (this._screenStream) {
        this._screenStream.getTracks().forEach(track => track.stop());
        this._screenStream = null;
      }

      // 恢复原始摄像头视频轨道
      if (this._originalVideoTrack && this.localStream) {
        // 重新获取摄像头流
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 },
            facingMode: 'user'
          }
        });

        const newVideoTrack = cameraStream.getVideoTracks()[0];

        // 替换 peer connection 中的轨道
        if (this.peerConnection) {
          const sender = this.peerConnection.getSenders().find(
            s => s.track?.kind === 'video'
          );
          if (sender) {
            await sender.replaceTrack(newVideoTrack);
          }
        }

        // 更新本地流
        const oldTrack = this.localStream.getVideoTracks()[0];
        if (oldTrack) {
          this.localStream.removeTrack(oldTrack);
        }
        this.localStream.addTrack(newVideoTrack);

        // 触发本地流更新回调
        if (this.onLocalStream) {
          this.onLocalStream(this.localStream);
        }
      }

      this._isScreenSharing = false;
      this._originalVideoTrack = null;

      // 触发回调
      if (this.onScreenShareStopped) {
        this.onScreenShareStopped();
      }
    } catch (error) {
      console.error('Error stopping screen share:', error);
      throw error;
    }
  }

  /**
   * 检查是否正在屏幕共享
   * @returns {boolean}
   */
  isScreenSharing() {
    return this._isScreenSharing || false;
  }

  /**
   * 检查屏幕共享是否支持
   * @returns {boolean}
   */
  static isScreenShareSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  }

  /**
   * 关闭本地媒体流
   */
  closeLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }
  }

  /**
   * 关闭 Peer Connection
   */
  closePeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.remoteStream = null;
    this.pendingCandidates = [];
  }

  /**
   * 完全清理所有资源
   */
  cleanup() {
    this.closeLocalStream();
    this.closePeerConnection();
    
    // 清除回调
    this.onLocalStream = null;
    this.onRemoteStream = null;
    this.onIceCandidate = null;
    this.onConnectionStateChange = null;
    this.onTrack = null;
    this.onNegotiationNeeded = null;
  }

  /**
   * 检查 WebRTC 支持
   * @returns {boolean}
   */
  static isSupported() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.RTCPeerConnection
    );
  }

  /**
   * 获取可用的媒体设备
   * @returns {Promise<MediaDeviceInfo[]>}
   */
  static async getMediaDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    return {
      videoInputs: devices.filter(d => d.kind === 'videoinput'),
      audioInputs: devices.filter(d => d.kind === 'audioinput'),
      audioOutputs: devices.filter(d => d.kind === 'audiooutput')
    };
  }
}

export default WebRTCService;
