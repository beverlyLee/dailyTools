import { useEffect, useRef } from "react";

interface WaveformDisplayProps {
  waveformData: number[];
  color?: string;
  label?: string;
  height?: number;
}

export function WaveformDisplay({
  waveformData,
  color = "#3b82f6",
  label,
  height = 80,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, height);

    const barWidth = rect.width / waveformData.length;
    const centerY = height / 2;

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;

    waveformData.forEach((value, index) => {
      const barHeight = value * (height * 0.8);
      const x = index * barWidth;
      const y = centerY - barHeight / 2;

      ctx.fillRect(x, y, Math.max(barWidth - 1, 1), barHeight);
    });

    ctx.globalAlpha = 1;
  }, [waveformData, color, height]);

  return (
    <div className="w-full">
      {label && (
        <div className="text-sm text-gray-600 mb-1 font-medium">{label}</div>
      )}
      <div className="w-full bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: `${height}px` }}
        />
      </div>
    </div>
  );
}

export default WaveformDisplay;
