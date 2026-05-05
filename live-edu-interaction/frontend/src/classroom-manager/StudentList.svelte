<script>
  import { classroomState, onlineStudents } from '../store/classroomStore.js'
  import { emit } from '../utils/websocket.js'
  import { user } from '../store/classroomStore.js'

  let isTeacher = false
  const unsub = user.subscribe(u => {
    isTeacher = u.role === 'teacher'
  })

  let searchQuery = ''
  let filterStatus = 'all'

  $: filteredStudents = $classroomState.students?.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'online' && student.isOnline) ||
      (filterStatus === 'offline' && !student.isOnline)
    return matchesSearch && matchesStatus
  }) || []

  function toggleMute(studentId) {
    emit('toggle-mute', { studentId })
  }

  function toggleVideo(studentId) {
    emit('toggle-video', { studentId })
  }

  function removeStudent(studentId) {
    if (confirm('确定要移除该学生吗？')) {
      emit('remove-student', { studentId })
    }
  }

  function assignToBreakout(studentId) {
    const event = new CustomEvent('assign-student', { detail: { studentId } })
    window.dispatchEvent(event)
  }
</script>

<style>
  .student-list-container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding: 12px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .search-box {
    flex: 1;
    position: relative;
  }

  .search-input {
    width: 100%;
    padding: 10px 12px 10px 36px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.2s;
  }

  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
  }

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #9ca3af;
  }

  .filter-select {
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    background: white;
    cursor: pointer;
  }

  .students-grid {
    flex: 1;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    align-content: start;
  }

  .student-card {
    background: white;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    transition: all 0.2s;
    border: 2px solid transparent;
  }

  .student-card:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    border-color: #3b82f6;
  }

  .student-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 18px;
  }

  .student-info {
    flex: 1;
  }

  .student-name {
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 2px;
  }

  .student-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #6b7280;
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .status-indicator.online {
    background: #22c55e;
    animation: pulse 2s infinite;
  }

  .status-indicator.offline {
    background: #9ca3af;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .student-stats {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
    padding: 8px;
    background: #f9fafb;
    border-radius: 8px;
  }

  .stat-item {
    text-align: center;
    flex: 1;
  }

  .stat-value {
    font-size: 18px;
    font-weight: 600;
  }

  .stat-value.high {
    color: #22c55e;
  }

  .stat-value.medium {
    color: #f59e0b;
  }

  .stat-value.low {
    color: #ef4444;
  }

  .stat-label {
    font-size: 11px;
    color: #6b7280;
    margin-top: 2px;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .action-btn {
    flex: 1;
    min-width: 60px;
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .action-btn:hover {
    border-color: #3b82f6;
    background: #eff6ff;
    color: #3b82f6;
  }

  .action-btn.danger {
    border-color: #fee2e2;
  }

  .action-btn.danger:hover {
    border-color: #ef4444;
    background: #fef2f2;
    color: #ef4444;
  }

  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: #9ca3af;
  }

  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .empty-text {
    font-size: 14px;
  }
</style>

<div class="student-list-container">
  <div class="toolbar">
    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input
        type="text"
        class="search-input"
        bind:value={searchQuery}
        placeholder="搜索学生..."
      />
    </div>
    <select class="filter-select" bind:value={filterStatus}>
      <option value="all">全部状态</option>
      <option value="online">在线</option>
      <option value="offline">离线</option>
    </select>
  </div>

  <div class="students-grid">
    {#each filteredStudents as student (student.id)}
      <div class="student-card">
        <div class="student-header">
          <div class="avatar">
            {student.name ? student.name[0].toUpperCase() : '?'}
          </div>
          <div class="student-info">
            <div class="student-name">{student.name || '未知用户'}</div>
            <div class="student-status">
              <span class="status-indicator {student.isOnline ? 'online' : 'offline'}"></span>
              {student.isOnline ? '在线' : '离线'}
            </div>
          </div>
        </div>

        <div class="student-stats">
          <div class="stat-item">
            <div class="stat-value {
              student.focusScore >= 70 ? 'high' : 
              student.focusScore >= 40 ? 'medium' : 'low'
            }">
              {student.focusScore || 0}%
            </div>
            <div class="stat-label">专注度</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">
              {student.joinedAt ? Math.floor((Date.now() - student.joinedAt) / 60000) : 0}分钟
            </div>
            <div class="stat-label">在线时长</div>
          </div>
        </div>

        {#if isTeacher}
          <div class="action-buttons">
            <button class="action-btn" on:click={() => toggleMute(student.id)}>
              🔊 静音
            </button>
            <button class="action-btn" on:click={() => toggleVideo(student.id)}>
              📷 视频
            </button>
            <button class="action-btn" on:click={() => assignToBreakout(student.id)}>
              🏠 分组
            </button>
            <button class="action-btn danger" on:click={() => removeStudent(student.id)}>
              🚫 移除
            </button>
          </div>
        {/if}
      </div>
    {:else}
      <div class="empty-state" style="grid-column: 1/-1;">
        <div class="empty-icon">👥</div>
        <div class="empty-text">暂无学生</div>
      </div>
    {/each}
  </div>
</div>
