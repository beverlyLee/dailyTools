<script>
  import { onMount, onDestroy } from 'svelte'
  import { whiteboardState, user } from '../store/classroomStore.js'
  import { sendWhiteboardAction } from '../utils/websocket.js'
  import Toolbar from './Toolbar.svelte'
  import DrawingCanvas from './DrawingCanvas.svelte'
  import GeometryTools from './GeometryTools.svelte'
  import MathFormula from './MathFormula.svelte'

  let currentTool = 'pen'
  let currentColor = '#000000'
  let currentStrokeWidth = 2
  let showGeometryTools = false
  let showMathFormula = false

  const unsub = whiteboardState.subscribe(state => {
    currentTool = state.currentTool
    currentColor = state.color
    currentStrokeWidth = state.strokeWidth
  })

  function handleToolChange(tool) {
    currentTool = tool
    whiteboardState.update(state => ({ ...state, currentTool: tool }))
  }

  function handleColorChange(color) {
    currentColor = color
    whiteboardState.update(state => ({ ...state, color }))
  }

  function handleStrokeWidthChange(width) {
    currentStrokeWidth = width
    whiteboardState.update(state => ({ ...state, strokeWidth: width }))
  }

  function toggleGeometryTools() {
    showGeometryTools = !showGeometryTools
    showMathFormula = false
  }

  function toggleMathFormula() {
    showMathFormula = !showMathFormula
    showGeometryTools = false
  }

  onDestroy(() => {
    unsub()
  })
</script>

<style>
  .whiteboard-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: #f8f9fa;
  }

  .whiteboard-toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 15px;
    background: white;
    border-bottom: 1px solid #e0e0e0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }

  .canvas-area {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .side-panel {
    position: absolute;
    top: 0;
    right: 0;
    width: 320px;
    height: 100%;
    background: white;
    border-left: 1px solid #e0e0e0;
    box-shadow: -2px 0 10px rgba(0,0,0,0.1);
    z-index: 100;
    overflow-y: auto;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px;
    border-bottom: 1px solid #e0e0e0;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 16px;
    color: #333;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #666;
  }

  .panel-content {
    padding: 15px;
  }
</style>

<div class="whiteboard-container">
  <div class="whiteboard-toolbar">
    <Toolbar
      currentTool={currentTool}
      currentColor={currentColor}
      currentStrokeWidth={currentStrokeWidth}
      onToolChange={handleToolChange}
      onColorChange={handleColorChange}
      onStrokeWidthChange={handleStrokeWidthChange}
      onToggleGeometry={toggleGeometryTools}
      onToggleMath={toggleMathFormula}
    />
  </div>

  <div class="canvas-area">
    <DrawingCanvas
      currentTool={currentTool}
      currentColor={currentColor}
      currentStrokeWidth={currentStrokeWidth}
    />

    {#if showGeometryTools}
      <div class="side-panel">
        <div class="panel-header">
          <h3>📐 几何作图工具</h3>
          <button class="close-btn" on:click={toggleGeometryTools}>×</button>
        </div>
        <div class="panel-content">
          <GeometryTools
            currentTool={currentTool}
            onToolChange={handleToolChange}
          />
        </div>
      </div>
    {/if}

    {#if showMathFormula}
      <div class="side-panel">
        <div class="panel-header">
          <h3>∑ 数学公式</h3>
          <button class="close-btn" on:click={toggleMathFormula}>×</button>
        </div>
        <div class="panel-content">
          <MathFormula />
        </div>
      </div>
    {/if}
  </div>
</div>
