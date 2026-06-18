import type { TemperatureRecord, SystemState, ProductInfo, AlertRecord, Report, HandoffDoc } from './types';

const WS_URL = 'ws://localhost:3001';
const API_BASE = 'http://localhost:3001';

class TemperatureChart {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private width: number = 0;
  private height: number = 0;
  private padding = { top: 30, right: 50, bottom: 40, left: 55 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
  }

  draw(data: TemperatureRecord[], threshold: number) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const chartW = this.width - this.padding.left - this.padding.right;
    const chartH = this.height - this.padding.top - this.padding.bottom;

    const temps = data.map(d => d.temperature);
    const minT = Math.min(threshold - 2, ...temps, -5);
    const maxT = Math.max(threshold + 8, ...temps, 15);

    this.drawGrid(minT, maxT, threshold);

    if (data.length < 2) return;

    const maxTime = Math.max(3600, data[data.length - 1].time);
    const xScale = (t: number) => this.padding.left + (t / maxTime) * chartW;
    const yScale = (t: number) => this.padding.top + ((maxT - t) / (maxT - minT)) * chartH;

    ctx.beginPath();
    let started = false;
    for (let i = 0; i < data.length; i++) {
      const x = xScale(data[i].time);
      const y = yScale(data[i].temperature);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineTo(xScale(data[data.length - 1].time), this.padding.top + chartH);
    ctx.lineTo(xScale(data[0].time), this.padding.top + chartH);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    started = false;
    for (let i = 0; i < data.length; i++) {
      const x = xScale(data[i].time);
      const y = yScale(data[i].temperature);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#38bdf8';
    ctx.stroke();

    ctx.beginPath();
    let alertStarted = false;
    let alertStartIdx = -1;
    for (let i = 0; i <= data.length; i++) {
      const isAlert = i < data.length && data[i].isAlert;
      if (isAlert && !alertStarted) {
        alertStarted = true;
        alertStartIdx = i;
      } else if (!isAlert && alertStarted) {
        alertStarted = false;
        const endIdx = i - 1;
        ctx.beginPath();
        for (let j = alertStartIdx; j <= endIdx; j++) {
          const x = xScale(data[j].time);
          const y = yScale(data[j].temperature);
          if (j === alertStartIdx) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ef4444';
        ctx.stroke();

        ctx.beginPath();
        for (let j = alertStartIdx; j <= endIdx; j++) {
          const x = xScale(data[j].time);
          const y = yScale(data[j].temperature);
          if (j === alertStartIdx) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(xScale(data[endIdx].time), yScale(threshold));
        ctx.lineTo(xScale(data[alertStartIdx].time), yScale(threshold));
        ctx.closePath();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fill();
      }
    }

    if (data.length > 0) {
      const last = data[data.length - 1];
      const x = xScale(last.time);
      const y = yScale(last.temperature);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = last.isAlert ? '#ef4444' : '#38bdf8';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private drawGrid(minT: number, maxT: number, threshold: number) {
    const ctx = this.ctx;
    const chartW = this.width - this.padding.left - this.padding.right;
    const chartH = this.height - this.padding.top - this.padding.bottom;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.fillRect(this.padding.left, this.padding.top, chartW, chartH);

    const yScale = (t: number) => this.padding.top + ((maxT - t) / (maxT - minT)) * chartH;

    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = 1;

    const tempStep = 2;
    for (let t = Math.ceil(minT / tempStep) * tempStep; t <= Math.floor(maxT / tempStep) * tempStep; t += tempStep) {
      const y = yScale(t);
      ctx.beginPath();
      ctx.moveTo(this.padding.left, y);
      ctx.lineTo(this.padding.left + chartW, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillText(`${t}°C`, this.padding.left - 8, y + 4);
    }

    const thresholdY = yScale(threshold);
    ctx.beginPath();
    ctx.moveTo(this.padding.left, thresholdY);
    ctx.lineTo(this.padding.left + chartW, thresholdY);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px -apple-system, system-ui, sans-serif';
    ctx.fillText(`阈值 ${threshold}°C`, this.padding.left + chartW + 8, thresholdY + 4);

    const timeStep = 600;
    const maxTime = 3600;
    for (let t = 0; t <= maxTime; t += timeStep) {
      const x = this.padding.left + (t / maxTime) * chartW;
      ctx.beginPath();
      ctx.moveTo(x, this.padding.top);
      ctx.lineTo(x, this.padding.top + chartH);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const mins = Math.floor(t / 60);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${mins}分`, x, this.padding.top + chartH + 22);
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('运输时间', this.padding.left + chartW / 2, this.height - 8);

    ctx.save();
    ctx.translate(14, this.padding.top + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('温度 (°C)', 0, 0);
    ctx.restore();
  }
}

class SignaturePad {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private drawing: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;
  private hasSignature: boolean = false;
  private dpr: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    this.bindEvents();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#38bdf8';
  }

  private bindEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.startDraw(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.stopDraw());
    this.canvas.addEventListener('mouseleave', () => this.stopDraw());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.startDraw(touch as unknown as MouseEvent);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.draw(touch as unknown as MouseEvent);
    });
    this.canvas.addEventListener('touchend', () => this.stopDraw());
  }

  private getPos(e: MouseEvent | Touch) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : 0;
    const clientY = 'clientY' in e ? e.clientY : 0;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  private startDraw(e: MouseEvent | Touch) {
    this.drawing = true;
    this.hasSignature = true;
    const pos = this.getPos(e);
    this.lastX = pos.x;
    this.lastY = pos.y;
  }

  private draw(e: MouseEvent | Touch) {
    if (!this.drawing) return;
    const pos = this.getPos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
    this.lastX = pos.x;
    this.lastY = pos.y;
  }

  private stopDraw() {
    this.drawing = false;
  }

  clear() {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
    this.hasSignature = false;
  }

  isEmpty() {
    return !this.hasSignature;
  }

  toDataURL() {
    return this.canvas.toDataURL('image/png');
  }
}

class ColdChainApp {
  private ws: WebSocket | null = null;
  private chart: TemperatureChart | null = null;
  private signaturePad: SignaturePad | null = null;
  private temperatureHistory: TemperatureRecord[] = [];
  private state: SystemState = {
    currentTemp: 0,
    doorOpen: false,
    refrigerationPower: 800,
    ambientTemp: 30,
    threshold: 0,
    time: 0,
    isAlert: false,
    totalAlertDuration: 0
  };
  private products: Record<string, ProductInfo> = {};
  private selectedProduct: string = 'litchi';
  private audioCtx: AudioContext | null = null;
  private alertOscillator: OscillatorNode | null = null;
  private alertInterval: number | null = null;
  private report: Report | null = null;
  private handoffDoc: HandoffDoc | null = null;

  private els: Record<string, HTMLElement> = {};

  constructor() {
    this.init();
  }

  private init() {
    this.cacheElements();
    this.initChart();
    this.initSignaturePad();
    this.bindEvents();
    this.connectWebSocket();
    this.render();
  }

  private cacheElements() {
    const ids = [
      'tempValue', 'tempStatus', 'doorIndicator', 'alertBanner',
      'alertTitle', 'alertDesc', 'timeElapsed', 'alertDuration',
      'alertCount', 'ambientTemp', 'powerValue', 'connectionStatus',
      'powerSlider', 'ambientSlider', 'doorBtn', 'resetBtn',
      'handoffBtn', 'modal', 'closeModal', 'signatureCanvas',
      'clearSignature', 'submitHandoff', 'receiverName', 'notes',
      'handoffContent', 'productList', 'alertList', 'minTemp',
      'maxTemp', 'avgTemp'
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) this.els[id] = el;
    });
  }

  private initChart() {
    const canvas = document.getElementById('tempChart') as HTMLCanvasElement;
    if (canvas) {
      this.chart = new TemperatureChart(canvas);
    }
  }

  private initSignaturePad() {
    const canvas = document.getElementById('signatureCanvas') as HTMLCanvasElement;
    if (canvas) {
      this.signaturePad = new SignaturePad(canvas);
    }
  }

  private bindEvents() {
    this.els.doorBtn?.addEventListener('click', () => this.toggleDoor());
    this.els.resetBtn?.addEventListener('click', () => this.resetSimulation());
    this.els.handoffBtn?.addEventListener('click', () => this.openHandoffModal());
    this.els.closeModal?.addEventListener('click', () => this.closeHandoffModal());
    this.els.clearSignature?.addEventListener('click', () => this.signaturePad?.clear());
    this.els.submitHandoff?.addEventListener('click', () => this.submitHandoff());

    const powerSlider = this.els.powerSlider as HTMLInputElement;
    powerSlider?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value);
      this.setPower(val);
    });

    const ambientSlider = this.els.ambientSlider as HTMLInputElement;
    ambientSlider?.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value);
      this.setAmbientTemp(val);
    });

    this.els.modal?.addEventListener('click', (e) => {
      if (e.target === this.els.modal) this.closeHandoffModal();
    });
  }

  private connectWebSocket() {
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      this.updateConnectionStatus(true);
    };

    this.ws.onclose = () => {
      this.updateConnectionStatus(false);
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.ws.onerror = () => {
      this.updateConnectionStatus(false);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleWsMessage(data);
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };
  }

  private handleWsMessage(data: any) {
    switch (data.type) {
      case 'init':
        this.temperatureHistory = data.history || [];
        this.state = { ...this.state, ...data.state };
        this.products = data.products || {};
        this.renderProducts();
        break;
      case 'tick':
        this.temperatureHistory.push(data.record);
        if (this.temperatureHistory.length > 3600) {
          this.temperatureHistory.shift();
        }
        this.state.currentTemp = data.record.temperature;
        this.state.time = data.record.time;
        this.state.isAlert = data.record.isAlert;
        this.state.threshold = data.record.threshold;
        if (this.state.alertHistory && this.state.alertHistory.length > 0) {
          let total = 0;
          for (const alert of this.state.alertHistory) {
            if (alert.ongoing) {
              total += data.record.time - alert.startTime;
            } else if (alert.endTime !== null) {
              total += alert.endTime - alert.startTime;
            }
          }
          this.state.totalAlertDuration = total;
        }
        break;
      case 'state':
        this.state = { ...this.state, ...data };
        break;
    }
    this.render();
  }

  private renderProducts() {
    const list = this.els.productList;
    if (!list) return;
    list.innerHTML = '';
    Object.entries(this.products).forEach(([key, info]) => {
      const btn = document.createElement('button');
      btn.className = `product-btn ${key === this.selectedProduct ? 'active' : ''}`;
      btn.innerHTML = `${info.name}<small>阈值 ≤ ${info.threshold}°C</small>`;
      btn.addEventListener('click', () => this.selectProduct(key));
      list.appendChild(btn);
    });
  }

  private selectProduct(key: string) {
    this.selectedProduct = key;
    this.renderProducts();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'product', productKey: key }));
    }
  }

  private toggleDoor() {
    const newState = !this.state.doorOpen;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'door', open: newState }));
    }
  }

  private setPower(power: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'power', power }));
    }
  }

  private setAmbientTemp(temp: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'ambient', temp }));
    }
  }

  private resetSimulation() {
    this.temperatureHistory = [];
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'reset' }));
    }
    this.stopAlertSound();
  }

  private updateConnectionStatus(connected: boolean) {
    const el = this.els.connectionStatus;
    if (!el) return;
    el.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
    el.innerHTML = `<span class="connection-dot"></span>${connected ? '已连接' : '连接中断'}`;
  }

  private async openHandoffModal() {
    try {
      const res = await fetch(`${API_BASE}/api/report`);
      this.report = await res.json();
    } catch (e) {
      console.error('Fetch report error:', e);
    }
    this.renderHandoffForm();
    this.els.modal?.classList.remove('hidden');
    setTimeout(() => this.signaturePad?.resize(), 100);
  }

  private closeHandoffModal() {
    this.els.modal?.classList.add('hidden');
    this.handoffDoc = null;
    (this.els.receiverName as HTMLInputElement).value = '';
    (this.els.notes as HTMLInputElement).value = '';
    this.signaturePad?.clear();
  }

  private renderHandoffForm() {
    const content = this.els.handoffContent;
    if (!content || !this.report) return;
    const r = this.report;

    content.innerHTML = `
      <div class="report-summary">
        <div class="verdict-badge ${r.isQualified ? 'pass' : 'fail'}">
          ${r.isQualified ? '✓ 验收合格' : '✗ 验收不合格'}
        </div>
        <div class="time-info">
          运输总时长: ${this.formatDuration(r.totalDuration)} · 
          温度越界: ${r.alertCount} 次 · 
          越界累计: ${this.formatDuration(r.alertDuration)} (${r.alertDurationPercent.toFixed(1)}%)
        </div>
        <div class="report-stats">
          <div class="report-stat">
            <div class="report-stat-label">最高温度</div>
            <div class="report-stat-value ${r.maxTemp > r.threshold ? 'danger' : ''}">${r.maxTemp.toFixed(1)}°C</div>
          </div>
          <div class="report-stat">
            <div class="report-stat-label">最低温度</div>
            <div class="report-stat-value">${r.minTemp.toFixed(1)}°C</div>
          </div>
          <div class="report-stat">
            <div class="report-stat-label">平均温度</div>
            <div class="report-stat-value ${r.avgTemp > r.threshold ? 'danger' : ''}">${r.avgTemp.toFixed(1)}°C</div>
          </div>
        </div>
      </div>
    `;
  }

  private async submitHandoff() {
    if (!this.report) return;
    const name = (this.els.receiverName as HTMLInputElement).value.trim();
    const notes = (this.els.notes as HTMLInputElement).value.trim();

    if (!name) {
      alert('请输入收货人姓名');
      return;
    }
    if (this.signaturePad?.isEmpty()) {
      alert('请进行电子签名');
      return;
    }

    const signature = this.signaturePad?.toDataURL() || '';

    try {
      const res = await fetch(`${API_BASE}/api/handoff/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature, receiverName: name, notes })
      });
      const data = await res.json();
      if (data.success) {
        this.handoffDoc = data.handoffDoc;
        this.renderHandoffDone();
      }
    } catch (e) {
      console.error('Submit handoff error:', e);
    }
  }

  private renderHandoffDone() {
    const content = this.els.handoffContent;
    if (!content || !this.handoffDoc || !this.report) return;
    const doc = this.handoffDoc;
    const r = doc.report;

    content.innerHTML = `
      <div class="report-summary">
        <div class="verdict-badge ${r.isQualified ? 'pass' : 'fail'}">
          ${r.isQualified ? '✓ 验收合格' : '✗ 验收不合格'}
        </div>
        <div class="time-info">
          运输总时长: ${this.formatDuration(r.totalDuration)} · 
          越界累计: ${this.formatDuration(r.alertDuration)}
        </div>
        <div class="report-stats">
          <div class="report-stat">
            <div class="report-stat-label">最高温度</div>
            <div class="report-stat-value">${r.maxTemp.toFixed(1)}°C</div>
          </div>
          <div class="report-stat">
            <div class="report-stat-label">最低温度</div>
            <div class="report-stat-value">${r.minTemp.toFixed(1)}°C</div>
          </div>
          <div class="report-stat">
            <div class="report-stat-label">平均温度</div>
            <div class="report-stat-value">${r.avgTemp.toFixed(1)}°C</div>
          </div>
        </div>
      </div>
      <div style="margin-bottom: 16px;">
        <div class="form-label">收货人</div>
        <div style="font-size: 15px; color: #e2e8f0; padding: 8px 0;">${doc.receiverName}</div>
      </div>
      ${doc.notes ? `
      <div style="margin-bottom: 16px;">
        <div class="form-label">备注</div>
        <div style="font-size: 14px; color: #cbd5e1; padding: 8px 0;">${doc.notes}</div>
      </div>
      ` : ''}
      <div style="margin-bottom: 16px;">
        <div class="form-label">电子签名</div>
        <img src="${doc.signature}" style="max-width: 100%; max-height: 120px; background: rgba(15,23,42,0.6); border-radius: 8px; padding: 12px;" />
      </div>
      <div class="handoff-footer">
        <div>
          <div class="doc-id">交接单号: ${doc.id}</div>
          <div class="doc-id">生成时间: ${new Date(doc.timestamp).toLocaleString('zh-CN')}</div>
        </div>
        <div class="hash-display">HASH: ${doc.hash}</div>
      </div>
    `;

    this.els.submitHandoff.style.display = 'none';
    this.els.clearSignature.style.display = 'none';
    const sigPad = document.getElementById('signaturePadContainer');
    if (sigPad) sigPad.style.display = 'none';
    const nameInput = document.getElementById('nameInputContainer');
    if (nameInput) nameInput.style.display = 'none';
    const notesInput = document.getElementById('notesInputContainer');
    if (notesInput) notesInput.style.display = 'none';
  }

  private playAlertSound() {
    if (this.alertInterval) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const beep = () => {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.frequency.value = 880;
        osc.type = 'square';
        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.2);
      };
      beep();
      this.alertInterval = window.setInterval(beep, 800);
    } catch (e) {
      console.warn('Audio not supported:', e);
    }
  }

  private stopAlertSound() {
    if (this.alertInterval) {
      clearInterval(this.alertInterval);
      this.alertInterval = null;
    }
  }

  private formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}小时${m}分${s}秒`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  }

  private renderAlertList() {
    const list = this.els.alertList;
    if (!list) return;
    const alerts = this.state.alertHistory || [];
    if (alerts.length === 0) {
      list.innerHTML = '<div style="color: #64748b; font-size: 13px; text-align: center; padding: 20px 0;">暂无温度越界记录</div>';
      return;
    }
    list.innerHTML = alerts.slice(-5).reverse().map((a, idx) => `
      <div class="alert-item">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="alert-item-time">#${alerts.length - idx} ${a.ongoing ? '进行中...' : '已结束'}</span>
          <span class="alert-item-temp">峰值 ${a.maxTemp.toFixed(1)}°C</span>
        </div>
        <div class="alert-item-time" style="margin-top: 4px;">
          持续: ${this.formatDuration((a.endTime || this.state.time) - a.startTime)}
        </div>
      </div>
    `).join('');
  }

  private render() {
    if (this.els.tempValue) {
      this.els.tempValue.textContent = this.state.currentTemp.toFixed(1);
      this.els.tempValue.className = `temp-value ${this.state.isAlert ? 'alert' : ''}`;
    }

    if (this.els.tempStatus) {
      this.els.tempStatus.textContent = this.state.isAlert ? '温度超标' : '温度正常';
      this.els.tempStatus.className = `temp-status ${this.state.isAlert ? 'alert' : 'normal'}`;
    }

    if (this.els.doorIndicator) {
      this.els.doorIndicator.className = `door-indicator ${this.state.doorOpen ? 'open' : 'closed'}`;
      this.els.doorIndicator.innerHTML = `<span class="door-dot"></span>车门${this.state.doorOpen ? '已开启' : '已关闭'}`;
    }

    if (this.els.alertBanner) {
      if (this.state.isAlert) {
        this.els.alertBanner.classList.remove('hidden');
        this.els.alertTitle.textContent = '⚠️ 温度越界警报';
        this.els.alertDesc.textContent = `当前 ${this.state.currentTemp.toFixed(1)}°C 超过阈值 ${this.state.threshold}°C，请立即检查！`;
        this.playAlertSound();
      } else {
        this.els.alertBanner.classList.add('hidden');
        this.stopAlertSound();
      }
    }

    if (this.els.timeElapsed) {
      this.els.timeElapsed.textContent = this.formatDuration(this.state.time);
    }

    if (this.els.alertDuration) {
      this.els.alertDuration.textContent = this.formatDuration(this.state.totalAlertDuration);
      this.els.alertDuration.className = `stat-value ${this.state.totalAlertDuration > 0 ? 'danger' : 'success'}`;
    }

    if (this.els.alertCount) {
      const count = (this.state.alertHistory || []).length;
      this.els.alertCount.textContent = String(count);
      this.els.alertCount.className = `stat-value ${count > 0 ? 'danger' : 'success'}`;
    }

    if (this.els.ambientTemp) {
      this.els.ambientTemp.textContent = `${this.state.ambientTemp.toFixed(0)}°C`;
    }

    if (this.els.powerValue) {
      this.els.powerValue.textContent = `${this.state.refrigerationPower}W`;
    }

    if (this.els.minTemp && this.temperatureHistory.length > 0) {
      const min = Math.min(...this.temperatureHistory.map(r => r.temperature));
      this.els.minTemp.textContent = `${min.toFixed(1)}°C`;
    }

    if (this.els.maxTemp && this.temperatureHistory.length > 0) {
      const max = Math.max(...this.temperatureHistory.map(r => r.temperature));
      this.els.maxTemp.textContent = `${max.toFixed(1)}°C`;
      this.els.maxTemp.className = `stat-value ${max > this.state.threshold ? 'danger' : ''}`;
    }

    if (this.els.avgTemp && this.temperatureHistory.length > 0) {
      const avg = this.temperatureHistory.reduce((s, r) => s + r.temperature, 0) / this.temperatureHistory.length;
      this.els.avgTemp.textContent = `${avg.toFixed(1)}°C`;
      this.els.avgTemp.className = `stat-value ${avg > this.state.threshold ? 'danger' : ''}`;
    }

    const powerSlider = this.els.powerSlider as HTMLInputElement;
    if (powerSlider && document.activeElement !== powerSlider) {
      powerSlider.value = String(this.state.refrigerationPower);
    }
    const ambientSlider = this.els.ambientSlider as HTMLInputElement;
    if (ambientSlider && document.activeElement !== ambientSlider) {
      ambientSlider.value = String(this.state.ambientTemp);
    }

    if (this.els.doorBtn) {
      this.els.doorBtn.textContent = this.state.doorOpen ? '关闭车门' : '开启车门';
      this.els.doorBtn.className = `btn ${this.state.doorOpen ? 'btn-danger' : 'btn-success'}`;
    }

    this.chart?.draw(this.temperatureHistory, this.state.threshold);
    this.renderAlertList();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ColdChainApp();
});
