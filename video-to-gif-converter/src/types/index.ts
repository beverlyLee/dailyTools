export interface VideoFile {
  id: string
  name: string
  path: string
  size: number
  duration: number
  width: number
  height: number
}

export interface ConversionSettings {
  startTime: number
  endTime: number
  width: number
  height: number
  fps: number
  loop: number
  colors: number
  format: 'gif' | 'webm'
  quality: number
}

export interface ConversionHistoryItem {
  id: number
  originalPath: string
  outputPath: string
  settings: ConversionSettings
  createdAt: string
}

export interface QueueItem {
  id: number
  file: VideoFile
  status: 'pending' | 'converting' | 'completed' | 'failed'
  settings: ConversionSettings
  outputPath?: string
}

export interface FFmpegProgress {
  progress: number
  time: number
  speed: number
}
