import React, { useState, useRef, useEffect, useCallback } from 'react'

const ComparisonSlider = ({ 
  originalImage, 
  processedImage,
  initialPosition = 50
}) => {
  const containerRef = useRef(null)
  const [position, setPosition] = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)

  const updatePosition = useCallback((clientX) => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    let newPosition = ((clientX - rect.left) / rect.width) * 100
    newPosition = Math.max(0, Math.min(100, newPosition))
    setPosition(newPosition)
  }, [])

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
    updatePosition(e.clientX)
  }, [updatePosition])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    updatePosition(e.clientX)
  }, [isDragging, updatePosition])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleTouchStart = useCallback((e) => {
    setIsDragging(true)
    updatePosition(e.touches[0].clientX)
  }, [updatePosition])

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return
    updatePosition(e.touches[0].clientX)
  }, [isDragging, updatePosition])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove)
      window.addEventListener('touchend', handleMouseUp)
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove])

  return (
    <div 
      ref={containerRef}
      className="comparison-slider"
      style={{ cursor: isDragging ? 'ew-resize' : 'default' }}
    >
      <img 
        src={processedImage} 
        alt="处理后" 
        draggable={false}
      />
      
      <div 
        className="comparison-overlay"
        style={{ width: `${position}%` }}
      >
        <img 
          src={originalImage} 
          alt="原图" 
          draggable={false}
          style={{ 
            maxWidth: 'none',
            width: containerRef.current ? `${100 / (position / 100)}%` : 'auto'
          }}
        />
      </div>
      
      <div 
        className="comparison-line"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      />
      
      <div 
        className="comparison-handle"
        style={{ left: `${position}%`, transform: 'translate(-50%, -50%)' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      />
      
      <div className="comparison-labels">
        <span className="comparison-label">原图</span>
        <span className="comparison-label">处理后</span>
      </div>
    </div>
  )
}

export default ComparisonSlider
