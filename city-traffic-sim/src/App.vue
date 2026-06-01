<template>
  <div class="app-container">
    <MapContainer ref="mapContainerRef" @map-ready="onMapReady" />
    <div class="info-panel">
      <h3>城市交通模拟</h3>
      <p>车辆数量: {{ carCount }}</p>
      <p>红绿灯数量: {{ lightCount }}</p>
      <p class="hint">点击红绿灯切换红/绿状态</p>
      <div v-for="light in lightStates" :key="light.id" class="light-status">
        <span :class="['light-indicator', light.state]"></span>
        {{ light.id }}: {{ light.state === 'red' ? '红灯' : '绿灯' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted } from 'vue'
import MapContainer from './map/MapContainer.vue'
import { CarManager, buildAdjacencyList, type RoadNetwork, type RoadNode } from './sim/Car'
import { TrafficLightManager, createTrafficLightsForIntersections, type TrafficLightState } from './controls/TrafficLight'

const mapContainerRef = ref<InstanceType<typeof MapContainer> | null>(null)
const carCount = ref(0)
const lightCount = ref(0)
const lightStates = reactive<{ id: string; state: TrafficLightState }[]>([])

let carManager: CarManager | null = null
let trafficLightManager: TrafficLightManager | null = null
let animationId: number = 0
let clock: { getDelta: () => number; _lastTime: number } | null = null
let simulationInitialized = false

const initSimulation = () => {
  if (!mapContainerRef.value) return

  const sceneInstance = mapContainerRef.value.getScene()
  const cameraInstance = mapContainerRef.value.getCamera()

  if (!sceneInstance || !cameraInstance) return

  const roadNetwork = mapContainerRef.value.createRoadNetwork()
  const nodes = roadNetwork.nodes
  const edges = roadNetwork.edges

  const adjacencyList = buildAdjacencyList(edges)
  const network: RoadNetwork = { nodes: nodes as Map<string, RoadNode>, edges, adjacencyList }

  carManager = new CarManager(sceneInstance, 50, network)
  carCount.value = carManager.getCarCount()

  trafficLightManager = new TrafficLightManager(
    sceneInstance,
    cameraInstance,
    (id: string, state: TrafficLightState) => {
      updateLightStateUI(id, state)
    }
  )

  const lightIntersections = Array.from(nodes.entries())
    .filter(([id]) => ['n1', 'n2', 'n4', 'n5'].includes(id))
    .map(([id, node]) => ({ id, x: node.x, y: node.y }))

  createTrafficLightsForIntersections(trafficLightManager, lightIntersections)
  lightCount.value = lightIntersections.length

  trafficLightManager.trafficLights.forEach((light, id) => {
    lightStates.push({ id, state: light.state })
  })

  clock = {
    getDelta: () => {
      if (!clock) return 0.016
      const now = performance.now()
      const delta = (now - clock._lastTime) / 1000
      clock._lastTime = now
      return Math.min(delta, 0.1)
    },
    _lastTime: performance.now()
  }

  simulationInitialized = true
  animate()
}

const onMapReady = () => {
  if (!simulationInitialized) {
    initSimulation()
  }
}

const updateLightStateUI = (id: string, state: TrafficLightState) => {
  const lightState = lightStates.find(l => l.id === id)
  if (lightState) {
    lightState.state = state
  }
}

const animate = () => {
  if (!clock || !carManager || !trafficLightManager) return

  animationId = requestAnimationFrame(animate)

  const deltaTime = clock.getDelta()
  carManager.update(deltaTime, trafficLightManager.getAllStates())
}

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.info-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 15px 20px;
  border-radius: 10px;
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 250px;
  z-index: 100;
}

.info-panel h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  padding-bottom: 8px;
}

.info-panel p {
  margin: 5px 0;
  font-size: 14px;
}

.hint {
  color: #64b5f6;
  font-size: 12px;
  margin-top: 10px;
}

.light-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 5px 0;
  font-size: 13px;
}

.light-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.light-indicator.red {
  background-color: #ff0000;
  box-shadow: 0 0 8px #ff0000;
}

.light-indicator.green {
  background-color: #00ff00;
  box-shadow: 0 0 8px #00ff00;
}
</style>
