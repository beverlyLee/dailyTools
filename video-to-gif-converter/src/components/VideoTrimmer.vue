<template>
  <div class="card">
    <h3 class="card-title">视频截取</h3>
    
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">开始时间 (秒)</label>
        <input 
          type="number" 
          class="form-input"
          :value="startTime"
          @input="updateStartTime($event)"
          step="0.1"
          min="0"
          :max="endTime - 0.1"
        />
      </div>
      <div class="form-group">
        <label class="form-label">结束时间 (秒)</label>
        <input 
          type="number" 
          class="form-input"
          :value="endTime"
          @input="updateEndTime($event)"
          step="0.1"
          :min="startTime + 0.1"
          :max="duration"
        />
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">时间轴</label>
      <div class="timeline-container" ref="timelineContainer">
        <div class="timeline-track"></div>
        <div 
          class="timeline-range"
          :style="{
            left: `${(startTime / duration) * 100}%`,
            width: `${((endTime - startTime) / duration) * 100}%`
          }"
        ></div>
        <div 
          class="timeline-handle"
          :style="{ left: `${(startTime / duration) * 100}%` }"
          @mousedown="startDragStart"
        ></div>
        <div 
          class="timeline-handle"
          :style="{ left: `${(endTime / duration) * 100}%` }"
          @mousedown="startDragEnd"
        ></div>
      </div>
      <div class="timeline-time">
        <span>{{ formatTime(startTime) }}</span>
        <span>{{ formatTime(duration / 2) }}</span>
        <span>{{ formatTime(duration) }}</span>
      </div>
    </div>
    
    <div class="form-group">
      <p class="duration-info">
        视频总时长: <strong>{{ formatTime(duration) }}</strong>
        | 截取时长: <strong>{{ formatTime(endTime - startTime) }}</strong>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  startTime: number
  endTime: number
  duration: number
}

const props = withDefaults(defineProps<Props>(), {
  startTime: 0,
  endTime: 10,
  duration: 10
})

const emit = defineEmits<{
  (e: 'update:startTime', value: number): void
  (e: 'update:endTime', value: number): void
}>()

const timelineContainer = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const dragType = ref<'start' | 'end'>('start')

const updateStartTime = (e: Event) => {
  const input = e.target as HTMLInputElement
  const value = parseFloat(input.value)
  if (!isNaN(value)) {
    emit('update:startTime', Math.max(0, Math.min(value, props.endTime - 0.1)))
  }
}

const updateEndTime = (e: Event) => {
  const input = e.target as HTMLInputElement
  const value = parseFloat(input.value)
  if (!isNaN(value)) {
    emit('update:endTime', Math.min(props.duration, Math.max(value, props.startTime + 0.1)))
  }
}

const startDragStart = (e: MouseEvent) => {
  e.preventDefault()
  isDragging.value = true
  dragType.value = 'start'
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
}

const startDragEnd = (e: MouseEvent) => {
  e.preventDefault()
  isDragging.value = true
  dragType.value = 'end'
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
}

const handleDrag = (e: MouseEvent) => {
  if (!isDragging.value || !timelineContainer.value) return
  
  const rect = timelineContainer.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percentage = Math.max(0, Math.min(1, x / rect.width))
  const time = percentage * props.duration
  
  if (dragType.value === 'start') {
    emit('update:startTime', Math.max(0, Math.min(time, props.endTime - 0.1)))
  } else {
    emit('update:endTime', Math.min(props.duration, Math.max(time, props.startTime + 0.1)))
  }
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

watch(() => props.duration, (newDuration) => {
  if (props.endTime > newDuration) {
    emit('update:endTime', newDuration)
  }
})
</script>
