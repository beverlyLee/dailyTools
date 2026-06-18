<script>
  import { scheduleStore } from '../stores/scheduleStore.js'
  import { requestNotificationPermission, showFeedingNotification, showWeatherDelayNotification } from '../utils/notification.js'
  import { fetchFeedingAdvice } from '../utils/api.js'
  import { onMount, onDestroy } from 'svelte'
  import dayjs from 'dayjs'
  
  let currentTime = dayjs()
  let timer = null
  let weatherTimer = null
  let notificationPermission = 'default'
  let showAddForm = false
  let weatherAdvice = null
  let delayedSchedules = {}
  let newSchedule = {
    name: '',
    time: '08:00',
    feedAmount: 50,
  }

  async function checkPermission() {
    if ('Notification' in window) {
      notificationPermission = Notification.permission
    }
  }

  async function enableNotifications() {
    const granted = await requestNotificationPermission()
    notificationPermission = granted ? 'granted' : 'denied'
  }

  function triggerSchedule(schedule) {
    showFeedingNotification(schedule.name, schedule.feedAmount)
    scheduleStore.markTriggered(schedule.id)
    if (delayedSchedules[schedule.id]) {
      delete delayedSchedules[schedule.id]
    }
  }

  async function updateWeatherAdvice() {
    const advice = await fetchFeedingAdvice()
    if (advice) {
      weatherAdvice = advice
      
      if (!advice.shouldDelay) {
        Object.keys(delayedSchedules).forEach(id => {
          const delayed = delayedSchedules[id]
          if (delayed) {
            triggerSchedule(delayed.schedule)
          }
        })
      }
    }
  }

  function checkSchedules() {
    currentTime = dayjs()
    
    const triggered = scheduleStore.checkAndTrigger(currentTime)
    triggered.forEach(schedule => {
      if (weatherAdvice && weatherAdvice.shouldDelay) {
        if (!delayedSchedules[schedule.id]) {
          showWeatherDelayNotification(weatherAdvice.reason)
          delayedSchedules[schedule.id] = {
            schedule,
            delayedAt: dayjs().format('HH:mm')
          }
        }
      } else {
        triggerSchedule(schedule)
      }
    })
  }

  function addSchedule() {
    if (!newSchedule.name.trim()) return
    scheduleStore.addSchedule({
      name: newSchedule.name,
      time: newSchedule.time,
      feedAmount: newSchedule.feedAmount,
      enabled: true,
    })
    newSchedule = {
      name: '',
      time: '08:00',
      feedAmount: 50,
    }
    showAddForm = false
  }

  function testNotification() {
    showFeedingNotification('测试投喂', 50)
  }

  onMount(() => {
    checkPermission()
    updateWeatherAdvice()
    timer = window.setInterval(checkSchedules, 1000)
    weatherTimer = window.setInterval(updateWeatherAdvice, 5 * 60 * 1000)
  })

  onDestroy(() => {
    if (timer) {
      clearInterval(timer)
    }
    if (weatherTimer) {
      clearInterval(weatherTimer)
    }
  })

  $: formattedTime = currentTime.format('HH:mm:ss')
  $: formattedDate = currentTime.format('YYYY年MM月DD日 dddd')
</script>

<div class="schedule-container">
  <div class="header">
    <h2>🐟 投饲日程管理</h2>
    <div class="current-time">
      <div class="time">{formattedTime}</div>
      <div class="date">{formattedDate}</div>
    </div>
  </div>

  <div class="notification-status">
    {#if notificationPermission === 'granted'}
      <span class="status ok">✓ 通知已开启</span>
    {:else if notificationPermission === 'denied'}
      <span class="status error">✗ 通知已拒绝</span>
    {:else}
      <span class="status warning">⚠ 通知未开启</span>
      <button class="btn-small" on:click={enableNotifications}>开启通知</button>
    {/if}
    <button class="btn-small btn-test" on:click={testNotification}>测试通知</button>
  </div>

  {#if weatherAdvice}
    <div class="weather-status" class:warning={weatherAdvice.shouldDelay}>
      <span class="weather-icon">{weatherAdvice.shouldDelay ? '⚠️' : '✅'}</span>
      <span class="weather-text">
        {weatherAdvice.shouldDelay ? '天气不佳，投喂自动推迟' : '天气良好，按时投喂'}
      </span>
      {#if weatherAdvice.shouldDelay}
        <span class="weather-reason">原因：{weatherAdvice.reason}</span>
      {/if}
    </div>
  {/if}

  {#if Object.keys(delayedSchedules).length > 0}
    <div class="delayed-list">
      <h4>⏰ 已推迟的投喂</h4>
      {#each Object.values(delayedSchedules) as delayed}
        <div class="delayed-item">
          <span>{delayed.schedule.name}</span>
          <span class="delayed-time">原计划 {delayed.schedule.time}</span>
        </div>
      {/each}
    </div>
  {/if}

  <div class="schedule-list">
    {#each $scheduleStore as schedule (schedule.id)}
      <div class="schedule-item" class:active={schedule.enabled}>
        <div class="schedule-info">
          <span class="schedule-time">{schedule.time}</span>
          <span class="schedule-name">{schedule.name}</span>
          <span class="schedule-amount">{schedule.feedAmount}kg</span>
        </div>
        <div class="schedule-actions">
          <label class="toggle">
            <input 
              type="checkbox" 
              checked={schedule.enabled}
              on:change={() => scheduleStore.toggleSchedule(schedule.id)}
            />
            <span class="slider"></span>
          </label>
          <button 
            class="btn-small btn-delete" 
            on:click={() => scheduleStore.deleteSchedule(schedule.id)}
          >删除</button>
        </div>
      </div>
    {/each}
  </div>

  {#if showAddForm}
    <div class="add-form">
      <h3>添加投喂计划</h3>
      <div class="form-group">
        <label>名称</label>
        <input 
          type="text" 
          bind:value={newSchedule.name} 
          placeholder="如：早餐投喂"
        />
      </div>
      <div class="form-group">
        <label>时间</label>
        <input type="time" bind:value={newSchedule.time} />
      </div>
      <div class="form-group">
        <label>投喂量 (kg)</label>
        <input 
          type="number" 
          bind:value={newSchedule.feedAmount}
          min="1"
          step="1"
        />
      </div>
      <div class="form-actions">
        <button class="btn btn-cancel" on:click={() => showAddForm = false}>取消</button>
        <button class="btn btn-primary" on:click={addSchedule}>添加</button>
      </div>
    </div>
  {:else}
    <button class="btn btn-add" on:click={() => showAddForm = true}>+ 添加投喂计划</button>
  {/if}
</div>

<style>
  .schedule-container {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .header h2 {
    margin: 0;
    font-size: 20px;
    color: #1a1a2e;
  }

  .current-time {
    text-align: right;
  }

  .time {
    font-size: 28px;
    font-weight: 700;
    color: #2d6a4f;
    font-family: 'Courier New', monospace;
  }

  .date {
    font-size: 13px;
    color: #666;
    margin-top: 4px;
  }

  .notification-status {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: #f8f9fa;
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .status {
    font-size: 14px;
    font-weight: 500;
  }

  .status.ok {
    color: #2d6a4f;
  }

  .status.error {
    color: #d00000;
  }

  .status.warning {
    color: #e85d04;
  }

  .weather-status {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: #f0fff4;
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 14px;
  }

  .weather-status.warning {
    background: #fff3cd;
  }

  .weather-icon {
    font-size: 18px;
  }

  .weather-text {
    font-weight: 500;
    color: #333;
  }

  .weather-reason {
    color: #856404;
    font-size: 13px;
    margin-left: auto;
  }

  .delayed-list {
    background: #fff5f5;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
  }

  .delayed-list h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #c53030;
  }

  .delayed-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    font-size: 14px;
    color: #333;
  }

  .delayed-time {
    color: #999;
    font-size: 13px;
  }

  .schedule-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .schedule-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 10px;
    border-left: 4px solid #ccc;
    transition: all 0.2s;
  }

  .schedule-item.active {
    border-left-color: #2d6a4f;
    background: #f0fff4;
  }

  .schedule-info {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .schedule-time {
    font-size: 22px;
    font-weight: 700;
    color: #1a1a2e;
    font-family: 'Courier New', monospace;
    min-width: 70px;
  }

  .schedule-name {
    font-size: 15px;
    color: #333;
    font-weight: 500;
  }

  .schedule-amount {
    font-size: 13px;
    color: #666;
    background: #e9ecef;
    padding: 4px 10px;
    border-radius: 12px;
  }

  .schedule-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .toggle {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 26px;
  }

  .toggle input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.3s;
    border-radius: 26px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }

  input:checked + .slider {
    background-color: #2d6a4f;
  }

  input:checked + .slider:before {
    transform: translateX(22px);
  }

  .btn-small {
    padding: 6px 14px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    background: #2d6a4f;
    color: white;
    transition: background 0.2s;
  }

  .btn-small:hover {
    background: #1b4332;
  }

  .btn-test {
    margin-left: auto;
    background: #40916c;
  }

  .btn-delete {
    background: #dc3545;
  }

  .btn-delete:hover {
    background: #c82333;
  }

  .btn-add {
    width: 100%;
    padding: 14px;
    border: 2px dashed #2d6a4f;
    border-radius: 10px;
    background: transparent;
    color: #2d6a4f;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-add:hover {
    background: #f0fff4;
  }

  .add-form {
    background: #f8f9fa;
    border-radius: 10px;
    padding: 20px;
  }

  .add-form h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #1a1a2e;
  }

  .form-group {
    margin-bottom: 14px;
  }

  .form-group label {
    display: block;
    font-size: 13px;
    color: #666;
    margin-bottom: 6px;
  }

  .form-group input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    box-sizing: border-box;
  }

  .form-group input:focus {
    outline: none;
    border-color: #2d6a4f;
  }

  .form-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }

  .btn {
    flex: 1;
    padding: 10px 16px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-primary {
    background: #2d6a4f;
    color: white;
  }

  .btn-primary:hover {
    background: #1b4332;
  }

  .btn-cancel {
    background: #e9ecef;
    color: #333;
  }

  .btn-cancel:hover {
    background: #dee2e6;
  }
</style>
