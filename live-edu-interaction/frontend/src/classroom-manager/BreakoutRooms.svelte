<script>
  import { onMount } from 'svelte'
  import { classroomState, user } from '../store/classroomStore.js'
  import { emit, getSocket } from '../utils/websocket.js'

  export let isTeacher

  let newRoomName = ''
  let showingCreateDialog = false
  let selectedRoom = null

  onMount(() => {
    const socket = getSocket()
    if (socket) {
      socket.on('breakout-created', handleBreakoutCreated)
      socket.on('breakout-assigned', handleBreakoutAssigned)
      socket.on('breakout-closed', handleBreakoutClosed)
    }
  })

  function handleBreakoutCreated(data) {
    classroomState.update(state => ({
      ...state,
      breakoutRooms: [...state.breakoutRooms, data.room]
    }))
  }

  function handleBreakoutAssigned(data) {
    classroomState.update(state => ({
      ...state,
      currentBreakoutRoom: data.room,
      isInBreakoutRoom: true
    }))
  }

  function handleBreakoutClosed(data) {
    classroomState.update(state => ({
      ...state,
      currentBreakoutRoom: null,
      isInBreakoutRoom: false,
      breakoutRooms: state.breakoutRooms.filter(r => r.id !== data.roomId)
    }))
  }

  function createBreakoutRoom() {
    if (!newRoomName.trim()) return

    const roomId = 'room_' + Date.now()
    emit('create-breakout', {
      breakoutId: roomId,
      name: newRoomName.trim()
    })

    newRoomName = ''
    showingCreateDialog = false
  }

  function closeBreakoutRoom(roomId) {
    if (confirm('确定要关闭此分组讨论室吗？')) {
      emit('close-breakout', { breakoutId: roomId })
    }
  }

  function assignStudent(roomId, studentId) {
    emit('assign-breakout', {
      breakoutId: roomId,
      studentId: studentId
    })
  }

  function returnToMainRoom() {
    emit('return-main-room', {})
    classroomState.update(state => ({
      ...state,
      currentBreakoutRoom: null,
      isInBreakoutRoom: false
    }))
  }

  function getAvailableStudents() {
    const assignedStudents = new Set()
    $classroomState.breakoutRooms?.forEach(room => {
      Object.keys(room.students || {}).forEach(id => assignedStudents.add(id))
    })
    return ($classroomState.students || []).filter(s => !assignedStudents.has(s.id))
  }
</script>

<style>
  .breakout-container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .current-room-banner {
    padding: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .current-room-info h4 {
    margin: 0 0 4px 0;
    font-size: 16px;
  }

  .current-room-info p {
    margin: 0;
    font-size: 13px;
    opacity: 0.9;
  }

  .return-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    background: rgba(255,255,255,0.2);
    color: white;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.2s;
  }

  .return-btn:hover {
    background: rgba(255,255,255,0.3);
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .create-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: transform 0.2s;
  }

  .create-btn:hover {
    transform: scale(1.02);
  }

  .create-dialog {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 12px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin-bottom: 16px;
  }

  .room-input {
    flex: 1;
    padding: 10px 14px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.2s;
  }

  .room-input:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .dialog-btn {
    padding: 10px 16px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }

  .dialog-btn.primary {
    background: #3b82f6;
    color: white;
  }

  .dialog-btn.secondary {
    background: #e5e7eb;
    color: #374151;
  }

  .rooms-grid {
    flex: 1;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    align-content: start;
  }

  .room-card {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .room-header {
    padding: 14px 16px;
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .room-name {
    font-weight: 600;
    font-size: 15px;
  }

  .room-count {
    font-size: 13px;
    opacity: 0.9;
  }

  .room-body {
    padding: 12px;
  }

  .room-students {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .student-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: #f3f4f6;
    border-radius: 20px;
    font-size: 13px;
    color: #374151;
  }

  .student-avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #8b5cf6;
    color: white;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .room-actions {
    display: flex;
    gap: 8px;
  }

  .room-action-btn {
    flex: 1;
    padding: 8px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  }

  .room-action-btn:hover {
    background: #f3f4f6;
  }

  .room-action-btn.danger {
    border-color: #fee2e2;
    color: #dc2626;
  }

  .room-action-btn.danger:hover {
    background: #fef2f2;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #9ca3af;
    grid-column: 1/-1;
  }

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .empty-text {
    font-size: 15px;
  }

  .assign-dropdown {
    position: relative;
  }

  .assign-dropdown select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 13px;
    background: white;
    cursor: pointer;
  }
</style>

<div class="breakout-container">
  {#if $classroomState.isInBreakoutRoom && $classroomState.currentBreakoutRoom}
    <div class="current-room-banner">
      <div class="current-room-info">
        <h4>🏠 当前分组: {$classroomState.currentBreakoutRoom.name}</h4>
        <p>
          成员: {Object.keys($classroomState.currentBreakoutRoom.students || {}).length} 人
        </p>
      </div>
      <button class="return-btn" on:click={returnToMainRoom}>
        ↩ 返回主房间
      </button>
    </div>
  {/if}

  {#if isTeacher}
    <div class="toolbar">
      <span style="font-weight: 600; color: #374151;">
        分组讨论室 ({$classroomState.breakoutRooms?.length || 0} 个)
      </span>
      {#if !showingCreateDialog}
        <button class="create-btn" on:click={() => showingCreateDialog = true}>
          + 创建分组
        </button>
      {/if}
    </div>

    {#if showingCreateDialog}
      <div class="create-dialog">
        <input
          type="text"
          class="room-input"
          bind:value={newRoomName}
          placeholder="输入分组名称..."
          on:keydown={(e) => e.key === 'Enter' && createBreakoutRoom()}
        />
        <button class="dialog-btn primary" on:click={createBreakoutRoom}>
          创建
        </button>
        <button class="dialog-btn secondary" on:click={() => showingCreateDialog = false}>
          取消
        </button>
      </div>
    {/if}
  {/if}

  <div class="rooms-grid">
    {#if $classroomState.breakoutRooms && $classroomState.breakoutRooms.length > 0}
      {#each $classroomState.breakoutRooms as room (room.id)}
        <div class="room-card">
          <div class="room-header">
            <span class="room-name">{room.name}</span>
            <span class="room-count">
              {Object.keys(room.students || {}).length} 人
            </span>
          </div>
          <div class="room-body">
            <div class="room-students">
              {#if room.students && Object.keys(room.students).length > 0}
                {#each Object.values(room.students) as student}
                  <div class="student-chip">
                    <div class="student-avatar">
                      {student.name ? student.name[0].toUpperCase() : '?'}
                    </div>
                    {student.name}
                  </div>
                {/each}
              {:else}
                <span style="color: #9ca3af; font-size: 13px;">暂无成员</span>
              {/if}
            </div>

            {#if isTeacher}
              <div class="room-actions">
                <button 
                  class="room-action-btn"
                  on:click={() => selectedRoom = selectedRoom === room.id ? null : room.id}
                >
                  + 添加成员
                </button>
                <button 
                  class="room-action-btn danger"
                  on:click={() => closeBreakoutRoom(room.id)}
                >
                  关闭房间
                </button>
              </div>

              {#if selectedRoom === room.id && getAvailableStudents().length > 0}
                <div class="assign-dropdown" style="margin-top: 10px;">
                  <select on:change={(e) => {
                    if (e.target.value) {
                      assignStudent(room.id, e.target.value)
                      e.target.value = ''
                    }
                  }}>
                    <option value="">选择学生...</option>
                    {#each getAvailableStudents() as student}
                      <option value={student.id}>{student.name}</option>
                    {/each}
                  </select>
                </div>
              {/if}
            {/if}
          </div>
        </div>
      {/each}
    {:else}
      <div class="empty-state">
        <div class="empty-icon">🏠</div>
        <div class="empty-text">
          {isTeacher ? '点击"创建分组"按钮创建分组讨论室' : '暂无分组讨论室'}
        </div>
      </div>
    {/if}
  </div>
</div>
