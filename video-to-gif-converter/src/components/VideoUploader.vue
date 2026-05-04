<template>
  <div class="card">
    <h3 class="card-title">选择视频文件</h3>
    <div 
      ref="dropzone"
      class="dropzone"
      :class="{ dragover: isDragover }"
      @click="handleClick"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <div class="dropzone-icon">📁</div>
      <div class="dropzone-text">
        <p>拖拽视频文件到此处</p>
        <p>或点击选择文件</p>
      </div>
      <input 
        ref="fileInput"
        type="file"
        accept="video/*"
        multiple
        @change="handleFileChange"
        style="display: none"
      />
    </div>
    
    <div v-if="selectedFiles.length > 0" class="selected-files">
      <h4>已选择的文件：</h4>
      <div class="file-list">
        <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
          <span class="file-name">{{ file.name }}</span>
          <span class="file-size">{{ formatFileSize(file.size) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { VideoFile } from '../types'

const emit = defineEmits<{
  (e: 'files-selected', files: VideoFile[]): void
}>()

const dropzone = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isDragover = ref(false)
const selectedFiles = ref<VideoFile[]>([])

const handleClick = () => {
  fileInput.value?.click()
}

const handleDragOver = () => {
  isDragover.value = true
}

const handleDragLeave = () => {
  isDragover.value = false
}

const handleDrop = (e: DragEvent) => {
  isDragover.value = false
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    processFiles(Array.from(files))
  }
}

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (files && files.length > 0) {
    processFiles(Array.from(files))
  }
  if (input) {
    input.value = ''
  }
}

const processFiles = async (files: File[]) => {
  const videoFiles: VideoFile[] = []
  
  for (const file of files) {
    if (file.type.startsWith('video/')) {
      const videoFile = await createVideoFile(file)
      if (videoFile) {
        videoFiles.push(videoFile)
      }
    }
  }
  
  if (videoFiles.length > 0) {
    selectedFiles.value = [...selectedFiles.value, ...videoFiles]
    emit('files-selected', videoFiles)
  }
}

const createVideoFile = (file: File): Promise<VideoFile | null> => {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.preload = 'metadata'
    
    video.onloadedmetadata = () => {
      const videoFile: VideoFile = {
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        path: file.name,
        size: file.size,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      }
      URL.revokeObjectURL(url)
      resolve(videoFile)
    }
    
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    
    video.src = url
  })
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>
