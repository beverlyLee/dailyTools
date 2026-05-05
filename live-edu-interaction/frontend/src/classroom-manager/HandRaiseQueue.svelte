<script>
  import { classroomState, user } from '../store/classroomStore.js'
  import { emit, raiseHand, lowerHand } from '../utils/websocket.js'

  let isTeacher = false
  let hasRaisedHand = false
  
  const unsub = user.subscribe(u => {
    isTeacher = u.role === 'teacher'
  })

  function handleRaiseHand() {
    if (hasRaisedHand) {
      lowerHand()
    } else {
      raiseHand()
    }
    hasRaisedHand = !hasRaisedHand
  }

  function approveHand(studentId, studentName) {
    emit('approve-hand', { studentId, studentName })
    classroomState.update(state => ({
      ...state,
      handRaiseQueue: state.handRaiseQueue.filter(h => h.id !== studentId)
    }))
  }

  function rejectHand(studentId) {
    emit('reject-hand', { studentId })
    classroomState.update(state => ({
      ...state,
      handRaiseQueue: state.handRaiseQueue.filter(h => h.id !== studentId)
    }))
  }

  function getWaitTime(raisedAt) {
    const seconds = Math.floor((Date.now() - raisedAt) / 1000)
    if (seconds < 60) return `${seconds}秒`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}分${seconds % 60}秒`
  }
</script>

<style>
  .queue-container {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .student-action {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: white;
    border-radius: 12px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .raise-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 20px 40px;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .raise-btn:not(.raised) {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    color: white;
  }

  .raise-btn:not(.raised):hover {
    transform: scale(1.05);
    box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
  }

  .raise-btn.raised {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
    color: white;
    animation: pulse-raise 1.5s infinite;
  }

  @keyframes pulse-raise {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
    50% { box-shadow: 0 0 0 15px rgba(34, 197, 94, 0); }
  }

  .raise-icon {
    font-size: 48px;
  }

  .raise-text {
    font-size: 16px;
    font-weight: 600;
  }

  .queue-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: white;
    border-radius: 10px 10px 0 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .queue-title {
    font-weight: 600;
    color: #1f2937;
  }

  .queue-count {
    background: #fef3c7;
    color: #d97706;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
  }

  .queue-list {
    flex: 1;
    overflow-y: auto;
    background: white;
    border-radius: 0 0 10px 10px;
  }

  .queue-item {
    display: flex;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #f3f4f6;
    transition: background 0.2s;
  }

  .queue-item:hover {
    background: #f9fafb;
  }

  .queue-item:last-child {
    border-bottom: none;
  }

  .queue-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 18px;
    margin-right: 14px;
  }

  .queue-info {
    flex: 1;
  }

  .queue-name {
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 4px;
  }

  .queue-wait {
    font-size: 13px;
    color: #6b7280;
  }

  .queue-actions {
    display: flex;
    gap: 8px;
  }

  .action-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .action-btn.approve {
    background: #dcfce7;
    color: #166534;
  }

  .action-btn.approve:hover {
    background: #bbf7d0;
  }

  .action-btn.reject {
    background: #fee2e2;
    color: #991b1b;
  }

  .action-btn.reject:hover {
    background: #fecaca;
  }

  .empty-queue {
    text-align: center;
    padding: 60px 20px;
    color: #9ca3af;
  }

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }

  .empty-text {
    font-size: 15px;
  }
</style>

<div class="queue-container">
  {#if !isTeacher}
    <div class="student-action">
      <button 
        class="raise-btn {hasRaisedHand ? 'raised' : ''}"
        on:click={handleRaiseHand}
      >
        <span class="raise-icon">🙋</span>
        <span class="raise-text">
          {hasRaisedHand ? '取消举手' : '举手发言'}
        </span>
      </button>
    </div>
  {/if}

  <div class="queue-header">
    <span class="queue-title">举手队列</span>
    <span class="queue-count">{$classroomState.handRaiseQueue?.length || 0} 人</span>
  </div>

  <div class="queue-list">
    {#if $classroomState.handRaiseQueue && $classroomState.handRaiseQueue.length > 0}
      {#each $classroomState.handRaiseQueue as item (item.id)}
        <div class="queue-item">
          <div class="queue-avatar">
            {item.name ? item.name[0].toUpperCase() : '?'}
          </div>
          <div class="queue-info">
            <div class="queue-name">{item.name || '未知用户'}</div>
            <div class="queue-wait">
              等待时间: {getWaitTime(item.raisedAt)}
            </div>
          </div>
          {#if isTeacher}
            <div class="queue-actions">
              <button 
                class="action-btn approve"
                on:click={() => approveHand(item.id, item.name)}
              >
                ✅ 允许
              </button>
              <button 
                class="action-btn reject"
                on:click={() => rejectHand(item.id)}
              >
                ❌ 拒绝
              </button>
            </div>
          {/if}
        </div>
      {/each}
    {:else}
      <div class="empty-queue">
        <div class="empty-icon">🙅</div>
        <div class="empty-text">暂无学生举手</div>
      </div>
    {/if}
  </div>
</div>
