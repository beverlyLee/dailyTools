import { ref, reactive } from 'vue'
import { invoke } from '@tauri-apps/api/tauri'
import type { VideoFile, ConversionSettings, FFmpegProgress } from '../types'

export interface FFmpegState {
  isLoaded: boolean
  isLoading: boolean
  isConverting: boolean
  progress: FFmpegProgress
  error: string | null
}

const state = reactive<FFmpegState>({
  isLoaded: false,
  isLoading: false,
  isConverting: false,
  progress: {
    progress: 0,
    time: 0,
    speed: 0
  },
  error: null
})

const outputUrl = ref<string>('')

const loadFFmpeg = async (): Promise<boolean> => {
  if (state.isLoaded) return true
  
  state.isLoading = true
  state.error = null
  
  try {
    console.log('FFmpeg.wasm 初始化中...')
    
    state.isLoaded = true
    return true
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'FFmpeg 初始化失败'
    return false
  } finally {
    state.isLoading = false
  }
}

const convertToGIF = async (
  videoFile: VideoFile, settings: ConversionSettings): Promise<string | null> => {
  if (!state.isLoaded) {
    const loaded = await loadFFmpeg()
    if (!loaded) return null
  }
  
  state.isConverting = true
  state.error = null
  state.progress = { progress: 0, time: 0, speed: 0 }
  
  try {
    console.log('开始转换为 GIF:', videoFile.name, settings)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    state.progress = { progress: 50, time: 5, speed: 1 }
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    state.progress = { progress: 100, time: 10, speed: 1 }
    
    return 'mock-output.gif'
  } catch (error) {
    state.error = error instanceof Error ? error.message : '转换失败'
    return null
  } finally {
    state.isConverting = false
  }
}

const convertToWebM = async (
  videoFile: VideoFile, settings: ConversionSettings): Promise<string | null> => {
  if (!state.isLoaded) {
    const loaded = await loadFFmpeg()
    if (!loaded) return null
  }
  
  state.isConverting = true
  state.error = null
  state.progress = { progress: 0, time: 0, speed: 0 }
  
  try {
    console.log('开始转换为 WebM:', videoFile.name, settings)
    
    await new Promise(resolve => setTimeout(resolve, 800))
    
    state.progress = { progress: 50, time: 5, speed: 1.2 }
    await new Promise(resolve => setTimeout(resolve, 800))
    
    state.progress = { progress: 100, time: 10, speed: 1.2 }
    
    return 'mock-output.webm'
  } catch (error) {
    state.error = error instanceof Error ? error.message : '转换失败'
    return null
  } finally {
    state.isConverting = false
  }
}

const convertVideo = async (
  videoFile: VideoFile, settings: ConversionSettings): Promise<string | null> => {
  if (settings.format === 'webm') {
    return convertToWebM(videoFile, settings)
  }
  return convertToGIF(videoFile, settings)
}

const generatePreview = async (
  videoFile: VideoFile, settings: ConversionSettings): Promise<string | null> => {
  if (!state.isLoaded) {
    const loaded = await loadFFmpeg()
    if (!loaded) return null
  }
  
  try {
    console.log('生成预览:', videoFile.name, settings)
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return ''
  } catch (error) {
    state.error = error instanceof Error ? error.message : '预览生成失败'
    return null
  }
}

const saveToHistory = async (
  originalPath: string,
  outputPath: string,
  settings: ConversionSettings
): Promise<void> => {
  try {
    await invoke('add_conversion', {
      originalPath,
      outputPath,
      settings: {
        start_time: settings.startTime,
        end_time: settings.endTime,
        width: settings.width,
        height: settings.height,
        fps: settings.fps,
        loop_count: settings.loop,
        colors: settings.colors,
        format: settings.format,
        quality: settings.quality
      }
    })
  } catch (error) {
    console.error('保存历史记录失败:', error)
  }
}

export const useFFmpeg = () => {
  return {
    state,
    outputUrl,
    loadFFmpeg,
    convertVideo,
    convertToGIF,
    convertToWebM,
    generatePreview,
    saveToHistory
  }
}
