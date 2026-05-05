<script>
  import { onMount, onDestroy, tick } from 'svelte'
  import { user } from '../store/classroomStore.js'
  import { sendWhiteboardAction } from '../utils/websocket.js'
  import { getSocket } from '../utils/websocket.js'

  export let currentTool
  export let currentColor
  export let currentStrokeWidth

  let canvas
  let context
  let isDrawing = false
  let lastX = 0
  let lastY = 0
  let startX = 0
  let startY = 0

  let canvasWidth = 0
  let canvasHeight = 0

  let history = []
  let historyIndex = -1
  const MAX_HISTORY = 50

  let shapes = []
  let currentShape = null

  let userId = ''
  const unsub = user.subscribe(u => {
    userId = u.id
  })

  onMount(async () => {
    await tick()
    
    const container = canvas.parentElement
    canvasWidth = container.clientWidth
    canvasHeight = container.clientHeight
    
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    
    context = canvas.getContext('2d')
    context.lineCap = 'round'
    context.lineJoin = 'round'

    saveToHistory()

    const resizeObserver = new ResizeObserver(() => {
      canvasWidth = container.clientWidth
      canvasHeight = container.clientHeight
      canvas.width = canvasWidth
      canvas.height = canvasHeight
      redrawAll()
    })
    resizeObserver.observe(container)

    const socket = getSocket()
    if (socket) {
      socket.on('whiteboard-draw', handleRemoteDraw)
    }

    window.addEventListener('whiteboard-undo', handleUndo)
    window.addEventListener('whiteboard-redo', handleRedo)
    window.addEventListener('whiteboard-clear', handleClear)

    return () => {
      resizeObserver.disconnect()
      if (socket) {
        socket.off('whiteboard-draw', handleRemoteDraw)
      }
      window.removeEventListener('whiteboard-undo', handleUndo)
      window.removeEventListener('whiteboard-redo', handleRedo)
      window.removeEventListener('whiteboard-clear', handleClear)
    }
  })

  function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    isDrawing = true
    lastX = x
    lastY = y
    startX = x
    startY = y

    if (currentTool === 'pen' || currentTool === 'eraser') {
      context.beginPath()
      context.moveTo(x, y)
    }
  }

  function handleMouseMove(e) {
    if (!isDrawing) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (currentTool === 'pen') {
      drawPen(x, y)
      sendDrawAction('pen-path', { x, y })
    } else if (currentTool === 'eraser') {
      drawEraser(x, y)
      sendDrawAction('eraser', { x, y })
    } else if (currentTool === 'line' || currentTool === 'arrow' || 
               currentTool === 'rectangle' || currentTool === 'circle') {
      redrawAll()
      drawShapePreview(startX, startY, x, y)
    }

    lastX = x
    lastY = y
  }

  function handleMouseUp(e) {
    if (!isDrawing) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (currentTool === 'line') {
      drawLine(startX, startY, x, y)
      sendDrawAction('line', { startX, startY, endX: x, endY: y })
      addShape('line', { startX, startY, endX: x, endY: y })
    } else if (currentTool === 'arrow') {
      drawArrow(startX, startY, x, y)
      sendDrawAction('arrow', { startX, startY, endX: x, endY: y })
      addShape('arrow', { startX, startY, endX: x, endY: y })
    } else if (currentTool === 'rectangle') {
      drawRectangle(startX, startY, x, y)
      sendDrawAction('rectangle', { startX, startY, endX: x, endY: y })
      addShape('rectangle', { startX, startY, endX: x, endY: y })
    } else if (currentTool === 'circle') {
      drawCircle(startX, startY, x, y)
      sendDrawAction('circle', { centerX: startX, centerY: startY, radius: Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2)) })
      addShape('circle', { centerX: startX, centerY: startY, radius: Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2)) })
    }

    isDrawing = false
    saveToHistory()
  }

  function handleMouseLeave() {
    if (isDrawing) {
      saveToHistory()
    }
    isDrawing = false
  }

  function drawPen(x, y) {
    context.strokeStyle = currentColor
    context.lineWidth = currentStrokeWidth
    context.globalCompositeOperation = 'source-over'
    
    context.lineTo(x, y)
    context.stroke()
    context.beginPath()
    context.moveTo(x, y)
  }

  function drawEraser(x, y) {
    context.globalCompositeOperation = 'destination-out'
    context.lineWidth = currentStrokeWidth * 3
    
    context.lineTo(x, y)
    context.stroke()
    context.beginPath()
    context.moveTo(x, y)
  }

  function drawLine(x1, y1, x2, y2) {
    context.strokeStyle = currentColor
    context.lineWidth = currentStrokeWidth
    context.globalCompositeOperation = 'source-over'
    
    context.beginPath()
    context.moveTo(x1, y1)
    context.lineTo(x2, y2)
    context.stroke()
  }

  function drawArrow(x1, y1, x2, y2) {
    context.strokeStyle = currentColor
    context.lineWidth = currentStrokeWidth
    context.globalCompositeOperation = 'source-over'
    context.fillStyle = currentColor

    const angle = Math.atan2(y2 - y1, x2 - x1)
    const headLength = 15

    context.beginPath()
    context.moveTo(x1, y1)
    context.lineTo(x2, y2)
    context.stroke()

    context.beginPath()
    context.moveTo(x2, y2)
    context.lineTo(x2 - headLength * Math.cos(angle - Math.PI / 6), y2 - headLength * Math.sin(angle - Math.PI / 6))
    context.lineTo(x2 - headLength * Math.cos(angle + Math.PI / 6), y2 - headLength * Math.sin(angle + Math.PI / 6))
    context.closePath()
    context.fill()
  }

  function drawRectangle(x1, y1, x2, y2) {
    context.strokeStyle = currentColor
    context.lineWidth = currentStrokeWidth
    context.globalCompositeOperation = 'source-over'
    
    const width = x2 - x1
    const height = y2 - y1
    
    context.strokeRect(x1, y1, width, height)
  }

  function drawCircle(cx, cy, x, y) {
    context.strokeStyle = currentColor
    context.lineWidth = currentStrokeWidth
    context.globalCompositeOperation = 'source-over'
    
    const radius = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2))
    
    context.beginPath()
    context.arc(cx, cy, radius, 0, 2 * Math.PI)
    context.stroke()
  }

  function drawShapePreview(x1, y1, x2, y2) {
    context.strokeStyle = currentColor
    context.lineWidth = currentStrokeWidth
    context.globalCompositeOperation = 'source-over'
    context.setLineDash([5, 5])

    if (currentTool === 'line') {
      drawLine(x1, y1, x2, y2)
    } else if (currentTool === 'arrow') {
      drawArrow(x1, y1, x2, y2)
    } else if (currentTool === 'rectangle') {
      drawRectangle(x1, y1, x2, y2)
    } else if (currentTool === 'circle') {
      drawCircle(x1, y1, x2, y2)
    }

    context.setLineDash([])
  }

  function addShape(type, data) {
    shapes.push({
      type,
      data,
      color: currentColor,
      strokeWidth: currentStrokeWidth,
      userId
    })
  }

  function redrawAll() {
    const imageData = history[historyIndex]
    if (imageData) {
      context.putImageData(imageData, 0, 0)
    }
  }

  function saveToHistory() {
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1)
    }
    
    history.push(context.getImageData(0, 0, canvasWidth, canvasHeight))
    
    if (history.length > MAX_HISTORY) {
      history.shift()
      historyIndex--
    }
    
    historyIndex = history.length - 1
  }

  function handleUndo() {
    if (historyIndex > 0) {
      historyIndex--
      redrawAll()
    }
  }

  function handleRedo() {
    if (historyIndex < history.length - 1) {
      historyIndex++
      redrawAll()
    }
  }

  function handleClear() {
    context.clearRect(0, 0, canvasWidth, canvasHeight)
    shapes = []
    saveToHistory()
  }

  function sendDrawAction(type, data) {
    const action = {
      type,
      data,
      color: currentColor,
      strokeWidth: currentStrokeWidth,
      userId,
      tool: currentTool
    }
    sendWhiteboardAction(action)
  }

  function handleRemoteDraw(data) {
    if (data.userId === userId) return

    context.globalCompositeOperation = 'source-over'
    context.strokeStyle = data.color
    context.lineWidth = data.strokeWidth

    if (data.type === 'pen-path') {
      context.beginPath()
      context.moveTo(data.data.x, data.data.y)
      context.lineTo(data.data.x + 0.1, data.data.y + 0.1)
      context.stroke()
    } else if (data.type === 'line') {
      drawLine(data.data.startX, data.data.startY, data.data.endX, data.data.endY)
    } else if (data.type === 'arrow') {
      drawArrow(data.data.startX, data.data.startY, data.data.endX, data.data.endY)
    } else if (data.type === 'rectangle') {
      drawRectangle(data.data.startX, data.data.startY, data.data.endX, data.data.endY)
    } else if (data.type === 'circle') {
      drawCircle(data.data.centerX, data.data.centerY, 
                 data.data.centerX + data.data.radius, 
                 data.data.centerY)
    }
  }

  onDestroy(() => {
    unsub()
  })
</script>

<style>
  .canvas-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
    background: white;
  }

  canvas {
    position: absolute;
    top: 0;
    left: 0;
    cursor: crosshair;
    box-shadow: inset 0 0 20px rgba(0,0,0,0.05);
  }

  .canvas-wrapper::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: 
      radial-gradient(circle, #e0e0e0 1px, transparent 1px);
    background-size: 20px 20px;
    pointer-events: none;
    z-index: 1;
  }
</style>

<div class="canvas-wrapper">
  <canvas
    bind:this={canvas}
    on:mousedown={handleMouseDown}
    on:mousemove={handleMouseMove}
    on:mouseup={handleMouseUp}
    on:mouseleave={handleMouseLeave}
  />
</div>
