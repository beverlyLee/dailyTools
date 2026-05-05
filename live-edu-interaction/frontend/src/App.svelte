<script>
  import { onMount } from 'svelte'
  import { classroomState } from './store/classroomStore.js'
  import { initWebSocket } from './utils/websocket.js'
  import { initWebRTC } from './utils/webrtc.js'
  import Whiteboard from './interactive-whiteboard/Whiteboard.svelte'
  import ClassroomManager from './classroom-manager/ClassroomManager.svelte'
  import VideoContainer from './components/VideoContainer.svelte'
  import TopBar from './components/TopBar.svelte'

  let currentView = 'main'

  onMount(() => {
    initWebSocket()
    initWebRTC()
  })

  function switchView(view) {
    currentView = view
  }
</script>

<style>
  .app-container {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #f5f7fa;
    overflow: hidden;
  }

  .main-content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .sidebar {
    width: 250px;
    background: #2c3e50;
    color: white;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .sidebar button {
    width: 100%;
    padding: 12px;
    border: none;
    background: #34495e;
    color: white;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.3s;
    font-size: 14px;
    text-align: left;
  }

  .sidebar button:hover {
    background: #3d566e;
  }

  .sidebar button.active {
    background: #3498db;
  }

  .content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .video-section {
    height: 300px;
    background: #1a1a2e;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
  }
</style>

<div class="app-container">
  <TopBar {classroomState} />
  
  <div class="main-content">
    <div class="sidebar">
      <h3>功能导航</h3>
      <button 
        class:active={currentView === 'main'} 
        on:click={() => switchView('main')}
      >
        📺 主视图
      </button>
      <button 
        class:active={currentView === 'whiteboard'} 
        on:click={() => switchView('whiteboard')}
      >
        🎨 互动白板
      </button>
      <button 
        class:active={currentView === 'classroom'} 
        on:click={() => switchView('classroom')}
      >
        👥 课堂管理
      </button>
    </div>

    <div class="content-area">
      {#if currentView === 'main'}
        <VideoContainer />
      {:else if currentView === 'whiteboard'}
        <Whiteboard />
      {:else if currentView === 'classroom'}
        <ClassroomManager />
      {/if}
    </div>
  </div>
</div>
