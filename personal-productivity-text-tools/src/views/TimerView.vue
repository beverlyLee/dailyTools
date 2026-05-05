<template>
  <div class="timer-view">
    <div class="timer-card card">
      <div class="mode-selector">
        <button
          :class="['mode-btn', { active: currentMode === 'work' }]"
          @click="setMode('work')"
          :disabled="isRunning"
        >
          工作
        </button>
        <button
          :class="['mode-btn', { active: currentMode === 'short_break' }]"
          @click="setMode('short_break')"
          :disabled="isRunning"
        >
          短休息
        </button>
        <button
          :class="['mode-btn', { active: currentMode === 'long_break' }]"
          @click="setMode('long_break')"
          :disabled="isRunning"
        >
          长休息
        </button>
      </div>
      
      <div class="timer-display">
        <div class="timer-circle">
          <svg class="progress-ring" width="220" height="220">
            <circle
              class="progress-ring-circle-bg"
              stroke="rgba(255,255,255,0.2)"
              stroke-width="8"
              fill="transparent"
              r="100"
              cx="110"
              cy="110"
            />
            <circle
              class="progress-ring-circle"
              :stroke="currentMode === 'work' ? '#f5576c' : '#667eea'"
              stroke-width="8"
              stroke-linecap="round"
              fill="transparent"
              r="100"
              cx="110"
              cy="110"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="progressOffset"
            />
          </svg>
          <div class="timer-text">
            {{ formatTime(timeLeft) }}
          </div>
        </div>
      </div>
      
      <div class="task-selector">
        <label>关联任务：</label>
        <select v-model="selectedTaskId" :disabled="isRunning" class="input">
          <option :value="null">无关联任务</option>
          <option v-for="task in tasks" :key="task.id" :value="task.id">
            {{ task.title }} ({{ task.completed_pomodoros }}/{{ task.estimated_pomodoros }})
          </option>
        </select>
      </div>
      
      <div class="timer-controls">
        <button
          :class="['btn', isRunning ? 'btn-secondary' : 'btn-primary']"
          @click="toggleTimer"
        >
          {{ isRunning ? '暂停' : (isPaused ? '继续' : '开始') }}
        </button>
        <button class="btn btn-secondary" @click="skipSession" :disabled="!isRunning && !isPaused">
          跳过
        </button>
        <button class="btn btn-secondary" @click="resetTimer" :disabled="timeLeft === getDuration()">
          重置
        </button>
      </div>
      
      <div class="session-info">
        <p>今日完成番茄数: {{ todayStats.total_pomodoros }}</p>
        <p>今日专注时长: {{ todayStats.total_minutes }} 分钟</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { api, Task, DailyStat } from '@/api'

const WORK_DURATION = 25
const SHORT_BREAK_DURATION = 5
const LONG_BREAK_DURATION = 15
const LONG_BREAK_INTERVAL = 4

type TimerMode = 'work' | 'short_break' | 'long_break'

const currentMode = ref<TimerMode>('work')
const timeLeft = ref(WORK_DURATION * 60)
const isRunning = ref(false)
const isPaused = ref(false)
const currentSessionId = ref<number | null>(null)
const completedSessions = ref(0)
const selectedTaskId = ref<number | null>(null)
const tasks = ref<Task[]>([])
const todayStats = ref<DailyStat>({
  date: '',
  total_pomodoros: 0,
  total_minutes: 0,
  completed_tasks: 0
})

const circumference = 2 * Math.PI * 100

const progressOffset = computed(() => {
  const total = getDuration() * 60
  const progress = (total - timeLeft.value) / total
  return circumference * (1 - progress)
})

function getDuration(): number {
  switch (currentMode.value) {
    case 'work':
      return WORK_DURATION
    case 'short_break':
      return SHORT_BREAK_DURATION
    case 'long_break':
      return LONG_BREAK_DURATION
    default:
      return WORK_DURATION
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function setMode(mode: TimerMode) {
  currentMode.value = mode
  timeLeft.value = getDuration() * 60
  isRunning.value = false
  isPaused.value = false
  currentSessionId.value = null
}

async function startTimer() {
  const sessionType = currentMode.value === 'work' ? 'work' : 'break'
  const session = await api.createSession(selectedTaskId.value, sessionType, getDuration())
  currentSessionId.value = session.id
  isRunning.value = true
  isPaused.value = false
}

function pauseTimer() {
  isRunning.value = false
  isPaused.value = true
}

function resumeTimer() {
  isRunning.value = true
  isPaused.value = false
}

function toggleTimer() {
  if (isRunning.value) {
    pauseTimer()
  } else if (isPaused.value) {
    resumeTimer()
  } else {
    startTimer()
  }
}

async function skipSession() {
  if (currentSessionId.value) {
    await api.completeSession(currentSessionId.value)
  }
  nextSession()
}

function resetTimer() {
  timeLeft.value = getDuration() * 60
  isRunning.value = false
  isPaused.value = false
  currentSessionId.value = null
}

async function completeSession() {
  if (currentSessionId.value && currentMode.value === 'work') {
    await api.completeSession(currentSessionId.value)
    completedSessions.value++
    
    const message = '番茄钟完成！休息一下吧。'
    await api.sendNotification('番茄钟完成', message)
    
    await loadTodayStats()
    await loadTasks()
  } else if (currentMode.value !== 'work') {
    const message = '休息结束！准备好开始下一个番茄钟了吗？'
    await api.sendNotification('休息结束', message)
  }
  
  nextSession()
}

function nextSession() {
  if (currentMode.value === 'work') {
    completedSessions.value++
    if (completedSessions.value % LONG_BREAK_INTERVAL === 0) {
      setMode('long_break')
    } else {
      setMode('short_break')
    }
  } else {
    setMode('work')
  }
}

async function loadTasks() {
  tasks.value = await api.getTasks()
}

async function loadTodayStats() {
  const today = new Date().toISOString().split('T')[0]
  todayStats.value = await api.getDailyStats(today)
}

let timerInterval: number | null = null

watch(isRunning, (running) => {
  if (running) {
    timerInterval = window.setInterval(() => {
      if (timeLeft.value > 0) {
        timeLeft.value--
      } else {
        completeSession()
      }
    }, 1000)
  } else {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }
})

onMounted(async () => {
  await loadTasks()
  await loadTodayStats()
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})
</script>

<style scoped>
.timer-view {
  width: 100%;
  max-width: 500px;
}

.timer-card {
  text-align: center;
}

.mode-selector {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.mode-btn {
  padding: 0.5rem 1.5rem;
  border: 2px solid rgba(102, 126, 234, 0.3);
  background: transparent;
  border-radius: 2rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #666;
}

.mode-btn:hover:not(:disabled) {
  border-color: rgba(102, 126, 234, 0.6);
}

.mode-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.mode-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.timer-display {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.timer-circle {
  position: relative;
  width: 220px;
  height: 220px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.progress-ring {
  transform: rotate(-90deg);
}

.progress-ring-circle {
  transition: stroke-dashoffset 0.5s ease;
}

.timer-text {
  position: absolute;
  font-size: 3rem;
  font-weight: 700;
  color: #333;
}

.task-selector {
  margin-bottom: 1.5rem;
  text-align: left;
}

.task-selector label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #666;
}

.timer-controls {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.session-info {
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  color: #666;
}

.session-info p {
  margin: 0.5rem 0;
}
</style>
