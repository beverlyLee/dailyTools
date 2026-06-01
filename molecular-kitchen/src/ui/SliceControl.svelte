<script>
  export let sliceY = 0.5;

  function handleInput(e) {
    sliceY = parseFloat(e.target.value);
  }
</script>

<div class="control-panel">
  <div class="control-header">
    <h3>切肉控制</h3>
    <span class="value">{(sliceY * 100).toFixed(1)}%</span>
  </div>
  <div class="slider-container">
    <input
      type="range"
      min="0"
      max="1"
      step="0.001"
      value={sliceY}
      on:input={handleInput}
      class="slice-slider"
    />
    <div class="slider-labels">
      <span>底部</span>
      <span>中间</span>
      <span>顶部</span>
    </div>
  </div>
  <div class="info-panel">
    <p>拖动滑块沿 Y 轴切开食物，</p>
    <p>观察内部不规则的纤维状纹理结构。</p>
  </div>
</div>

<style>
  .control-panel {
    position: absolute;
    top: 20px;
    left: 20px;
    background: rgba(20, 20, 25, 0.9);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 102, 0, 0.3);
    border-radius: 12px;
    padding: 20px;
    width: 280px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    z-index: 100;
  }

  .control-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 102, 0, 0.2);
  }

  .control-header h3 {
    color: #ff6600;
    font-size: 16px;
    font-weight: 600;
    margin: 0;
    letter-spacing: 0.5px;
  }

  .value {
    color: #00ff88;
    font-family: 'Courier New', monospace;
    font-size: 18px;
    font-weight: bold;
  }

  .slider-container {
    margin-bottom: 16px;
  }

  .slice-slider {
    width: 100%;
    height: 6px;
    -webkit-appearance: none;
    appearance: none;
    background: linear-gradient(90deg, #1a1a1e, #3a2a1a, #1a1a1e);
    border-radius: 3px;
    outline: none;
    cursor: pointer;
  }

  .slice-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    background: linear-gradient(135deg, #ff6600, #ff8833);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(255, 102, 0, 0.5);
    border: 2px solid rgba(255, 102, 0, 0.8);
    transition: transform 0.15s ease;
  }

  .slice-slider::-webkit-slider-thumb:hover {
    transform: scale(1.15);
  }

  .slice-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    background: linear-gradient(135deg, #ff6600, #ff8833);
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(255, 102, 0, 0.5);
    border: 2px solid rgba(255, 102, 0, 0.8);
  }

  .slider-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-size: 11px;
    color: #888;
  }

  .info-panel {
    background: rgba(255, 102, 0, 0.08);
    border-left: 3px solid #ff6600;
    padding: 10px 12px;
    border-radius: 4px;
  }

  .info-panel p {
    color: #aaa;
    font-size: 12px;
    margin: 2px 0;
    line-height: 1.5;
  }
</style>
