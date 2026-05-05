import React, { useEffect, useRef, useCallback } from 'react';
import { vorticityToColor, velocityToColor } from '../utils/dataUtils';

const SimulationCanvas = ({ 
  simulationState, 
  gridWidth, 
  gridHeight, 
  renderMode = 'vorticity',
  vectorDensity = 8,
  width = 800,
  height = 400
}) => {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !simulationState) return;

    const ctx = canvas.getContext('2d');
    const scaleX = width / gridWidth;
    const scaleY = height / gridHeight;

    ctx.clearRect(0, 0, width, height);

    const { vorticity, velocity, obstacle } = simulationState;

    if (renderMode === 'vorticity' || renderMode === 'both') {
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;

      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const gridX = Math.floor(x / scaleX);
          const gridY = Math.floor(y / scaleY);
          
          const clampedX = Math.min(Math.max(gridX, 0), gridWidth - 1);
          const clampedY = Math.min(Math.max(gridY, 0), gridHeight - 1);

          const idx = (y * width + x) * 4;

          if (obstacle[clampedX][clampedY] === 1) {
            data[idx] = 50;
            data[idx + 1] = 50;
            data[idx + 2] = 50;
            data[idx + 3] = 255;
          } else {
            const vort = vorticity[clampedX][clampedY];
            const color = vorticityToColor(vort, -0.08, 0.08);
            data[idx] = color.r;
            data[idx + 1] = color.g;
            data[idx + 2] = color.b;
            data[idx + 3] = 255;
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    if (renderMode === 'velocity') {
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;

      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const gridX = Math.floor(x / scaleX);
          const gridY = Math.floor(y / scaleY);
          
          const clampedX = Math.min(Math.max(gridX, 0), gridWidth - 1);
          const clampedY = Math.min(Math.max(gridY, 0), gridHeight - 1);

          const idx = (y * width + x) * 4;

          if (obstacle[clampedX][clampedY] === 1) {
            data[idx] = 50;
            data[idx + 1] = 50;
            data[idx + 2] = 50;
            data[idx + 3] = 255;
          } else {
            const [ux, uy] = velocity[clampedX][clampedY];
            const color = velocityToColor(ux, uy, 0.3);
            data[idx] = color.r;
            data[idx + 1] = color.g;
            data[idx + 2] = color.b;
            data[idx + 3] = 255;
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    if (renderMode === 'velocity' || renderMode === 'both') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;

      for (let x = 0; x < gridWidth; x += vectorDensity) {
        for (let y = 0; y < gridHeight; y += vectorDensity) {
          if (obstacle[x][y] === 1) continue;

          const [ux, uy] = velocity[x][y];
          const speed = Math.sqrt(ux * ux + uy * uy);
          
          if (speed < 0.001) continue;

          const startX = x * scaleX + scaleX / 2;
          const startY = y * scaleY + scaleY / 2;
          
          const arrowLength = Math.min(speed * 200, 20);
          const angle = Math.atan2(uy, ux);
          
          const endX = startX + Math.cos(angle) * arrowLength;
          const endY = startY + Math.sin(angle) * arrowLength;

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          const headLength = 4;
          const headAngle = Math.PI / 6;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headLength * Math.cos(angle - headAngle),
            endY - headLength * Math.sin(angle - headAngle)
          );
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headLength * Math.cos(angle + headAngle),
            endY - headLength * Math.sin(angle + headAngle)
          );
          ctx.stroke();
        }
      }
    }

    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(0, 0, width, height);

  }, [simulationState, gridWidth, gridHeight, renderMode, vectorDensity, width, height]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        border: '1px solid #d9d9d9',
        borderRadius: '4px',
        background: '#f5f5f5'
      }}
    />
  );
};

export default SimulationCanvas;
