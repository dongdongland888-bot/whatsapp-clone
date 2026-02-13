/**
 * Vuex Call Module
 * 管理视频/语音通话状态
 */

import WebRTCService from '@/services/webrtc';

// 通话状态枚举
export const CALL_STATUS = {
  IDLE: 'idle',
  INITIATING: 'initiating',
  RINGING: 'ringing',
  INCOMING: 'incoming',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ENDED: 'ended',
  FAILED: 'failed'
};

// 通话类型枚举
export const CALL_TYPE = {
  VIDEO: 'video',
  VOICE: 'voice'
};

const state = {
  // 通话状态
  status: CALL_STATUS.IDLE,
  
  // 通话信息
  callId: null,
  callType: null, // 'video' | 'voice'
  
  // 通话参与者
  caller: null,    // 发起通话的人
  receiver: null,  // 接收通话的人
  isCaller: false, // 当前用户是否是发起方
  
  // 媒体控制
  isVideoEnabled: true,
  isAudioEnabled: true,
  isSpeakerOn: false,
  
  // 媒体流
  localStream: null,
  remoteStream: null,
  
  // 通话时间
  callStartTime: null,
  callDuration: 0,
  durationTimer: null,
  
  // 错误信息
  error: null,
  
  // 来电铃声
  ringtone: null,
  
  // 连接状态
  connectionState: null,
  iceConnectionState: null,
  
  // WebRTC 服务实例
  webrtcService: null
};

const mutations = {
  SET_STATUS(state, status) {
    state.status = status;
  },
  
  SET_CALL_INFO(state, { callId, callType, caller, receiver, isCaller }) {
    state.callId = callId;
    state.callType = callType;
    state.caller = caller;
    state.receiver = receiver;
    state.isCaller = isCaller;
  },
  
  SET_VIDEO_ENABLED(state, enabled) {
    state.isVideoEnabled = enabled;
  },
  
  SET_AUDIO_ENABLED(state, enabled) {
    state.isAudioEnabled = enabled;
  },
  
  SET_SPEAKER_ON(state, on) {
    state.isSpeakerOn = on;
  },
  
  SET_LOCAL_STREAM(state, stream) {
    state.localStream = stream;
  },
  
  SET_REMOTE_STREAM(state, stream) {
    state.remoteStream = stream;
  },
  
  SET_CALL_START_TIME(state, time) {
    state.callStartTime = time;
  },
  
  SET_CALL_DURATION(state, duration) {
    state.callDuration = duration;
  },
  
  SET_DURATION_TIMER(state, timer) {
    state.durationTimer = timer;
  },
  
  SET_ERROR(state, error) {
    state.error = error;
  },
  
  SET_RINGTONE(state, ringtone) {
    state.ringtone = ringtone;
  },
  
  SET_CONNECTION_STATE(state, connectionState) {
    state.connectionState = connectionState;
  },
  
  SET_ICE_CONNECTION_STATE(state, iceConnectionState) {
    state.iceConnectionState = iceConnectionState;
  },
  
  SET_WEBRTC_SERVICE(state, service) {
    state.webrtcService = service;
  },
  
  RESET_CALL(state) {
    // 清理计时器
    if (state.durationTimer) {
      clearInterval(state.durationTimer);
    }
    
    // 停止铃声
    if (state.ringtone) {
      state.ringtone.pause();
      state.ringtone.currentTime = 0;
    }
    
    // 重置状态
    state.status = CALL_STATUS.IDLE;
    state.callId = null;
    state.callType = null;
    state.caller = null;
    state.receiver = null;
    state.isCaller = false;
    state.isVideoEnabled = true;
    state.isAudioEnabled = true;
    state.isSpeakerOn = false;
    state.localStream = null;
    state.remoteStream = null;
    state.callStartTime = null;
    state.callDuration = 0;
    state.durationTimer = null;
    state.error = null;
    state.connectionState = null;
    state.iceConnectionState = null;
    // 不重置 webrtcService，但清理它的资源
    if (state.webrtcService) {
      state.webrtcService.cleanup();
    }
  }
};

const actions = {
  /**
   * 初始化 WebRTC 服务
   */
  initWebRTC({ commit, state }) {
    if (!state.webrtcService) {
      const service = new WebRTCService();
      commit('SET_WEBRTC_SERVICE', service);
    }
    return state.webrtcService;
  },
  
  /**
   * 发起通话
   * @param {Object} payload - { userId, username, avatar, callType }
   */
  async initiateCall({ commit, dispatch, state, rootState }, { userId, username, avatar, callType }) {
    try {
      // 检查 WebRTC 支持
      if (!WebRTCService.isSupported()) {
        throw new Error('Your browser does not support video calls');
      }
      
      // 初始化 WebRTC 服务
      const webrtc = await dispatch('initWebRTC');
      
      commit('SET_STATUS', CALL_STATUS.INITIATING);
      commit('SET_CALL_INFO', {
        callId: null,
        callType,
        caller: {
          id: rootState.auth.user.id,
          username: rootState.auth.user.username,
          avatar: rootState.auth.user.avatar
        },
        receiver: {
          id: userId,
          username,
          avatar
        },
        isCaller: true
      });
      
      // 设置初始视频状态
      commit('SET_VIDEO_ENABLED', callType === CALL_TYPE.VIDEO);
      
      // 获取本地媒体流
      const isVideo = callType === CALL_TYPE.VIDEO;
      const localStream = await webrtc.initLocalStream(isVideo, true);
      commit('SET_LOCAL_STREAM', localStream);
      
      // 创建 peer connection
      webrtc.createPeerConnection();
      
      // 设置回调
      webrtc.onLocalStream = (stream) => {
        commit('SET_LOCAL_STREAM', stream);
      };
      
      webrtc.onRemoteStream = (stream) => {
        commit('SET_REMOTE_STREAM', stream);
      };
      
      webrtc.onIceCandidate = (candidate) => {
        dispatch('sendIceCandidate', { candidate, targetUserId: userId });
      };
      
      webrtc.onConnectionStateChange = (iceState) => {
        commit('SET_ICE_CONNECTION_STATE', iceState);
        dispatch('handleConnectionStateChange', iceState);
      };
      
      // 创建 offer
      const offer = await webrtc.createOffer();
      
      // 发送通话请求
      const socket = rootState.chat.socket;
      if (!socket) {
        throw new Error('Socket not connected');
      }
      
      socket.emit('call-initiate', {
        receiverId: userId,
        callType,
        offer
      });
      
      commit('SET_STATUS', CALL_STATUS.RINGING);
      
      // 播放拨号音
      dispatch('playRingtone', 'outgoing');
      
    } catch (error) {
      console.error('Error initiating call:', error);
      commit('SET_ERROR', error.message);
      commit('SET_STATUS', CALL_STATUS.FAILED);
      dispatch('cleanupCall');
      throw error;
    }
  },
  
  /**
   * 处理来电
   */
  handleIncomingCall({ commit, dispatch }, { callId, callType, caller, offer }) {
    commit('SET_STATUS', CALL_STATUS.INCOMING);
    commit('SET_CALL_INFO', {
      callId,
      callType,
      caller,
      receiver: null, // 会在接听时设置
      isCaller: false
    });
    
    // 保存 offer 以便接听时使用
    commit('SET_VIDEO_ENABLED', callType === CALL_TYPE.VIDEO);
    
    // 临时存储 offer
    if (!state._pendingOffer) {
      Object.defineProperty(state, '_pendingOffer', {
        value: offer,
        writable: true,
        configurable: true
      });
    } else {
      state._pendingOffer = offer;
    }
    
    // 播放来电铃声
    dispatch('playRingtone', 'incoming');
  },
  
  /**
   * 接听通话
   */
  async answerCall({ commit, dispatch, state, rootState }) {
    try {
      // 停止铃声
      dispatch('stopRingtone');
      
      commit('SET_STATUS', CALL_STATUS.CONNECTING);
      
      // 初始化 WebRTC 服务
      const webrtc = await dispatch('initWebRTC');
      
      // 获取本地媒体流
      const isVideo = state.callType === CALL_TYPE.VIDEO;
      const localStream = await webrtc.initLocalStream(isVideo, true);
      commit('SET_LOCAL_STREAM', localStream);
      
      // 创建 peer connection
      webrtc.createPeerConnection();
      
      // 设置回调
      webrtc.onLocalStream = (stream) => {
        commit('SET_LOCAL_STREAM', stream);
      };
      
      webrtc.onRemoteStream = (stream) => {
        commit('SET_REMOTE_STREAM', stream);
      };
      
      webrtc.onIceCandidate = (candidate) => {
        dispatch('sendIceCandidate', { 
          candidate, 
          targetUserId: state.caller.id 
        });
      };
      
      webrtc.onConnectionStateChange = (iceState) => {
        commit('SET_ICE_CONNECTION_STATE', iceState);
        dispatch('handleConnectionStateChange', iceState);
      };
      
      // 设置远程描述 (offer)
      const offer = state._pendingOffer;
      if (!offer) {
        throw new Error('No pending offer found');
      }
      await webrtc.setRemoteDescription(offer);
      
      // 创建 answer
      const answer = await webrtc.createAnswer();
      
      // 发送 answer
      const socket = rootState.chat.socket;
      if (!socket) {
        throw new Error('Socket not connected');
      }
      
      socket.emit('call-answer', {
        callId: state.callId,
        answer
      });
      
      // 清理临时存储的 offer
      delete state._pendingOffer;
      
    } catch (error) {
      console.error('Error answering call:', error);
      commit('SET_ERROR', error.message);
      commit('SET_STATUS', CALL_STATUS.FAILED);
      dispatch('cleanupCall');
      throw error;
    }
  },
  
  /**
   * 处理通话被接听 (发起方收到 answer)
   */
  async handleCallAnswered({ commit, dispatch, state }, { callId, answer }) {
    try {
      dispatch('stopRingtone');
      
      commit('SET_STATUS', CALL_STATUS.CONNECTING);
      
      if (state.callId !== callId && state.callId !== null) {
        console.warn('Call ID mismatch');
        return;
      }
      
      commit('SET_CALL_INFO', { ...state, callId });
      
      const webrtc = state.webrtcService;
      if (!webrtc) {
        throw new Error('WebRTC service not initialized');
      }
      
      // 设置远程描述 (answer)
      await webrtc.setRemoteDescription(answer);
      
    } catch (error) {
      console.error('Error handling call answer:', error);
      commit('SET_ERROR', error.message);
      commit('SET_STATUS', CALL_STATUS.FAILED);
      dispatch('cleanupCall');
    }
  },
  
  /**
   * 拒绝通话
   */
  rejectCall({ commit, dispatch, state, rootState }, reason = 'declined') {
    dispatch('stopRingtone');
    
    const socket = rootState.chat.socket;
    if (socket && state.callId) {
      socket.emit('call-decline', {
        callId: state.callId,
        reason
      });
    }
    
    dispatch('cleanupCall');
  },
  
  /**
   * 结束通话
   */
  endCall({ commit, dispatch, state, rootState }) {
    dispatch('stopRingtone');
    
    const socket = rootState.chat.socket;
    if (socket && state.callId) {
      socket.emit('call-end', {
        callId: state.callId
      });
    }
    
    dispatch('cleanupCall');
  },
  
  /**
   * 处理通话被拒绝
   */
  handleCallDeclined({ commit, dispatch, state }, { callId, reason }) {
    if (state.callId !== callId && state.callId !== null) return;
    
    dispatch('stopRingtone');
    commit('SET_STATUS', CALL_STATUS.ENDED);
    commit('SET_ERROR', reason === 'busy' ? 'User is busy' : 'Call declined');
    
    // 延迟清理，让用户看到状态
    setTimeout(() => {
      dispatch('cleanupCall');
    }, 2000);
  },
  
  /**
   * 处理通话结束
   */
  handleCallEnded({ commit, dispatch, state }, { callId }) {
    if (state.callId !== callId && state.callId !== null) return;
    
    dispatch('stopRingtone');
    commit('SET_STATUS', CALL_STATUS.ENDED);
    
    // 延迟清理，让用户看到状态
    setTimeout(() => {
      dispatch('cleanupCall');
    }, 1500);
  },
  
  /**
   * 发送 ICE candidate
   */
  sendIceCandidate({ state, rootState }, { candidate, targetUserId }) {
    const socket = rootState.chat.socket;
    if (!socket) return;
    
    socket.emit('ice-candidate', {
      callId: state.callId,
      candidate,
      targetUserId
    });
  },
  
  /**
   * 处理收到的 ICE candidate
   */
  handleIceCandidate({ state }, { candidate }) {
    const webrtc = state.webrtcService;
    if (!webrtc) return;
    
    webrtc.addIceCandidate(candidate);
  },
  
  /**
   * 处理连接状态变化
   */
  handleConnectionStateChange({ commit, dispatch, state }, iceState) {
    switch (iceState) {
      case 'connected':
      case 'completed':
        commit('SET_STATUS', CALL_STATUS.CONNECTED);
        dispatch('startCallTimer');
        break;
        
      case 'disconnected':
        commit('SET_STATUS', CALL_STATUS.RECONNECTING);
        break;
        
      case 'failed':
        commit('SET_STATUS', CALL_STATUS.FAILED);
        commit('SET_ERROR', 'Connection failed');
        dispatch('endCall');
        break;
        
      case 'closed':
        if (state.status !== CALL_STATUS.IDLE) {
          dispatch('cleanupCall');
        }
        break;
    }
  },
  
  /**
   * 切换视频
   */
  toggleVideo({ commit, state }) {
    const newState = !state.isVideoEnabled;
    commit('SET_VIDEO_ENABLED', newState);
    
    const webrtc = state.webrtcService;
    if (webrtc) {
      webrtc.toggleVideo(newState);
    }
  },
  
  /**
   * 切换音频
   */
  toggleAudio({ commit, state }) {
    const newState = !state.isAudioEnabled;
    commit('SET_AUDIO_ENABLED', newState);
    
    const webrtc = state.webrtcService;
    if (webrtc) {
      webrtc.toggleAudio(newState);
    }
  },
  
  /**
   * 切换摄像头
   */
  async switchCamera({ state }) {
    const webrtc = state.webrtcService;
    if (webrtc) {
      await webrtc.switchCamera();
    }
  },
  
  /**
   * 切换扬声器
   */
  toggleSpeaker({ commit, state }) {
    commit('SET_SPEAKER_ON', !state.isSpeakerOn);
    // 实际的扬声器切换需要在组件中处理 audio 元素
  },
  
  /**
   * 开始通话计时器
   */
  startCallTimer({ commit, state }) {
    if (state.durationTimer) {
      clearInterval(state.durationTimer);
    }
    
    commit('SET_CALL_START_TIME', Date.now());
    
    const timer = setInterval(() => {
      if (state.callStartTime) {
        const duration = Math.floor((Date.now() - state.callStartTime) / 1000);
        commit('SET_CALL_DURATION', duration);
      }
    }, 1000);
    
    commit('SET_DURATION_TIMER', timer);
  },
  
  /**
   * 播放铃声
   */
  playRingtone({ commit, state }, type = 'incoming') {
    try {
      // 停止现有铃声
      if (state.ringtone) {
        state.ringtone.pause();
        state.ringtone.currentTime = 0;
      }
      
      // 创建音频元素
      const audio = new Audio();
      audio.loop = true;
      
      // 使用内置的铃声或默认的 Web Audio
      if (type === 'incoming') {
        // 来电铃声
        audio.src = '/sounds/ringtone.mp3';
      } else {
        // 拨号音
        audio.src = '/sounds/dialing.mp3';
      }
      
      // 如果没有音频文件，使用 Web Audio API 生成简单的铃声
      audio.play().catch(err => {
        console.warn('Could not play ringtone:', err);
        // 使用 Web Audio API 生成简单的铃声
        generateTone(type);
      });
      
      commit('SET_RINGTONE', audio);
    } catch (error) {
      console.error('Error playing ringtone:', error);
    }
  },
  
  /**
   * 停止铃声
   */
  stopRingtone({ commit, state }) {
    if (state.ringtone) {
      state.ringtone.pause();
      state.ringtone.currentTime = 0;
      commit('SET_RINGTONE', null);
    }
    
    // 停止 Web Audio API 生成的铃声
    if (window._callToneContext) {
      window._callToneContext.close();
      window._callToneContext = null;
    }
  },
  
  /**
   * 清理通话资源
   */
  cleanupCall({ commit, state }) {
    // 清理 WebRTC
    if (state.webrtcService) {
      state.webrtcService.cleanup();
    }
    
    // 重置状态
    commit('RESET_CALL');
  },
  
  /**
   * 处理通话初始化确认 (服务器返回 callId)
   */
  handleCallInitiated({ commit, state }, { callId, receiverId }) {
    if (state.status === CALL_STATUS.RINGING || state.status === CALL_STATUS.INITIATING) {
      commit('SET_CALL_INFO', { ...state, callId });
    }
  },
  
  /**
   * 处理通话失败
   */
  handleCallFailed({ commit, dispatch }, { reason }) {
    dispatch('stopRingtone');
    commit('SET_ERROR', reason || 'Call failed');
    commit('SET_STATUS', CALL_STATUS.FAILED);
    
    setTimeout(() => {
      dispatch('cleanupCall');
    }, 2000);
  }
};

const getters = {
  isInCall: state => [
    CALL_STATUS.CONNECTING,
    CALL_STATUS.CONNECTED,
    CALL_STATUS.RECONNECTING
  ].includes(state.status),
  
  hasIncomingCall: state => state.status === CALL_STATUS.INCOMING,
  
  isRinging: state => state.status === CALL_STATUS.RINGING,
  
  callPartner: state => {
    if (!state.caller && !state.receiver) return null;
    return state.isCaller ? state.receiver : state.caller;
  },
  
  formattedDuration: state => {
    const duration = state.callDuration;
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  },
  
  callStatusText: state => {
    switch (state.status) {
      case CALL_STATUS.INITIATING:
        return 'Initializing...';
      case CALL_STATUS.RINGING:
        return 'Ringing...';
      case CALL_STATUS.INCOMING:
        return 'Incoming call';
      case CALL_STATUS.CONNECTING:
        return 'Connecting...';
      case CALL_STATUS.CONNECTED:
        return 'Connected';
      case CALL_STATUS.RECONNECTING:
        return 'Reconnecting...';
      case CALL_STATUS.ENDED:
        return 'Call ended';
      case CALL_STATUS.FAILED:
        return state.error || 'Call failed';
      default:
        return '';
    }
  }
};

// 辅助函数：使用 Web Audio API 生成铃声
function generateTone(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    window._callToneContext = context;
    
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    if (type === 'incoming') {
      // 来电铃声：双音交替
      oscillator.frequency.value = 440;
      gainNode.gain.value = 0.3;
      
      // 创建铃声效果
      const now = context.currentTime;
      for (let i = 0; i < 10; i++) {
        gainNode.gain.setValueAtTime(0.3, now + i * 1);
        gainNode.gain.setValueAtTime(0, now + i * 1 + 0.5);
      }
    } else {
      // 拨号音：单音
      oscillator.frequency.value = 440;
      gainNode.gain.value = 0.2;
      
      // 拨号音效果
      const now = context.currentTime;
      for (let i = 0; i < 20; i++) {
        gainNode.gain.setValueAtTime(0.2, now + i * 2);
        gainNode.gain.setValueAtTime(0, now + i * 2 + 1);
      }
    }
    
    oscillator.start();
  } catch (error) {
    console.error('Error generating tone:', error);
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};
