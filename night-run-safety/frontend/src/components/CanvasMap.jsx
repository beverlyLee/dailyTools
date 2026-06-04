import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';

const getSafetyColor = (score) => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#84cc16';
  if (score >= 40) return '#eab308';
  if (score >= 20) return '#f97316';
  return '#ef4444';
};

const coordToPixel = (lng, lat, bounds, width, height, padding = 40) => {
  const x = ((lng - bounds.min_lng) / (bounds.max_lng - bounds.min_lng)) * (width - padding * 2) + padding;
  const y = height - padding - ((lat - bounds.min_lat) / (bounds.max_lat - bounds.min_lat)) * (height - padding * 2);
  return [x, y];
};

const pixelToCoord = (x, y, bounds, width, height, padding = 40) => {
  const lng = ((x - padding) / (width - padding * 2)) * (bounds.max_lng - bounds.min_lng) + bounds.min_lng;
  const lat = ((height - padding - y) / (height - padding * 2)) * (bounds.max_lat - bounds.min_lat) + bounds.min_lat;
  return [lng, lat];
};

const distanceToSegment = (px, py, x1, y1, x2, y2) => {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

const CanvasMap = ({
  segments,
  bounds,
  center,
  onSegmentHover,
  onSegmentClick,
  routeSegments = null,
  startPoint = null,
  endPoint = null,
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const transformedBounds = useMemo(() => {
    const lngRange = bounds.max_lng - bounds.min_lng;
    const latRange = bounds.max_lat - bounds.min_lat;
    const centerLng = (bounds.min_lng + bounds.max_lng) / 2;
    const centerLat = (bounds.min_lat + bounds.max_lat) / 2;
    
    const newLngRange = lngRange / zoom;
    const newLatRange = latRange / zoom;
    
    const offsetLng = (offset.x / dimensions.width) * newLngRange;
    const offsetLat = (offset.y / dimensions.height) * newLatRange;
    
    return {
      min_lng: centerLng - newLngRange / 2 + offsetLng,
      max_lng: centerLng + newLngRange / 2 + offsetLng,
      min_lat: centerLat - newLatRange / 2 - offsetLat,
      max_lat: centerLat + newLatRange / 2 - offsetLat,
    };
  }, [bounds, zoom, offset, dimensions]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = dimensions;

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (!segments || segments.length === 0) return;

    for (const segment of segments) {
      if (!segment.coordinates || segment.coordinates.length < 2) continue;

      ctx.beginPath();
      for (let i = 0; i < segment.coordinates.length; i++) {
        const [lng, lat] = segment.coordinates[i];
        const [x, y] = coordToPixel(lng, lat, transformedBounds, width, height, 40);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      const color = segment.safety_color || getSafetyColor(segment.safety_score);
      const isHovered = hoveredSegment && hoveredSegment.id === segment.id;
      
      ctx.strokeStyle = color;
      ctx.lineWidth = isHovered ? 10 : 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = isHovered ? 1 : 0.8;
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (segment.safety_score < 60 && segment.coordinates.length > 0) {
        const [firstLng, firstLat] = segment.coordinates[0];
        const [fx, fy] = coordToPixel(firstLng, firstLat, transformedBounds, width, height, 40);
        
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(fx, fy, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', fx, fy);
      }
    }

    if (routeSegments && routeSegments.length > 0) {
      ctx.setLineDash([15, 5]);
      
      for (const segment of routeSegments) {
        if (!segment.coordinates || segment.coordinates.length < 2) continue;

        ctx.beginPath();
        for (let i = 0; i < segment.coordinates.length; i++) {
          const [lng, lat] = segment.coordinates[i];
          const [x, y] = coordToPixel(lng, lat, transformedBounds, width, height, 40);
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        const color = getSafetyColor(segment.safety_score);
        ctx.strokeStyle = color;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.9;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      
      ctx.setLineDash([]);
    }

    if (startPoint) {
      const [sx, sy] = coordToPixel(startPoint[0], startPoint[1], transformedBounds, width, height, 40);
      
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(sx, sy, 10, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', sx, sy);
    }

    if (endPoint) {
      const [ex, ey] = coordToPixel(endPoint[0], endPoint[1], transformedBounds, width, height, 40);
      
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(ex, ey, 10, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('E', ex, ey);
    }

    if (hoveredSegment) {
      const coords = hoveredSegment.coordinates;
      if (coords && coords.length > 0) {
        const [lng, lat] = coords[Math.floor(coords.length / 2)];
        const [x, y] = coordToPixel(lng, lat, transformedBounds, width, height, 40);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x - 80, y - 50, 160, 45);
        ctx.strokeStyle = hoveredSegment.safety_color || getSafetyColor(hoveredSegment.safety_score);
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 80, y - 50, 160, 45);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(hoveredSegment.road_name || '未知道路', x, y - 32);
        
        ctx.font = '11px sans-serif';
        ctx.fillStyle = hoveredSegment.safety_color || getSafetyColor(hoveredSegment.safety_score);
        ctx.fillText(`安全评分: ${hoveredSegment.safety_score}`, x, y - 17);
        
        ctx.fillStyle = hoveredSegment.has_lighting ? '#22c55e' : '#ef4444';
        ctx.fillText(`路灯: ${hoveredSegment.has_lighting ? '有' : '无'}`, x, y - 2);
      }
    }
  }, [segments, routeSegments, startPoint, endPoint, transformedBounds, dimensions, hoveredSegment]);

  useEffect(() => {
    drawMap();
  }, [drawMap]);

  const findSegmentAtPixel = useCallback((px, py) => {
    if (!segments || segments.length === 0) return null;

    let nearestSegment = null;
    let minDistance = 15;

    for (const segment of segments) {
      if (!segment.coordinates || segment.coordinates.length < 2) continue;

      for (let i = 0; i < segment.coordinates.length - 1; i++) {
        const [lng1, lat1] = segment.coordinates[i];
        const [lng2, lat2] = segment.coordinates[i + 1];
        const [x1, y1] = coordToPixel(lng1, lat1, transformedBounds, dimensions.width, dimensions.height, 40);
        const [x2, y2] = coordToPixel(lng2, lat2, transformedBounds, dimensions.width, dimensions.height, 40);

        const dist = distanceToSegment(px, py, x1, y1, x2, y2);
        if (dist < minDistance) {
          minDistance = dist;
          nearestSegment = segment;
        }
      }
    }

    return nearestSegment;
  }, [segments, transformedBounds, dimensions]);

  const handleMouseMove = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x, y });

    if (isDragging) {
      const dx = dragStart.x - x;
      const dy = dragStart.y - y;
      setOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      setDragStart({ x, y });
      return;
    }

    const segment = findSegmentAtPixel(x, y);
    setHoveredSegment(segment);
    if (onSegmentHover) {
      onSegmentHover(segment);
    }
  }, [isDragging, dragStart, findSegmentAtPixel, onSegmentHover]);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 0) {
      setIsDragging(true);
      const rect = canvasRef.current.getBoundingClientRect();
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setHoveredSegment(null);
    if (onSegmentHover) {
      onSegmentHover(null);
    }
  }, [onSegmentHover]);

  const handleClick = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const segment = findSegmentAtPixel(x, y);
    if (onSegmentClick && segment) {
      onSegmentClick(segment);
    }
  }, [findSegmentAtPixel, onSegmentClick]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.5), 5));
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.3, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.3, 0.5));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onWheel={handleWheel}
        style={{
          display: 'block',
          cursor: isDragging ? 'grabbing' : hoveredSegment ? 'pointer' : 'grab',
        }}
      />

      <div className="canvas-controls" style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '8px',
        padding: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <button
          onClick={handleZoomIn}
          style={{
            padding: '6px 8px',
            border: 'none',
            background: 'transparent',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="放大"
        >
          <ZoomIn size="16" />
        </button>
        <button
          onClick={handleZoomOut}
          style={{
            padding: '6px 8px',
            border: 'none',
            background: 'transparent',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="缩小"
        >
          <ZoomOut size="16" />
        </button>
        <div style={{ height: '1px', background: '#e5e7eb', margin: '2px 0' }} />
        <button
          onClick={handleReset}
          style={{
            padding: '6px 8px',
            border: 'none',
            background: 'transparent',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="重置视图"
        >
          <Move size="16" />
        </button>
      </div>

      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        background: 'rgba(15, 23, 42, 0.8)',
        color: '#94a3b8',
        padding: '6px 10px',
        borderRadius: '4px',
        fontSize: '11px',
      }}>
        <Move size="12" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
        拖拽平移 · 滚轮缩放 · 悬停查看详情
      </div>

      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        background: 'rgba(245, 158, 11, 0.9)',
        color: '#fff',
        padding: '6px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        🗺️ Canvas 模拟模式
      </div>
    </div>
  );
};

export default CanvasMap;
export { getSafetyColor, coordToPixel, pixelToCoord };
