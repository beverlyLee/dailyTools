<script>
  import { onMount, onDestroy } from 'svelte'
  import { classroomState, user } from '../store/classroomStore.js'
  import { emit, getSocket } from '../utils/websocket.js'
  import StudentList from './StudentList.svelte'
  import HandRaiseQueue from './HandRaiseQueue.svelte'
  import BreakoutRooms from './BreakoutRooms.svelte'
  import FocusMonitor from './FocusMonitor.svelte'
  import QuickActions from './QuickActions.svelte'

  let currentTab = 'students'
  let isTeacher = false

  const unsub1 = user.subscribe(u => {
    isTeacher = u.role === 'teacher'
  })

  const tabs = [
    { id: 'students', label: '学生列表', icon: '👥' },
    { id: 'handraise', label: '举手队列', icon: '🙋' },
    { id: 'breakout', label: '分组讨论', icon: '🏠' },
    { id: 'focus', label: '专注度监测', icon: '👁' },
  ]

  function switchTab(tab) {
    currentTab = tab
  }

  onMount(() => {
    const socket = getSocket()
    if (socket) {
      socket.on('classroom-update', handleClassroomUpdate)
    }
  })

  function handleClassroomUpdate(data) {
    classroomState.set(data)
  }

  onDestroy(() => {
    unsub1()
  })
</script>

<style>
  .classroom-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: #f8f9fa;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    background: white;
    border-bottom: 1px solid #e5e7eb;
  }

  .header-title {
    font-size: 20px;
    font-weight: 600;
    color: #1f2937;
  }

  .header-status {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 14px;
    color: #6b7280;
  }

  .status-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .status-dot.online {
    background: #22c55e;
  }

  .status-dot.offline {
    background: #ef4444;
  }

  .tab-bar {
    display: flex;
    background: white;
    border-bottom: 1px solid #e5e7eb;
    padding: 0 16px;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 20px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: #6b7280;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }

  .tab-btn:hover {
    color: #3b82f6;
    background: #eff6ff;
  }

  .tab-btn.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }

  .tab-icon {
    font-size: 16px;
  }

  .content-area {
    flex: 1;
    overflow: hidden;
    padding: 16px;
  }

  .tab-content {
    width: 100%;
    height: 100%;
  }

  .teacher-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    background: #dbeafe;
    color: #1d4ed8;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
  }

  .student-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    background: #dcfce7;
    color: #166534;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
  }
</style>

<div class="classroom-container">
  <div class="header">
    <div class="header-title">
      课堂管理中心
      {#if isTeacher}
        <span class="teacher-badge">👨‍🏫 教师</span>
      {:else}
        <span class="student-badge">👨‍🎓 学生</span>
      {/if}
    </div>
    <div class="header-status">
      <div class="status-item">
        <span class="status-dot online"></span>
        <span>在线: {$classroomState.students?.filter(s => s.isOnline)?.length || 0} 人</span>
      </div>
      <div class="status-item">
        <span>举手: {$classroomState.handRaiseQueue?.length || 0} 人</span>
      </div>
      {#if isTeacher}
        <div class="status-item">
          <span>分组: {$classroomState.breakoutRooms?.length || 0} 个</span>
        </div>
      {/if}
    </div>
  </div>

  <div class="tab-bar">
    {#each tabs as tab}
      <button
        class="tab-btn {currentTab === tab.id ? 'active' : ''}"
        on:click={() => switchTab(tab.id)}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span>{tab.label}</span>
      </button>
    {/each}
  </div>

  <div class="content-area">
    {#if currentTab === 'students'}
      <div class="tab-content">
        <StudentList />
      </div>
    {:else if currentTab === 'handraise'}
      <div class="tab-content">
        <HandRaiseQueue />
      </div>
    {:else if currentTab === 'breakout'}
      <div class="tab-content">
        <BreakoutRooms {isTeacher} />
      </div>
    {:else if currentTab === 'focus'}
      <div class="tab-content">
        <FocusMonitor />
      </div>
    {/if}
  </div>

  {#if isTeacher}
    <QuickActions />
  {/if}
</div>
