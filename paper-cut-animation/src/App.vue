<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import LayeredStage from './scenes/LayeredStage.vue'
import PaperFigure from './characters/PaperFigure.vue'
import * as THREE from 'three'

const stageRef = ref(null)
const figureRef = ref(null)
const animationFrameId = ref(null)
const timer = ref(null)

const figurePosition = reactive({ x: 0, y: 0 })
const targetPosition = reactive({ x: 0, y: 0 })
const layerSequence = ['foreground', 'midground', 'background', 'midground']
const currentLayerIndex = ref(1)
const layerTimer = ref(0)

const initAnimation = () => {
  timer.value = new THREE.Timer()
  animate()
}

const animate = () => {
  animationFrameId.value = requestAnimationFrame(animate)
  
  if (!timer.value || !figureRef.value) return
  
  timer.value.update()
  const delta = timer.value.getDelta()
  const elapsed = timer.value.getElapsed()

  targetPosition.x = Math.sin(elapsed * 0.8) * 3
  targetPosition.y = Math.sin(elapsed * 0.5) * 0.5 + Math.sin(elapsed * 1.2) * 0.3

  figurePosition.x += (targetPosition.x - figurePosition.x) * delta * 2
  figurePosition.y += (targetPosition.y - figurePosition.y) * delta * 2

  figureRef.value.setPosition(figurePosition.x, figurePosition.y)

  layerTimer.value += delta
  if (layerTimer.value > 3) {
    layerTimer.value = 0
    currentLayerIndex.value = (currentLayerIndex.value + 1) % layerSequence.length
    figureRef.value.moveToLayer(layerSequence[currentLayerIndex.value])
  }

  figureRef.value.updatePosition(delta)
}

const syncLayerDepths = () => {
  if (stageRef.value && figureRef.value) {
    const zValues = {
      foreground: stageRef.value.getFigureZForLayer('foreground'),
      midground: stageRef.value.getFigureZForLayer('midground'),
      background: stageRef.value.getFigureZForLayer('background')
    }
    figureRef.value.setLayerZValues(zValues)
  }
}

onMounted(() => {
  if (stageRef.value && figureRef.value) {
    syncLayerDepths()
    const figure = figureRef.value.createFigure()
    stageRef.value.addToScene(figure)
    initAnimation()
  }
})

onUnmounted(() => {
  if (animationFrameId.value) {
    cancelAnimationFrame(animationFrameId.value)
  }
})
</script>

<template>
  <div class="app-container">
    <LayeredStage ref="stageRef" />
    <PaperFigure ref="figureRef" />
    <div class="info-panel">
      <h2>中国剪纸风格 3D 动画</h2>
      <p>红色剪纸人物在前景、中景、背景之间穿梭</p>
      <p class="hint">观察深度变化带来的遮挡关系和透视效果</p>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  overflow: hidden;
}

.app-container {
  width: 100vw;
  height: 100vh;
  position: relative;
}

.info-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(255, 248, 231, 0.95);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(139, 0, 0, 0.2);
  border: 2px solid #8b0000;
  z-index: 100;
}

.info-panel h2 {
  color: #8b0000;
  font-size: 1.2rem;
  margin-bottom: 10px;
}

.info-panel p {
  color: #5a4a3a;
  font-size: 0.9rem;
  margin-bottom: 5px;
}

.info-panel .hint {
  color: #8b7355;
  font-size: 0.8rem;
  margin-top: 8px;
  font-style: italic;
}
</style>
