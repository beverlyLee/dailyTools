<template>
  <div class="app-container">
    <header class="app-header">
      <h1>视频转 GIF/WebM 转换器</h1>
    </header>
    <main class="app-main">
      <VideoUploader @files-selected="handleFilesSelected" />
      <div v-if="selectedFiles.length > 0" class="conversion-section">
        <VideoTrimmer 
          v-model:start-time="currentSettings.startTime"
          v-model:end-time="currentSettings.endTime"
          :duration="currentVideoDuration"
        />
        <ConversionSettings v-model="currentSettings" />
        <PreviewComponent :preview-url="previewUrl" :loading="isGeneratingPreview" />
        <button 
          class="generate-preview-btn"
          @click="generatePreview"
          :disabled="isGeneratingPreview || !currentVideoFile"
        >
          {{ isGeneratingPreview ? '生成预览中...' : '生成预览' }}
        </button>
        <button 
          class="convert-btn"
          @click="startConversion"
          :disabled="isConverting || !currentVideoFile"
        >
          {{ isConverting ? '转换中...' : '开始转换' }}
        </button>
      </div>
      <BatchQueue 
        :queue="conversionQueue"
        :current-index="currentQueueIndex"
        @remove="removeFromQueue"
      />
      <HistoryComponent :history="conversionHistory" @load-history="loadHistoryItem" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import VideoUploader from './components/VideoUploader.vue'
import VideoTrimmer from './components/VideoTrimmer.vue'
import ConversionSettings from './components/ConversionSettings.vue'
import PreviewComponent from './components/Preview.vue'
import BatchQueue from './components/BatchQueue.vue'
import HistoryComponent from './components/History.vue'
import type { VideoFile, ConversionSettings as SettingsType, ConversionHistoryItem, QueueItem } from './types'

const selectedFiles = ref<VideoFile[]>([])
const currentVideoFile = ref<VideoFile | null>(null)
const currentVideoDuration = ref<number>(0)
const currentSettings = ref<SettingsType>({
  startTime: 0,
  endTime: 10,
  width: 640,
  height: 480,
  fps: 15,
  loop: 0,
  colors: 256,
  format: 'gif',
  quality: 80
})
const previewUrl = ref<string>('')
const isGeneratingPreview = ref(false)
const isConverting = ref(false)
const conversionQueue = ref<QueueItem[]>([])
const currentQueueIndex = ref(0)
const conversionHistory = ref<ConversionHistoryItem[]>([])

const handleFilesSelected = (files: VideoFile[]) => {
  selectedFiles.value = [...selectedFiles.value, ...files]
  if (files.length > 0 && !currentVideoFile.value) {
    currentVideoFile.value = files[0]
  }
  conversionQueue.value = [...conversionQueue.value, ...files.map(file => ({
    id: Date.now() + Math.random(),
    file,
    status: 'pending',
    settings: { ...currentSettings.value }
  }))]
}

const generatePreview = async () => {
  if (!currentVideoFile.value) return
  isGeneratingPreview.value = true
  try {
    const preview = await generatePreviewImpl(currentVideoFile.value, currentSettings.value)
    previewUrl.value = preview
  } catch (error) {
    console.error('预览生成失败:', error)
  } finally {
    isGeneratingPreview.value = false
  }
}

const startConversion = async () => {
  if (conversionQueue.value.length === 0) return
  isConverting.value = true
  for (let i = 0; i < conversionQueue.value.length; i++) {
    currentQueueIndex.value = i
    const item = conversionQueue.value[i]
    item.status = 'converting'
    try {
      const outputPath = await convertVideo(item.file, item.settings)
      item.status = 'completed'
      item.outputPath = outputPath
      conversionHistory.value.unshift({
        id: Date.now(),
        originalPath: item.file.path,
        outputPath: outputPath,
        settings: item.settings,
        createdAt: new Date().toISOString()
      })
    } catch (error) {
      item.status = 'failed'
      console.error('转换失败:', error)
    }
  }
  isConverting.value = false
}

const removeFromQueue = (id: number) => {
  const index = conversionQueue.value.findIndex(item => item.id === id)
  if (index !== -1) {
    conversionQueue.value.splice(index, 1)
  }
}

const loadHistoryItem = (item: ConversionHistoryItem) => {
  currentSettings.value = { ...item.settings }
}

const generatePreviewImpl = async (file: VideoFile, settings: SettingsType): Promise<string> => {
  console.log('生成预览:', file.name, settings)
  return ''
}

const convertVideo = async (file: VideoFile, settings: SettingsType): Promise<string> => {
  console.log('转换视频:', file.name, settings)
  return ''
}
</script>
