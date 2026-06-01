<script>
  import { onMount, onDestroy } from 'svelte'
  import * as d3 from 'd3'
  import { scaleThreshold, format } from 'd3'
  import { cityData, provinceData } from '../data/mockData'

  let svg
  let mapContainer
  let loading = true
  let error = null
  let geoData = null
  let zoomLevel = 1
  let selectedCity = null
  let selectedProvince = null
  let highlightedProvince = null
  let tooltip = { show: false, x: 0, y: 0, content: {} }

  let currentPrecision = 'low'

  const provinceCenters = {
    '黑龙江': [126.53, 45.80], '吉林': [125.19, 43.54], '辽宁': [123.38, 41.80],
    '内蒙古': [111.67, 40.82], '北京': [116.40, 39.90], '天津': [117.20, 39.09],
    '河北': [114.48, 38.03], '山西': [112.55, 37.87], '陕西': [108.94, 34.27],
    '宁夏': [106.27, 38.47], '甘肃': [103.82, 36.06], '青海': [101.78, 36.62],
    '新疆': [87.62, 43.82], '西藏': [91.13, 29.66], '四川': [104.07, 30.66],
    '重庆': [106.55, 29.56], '贵州': [106.63, 26.65], '云南': [102.72, 25.04],
    '广西': [108.37, 22.82], '广东': [113.26, 23.13], '海南': [110.35, 20.02],
    '香港': [114.17, 22.32], '澳门': [113.55, 22.20], '湖南': [112.94, 28.23],
    '湖北': [114.31, 30.59], '河南': [113.63, 34.75], '安徽': [117.28, 31.86],
    '江苏': [118.78, 32.04], '浙江': [120.16, 30.28], '福建': [119.30, 26.08],
    '台湾': [121.52, 25.03], '江西': [115.89, 28.68], '山东': [117.01, 36.67]
  }

  const densityThresholds = [0.5, 1, 2, 4, 6, 8, 10]
  const densityColors = ['#f0f9e8', '#ccebc5', '#a8ddb5', '#7bccc4', '#4eb3d3', '#2b8cbe', '#0868ac', '#084081']
  const colorScale = scaleThreshold().domain(densityThresholds).range(densityColors)
  const formatNum = format(',.1f')

  const projection = d3.geoMercator()
    .center([104, 35])
    .scale(750)
    .translate([500, 420])

  const zoom = d3.zoom()
    .scaleExtent([0.5, 8])
    .translateExtent([[-200, -200], [1200, 1000]])
    .on('zoom', handleZoom)

  let g, pathGenerator, labelPositionsCache = null

  async function loadGeoData(precision) {
    const files = { high: 'china-provinces-highres.json', low: 'china-provinces-lowres.json', medium: 'china-provinces.json' }
    const fallbackOrder = ['high', 'medium', 'low']
    for (const p of fallbackOrder) {
      try {
        const res = await fetch(`/${files[p]}`)
        if (res.ok) return await res.json()
      } catch (e) { console.log(`Failed to load ${p} precision data`) }
    }
    return generateFallbackGeoJSON()
  }

  function generateFallbackGeoJSON() {
    return { type: 'FeatureCollection', features: Object.entries(provinceCenters).map(([name, [lng, lat]]) => ({
      type: 'Feature', properties: { name, area: 100000, priority: 2 },
      geometry: { type: 'Polygon', coordinates: [[[lng - 3, lat - 2], [lng + 3, lat - 2], [lng + 3, lat + 2], [lng - 3, lat + 2], [lng - 3, lat - 2]]] }
    })) }
  }

  function getPrecisionByZoom(zoom) {
    if (zoom >= 3) return 'high'
    if (zoom >= 1.5) return 'medium'
    return 'low'
  }

  async function handleZoom(e) {
    const { transform } = e
    g.attr('transform', transform)
    zoomLevel = transform.k

    const newPrecision = getPrecisionByZoom(zoomLevel)
    if (newPrecision !== currentPrecision) {
      currentPrecision = newPrecision
      geoData = await loadGeoData(newPrecision)
      updateMap()
    }

    updateLabels()
    updateCityMarkers()
  }

  function preventLabelOverlapSimulated(labels, projection, zoom) {
    const positions = []
    const minDistance = Math.max(40, 35 / Math.sqrt(zoom))
    const iterations = 5

    labels.forEach((label, i) => {
      const center = provinceCenters[label.properties.name]
      if (!center) return
      let [x, y] = projection(center)

      for (let iter = 0; iter < iterations; iter++) {
        let moved = false
        for (const pos of positions) {
          const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2)
          if (dist < minDistance) {
            const angle = Math.atan2(y - pos.y, x - pos.x)
            const push = (minDistance - dist) / 2
            x += Math.cos(angle) * push
            y += Math.sin(angle) * push
            moved = true
          }
        }
        if (!moved) break
      }
      positions.push({ x, y, name: label.properties.name, area: label.properties.area })
    })
    return positions
  }

  function calculateFontSize(area, zoom) {
    const baseSize = area > 500000 ? 13 : area > 200000 ? 11 : area > 100000 ? 10 : 8
    return Math.min(Math.max(baseSize * Math.sqrt(zoom), 7), 18)
  }

  function shouldShowLabel(area, zoom) {
    if (zoom >= 2) return true
    if (zoom >= 1.2) return area >= 80000
    return area >= 150000
  }

  function adjustTooltipPosition(event, tooltipWidth = 250, tooltipHeight = 150) {
    let x = event.pageX + 15
    let y = event.pageY - 10
    if (x + tooltipWidth > window.innerWidth) x = event.pageX - tooltipWidth - 15
    if (y + tooltipHeight > window.innerHeight) y = event.pageY - tooltipHeight - 10
    return { x, y }
  }

  function handleCityClick(city) {
    selectedCity = city
    highlightedProvince = city.province
    updateMap()
  }

  function handleProvinceClick(provinceName) {
    selectedProvince = provinceName
    selectedCity = null
    highlightedProvince = provinceName

    const provinceCities = Object.values(cityData)
      .filter(c => c.province === provinceName)
      .sort((a, b) => b.density - a.density)
    if (provinceCities.length > 0) {
      const center = provinceCenters[provinceName]
      if (center) {
        const [x, y] = projection(center)
        svg.transition().duration(750).call(
          zoom.transform,
          d3.zoomIdentity.translate(500 - x * 1.5, 420 - y * 1.5).scale(1.5)
        )
      }
    }
    updateMap()
  }

  function resetView() {
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity)
    selectedCity = null
    selectedProvince = null
    highlightedProvince = null
    updateMap()
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      selectedCity = null
      selectedProvince = null
      highlightedProvince = null
      updateMap()
    }
  }

  function updateLabels() {
    if (!labelPositionsCache) return
    d3.select('#province-labels').selectAll('text').data(labelPositionsCache, d => d.name)
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('font-size', d => calculateFontSize(d.area, zoomLevel))
      .style('display', d => shouldShowLabel(d.area, zoomLevel) ? 'block' : 'none')
  }

  function updateCityMarkers() {
    const markerSize = Math.max(3, Math.min(8, 6 / Math.sqrt(zoomLevel)))
    d3.select('#city-markers').selectAll('circle')
      .attr('r', d => markerSize * (d.density > 8 ? 1.3 : 1))
  }

  function updateMap() {
    if (!geoData || !g) return

    const provinces = g.select('#provinces').selectAll('.province').data(geoData.features, d => d.properties.name)
    provinces.enter().append('path')
      .attr('class', 'province')
      .attr('d', pathGenerator)
      .attr('fill', d => colorScale(provinceData[d.properties.name]?.density || 0))
      .attr('stroke', '#1a1a2e')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.8)
      .style('cursor', 'pointer')
      .style('pointer-events', 'visiblePainted')
      .on('mouseover', (e, d) => {
        d3.select(e.currentTarget).attr('stroke', '#ffd700').attr('stroke-width', 2.5).raise()
        const pos = adjustTooltipPosition(e)
        const data = provinceData[d.properties.name] || { density: 0, storeCount: 0, cityCount: 0 }
        tooltip = { show: true, x: pos.x, y: pos.y, content: { type: 'province', name: d.properties.name, ...data } }
      })
      .on('mousemove', e => {
        const pos = adjustTooltipPosition(e)
        tooltip = { ...tooltip, x: pos.x, y: pos.y }
      })
      .on('mouseout', (e, d) => {
        const currentProvince = d.properties.name
        if (highlightedProvince !== currentProvince) {
          d3.select(e.currentTarget).attr('stroke', '#1a1a2e').attr('stroke-width', 1.5)
        }
        tooltip = { ...tooltip, show: false }
      })
      .on('click', (e, d) => handleProvinceClick(d.properties.name))

    provinces.attr('d', pathGenerator)
      .attr('fill', d => colorScale(provinceData[d.properties.name]?.density || 0))
      .attr('stroke', d => highlightedProvince === d.properties.name ? '#ff6b6b' : '#1a1a2e')
      .attr('stroke-width', d => highlightedProvince === d.properties.name ? 4 : 1.5)

    if (highlightedProvince) {
      g.select('#provinces').selectAll('.province')
        .filter(d => d.properties.name === highlightedProvince)
        .style('filter', 'url(#glow)').raise()
    }

    labelPositionsCache = preventLabelOverlapSimulated(geoData.features, projection, zoomLevel)
    const labels = g.select('#province-labels').selectAll('text').data(labelPositionsCache, d => d.name)
    labels.enter().append('text')
      .attr('text-anchor', 'middle')
      .attr('fill', '#1a1a2e')
      .attr('font-weight', 500)
      .style('text-shadow', '0 0 3px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.9)')
      .style('pointer-events', 'none')
      .text(d => d.name)
    labels.attr('x', d => d.x).attr('y', d => d.y)
      .attr('font-size', d => calculateFontSize(d.area, zoomLevel))
      .style('display', d => shouldShowLabel(d.area, zoomLevel) ? 'block' : 'none')
    labels.exit().remove()

    const cities = Object.values(cityData)
    const markers = g.select('#city-markers').selectAll('circle').data(cities, d => d.name)
    markers.enter().append('circle')
      .attr('fill', '#e74c3c')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', (e, d) => {
        d3.select(e.currentTarget).attr('r', 10).attr('fill', '#c0392b').raise()
        const pos = adjustTooltipPosition(e)
        tooltip = { show: true, x: pos.x, y: pos.y, content: { type: 'city', name: d.name, ...d } }
      })
      .on('mousemove', e => {
        const pos = adjustTooltipPosition(e)
        tooltip = { ...tooltip, x: pos.x, y: pos.y }
      })
      .on('mouseout', (e, d) => {
        const size = Math.max(3, Math.min(8, 6 / Math.sqrt(zoomLevel)))
        d3.select(e.currentTarget).attr('r', size * (d.density > 8 ? 1.3 : 1)).attr('fill', '#e74c3c')
        tooltip = { ...tooltip, show: false }
      })
      .on('click', (e, d) => handleCityClick(d))

    markers.each(function(d) {
      const center = provinceCenters[d.province]
      if (center) {
        const [x, y] = projection([center[0] + (Math.random() - 0.5) * 1.5, center[1] + (Math.random() - 0.5) * 1])
        d3.select(this).attr('cx', x).attr('cy', y)
      }
    })
    markers.exit().remove()
    updateCityMarkers()
  }

  onMount(async () => {
    window.addEventListener('keydown', handleKeyDown)
    svg = d3.select(mapContainer).append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', '0 0 1000 800')
      .call(zoom)
      .on('dblclick.zoom', null)
      .on('dblclick', () => {
        svg.transition().duration(750).call(
          zoom.scaleBy, 2
        )
      })

    const defs = svg.append('defs')
    const glowFilter = defs.append('filter').attr('id', 'glow').attr('x', '-70%').attr('y', '-70%').attr('width', '240%').attr('height', '240%')
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '8').attr('result', 'coloredBlur')
    const merge = glowFilter.append('feMerge')
    merge.append('feMergeNode').attr('in', 'coloredBlur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')

    g = svg.append('g')
    g.append('g').attr('id', 'provinces')
    g.append('g').attr('id', 'province-labels')
    g.append('g').attr('id', 'city-markers')
    pathGenerator = d3.geoPath().projection(projection)

    try {
      geoData = await loadGeoData('low')
      updateMap()
    } catch (err) { error = err.message }
    loading = false
  })

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  function retry() {
    loading = true
    error = null
    loadGeoData('low').then(data => {
      geoData = data
      updateMap()
      loading = false
    }).catch(err => { error = err.message; loading = false })
  }
</script>

<div class="map-wrapper" bind:this={mapContainer}>
  {#if loading}
    <div class="loading-overlay">
      <div class="spinner"></div>
      <p>正在加载地图数据...</p>
    </div>
  {/if}

  {#if error}
    <div class="error-overlay">
      <p>加载失败: {error}</p>
      <button on:click={retry}>重试</button>
    </div>
  {/if}

  <div class="map-controls">
    <button class="reset-btn" on:click={resetView} title="重置视图">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
      重置
    </button>
  </div>

  <div class="map-instructions">
    <p>🖱 滚轮缩放 | 拖拽平移 | 双击放大 | ESC 关闭弹窗</p>
  </div>

  {#if tooltip.show && tooltip.content}
    <div class="tooltip" style="left: {tooltip.x}px; top: {tooltip.y}px; z-index: 1000;">
      <h4>{tooltip.content.name}</h4>
      {#if tooltip.content.type === 'province'}
        <p>密度指数: {formatNum(tooltip.content.density)}</p>
        <p>样本门店: {tooltip.content.storeCount}</p>
        <p>覆盖城市: {tooltip.content.cityCount}</p>
      {:else if tooltip.content.type === 'city'}
        <p>所属省份: {tooltip.content.province}</p>
        <p>密度指数: {formatNum(tooltip.content.density)}</p>
        <p>全国排名: #{tooltip.content.rank}</p>
        <p>同比增长: {tooltip.content.growth}%</p>
      {/if}
    </div>
  {/if}

  {#if selectedCity}
    <div class="modal-overlay" on:click={() => { selectedCity = null; highlightedProvince = null; updateMap(); }}>
      <div class="modal" on:click|stopPropagation>
        <button class="close-btn" on:click={() => { selectedCity = null; highlightedProvince = null; updateMap(); }}>×</button>
        <h2>{selectedCity.name}</h2>
        <p class="subtitle">{selectedCity.province}</p>
        <div class="stats-grid">
          <div class="stat"><h3>{formatNum(selectedCity.density)}</h3><p>密度指数</p></div>
          <div class="stat"><h3>#{selectedCity.rank}</h3><p>全国排名</p></div>
          <div class="stat"><h3>{selectedCity.storeCount}</h3><p>样本门店</p></div>
          <div class="stat"><h3>{selectedCity.growth}%</h3><p>同比增长</p></div>
        </div>
        <div class="insights">
          <h4>📊 洞察分析</h4>
          <p>该城市便利店密度在全国排名前{selectedCity.rank <= 10 ? '10%' : selectedCity.rank <= 30 ? '30%' : '50%'}，{selectedCity.growth > 10 ? '增长势头强劲' : selectedCity.growth > 0 ? '保持稳定增长' : '增长放缓'}，{selectedCity.density > 6 ? '市场竞争激烈，建议差异化经营' : '仍有较大市场空间，适合布局新门店'}。</p>
        </div>
      </div>
    </div>
  {/if}

  {#if selectedProvince && !selectedCity}
    <div class="modal-overlay" on:click={() => { selectedProvince = null; highlightedProvince = null; updateMap(); }}>
      <div class="modal province-modal" on:click|stopPropagation>
        <button class="close-btn" on:click={() => { selectedProvince = null; highlightedProvince = null; updateMap(); }}>×</button>
        <h2>{selectedProvince}</h2>
        <div class="stats-grid">
          <div class="stat"><h3>{formatNum(provinceData[selectedProvince]?.density || 0)}</h3><p>平均密度</p></div>
          <div class="stat"><h3>{provinceData[selectedProvince]?.storeCount || 0}</h3><p>样本门店</p></div>
          <div class="stat"><h3>{provinceData[selectedProvince]?.cityCount || 0}</h3><p>覆盖城市</p></div>
        </div>
        <div class="city-list">
          <h4>🏙 省内城市排名</h4>
          <div class="city-items">
            {#each Object.values(cityData).filter(c => c.province === selectedProvince).sort((a, b) => b.density - a.density) as city}
              <div class="city-item" on:click={() => handleCityClick(city)}>
                <span class="rank-badge {city.rank <= 3 ? 'gold' : ''}">#{city.rank}</span>
                <span class="city-name">{city.name}</span>
                <span class="city-density">{formatNum(city.density)}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .map-wrapper {
    position: relative;
    width: 100%;
    height: 700px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    overflow: hidden;
  }

  .loading-overlay, .error-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    z-index: 100;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .error-overlay button {
    margin-top: 16px;
    padding: 10px 20px;
    background: #e74c3c;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }

  .map-controls {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 50;
  }

  .reset-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(255, 255, 255, 0.95);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: #2c3e50;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.2s;
  }

  .reset-btn:hover {
    background: #fff;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  .map-instructions {
    position: absolute;
    bottom: 20px;
    left: 20px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 8px;
    font-size: 12px;
    color: #666;
    z-index: 50;
  }

  .map-instructions p { margin: 0; }

  .tooltip {
    position: fixed;
    background: rgba(26, 26, 46, 0.95);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 13px;
    pointer-events: none;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    max-width: 220px;
  }

  .tooltip h4 { margin: 0 0 8px 0; font-size: 14px; color: #ffd700; }
  .tooltip p { margin: 4px 0; opacity: 0.9; }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .modal {
    background: white;
    border-radius: 16px;
    padding: 32px;
    max-width: 480px;
    width: 90%;
    max-height: 85vh;
    overflow-y: auto;
    position: relative;
    animation: slideUp 0.3s ease;
  }

  .province-modal { max-width: 560px; }

  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  .close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: #f0f0f0;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
  }

  .close-btn:hover { background: #e0e0e0; }

  .modal h2 { margin: 0 0 4px 0; font-size: 28px; color: #1a1a2e; }
  .modal .subtitle { margin: 0 0 24px 0; color: #666; font-size: 14px; }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }

  .stat { text-align: center; padding: 16px; background: #f8f9fa; border-radius: 12px; }
  .stat h3 { margin: 0 0 4px 0; font-size: 24px; color: #667eea; }
  .stat p { margin: 0; font-size: 12px; color: #666; }

  .insights {
    background: linear-gradient(135deg, #667eea10 0%, #764ba210 100%);
    padding: 20px;
    border-radius: 12px;
  }

  .insights h4 { margin: 0 0 12px 0; font-size: 14px; color: #1a1a2e; }
  .insights p { margin: 0; font-size: 13px; line-height: 1.6; color: #555; }

  .city-list h4 { margin: 0 0 16px 0; font-size: 14px; color: #1a1a2e; }

  .city-items {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
    max-height: 300px;
    overflow-y: auto;
  }

  .city-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #f8f9fa;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .city-item:hover {
    background: #e9ecef;
    transform: translateX(4px);
  }

  .rank-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    padding: 0 6px;
    background: #667eea;
    color: white;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
  }

  .rank-badge.gold {
    background: linear-gradient(135deg, #ffd700 0%, #ffaa00 100%);
    color: #1a1a2e;
  }

  .city-name {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
  }

  .city-density {
    font-size: 12px;
    color: #667eea;
    font-weight: 600;
  }
</style>