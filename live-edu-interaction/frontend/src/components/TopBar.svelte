<script>
  export let classroomState
  import { user, webrtcState } from '../store/classroomStore.js'
  import { toggleAudio, toggleVideo } from '../utils/webrtc.js'

  let isAudioEnabled = true
  let isVideoEnabled = true

  const unsub1 = webrtcState.subscribe(state => {
    isAudioEnabled = state.isAudioEnabled
    isVideoEnabled = state.isVideoEnabled
  })

  let userName = ''
  const unsub2 = user.subscribe(u => {
    userName = u.name
  })

  function handleToggleAudio() {
    toggleAudio()
    isAudioEnabled = !isAudioEnabled
  }

  function handleToggleVideo() {
    toggleVideo()
    isVideoEnabled = !isVideoEnabled
  }
</script>

<style>
  .top-bar {
    height: 60px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }

  .logo-section {
    display: flex;
    align-items: center;
    gap: 12px;
    color: white;
  }

  .logo {
    font-size: 24px;
    font-weight: bold;
  }

  .room-info {
    color: rgba(255,255,255,0.8);
    font-size: 14px;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .control-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    transition: all 0.3s;
  }

  .control-btn.on {
    background: rgba(255,255,255,0.2);
    color: white;
  }

  .control-btn.off {
    background: #e74c3c;
    color: white;
  }

  .control-btn:hover {
    transform: scale(1.1);
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 10px;
    color: white;
  }

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
  }
</style>

<div class="top-bar">
  <div class="logo-section">
    <div class="logo">📚 在线教育直播互动台</div>
    <div class="room-info">
      房间: {$classroomState?.teacher?.name || '未连接'} | 
      在线人数: {$classroomState?.students?.length || 0}
    </div>
  </div>

  <div class="controls">
    <button 
      class="control-btn {isAudioEnabled ? 'on' : 'off'}"
      on:click={handleToggleAudio}
      title={isAudioEnabled ? '关闭麦克风' : '开启麦克风'}
    >
      {isAudioEnabled ? '🎤' : '🔇'}
    </button>
    
    <button 
      class="control-btn {isVideoEnabled ? 'on' : 'off'}"
      on:click={handleToggleVideo}
      title={isVideoEnabled ? '关闭摄像头' : '开启摄像头'}
    >
      {isVideoEnabled ? '📷' : '📷❌'}
    </button>
  </div>

  <div class="user-info">
    <div class="avatar">
      {userName ? userName[0].toUpperCase() : '?'}
    </div>
    <span>{userName || '未登录'}</span>
  </div>
</div>
