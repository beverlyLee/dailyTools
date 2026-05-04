import React, { useRef, useEffect, useState, useCallback } from 'react'
import { fabric } from 'fabric'

const ImageCanvas = ({ 
  imageSrc, 
  onAnnotationsChange,
  brushSize = 10,
  activeTool = 'select'
}) => {
  const canvasRef = useRef(null)
  const fabricRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState([])
  const [annotations, setAnnotations] = useState([])

  useEffect(() => {
    if (!canvasRef.current || !imageSrc) return

    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: false,
      selection: false
    })
    
    fabricRef.current = canvas

    fabric.Image.fromURL(imageSrc, (img) => {
      const container = canvasRef.current.parentElement
      const containerWidth = container.clientWidth
      const containerHeight = container.clientHeight || 600
      
      const scale = Math.min(
        containerWidth / img.width,
        containerHeight / img.height,
        1
      )
      
      img.set({
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false
      })
      
      canvas.setWidth(img.width * scale)
      canvas.setHeight(img.height * scale)
      canvas.add(img)
      canvas.centerObject(img)
      canvas.renderAll()
    })

    return () => {
      if (fabricRef.current) {
        fabricRef.current.dispose()
      }
    }
  }, [imageSrc])

  useEffect(() => {
    if (!fabricRef.current) return
    
    const canvas = fabricRef.current
    
    if (activeTool === 'brush') {
      canvas.isDrawingMode = true
      canvas.freeDrawingBrush.color = 'rgba(255, 0, 0, 0.5)'
      canvas.freeDrawingBrush.width = brushSize
    } else if (activeTool === 'eraser') {
      canvas.isDrawingMode = true
      canvas.freeDrawingBrush.color = 'rgba(255, 255, 255, 0)'
      canvas.freeDrawingBrush.width = brushSize
    } else {
      canvas.isDrawingMode = false
    }
  }, [activeTool, brushSize])

  const handleMouseDown = useCallback((e) => {
    if (activeTool !== 'brush' && activeTool !== 'rect') return
    setIsDrawing(true)
    
    const canvas = fabricRef.current
    if (!canvas) return
    
    const pointer = canvas.getPointer(e.e)
    setCurrentPath([{ x: pointer.x, y: pointer.y }])
  }, [activeTool])

  const handleMouseMove = useCallback((e) => {
    if (!isDrawing) return
    
    const canvas = fabricRef.current
    if (!canvas) return
    
    const pointer = canvas.getPointer(e.e)
    setCurrentPath(prev => [...prev, { x: pointer.x, y: pointer.y }])
  }, [isDrawing])

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || currentPath.length === 0) return
    
    setIsDrawing(false)
    
    const newAnnotation = {
      id: Date.now(),
      type: activeTool === 'rect' ? 'rectangle' : 'freeform',
      points: currentPath,
      brushSize
    }
    
    const updatedAnnotations = [...annotations, newAnnotation]
    setAnnotations(updatedAnnotations)
    
    if (onAnnotationsChange) {
      onAnnotationsChange(updatedAnnotations)
    }
    
    setCurrentPath([])
  }, [isDrawing, currentPath, activeTool, brushSize, annotations, onAnnotationsChange])

  const clearAnnotations = useCallback(() => {
    setAnnotations([])
    if (onAnnotationsChange) {
      onAnnotationsChange([])
    }
    
    const canvas = fabricRef.current
    if (!canvas) return
    
    const objects = canvas.getObjects().filter(obj => obj.type === 'path' || obj.type === 'rect')
    objects.forEach(obj => canvas.remove(obj))
  }, [onAnnotationsChange])

  return (
    <div className="canvas-wrapper">
      <div className="canvas-toolbar">
        <button
          className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`}
          onClick={() => {}}
        >
          选择
        </button>
        <button
          className={`tool-btn ${activeTool === 'brush' ? 'active' : ''}`}
          onClick={() => {}}
        >
          画笔 (标记修复区域)
        </button>
        <button
          className={`tool-btn ${activeTool === 'rect' ? 'active' : ''}`}
          onClick={() => {}}
        >
          矩形
        </button>
        <button
          className="tool-btn"
          onClick={clearAnnotations}
        >
          清除标记
        </button>
        
        {activeTool === 'brush' && (
          <div className="brush-size">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>画笔大小:</span>
            <input
              type="range"
              min="2"
              max="50"
              value={brushSize}
              onChange={() => {}}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{brushSize}px</span>
          </div>
        )}
      </div>
      
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
      
      {annotations.length > 0 && (
        <div style={{ 
          padding: '0.5rem 1rem', 
          background: 'var(--bg-color)', 
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)'
        }}>
          已标记 {annotations.length} 个修复区域
        </div>
      )}
    </div>
  )
}

export default ImageCanvas
