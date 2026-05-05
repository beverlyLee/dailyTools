<script>
  export let currentTool
  export let onToolChange

  const shapes = [
    { id: 'triangle', label: '三角形', icon: '△', description: '绘制任意三角形' },
    { id: 'right-triangle', label: '直角三角形', icon: '⊿', description: '绘制直角三角形' },
    { id: 'equilateral', label: '等边三角形', icon: '▲', description: '绘制等边三角形' },
    { id: 'rectangle', label: '矩形', icon: '▭', description: '绘制矩形' },
    { id: 'square', label: '正方形', icon: '□', description: '绘制正方形' },
    { id: 'circle', label: '圆形', icon: '○', description: '绘制圆形' },
    { id: 'ellipse', label: '椭圆', icon: '⬭', description: '绘制椭圆' },
    { id: 'arc', label: '圆弧', icon: '⌒', description: '绘制圆弧' },
    { id: 'angle', label: '角', icon: '∠', description: '绘制角' },
    { id: 'parallel', label: '平行线', icon: '∥', description: '绘制平行线' },
    { id: 'perpendicular', label: '垂线', icon: '⊥', description: '绘制垂线' },
    { id: 'polygon', label: '多边形', icon: '⬡', description: '绘制多边形' },
  ]

  const helperTools = [
    { id: 'ruler', label: '标尺', icon: '📏', description: '显示距离标尺' },
    { id: 'protractor', label: '量角器', icon: '📐', description: '显示角度量角器' },
    { id: 'grid', label: '网格', icon: '⊞', description: '显示坐标网格' },
    { id: 'coordinates', label: '坐标', icon: '📍', description: '显示点坐标' },
  ]

  let showGrid = false
  let showCoordinates = false

  function toggleGrid() {
    showGrid = !showGrid
    window.dispatchEvent(new CustomEvent('whiteboard-toggle-grid', { 
      detail: { show: showGrid } 
    }))
  }

  function toggleCoordinates() {
    showCoordinates = !showCoordinates
    window.dispatchEvent(new CustomEvent('whiteboard-toggle-coordinates', { 
      detail: { show: showCoordinates } 
    }))
  }
</script>

<style>
  .geometry-panel {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 12px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;
  }

  .shapes-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 20px;
  }

  .shape-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px 8px;
    border: 2px solid #e5e7eb;
    border-radius: 10px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 12px;
    color: #374151;
  }

  .shape-btn:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .shape-btn.active {
    border-color: #3b82f6;
    background: #dbeafe;
    color: #1d4ed8;
  }

  .shape-icon {
    font-size: 28px;
    margin-bottom: 6px;
  }

  .shape-label {
    font-size: 11px;
    font-weight: 500;
  }

  .helpers-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .helper-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 13px;
    color: #374151;
  }

  .helper-btn:hover {
    border-color: #d1d5db;
    background: #f9fafb;
  }

  .helper-btn.active {
    border-color: #3b82f6;
    background: #eff6ff;
    color: #1d4ed8;
  }

  .helper-icon {
    font-size: 18px;
  }

  .tips-section {
    margin-top: 20px;
    padding: 12px;
    background: #f9fafb;
    border-radius: 8px;
    border-left: 3px solid #3b82f6;
  }

  .tips-title {
    font-size: 13px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
  }

  .tips-list {
    margin: 0;
    padding-left: 16px;
    font-size: 12px;
    color: #6b7280;
    line-height: 1.6;
  }

  .tips-list li {
    margin-bottom: 4px;
  }
</style>

<div class="geometry-panel">
  <h3 class="section-title">几何图形</h3>
  <div class="shapes-grid">
    {#each shapes as shape}
      <button
        class="shape-btn {currentTool === shape.id ? 'active' : ''}"
        on:click={() => onToolChange(shape.id)}
        title={shape.description}
      >
        <span class="shape-icon">{shape.icon}</span>
        <span class="shape-label">{shape.label}</span>
      </button>
    {/each}
  </div>

  <h3 class="section-title">辅助工具</h3>
  <div class="helpers-grid">
    {#each helperTools as tool}
      <button
        class="helper-btn {(tool.id === 'grid' && showGrid) || (tool.id === 'coordinates' && showCoordinates) ? 'active' : ''}"
        on:click={() => {
          if (tool.id === 'grid') toggleGrid()
          else if (tool.id === 'coordinates') toggleCoordinates()
          else onToolChange(tool.id)
        }}
        title={tool.description}
      >
        <span class="helper-icon">{tool.icon}</span>
        <span>{tool.label}</span>
      </button>
    {/each}
  </div>

  <div class="tips-section">
    <div class="tips-title">使用提示</div>
    <ul class="tips-list">
      <li>选择图形后在画布上点击拖动绘制</li>
      <li>按住 Shift 可绘制正图形（如正方形、正圆）</li>
      <li>网格辅助可帮助精确定位</li>
      <li>坐标功能显示点的精确位置</li>
    </ul>
  </div>
</div>
