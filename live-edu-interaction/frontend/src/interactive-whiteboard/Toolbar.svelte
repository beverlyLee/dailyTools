<script>
  export let currentTool
  export let currentColor
  export let currentStrokeWidth
  export let onToolChange
  export let onColorChange
  export let onStrokeWidthChange
  export let onToggleGeometry
  export let onToggleMath

  const tools = [
    { id: 'pen', label: '画笔', icon: '✏️' },
    { id: 'eraser', label: '橡皮擦', icon: '🧽' },
    { id: 'text', label: '文字', icon: 'T' },
    { id: 'line', label: '直线', icon: '─' },
    { id: 'arrow', label: '箭头', icon: '➜' },
    { id: 'rectangle', label: '矩形', icon: '▭' },
    { id: 'circle', label: '圆形', icon: '○' },
  ]

  const colors = [
    '#000000', '#ef4444', '#f97316', '#eab308', 
    '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'
  ]

  const strokeWidths = [2, 4, 6, 8, 10, 15, 20]

  function undo() {
    // 撤销操作
    window.dispatchEvent(new CustomEvent('whiteboard-undo'))
  }

  function redo() {
    // 重做操作
    window.dispatchEvent(new CustomEvent('whiteboard-redo'))
  }

  function clear() {
    if (confirm('确定要清空画布吗？')) {
      window.dispatchEvent(new CustomEvent('whiteboard-clear'))
    }
  }
</script>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tool-group {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    border-right: 1px solid #e0e0e0;
  }

  .tool-group:last-child {
    border-right: none;
  }

  .tool-btn {
    width: 36px;
    height: 36px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all 0.2s;
    position: relative;
  }

  .tool-btn:hover {
    background: #f0f0f0;
  }

  .tool-btn.active {
    background: #e3f2fd;
    color: #1976d2;
    box-shadow: inset 0 0 0 2px #2196f3;
  }

  .tool-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tool-btn .tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s;
    margin-bottom: 4px;
    z-index: 1000;
  }

  .tool-btn:hover .tooltip {
    opacity: 1;
    visibility: visible;
  }

  .color-picker {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .color-btn {
    width: 24px;
    height: 24px;
    border: 2px solid transparent;
    border-radius: 50%;
    cursor: pointer;
    padding: 0;
  }

  .color-btn.active {
    border-color: #333;
    box-shadow: 0 0 0 2px white, 0 0 0 4px #333;
  }

  .stroke-select {
    padding: 4px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
  }

  .action-btn {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  }

  .action-btn:hover {
    background: #f5f5f5;
  }

  .action-btn.danger {
    color: #ef4444;
    border-color: #ef4444;
  }

  .action-btn.danger:hover {
    background: #fef2f2;
  }

  .special-btn {
    padding: 6px 12px;
    border: 1px solid #3b82f6;
    border-radius: 4px;
    background: #eff6ff;
    color: #3b82f6;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .special-btn:hover {
    background: #dbeafe;
  }
</style>

<div class="toolbar">
  <div class="tool-group">
    {#each tools as tool}
      <button
        class="tool-btn {currentTool === tool.id ? 'active' : ''}"
        on:click={() => onToolChange(tool.id)}
        title={tool.label}
      >
        {tool.icon}
        <span class="tooltip">{tool.label}</span>
      </button>
    {/each}
  </div>

  <div class="tool-group">
    <button class="special-btn" on:click={onToggleGeometry}>
      📐 几何
    </button>
    <button class="special-btn" on:click={onToggleMath}>
      ∑ 公式
    </button>
  </div>

  <div class="tool-group">
    <div class="color-picker">
      {#each colors as color}
        <button
          class="color-btn {currentColor === color ? 'active' : ''}"
          style="background-color: {color};"
          on:click={() => onColorChange(color)}
        />
      {/each}
    </div>
  </div>

  <div class="tool-group">
    <select 
      class="stroke-select"
      bind:value={currentStrokeWidth}
      on:change={(e) => onStrokeWidthChange(parseInt(e.target.value))}
    >
      {#each strokeWidths as width}
        <option value={width}>{width}px</option>
      {/each}
    </select>
  </div>

  <div class="tool-group">
    <button class="action-btn" on:click={undo} title="撤销">↩ 撤销</button>
    <button class="action-btn" on:click={redo} title="重做">↪ 重做</button>
    <button class="action-btn danger" on:click={clear} title="清空">🗑 清空</button>
  </div>
</div>
