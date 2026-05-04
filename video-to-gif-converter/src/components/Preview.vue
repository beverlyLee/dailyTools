<template>
  <div class="card">
    <h3 class="card-title">预览</h3>
    <div class="preview-container">
      <div v-if="loading" class="preview-loading">
        <div class="spinner"></div>
        <p>生成预览中...</p>
      </div>
      <div v-else-if="previewUrl" class="preview-content">
        <img 
          v-if="isImage"
          :src="previewUrl" 
          alt="Preview"
          class="preview-image"
        />
        <video 
          v-else
          :src="previewUrl" 
          controls
          loop
          class="preview-video"
        ></video>
      </div>
      <div v-else class="preview-placeholder">
        <div class="preview-icon">👁️</div>
        <p>点击"生成预览"按钮查看效果</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  previewUrl: string
  loading: boolean
}

const props = defineProps<Props>()

const isImage = computed(() => {
  return props.previewUrl && !props.previewUrl.endsWith('.webm')
})
</script>

<style scoped>
.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.preview-content {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-image {
  max-width: 100%;
  max-height: 400px;
  object-fit: contain;
  border-radius: var(--radius);
}

.preview-video {
  max-width: 100%;
  max-height: 400px;
  border-radius: var(--radius);
}

.preview-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.preview-placeholder {
  text-align: center;
  color: var(--text-secondary);
}
</style>
