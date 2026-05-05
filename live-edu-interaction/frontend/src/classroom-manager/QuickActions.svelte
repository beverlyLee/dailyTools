<script>
  import { emit } from '../utils/websocket.js'
  import { classroomState } from '../store/classroomStore.js'

  function muteAll() {
    if (confirm('确定要静音所有学生吗？')) {
      emit('mute-all', {})
    }
  }

  function unmuteAll() {
    if (confirm('确定要取消静音所有学生吗？')) {
      emit('unmute-all', {})
    }
  }

  function lockClassroom() {
    if (confirm('确定要锁定课堂吗？锁定后将禁止新学生加入。')) {
      emit('lock-classroom', { locked: true })
    }
  }

  function unlockClassroom() {
    emit('lock-classroom', { locked: false })
  }

  function endClass() {
    if (confirm('确定要结束课堂吗？所有学生将被移出教室。')) {
      emit('end-class', {})
    }
  }

  function broadcastMessage() {
    const message = prompt('输入广播消息：')
    if (message) {
      emit('broadcast-message', { message })
    }
  }
</script>

<style>
  .quick-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 20px;
    background: white;
    border-top: 1px solid #e5e7eb;
  }

  .section-label {
    font-size: 13px;
    font-weight: 600;
    color: #6b7280;
    margin-right: 10px;
  }

  .action-btn {
    padding: 8px 16px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: #374151;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .action-btn:hover {
    border-color: #3b82f6;
    background: #eff6ff;
    color: #3b82f6;
  }

  .action-btn.warning {
    border-color: #fef3c7;
    color: #d97706;
  }

  .action-btn.warning:hover {
    background: #fef3c7;
  }

  .action-btn.danger {
    border-color: #fee2e2;
    color: #dc2626;
  }

  .action-btn.danger:hover {
    background: #fee2e2;
  }

  .divider {
    width: 1px;
    height: 28px;
    background: #e5e7eb;
    margin: 0 6px;
  }
</style>

<div class="quick-actions">
  <span class="section-label">快捷操作:</span>
  
  <button class="action-btn" on:click={broadcastMessage}>
    📢 广播消息
  </button>
  
  <div class="divider"></div>
  
  <button class="action-btn warning" on:click={muteAll}>
    🔇 全体静音
  </button>
  
  <button class="action-btn" on:click={unmuteAll}>
    🔊 取消静音
  </button>
  
  <div class="divider"></div>
  
  <button class="action-btn" on:click={lockClassroom}>
    🔒 锁定课堂
  </button>
  
  <button class="action-btn" on:click={unlockClassroom}>
    🔓 解锁课堂
  </button>
  
  <div class="divider"></div>
  
  <button class="action-btn danger" on:click={endClass}>
    ⏹ 结束课堂
  </button>
</div>
