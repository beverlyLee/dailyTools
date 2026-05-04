<template>
  <div class="knowledge-graph">
    <div class="graph-header">
      <span class="title">知识图谱</span>
      <div class="controls">
        <button class="control-btn" @click="zoomIn" title="放大">
          <span class="icon">+</span>
        </button>
        <button class="control-btn" @click="zoomOut" title="缩小">
          <span class="icon">-</span>
        </button>
        <button class="control-btn" @click="resetView" title="重置视图">
          <span class="icon">⟲</span>
        </button>
        <button class="control-btn" @click="refreshGraph" title="刷新">
          <span class="icon">🔄</span>
        </button>
      </div>
    </div>
    <div class="graph-container" ref="graphContainer">
      <svg ref="svgElement" class="graph-svg"></svg>
    </div>
    
    <!-- 节点信息弹窗 -->
    <div
      v-if="selectedNode"
      class="node-tooltip"
      :style="{
        left: tooltipPosition.x + 'px',
        top: tooltipPosition.y + 'px'
      }"
    >
      <div class="tooltip-header">
        <span class="tooltip-title">{{ selectedNode.title }}</span>
        <button class="tooltip-close" @click="selectedNode = null">×</button>
      </div>
      <div class="tooltip-content">
        <div class="tooltip-item">
          <span class="tooltip-label">路径:</span>
          <span class="tooltip-value">{{ selectedNode.file_path }}</span>
        </div>
        <div v-if="selectedNode.created_at" class="tooltip-item">
          <span class="tooltip-label">创建时间:</span>
          <span class="tooltip-value">{{ formatDate(selectedNode.created_at) }}</span>
        </div>
        <div v-if="selectedNode.updated_at" class="tooltip-item">
          <span class="tooltip-label">更新时间:</span>
          <span class="tooltip-value">{{ formatDate(selectedNode.updated_at) }}</span>
        </div>
      </div>
      <div class="tooltip-actions">
        <button class="action-btn primary" @click="openNote(selectedNode.file_path)">
          打开笔记
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as d3 from 'd3'
import type { GraphNode, GraphEdge, KnowledgeGraph } from '@/types'
import { linkApi } from '@/services/api'
import { useNotesStore } from '@/stores/notes'

const props = defineProps<{
  centerPath?: string
}>()

const emit = defineEmits<{
  (e: 'navigate', path: string): void
}>()

const notesStore = useNotesStore()
const { openNote } = notesStore

const graphContainer = ref<HTMLDivElement | null>(null)
const svgElement = ref<SVGSVGElement | null>(null)

const selectedNode = ref<GraphNode | null>(null)
const tooltipPosition = ref({ x: 0, y: 0 })

let simulation: d3.Simulation<GraphNode, GraphEdge> | null = null
let zoomBehavior: d3.ZoomBehavior<Element, unknown> | null = null
let svgGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null

// 加载图谱数据
async function loadGraphData(): Promise<KnowledgeGraph | null> {
  try {
    let response
    if (props.centerPath) {
      // 加载子图
      response = await linkApi.getSubgraph(props.centerPath, 2)
      if (response.success) {
        return response.data as unknown as KnowledgeGraph
      }
    } else {
      // 加载完整图谱
      response = await linkApi.getKnowledgeGraph()
      if (response.success) {
        return response.data
      }
    }
    return null
  } catch (error) {
    console.error('Failed to load graph data:', error)
    return null
  }
}

// 渲染图谱
async function renderGraph() {
  if (!svgElement.value || !graphContainer.value) return
  
  const graphData = await loadGraphData()
  if (!graphData) return
  
  const { nodes, edges } = graphData
  
  if (nodes.length === 0) return
  
  // 清空现有内容
  d3.select(svgElement.value).selectAll('*').remove()
  
  const width = graphContainer.value.clientWidth
  const height = graphContainer.value.clientHeight
  
  // 创建 SVG
  const svg = d3.select(svgElement.value)
    .attr('width', width)
    .attr('height', height)
  
  // 创建缩放行为
  zoomBehavior = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      if (svgGroup) {
        svgGroup.attr('transform', event.transform)
      }
    })
  
  svg.call(zoomBehavior)
  
  // 创建主容器
  svgGroup = svg.append('g')
  
  // 定义箭头标记
  const defs = svg.append('defs')
  
  defs.append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '-0 -5 10 10')
    .attr('refX', 20)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .append('path')
    .attr('d', 'M 0,-5 L 10,0 L 0,5')
    .attr('fill', '#569cd6')
  
  // 准备链接数据
  const links: Array<{ source: number; target: number } & GraphEdge> = edges.map(e => ({
    ...e,
    source: e.from,
    target: e.to
  }))
  
  // 创建力导向模拟
  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(50))
  
  // 绘制链接
  const link = svgGroup.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('class', 'link')
    .attr('stroke', '#569cd6')
    .attr('stroke-opacity', 0.6)
    .attr('stroke-width', 1.5)
    .attr('marker-end', 'url(#arrowhead)')
  
  // 创建节点组
  const nodeGroup = svgGroup.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node')
    .style('cursor', 'pointer')
    .call(d3.drag<SVGGElement, GraphNode>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended))
    .on('click', (event, d) => handleNodeClick(event, d))
  
  // 节点圆形
  nodeGroup.append('circle')
    .attr('r', (d: GraphNode) => d.is_center ? 25 : 20)
    .attr('fill', (d: GraphNode) => d.is_center ? '#dcdcaa' : '#569cd6')
    .attr('stroke', '#1e1e1e')
    .attr('stroke-width', 2)
  
  // 节点文本
  nodeGroup.append('text')
    .attr('dy', '.35em')
    .attr('text-anchor', 'middle')
    .attr('fill', '#d4d4d4')
    .attr('font-size', '11px')
    .attr('pointer-events', 'none')
    .text((d: GraphNode) => {
      const maxLength = 10
      return d.title.length > maxLength ? d.title.substring(0, maxLength) + '...' : d.title
    })
  
  // 更新位置
  simulation.on('tick', () => {
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y)
    
    nodeGroup
      .attr('transform', (d: GraphNode) => `translate(${d.x},${d.y})`)
  })
  
  // 拖拽函数
  function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
    if (!event.active && simulation) {
      simulation.alphaTarget(0.3).restart()
    }
    d.fx = d.x
    d.fy = d.y
  }
  
  function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
    d.fx = event.x
    d.fy = event.y
  }
  
  function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>, d: GraphNode) {
    if (!event.active && simulation) {
      simulation.alphaTarget(0)
    }
    d.fx = null
    d.fy = null
  }
}

// 处理节点点击
function handleNodeClick(event: MouseEvent, node: GraphNode) {
  event.stopPropagation()
  selectedNode.value = node
  tooltipPosition.value = {
    x: event.clientX + 10,
    y: event.clientY + 10
  }
}

// 缩放控制
function zoomIn() {
  if (svgElement.value && zoomBehavior) {
    d3.select(svgElement.value).transition().duration(300).call(
      zoomBehavior.scaleBy, 1.3
    )
  }
}

function zoomOut() {
  if (svgElement.value && zoomBehavior) {
    d3.select(svgElement.value).transition().duration(300).call(
      zoomBehavior.scaleBy, 1 / 1.3
    )
  }
}

function resetView() {
  if (svgElement.value && zoomBehavior) {
    d3.select(svgElement.value).transition().duration(300).call(
      zoomBehavior.transform, d3.zoomIdentity
    )
  }
}

function refreshGraph() {
  renderGraph()
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 监听中心路径变化
watch(() => props.centerPath, () => {
  renderGraph()
})

// 生命周期
onMounted(async () => {
  await nextTick()
  renderGraph()
  
  // 点击空白处关闭弹窗
  const handleClick = () => {
    selectedNode.value = null
  }
  document.addEventListener('click', handleClick)
  
  onUnmounted(() => {
    document.removeEventListener('click', handleClick)
    if (simulation) {
      simulation.stop()
    }
  })
})
</script>

<style scoped>
.knowledge-graph {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #1e1e1e;
  color: #d4d4d4;
}

.graph-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #2d2d2d;
}

.title {
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: #858585;
}

.controls {
  display: flex;
  gap: 4px;
}

.control-btn {
  background: none;
  border: none;
  color: #858585;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 14px;
  transition: all 0.15s;
}

.control-btn:hover {
  background-color: #2d2d2d;
  color: #d4d4d4;
}

.graph-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.graph-svg {
  width: 100%;
  height: 100%;
}

/* 节点样式 */
:deep(.node circle) {
  transition: fill 0.2s, r 0.2s;
}

:deep(.node:hover circle) {
  fill: #9cdcfe;
  r: 28;
}

/* 链接样式 */
:deep(.link) {
  transition: stroke-opacity 0.2s;
}

:deep(.link:hover) {
  stroke-opacity: 1;
  stroke-width: 2;
}

/* 弹窗样式 */
.node-tooltip {
  position: fixed;
  z-index: 1000;
  background-color: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  min-width: 250px;
  max-width: 350px;
}

.tooltip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #3c3c3c;
  background-color: #2d2d2d;
  border-radius: 6px 6px 0 0;
}

.tooltip-title {
  font-weight: 600;
  color: #dcdcaa;
}

.tooltip-close {
  background: none;
  border: none;
  color: #858585;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0;
  transition: color 0.15s;
}

.tooltip-close:hover {
  color: #d4d4d4;
}

.tooltip-content {
  padding: 12px 14px;
}

.tooltip-item {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
}

.tooltip-item:last-child {
  margin-bottom: 0;
}

.tooltip-label {
  color: #858585;
  margin-right: 8px;
  min-width: 60px;
}

.tooltip-value {
  color: #d4d4d4;
  word-break: break-all;
}

.tooltip-actions {
  padding: 10px 14px;
  border-top: 1px solid #3c3c3c;
}

.action-btn {
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
}

.action-btn.primary {
  background-color: #0e639c;
  color: white;
}

.action-btn.primary:hover {
  background-color: #1177bb;
}

/* 滚动条样式 */
.graph-container::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.graph-container::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.graph-container::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 5px;
}

.graph-container::-webkit-scrollbar-thumb:hover {
  background: #4f4f4f;
}
</style>
