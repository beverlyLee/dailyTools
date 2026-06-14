<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { ProjectorScene } from './scene/ProjectorScene'
  import { projectors, categoryLabels } from './data/projectors'
  import { standardScreens, matchScreen, formatScreenInfo } from './utils/screenMatcher'
  import { 
    calculateProjection, 
    metersToInches,
    calculateDistanceForScreen
  } from './utils/optics'
  import { 
    verifyInstallation, 
    getIdealViewerDistance,
    DEFAULT_VIEWER_EYE_HEIGHT,
    DEFAULT_CEILING_HEIGHT,
    DEFAULT_SCREEN_BOTTOM_HEIGHT
  } from './utils/installation'
  import { analyzeKeystone, getKeystoneSeverity } from './utils/keystone'
  import type { Projector, ScreenSize, ProjectionResult, ScreenMatchResult, InstallationResult, KeystoneResult } from './types'
  
  let container: HTMLElement
  let scene: ProjectorScene | null = null
  
  let selectedProjector: Projector = projectors[3]
  let selectedScreen: ScreenSize | null = standardScreens[2]
  
  let distance = 2.0
  let zoomPosition = 0
  let lensHeight = 0.48
  let horizontalShift = 0
  
  let ceilingHeight = DEFAULT_CEILING_HEIGHT
  let screenBottomHeight = DEFAULT_SCREEN_BOTTOM_HEIGHT
  let viewerEyeHeight = DEFAULT_VIEWER_EYE_HEIGHT
  
  let activeTab = 'projector'
  let showCustomProjector = false
  let customThrowRatio = 1.0
  let customOffset = 0.5
  let customMaxKeystone = 30
  
  $: projectionResult = calculateProjection(
    selectedProjector,
    distance,
    zoomPosition
  )
  
  $: screenMatchResult = matchScreen(projectionResult)
  
  $: installationResult = selectedScreen ? verifyInstallation(
    {
      projectorHeight: lensHeight,
      ceilingHeight,
      screenBottomHeight,
      viewerEyeHeight,
      viewerDistance: distance * 0.6,
      isCeilingMount: false
    },
    selectedProjector,
    selectedScreen,
    distance
  ) : null
  
  $: keystoneResult = analyzeKeystone(
    {
      horizontalShift,
      verticalShift: 0,
      angle: 0,
      maxKeystone: selectedProjector.maxKeystoneAngle
    },
    selectedProjector,
    distance
  )
  
  $: keystoneSeverity = getKeystoneSeverity(keystoneResult.distortionPercentage)
  
  $: idealDistance = selectedScreen 
    ? calculateDistanceForScreen(selectedProjector, selectedScreen.diagonalInches * 0.0254, zoomPosition)
    : 0
  
  $: idealViewerDistance = selectedScreen ? getIdealViewerDistance(selectedScreen) : 0
  
  $: canFillCurrentScreen = selectedScreen 
    ? projectionResult.imageDiagonalInches >= selectedScreen.diagonalInches * 0.95
    : false
  
  function selectProjector(projector: Projector) {
    selectedProjector = projector
    showCustomProjector = false
    if (scene) {
      scene.setProjector(projector)
    }
  }
  
  function selectScreen(screen: ScreenSize) {
    selectedScreen = screen
    if (scene) {
      scene.setScreen(screen)
    }
  }
  
  function updateDistance(value: number) {
    distance = value
    if (scene) {
      scene.setDistance(value)
    }
  }
  
  function updateZoom(value: number) {
    zoomPosition = value
    if (scene) {
      scene.setZoom(value)
    }
  }
  
  function updateLensHeight(value: number) {
    lensHeight = value
    if (scene) {
      scene.setLensHeight(value)
    }
  }
  
  function updateHorizontalShift(value: number) {
    horizontalShift = value
    if (scene) {
      scene.setHorizontalShift(value)
    }
  }
  
  function useCustomProjector() {
    showCustomProjector = true
    const custom: Projector = {
      id: 'custom',
      name: '自定义投影仪',
      brand: '自定义',
      throwRatio: customThrowRatio,
      zoomType: 'fixed',
      offset: customOffset,
      maxKeystoneAngle: customMaxKeystone,
      nativeResolution: { width: 1920, height: 1080 },
      brightness: 2000,
      category: 'standard'
    }
    selectedProjector = custom
    if (scene) {
      scene.setProjector(custom)
    }
  }
  
  function applyCustomSettings() {
    const custom: Projector = {
      ...selectedProjector,
      id: 'custom',
      name: '自定义投影仪',
      brand: '自定义',
      throwRatio: customThrowRatio,
      offset: customOffset,
      maxKeystoneAngle: customMaxKeystone
    }
    selectedProjector = custom
    if (scene) {
      scene.setProjector(custom)
    }
  }
  
  function setToIdealDistance() {
    if (idealDistance > 0) {
      updateDistance(idealDistance)
    }
  }
  
  function formatMeters(m: number): string {
    return (m * 100).toFixed(0) + ' cm'
  }
  
  function formatInches(inches: number): string {
    return inches.toFixed(0) + ' 寸'
  }
  
  function getCategoryColor(category: Projector['category']): string {
    switch (category) {
      case 'standard': return '#4a9eff'
      case 'shortThrow': return '#ff9800'
      case 'ultraShortThrow': return '#e91e63'
    }
  }
  
  onMount(() => {
    if (container) {
      scene = new ProjectorScene(container)
      scene.setProjector(selectedProjector)
      if (selectedScreen) {
        scene.setScreen(selectedScreen)
      }
      scene.setDistance(distance)
      scene.setZoom(zoomPosition)
      scene.setLensHeight(lensHeight)
      scene.setHorizontalShift(horizontalShift)
    }
  })
  
  onDestroy(() => {
    if (scene) {
      scene.dispose()
    }
  })
</script>

<div class="app-container">
  <div bind:this={container} class="scene-container"></div>
  
  <div class="control-panel">
    <div class="panel-header">
      <h1>🎬 投影仪安装模拟器</h1>
      <p class="subtitle">光学参数 · 空间几何 · 安装规划</p>
    </div>
    
    <div class="tabs">
      {#each ['projector', 'screen', 'installation', 'keystone'] as tab}
        <button 
          class="tab-btn"
          class:active={activeTab === tab}
          on:click={() => activeTab = tab}
        >
          {#if tab === 'projector'}📽️ 投影仪{/if}
          {#if tab === 'screen'}🖼️ 幕布匹配{/if}
          {#if tab === 'installation'}🏗️ 安装验证{/if}
          {#if tab === 'keystone'}📐 梯形校正{/if}
        </button>
      {/each}
    </div>
    
    <div class="tab-content">
      {#if activeTab === 'projector'}
        <div class="section">
          <h3>选择投影仪型号</h3>
          
          <div class="projector-list">
            {#each projectors as proj}
              <div 
                class="projector-card"
                class:selected={selectedProjector.id === proj.id}
                on:click={() => selectProjector(proj)}
              >
                <div class="projector-brand">{proj.brand}</div>
                <div class="projector-name">{proj.name}</div>
                <div class="projector-category" style="background: {getCategoryColor(proj.category)}20; color: {getCategoryColor(proj.category)}">
                  {categoryLabels[proj.category]}
                </div>
                <div class="projector-specs">
                  <span>投射比: {proj.throwRatio}</span>
                  {#if proj.zoomType === 'optical'}
                    <span class="zoom-badge">光学变焦</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
          
          <div class="custom-projector-section">
            <button class="btn-outline" on:click={() => showCustomProjector = !showCustomProjector}>
              {showCustomProjector ? '取消自定义' : '+ 自定义投射比'}
            </button>
            
            {#if showCustomProjector}
              <div class="custom-inputs">
                <div class="input-group">
                  <label>投射比</label>
                  <input 
                    type="number" 
                    bind:value={customThrowRatio} 
                    step="0.01"
                    min="0.1"
                    max="5"
                    on:input={applyCustomSettings}
                  />
                </div>
                <div class="input-group">
                  <label>镜头偏移</label>
                  <input 
                    type="number" 
                    bind:value={customOffset} 
                    step="0.01"
                    min="0"
                    max="1"
                    on:input={applyCustomSettings}
                  />
                </div>
                <div class="input-group">
                  <label>最大梯形校正角</label>
                  <input 
                    type="number" 
                    bind:value={customMaxKeystone} 
                    step="1"
                    min="0"
                    max="60"
                    on:input={applyCustomSettings}
                  />
                  <span class="unit">°</span>
                </div>
              </div>
            {/if}
          </div>
          
          <div class="params-display">
            <h4>📊 当前参数</h4>
            <div class="param-grid">
              <div class="param-item">
                <span class="param-label">投射比</span>
                <span class="param-value">{selectedProjector.throwRatio}</span>
              </div>
              <div class="param-item">
                <span class="param-label">镜头偏移</span>
                <span class="param-value">{(selectedProjector.offset * 100).toFixed(0)}%</span>
              </div>
              <div class="param-item">
                <span class="param-label">分辨率</span>
                <span class="param-value">{selectedProjector.nativeResolution.width}×{selectedProjector.nativeResolution.height}</span>
              </div>
              <div class="param-item">
                <span class="param-label">亮度</span>
                <span class="param-value">{selectedProjector.brightness} ANSI</span>
              </div>
            </div>
          </div>
        </div>
      {/if}
      
      {#if activeTab === 'screen'}
        <div class="section">
          <h3>🖼️ 幕布匹配分析</h3>
          
          <div class="projection-result-card">
            <div class="result-header">
              <span class="result-icon">🎯</span>
              <span class="result-title">当前投射尺寸</span>
            </div>
            <div class="result-size">{formatInches(projectionResult.imageDiagonalInches)}</div>
            <div class="result-details">
              {formatMeters(projectionResult.imageWidth)} × {formatMeters(projectionResult.imageHeight)}
            </div>
          </div>
          
          <div class="distance-control">
            <label>投射距离: {distance.toFixed(2)} m</label>
            <input 
              type="range" 
              min="0.5" 
              max="5" 
              step="0.05"
              bind:value={distance}
              on:input={() => updateDistance(distance)}
            />
            <div class="range-labels">
              <span>0.5m</span>
              <button class="btn-mini" on:click={setToIdealDistance}>推荐距离</button>
              <span>5m</span>
            </div>
          </div>
          
          {#if selectedProjector.zoomType === 'optical'}
            <div class="distance-control">
              <label>变焦位置: {(zoomPosition * 100).toFixed(0)}%</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01"
                bind:value={zoomPosition}
                on:input={() => updateZoom(zoomPosition)}
              />
              <div class="range-labels">
                <span>广角</span>
                <span>长焦</span>
              </div>
            </div>
          {/if}
          
          <div class="screen-recommendation">
            <h4>🏆 推荐幕布</h4>
            {#if screenMatchResult.canFill && screenMatchResult.recommendedScreen}
              <div class="recommendation-card success">
                <div class="rec-title">✅ 可投满 {screenMatchResult.recommendedScreen.name}</div>
                <div class="rec-detail">
                  {formatScreenInfo(screenMatchResult.recommendedScreen)}
                </div>
                <div class="rec-fill">画面填充率: {screenMatchResult.fillPercentage.toFixed(1)}%</div>
              </div>
            {:else if screenMatchResult.closestSmaller}
              <div class="recommendation-card warning">
                <div class="rec-title">⚠️ 无法投满标准幕布</div>
                <div class="rec-detail">
                  最大可投: {formatInches(projectionResult.imageDiagonalInches)}
                </div>
                <div class="rec-detail">
                  最接近尺寸: {screenMatchResult.closestSmaller.name} 
                  (差 {formatInches(screenMatchResult.closestSmaller.diagonalInches - projectionResult.imageDiagonalInches)})
                </div>
              </div>
            {/if}
          </div>
          
          <div class="screen-size-list">
            <h4>📏 标准幕布尺寸</h4>
            {#each standardScreens as screen}
              <div 
                class="screen-item"
                class:selected={selectedScreen?.name === screen.name}
                class:can-fill={projectionResult.imageDiagonalInches >= screen.diagonalInches * 0.95}
                on:click={() => selectScreen(screen)}
              >
                <span class="screen-name">{screen.name}</span>
                <span class="screen-size">
                  {formatMeters(screen.width)} × {formatMeters(screen.height)}
                </span>
                <span class="screen-status">
                  {#if projectionResult.imageDiagonalInches >= screen.diagonalInches}
                    ✅ 可投满
                  {:else if projectionResult.imageDiagonalInches >= screen.diagonalInches * 0.9}
                    ⚠️ 接近
                  {:else}
                    ❌ 不够
                  {/if}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
      
      {#if activeTab === 'installation'}
        <div class="section">
          <h3>🏗️ 安装高度验证</h3>
          
          <div class="height-controls">
            <div class="input-group">
              <label>投影仪镜头高度</label>
              <input 
                type="range" 
                min="0.2" 
                max="2.6" 
                step="0.01"
                bind:value={lensHeight}
                on:input={() => updateLensHeight(lensHeight)}
              />
              <span class="range-value">{formatMeters(lensHeight)}</span>
            </div>
            
            <div class="input-group">
              <label>天花板高度</label>
              <input 
                type="range" 
                min="2.4" 
                max="3.5" 
                step="0.05"
                bind:value={ceilingHeight}
              />
              <span class="range-value">{formatMeters(ceilingHeight)}</span>
            </div>
            
            <div class="input-group">
              <label>幕布下沿高度</label>
              <input 
                type="range" 
                min="0.3" 
                max="1.2" 
                step="0.05"
                bind:value={screenBottomHeight}
              />
              <span class="range-value">{formatMeters(screenBottomHeight)}</span>
            </div>
          </div>
          
          {#if installationResult}
            <div class="installation-result">
              <div class="install-card" class:good={installationResult.canShelfMount}>
                <div class="install-icon">🪑</div>
                <div class="install-title">电视柜放置</div>
                <div class="install-status">
                  {installationResult.canShelfMount ? '✅ 可行' : '❌ 不可行'}
                </div>
                <div class="install-detail">
                  建议高度: {formatMeters(installationResult.shelfHeight)}
                </div>
              </div>
              
              <div class="install-card" class:good={installationResult.canCeilingMount}>
                <div class="install-icon">🔧</div>
                <div class="install-title">吊顶安装</div>
                <div class="install-status">
                  {installationResult.canCeilingMount ? '✅ 可行' : '❌ 不可行'}
                </div>
                <div class="install-detail">
                  距顶: {formatMeters(ceilingHeight - installationResult.ceilingMountHeight)}
                </div>
              </div>
            </div>
            
            <div class="view-block-check">
              <h4>👁️ 视线遮挡检查</h4>
              <div class={`block-status ${installationResult.blocksView ? 'warning' : 'ok'}`}>
                {installationResult.blocksView 
                  ? '⚠️ 投影仪可能遮挡观众视线' 
                  : '✅ 不会遮挡视线'}
              </div>
              <div class="view-detail">
                观众眼高: {formatMeters(viewerEyeHeight)} · 
                观看距离: {formatMeters(distance * 0.6)}
              </div>
            </div>
            
            <div class="recommendation-box">
              <h4>💡 安装建议</h4>
              <p>{installationResult.recommendation}</p>
            </div>
          {/if}
          
          <div class="viewer-info">
            <h4>👥 最佳观看距离</h4>
            {#if selectedScreen}
              <p>对于 {selectedScreen.name} 幕布，推荐观看距离约 <strong>{formatMeters(idealViewerDistance)}</strong></p>
              <p class="tip">💡 一般建议观看距离为幕布宽度的 1.2 倍</p>
            {/if}
          </div>
        </div>
      {/if}
      
      {#if activeTab === 'keystone'}
        <div class="section">
          <h3>📐 梯形校正分析</h3>
          
          <div class="shift-control">
            <label>水平偏移: {(horizontalShift * 100).toFixed(0)} cm</label>
            <input 
              type="range" 
              min="-1.5" 
              max="1.5" 
              step="0.01"
              bind:value={horizontalShift}
              on:input={() => updateHorizontalShift(horizontalShift)}
            />
            <div class="range-labels">
              <span>-150cm</span>
              <button class="btn-mini" on:click={() => updateHorizontalShift(0)}>居中</button>
              <span>+150cm</span>
            </div>
          </div>
          
          <div class="keystone-result-card" style="border-color: {keystoneSeverity.color}">
            <div class="keystone-header">
              <span class="keystone-level" style="background: {keystoneSeverity.color}">
                {keystoneSeverity.label}
              </span>
              <span class="keystone-angle">{keystoneResult.keystoneNeeded.toFixed(1)}°</span>
            </div>
            
            <div class="keystone-stats">
              <div class="keystone-stat">
                <span class="stat-label">校正范围</span>
                <span class="stat-value">±{selectedProjector.maxKeystoneAngle}°</span>
              </div>
              <div class="keystone-stat">
                <span class="stat-label">畸变程度</span>
                <span class="stat-value">{keystoneResult.distortionPercentage.toFixed(1)}%</span>
              </div>
              <div class="keystone-stat">
                <span class="stat-label">亮度损失</span>
                <span class="stat-value">~{keystoneResult.brightnessLoss.toFixed(0)}%</span>
              </div>
              <div class="keystone-stat">
                <span class="stat-label">分辨率损失</span>
                <span class="stat-value">~{keystoneResult.resolutionLoss.toFixed(0)}%</span>
              </div>
            </div>
          </div>
          
          <div class="keystone-status">
            {#if keystoneResult.withinRange}
              <div class="status-ok">
                ✅ 在梯形校正范围内，可通过数字校正修正
              </div>
            {:else}
              <div class="status-bad">
                ❌ 超出梯形校正范围，无法完全修正
              </div>
            {/if}
          </div>
          
          <div class="keystone-tips">
            <h4>💡 梯形校正小贴士</h4>
            <ul>
              <li>尽量保持投影仪正对幕布，减少梯形校正使用</li>
              <li>数字梯形校正会损失部分分辨率和亮度</li>
              <li>侧投会导致画面亮度不均，边缘变暗</li>
              <li>如果偏移较大，建议调整安装位置而非依赖校正</li>
            </ul>
          </div>
        </div>
      {/if}
    </div>
  </div>
  
  <div class="quick-info">
    <div class="info-item">
      <span class="info-label">投射距离</span>
      <span class="info-value">{distance.toFixed(2)}m</span>
    </div>
    <div class="info-item">
      <span class="info-label">画面尺寸</span>
      <span class="info-value highlight">{formatInches(projectionResult.imageDiagonalInches)}</span>
    </div>
    <div class="info-item">
      <span class="info-label">幕布匹配</span>
      <span class="info-value" class:success={canFillCurrentScreen}>
        {canFillCurrentScreen ? '✅ 可投满' : '⚠️ 不够大'}
      </span>
    </div>
  </div>
  
  <div class="scene-hint">
    💡 拖拽旋转视角 · 滚轮缩放
  </div>
</div>

<style>
  .app-container {
    width: 100vw;
    height: 100vh;
    position: relative;
    background: #0f0f1a;
    overflow: hidden;
  }
  
  .scene-container {
    width: 100%;
    height: 100%;
  }
  
  .control-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 380px;
    height: 100vh;
    background: rgba(15, 15, 30, 0.92);
    backdrop-filter: blur(20px);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    z-index: 100;
    overflow-y: auto;
  }
  
  .panel-header {
    padding: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .panel-header h1 {
    font-size: 20px;
    color: #fff;
    margin: 0 0 4px 0;
    font-weight: 600;
  }
  
  .subtitle {
    font-size: 12px;
    color: #888;
    margin: 0;
  }
  
  .tabs {
    display: flex;
    padding: 10px 15px;
    gap: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    flex-wrap: wrap;
  }
  
  .tab-btn {
    flex: 1;
    min-width: 80px;
    padding: 8px 10px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #aaa;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  
  .tab-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }
  
  .tab-btn.active {
    background: linear-gradient(135deg, #4a9eff, #667eea);
    border-color: transparent;
    color: white;
    font-weight: 500;
  }
  
  .tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }
  
  .section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .section h3 {
    color: #fff;
    font-size: 16px;
    margin: 0 0 4px 0;
    font-weight: 600;
  }
  
  .section h4 {
    color: #ddd;
    font-size: 14px;
    margin: 8px 0 8px 0;
    font-weight: 500;
  }
  
  .projector-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    max-height: 280px;
    overflow-y: auto;
    padding-right: 4px;
  }
  
  .projector-card {
    padding: 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .projector-card:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(74, 158, 255, 0.3);
  }
  
  .projector-card.selected {
    background: rgba(74, 158, 255, 0.15);
    border-color: #4a9eff;
  }
  
  .projector-brand {
    font-size: 10px;
    color: #888;
    margin-bottom: 2px;
  }
  
  .projector-name {
    font-size: 13px;
    color: #fff;
    font-weight: 500;
    margin-bottom: 6px;
  }
  
  .projector-category {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    margin-bottom: 6px;
  }
  
  .projector-specs {
    display: flex;
    gap: 6px;
    font-size: 10px;
    color: #999;
    flex-wrap: wrap;
  }
  
  .zoom-badge {
    color: #4caf50;
  }
  
  .custom-projector-section {
    margin-top: 8px;
  }
  
  .btn-outline {
    width: 100%;
    padding: 10px;
    background: transparent;
    border: 1px dashed rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    color: #aaa;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn-outline:hover {
    border-color: #4a9eff;
    color: #4a9eff;
  }
  
  .custom-inputs {
    margin-top: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .input-group label {
    font-size: 12px;
    color: #aaa;
  }
  
  .input-group input[type="number"] {
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #fff;
    font-size: 13px;
  }
  
  .input-group input[type="number"]:focus {
    outline: none;
    border-color: #4a9eff;
  }
  
  .params-display {
    margin-top: 8px;
    padding: 14px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 10px;
  }
  
  .param-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 10px;
  }
  
  .param-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .param-label {
    font-size: 11px;
    color: #888;
  }
  
  .param-value {
    font-size: 14px;
    color: #fff;
    font-weight: 500;
  }
  
  .projection-result-card {
    padding: 20px;
    background: linear-gradient(135deg, rgba(74, 158, 255, 0.2), rgba(102, 126, 234, 0.2));
    border: 1px solid rgba(74, 158, 255, 0.3);
    border-radius: 12px;
    text-align: center;
  }
  
  .result-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  
  .result-icon {
    font-size: 20px;
  }
  
  .result-title {
    font-size: 13px;
    color: #aaccff;
  }
  
  .result-size {
    font-size: 32px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 4px;
  }
  
  .result-details {
    font-size: 13px;
    color: #99bbdd;
  }
  
  .distance-control {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
  }
  
  .distance-control label {
    font-size: 13px;
    color: #ddd;
    font-weight: 500;
  }
  
  .distance-control input[type="range"] {
    width: 100%;
    -webkit-appearance: none;
    height: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.1);
    outline: none;
  }
  
  .distance-control input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4a9eff, #667eea);
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(74, 158, 255, 0.4);
  }
  
  .range-labels {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #666;
  }
  
  .btn-mini {
    padding: 3px 10px;
    background: rgba(74, 158, 255, 0.2);
    border: 1px solid rgba(74, 158, 255, 0.3);
    border-radius: 4px;
    color: #6699cc;
    font-size: 11px;
    cursor: pointer;
  }
  
  .btn-mini:hover {
    background: rgba(74, 158, 255, 0.3);
  }
  
  .screen-recommendation {
    margin-top: 8px;
  }
  
  .recommendation-card {
    padding: 14px;
    border-radius: 10px;
    margin-top: 8px;
  }
  
  .recommendation-card.success {
    background: rgba(76, 175, 80, 0.15);
    border: 1px solid rgba(76, 175, 80, 0.4);
  }
  
  .recommendation-card.warning {
    background: rgba(255, 152, 0, 0.15);
    border: 1px solid rgba(255, 152, 0, 0.4);
  }
  
  .rec-title {
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 6px;
  }
  
  .rec-detail {
    font-size: 12px;
    color: #ccc;
    margin-bottom: 4px;
  }
  
  .rec-fill {
    font-size: 12px;
    color: #888;
    margin-top: 6px;
  }
  
  .screen-size-list {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .screen-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .screen-item:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  
  .screen-item.selected {
    background: rgba(74, 158, 255, 0.15);
    border-color: #4a9eff;
  }
  
  .screen-name {
    font-size: 13px;
    color: #fff;
    font-weight: 500;
    min-width: 60px;
  }
  
  .screen-size {
    flex: 1;
    font-size: 11px;
    color: #888;
  }
  
  .screen-status {
    font-size: 11px;
  }
  
  .height-controls {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 14px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 10px;
  }
  
  .height-controls .input-group input[type="range"] {
    width: 100%;
    -webkit-appearance: none;
    height: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.1);
    outline: none;
  }
  
  .height-controls .input-group input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4a9eff, #667eea);
    cursor: pointer;
  }
  
  .range-value {
    font-size: 12px;
    color: #4a9eff;
    font-weight: 500;
    align-self: flex-end;
  }
  
  .installation-result {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 8px;
  }
  
  .install-card {
    padding: 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    text-align: center;
  }
  
  .install-card.good {
    border-color: rgba(76, 175, 80, 0.4);
    background: rgba(76, 175, 80, 0.08);
  }
  
  .install-icon {
    font-size: 24px;
    margin-bottom: 6px;
  }
  
  .install-title {
    font-size: 13px;
    color: #ddd;
    margin-bottom: 6px;
  }
  
  .install-status {
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    margin-bottom: 6px;
  }
  
  .install-detail {
    font-size: 11px;
    color: #888;
  }
  
  .view-block-check {
    margin-top: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
  }
  
  .block-status {
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 4px;
  }
  
  .block-status.ok {
    color: #4caf50;
  }
  
  .block-status.warning {
    color: #ff9800;
  }
  
  .view-detail {
    font-size: 11px;
    color: #888;
  }
  
  .recommendation-box {
    margin-top: 12px;
    padding: 14px;
    background: linear-gradient(135deg, rgba(74, 158, 255, 0.1), rgba(102, 126, 234, 0.1));
    border-left: 3px solid #4a9eff;
    border-radius: 8px;
  }
  
  .recommendation-box p {
    margin: 0;
    font-size: 13px;
    color: #ccc;
    line-height: 1.6;
  }
  
  .viewer-info {
    margin-top: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
  }
  
  .viewer-info p {
    margin: 4px 0;
    font-size: 13px;
    color: #ccc;
  }
  
  .viewer-info strong {
    color: #4a9eff;
  }
  
  .tip {
    font-size: 11px !important;
    color: #888 !important;
    margin-top: 8px !important;
  }
  
  .shift-control {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
  }
  
  .shift-control label {
    font-size: 13px;
    color: #ddd;
    font-weight: 500;
  }
  
  .shift-control input[type="range"] {
    width: 100%;
    -webkit-appearance: none;
    height: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.1);
    outline: none;
  }
  
  .shift-control input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: linear-gradient(135deg, #ff9800, #e91e63);
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(255, 152, 0, 0.4);
  }
  
  .keystone-result-card {
    margin-top: 12px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid;
    border-radius: 12px;
  }
  
  .keystone-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  
  .keystone-level {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    color: #fff;
  }
  
  .keystone-angle {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
  }
  
  .keystone-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  
  .keystone-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .stat-label {
    font-size: 11px;
    color: #888;
  }
  
  .stat-value {
    font-size: 14px;
    color: #fff;
    font-weight: 500;
  }
  
  .keystone-status {
    margin-top: 12px;
    text-align: center;
  }
  
  .status-ok {
    padding: 10px;
    background: rgba(76, 175, 80, 0.15);
    border-radius: 8px;
    color: #4caf50;
    font-size: 13px;
    font-weight: 500;
  }
  
  .status-bad {
    padding: 10px;
    background: rgba(244, 67, 54, 0.15);
    border-radius: 8px;
    color: #f44336;
    font-size: 13px;
    font-weight: 500;
  }
  
  .keystone-tips {
    margin-top: 14px;
    padding: 14px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 8px;
  }
  
  .keystone-tips ul {
    margin: 8px 0 0 0;
    padding-left: 18px;
  }
  
  .keystone-tips li {
    font-size: 12px;
    color: #aaa;
    line-height: 1.8;
  }
  
  .quick-info {
    position: fixed;
    top: 20px;
    left: 20px;
    display: flex;
    gap: 12px;
    z-index: 50;
  }
  
  .info-item {
    padding: 10px 16px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 100px;
  }
  
  .info-label {
    font-size: 11px;
    color: #888;
  }
  
  .info-value {
    font-size: 15px;
    font-weight: 600;
    color: #fff;
  }
  
  .info-value.highlight {
    color: #4a9eff;
  }
  
  .info-value.success {
    color: #4caf50;
  }
  
  .scene-hint {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    font-size: 12px;
    color: #888;
    z-index: 50;
  }
  
  .unit {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #888;
    font-size: 12px;
  }
  
  .custom-inputs .input-group {
    position: relative;
  }
</style>
