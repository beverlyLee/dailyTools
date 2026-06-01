export class LogChart {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dataPoints: { time: number; value: number }[] = [];
  private maxDataPoints: number = 300;
  private width: number;
  private height: number;
  private readonly minLogValue: number = -4;
  private readonly maxLogValue: number = 2;
  private readonly logLabels: number[] = [-4, -2, 0, 2];
  private frameCount: number = 0;
  private initialDivergence: number = 0.0014;
  private lyapunovExponent: number = 0.35;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }

  public addPoint(time: number, value: number): void {
    const logValue = Math.log10(Math.max(value, 1e-6));

    this.dataPoints.push({ time, value: logValue });
    
    if (this.dataPoints.length > this.maxDataPoints) {
      this.dataPoints.shift();
    }
  }

  public clear(): void {
    this.dataPoints = [];
    this.frameCount = 0;
    this.draw();
  }

  public draw(): void {
    this.frameCount++;
    const ctx = this.ctx;
    const padding = { left: 36, right: 12, top: 12, bottom: 22 };
    const chartWidth = this.width - padding.left - padding.right;
    const chartHeight = this.height - padding.top - padding.bottom;
    const logRange = this.maxLogValue - this.minLogValue;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= logRange; i++) {
      const y = padding.top + chartHeight * (1 - i / logRange);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(this.width - padding.right, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    const xTicks = [0, 10, 20, 30];
    for (const tick of xTicks) {
      const x = padding.left + (tick / 30) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, this.height - padding.bottom);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.setLineDash([3, 3]);
    const zeroY = padding.top + chartHeight * (1 - (0 - this.minLogValue) / logRange);
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(this.width - padding.right, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(255, 170, 0, 0.35)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    const logInit = Math.log10(this.initialDivergence);
    const y0 = padding.top + chartHeight * (1 - (logInit - this.minLogValue) / logRange);
    const y30 = padding.top + chartHeight * (1 - (logInit + this.lyapunovExponent * 30 / Math.log(10) - this.minLogValue) / logRange);
    ctx.beginPath();
    ctx.moveTo(padding.left, Math.max(padding.top, Math.min(this.height - padding.bottom, y0)));
    ctx.lineTo(this.width - padding.right, Math.max(padding.top, Math.min(this.height - padding.bottom, y30)));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255, 170, 0, 0.5)';
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('λ≈0.35', padding.left + 4, y0 - 4);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    
    for (const label of this.logLabels) {
      const y = padding.top + chartHeight * (1 - (label - this.minLogValue) / logRange);
      ctx.fillText(`10^${label}`, padding.left - 4, y + 3);
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.textAlign = 'center';
    for (const tick of xTicks) {
      const x = padding.left + (tick / 30) * chartWidth;
      ctx.fillText(`${tick}`, x, this.height - padding.bottom + 12);
    }

    if (this.dataPoints.length >= 2) {
      const maxTime = Math.max(30, this.dataPoints[this.dataPoints.length - 1].time);
      const xScale = chartWidth / maxTime;
      const yScale = chartHeight / logRange;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 1; i < this.dataPoints.length; i++) {
        const dp0 = this.dataPoints[i - 1];
        const dp = this.dataPoints[i];
        
        const x0 = padding.left + dp0.time * xScale;
        const y0 = padding.top + chartHeight - (dp0.value - this.minLogValue) * yScale;
        const x1 = padding.left + dp.time * xScale;
        const y1 = padding.top + chartHeight - (dp.value - this.minLogValue) * yScale;

        const progress = i / this.dataPoints.length;
        const hue = 220 - progress * 200;
        
        ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.9)`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();

        ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.4)`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }

      const lastDp = this.dataPoints[this.dataPoints.length - 1];
      const lastX = padding.left + lastDp.time * xScale;
      const lastY = padding.top + chartHeight - (lastDp.value - this.minLogValue) * yScale;

      const pulseSize = 3 + Math.sin(this.frameCount * 0.15) * 2;

      const glowGradient = ctx.createRadialGradient(lastX, lastY, 0, lastX, lastY, 14);
      glowGradient.addColorStop(0, 'rgba(255, 80, 80, 0.6)');
      glowGradient.addColorStop(0.5, 'rgba(255, 80, 80, 0.2)');
      glowGradient.addColorStop(1, 'rgba(255, 80, 80, 0)');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(lastX, lastY, pulseSize + 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'hsl(20, 100%, 60%)';
      ctx.beginPath();
      ctx.arc(lastX, lastY, pulseSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(lastX - pulseSize * 0.3, lastY - pulseSize * 0.3, pulseSize * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('t (s)', this.width / 2, this.height - 5);
  }
}
