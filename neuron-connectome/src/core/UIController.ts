import type { NeuronData } from '../neurons/NeuronCell'

export interface UIState {
  selectedNeuron: NeuronData | null
  impulseActive: boolean
  neuronCount: number
  connectionCount: number
  fps: number
}

export class UIController {
  private container: HTMLElement
  private helpPanel: HTMLElement
  private infoPanel: HTMLElement
  private titleElement: HTMLElement
  private state: UIState

  constructor(container: HTMLElement) {
    this.container = container
    this.state = {
      selectedNeuron: null,
      impulseActive: false,
      neuronCount: 0,
      connectionCount: 0,
      fps: 60
    }

    this.helpPanel = this.createHelpPanel()
    this.infoPanel = this.createInfoPanel()
    this.titleElement = this.createTitle()

    this.container.appendChild(this.titleElement)
    this.container.appendChild(this.helpPanel)
    this.container.appendChild(this.infoPanel)
  }

  private createTitle(): HTMLElement {
    const title = document.createElement('div')
    title.style.cssText = `
      position: absolute;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: #00f0ff;
      letter-spacing: 4px;
      text-transform: uppercase;
      text-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
      pointer-events: none;
      z-index: 100;
    `
    title.innerHTML = `
      <span style="color: #8b5cf6;">NEURON</span>
      <span style="color: #00f0ff;">CONNECTOME</span>
    `
    return title
  }

  private createHelpPanel(): HTMLElement {
    const panel = document.createElement('div')
    panel.style.cssText = `
      position: absolute;
      top: 24px;
      left: 24px;
      background: rgba(10, 14, 39, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 12px;
      padding: 20px 24px;
      font-family: 'Segoe UI', system-ui, sans-serif;
      color: #e2e8f0;
      font-size: 13px;
      line-height: 1.8;
      z-index: 100;
      min-width: 200px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `

    panel.innerHTML = `
      <div style="font-size: 11px; color: #6366f1; letter-spacing: 2px; margin-bottom: 12px; font-weight: 600; text-transform: uppercase;">
        操作指南
      </div>
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
        <span style="width: 60px; color: #94a3b8;">🖱️ 左键</span>
        <span>点击神经元触发信号</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
        <span style="width: 60px; color: #94a3b8;">🔄 拖动</span>
        <span>旋转视角</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
        <span style="width: 60px; color: #94a3b8;">🔍 滚轮</span>
        <span>缩放视图</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="width: 60px; color: #94a3b8;">➡️ 右键</span>
        <span>平移视图</span>
      </div>
      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(99, 102, 241, 0.2);">
        <div style="color: #64748b; font-size: 11px;">
          <span style="display: inline-block; width: 8px; height: 8px; background: #00f0ff; border-radius: 50%; margin-right: 6px; box-shadow: 0 0 8px #00f0ff;"></span>
          激活的神经元
        </div>
        <div style="color: #64748b; font-size: 11px; margin-top: 4px;">
          <span style="display: inline-block; width: 8px; height: 8px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 50%; margin-right: 6px;"></span>
          静息神经元
        </div>
      </div>
    `

    return panel
  }

  private createInfoPanel(): HTMLElement {
    const panel = document.createElement('div')
    panel.style.cssText = `
      position: absolute;
      bottom: 24px;
      right: 24px;
      background: rgba(10, 14, 39, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 12px;
      padding: 20px 24px;
      font-family: 'IBM Plex Mono', 'Consolas', monospace;
      color: #e2e8f0;
      font-size: 12px;
      line-height: 1.8;
      z-index: 100;
      min-width: 220px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `
    this.updateInfoPanel(panel)
    return panel
  }

  private updateInfoPanel(panel: HTMLElement): void {
    const neuron = this.state.selectedNeuron
    const statusColor = this.state.impulseActive ? '#00f0ff' : '#64748b'
    const statusText = this.state.impulseActive ? '信号传递中...' : '等待触发'

    panel.innerHTML = `
      <div style="font-size: 11px; color: #6366f1; letter-spacing: 2px; margin-bottom: 12px; font-weight: 600; text-transform: uppercase;">
        系统状态
      </div>
      
      <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(99, 102, 241, 0.2);">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #94a3b8;">神经元总数</span>
          <span style="color: #a78bfa;">${this.state.neuronCount.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #94a3b8;">轴突连接</span>
          <span style="color: #a78bfa;">${this.state.connectionCount.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #94a3b8;">帧率</span>
          <span style="color: ${this.state.fps >= 50 ? '#22c55e' : this.state.fps >= 30 ? '#f59e0b' : '#ef4444'};">${this.state.fps} FPS</span>
        </div>
      </div>

      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #94a3b8;">信号状态</span>
          <span style="color: ${statusColor}; font-weight: 600;">${statusText}</span>
        </div>
      </div>

      ${neuron ? `
        <div style="padding-top: 12px; border-top: 1px solid rgba(99, 102, 241, 0.2);">
          <div style="font-size: 11px; color: #00f0ff; margin-bottom: 8px; letter-spacing: 1px;">
            ▸ 选中神经元 #${neuron.id}
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #94a3b8;">连接数</span>
            <span style="color: #e2e8f0;">${neuron.connections.length}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #94a3b8;">位置</span>
            <span style="color: #e2e8f0;">(${neuron.position.x.toFixed(1)}, ${neuron.position.y.toFixed(1)}, ${neuron.position.z.toFixed(1)})</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #94a3b8;">激活度</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 60px; height: 4px; background: rgba(99, 102, 241, 0.2); border-radius: 2px; overflow: hidden;">
                <div style="width: ${neuron.activation * 100}%; height: 100%; background: linear-gradient(90deg, #6366f1, #00f0ff); transition: width 0.1s;"></div>
              </div>
              <span style="color: #00f0ff;">${(neuron.activation * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      ` : `
        <div style="padding-top: 12px; border-top: 1px solid rgba(99, 102, 241, 0.2); color: #64748b; text-align: center; font-size: 11px;">
          点击任意神经元查看详情
        </div>
      `}
    `
  }

  updateState(newState: Partial<UIState>): void {
    this.state = { ...this.state, ...newState }
    this.updateInfoPanel(this.infoPanel)
  }

  setSelectedNeuron(neuron: NeuronData | null): void {
    this.state.selectedNeuron = neuron
    this.updateInfoPanel(this.infoPanel)
  }

  setImpulseActive(active: boolean): void {
    this.state.impulseActive = active
    this.updateInfoPanel(this.infoPanel)
  }

  setFPS(fps: number): void {
    this.state.fps = Math.round(fps)
    this.updateInfoPanel(this.infoPanel)
  }

  updateSelectedNeuron(neuron: NeuronData | null): void {
    if (neuron !== null && this.state.selectedNeuron !== null && neuron.id === this.state.selectedNeuron.id) {
      this.state.selectedNeuron = neuron
      this.updateInfoPanel(this.infoPanel)
    }
  }

  dispose(): void {
    this.container.removeChild(this.helpPanel)
    this.container.removeChild(this.infoPanel)
    this.container.removeChild(this.titleElement)
  }
}
