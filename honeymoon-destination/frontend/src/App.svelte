<script>
  import { onMount, onDestroy } from 'svelte';
  
  let deckgl = null;
  let mapContainer = null;
  let gaodeMap = null;
  let loading = true;
  let error = null;
  let mapLoaded = false;
  let mapLoading = true;
  let mapError = null;
  let mapMode = 'deckgl';

  let allRoutes = [];
  let allProvinces = [];
  let allDestinations = [];
  let statistics = null;
  let hoveredRoute = null;
  let gaodeApiKey = '';

  export let currentRegion = '';
  export let currentColorMode = 'region';
  export let arcWidth = 3;

  const regionColors = {
    '长三角': [255, 100, 100],
    '珠三角': [100, 200, 255],
    '环渤海': [100, 255, 100],
    '中西部': [200, 150, 255],
    '其他': [200, 200, 200]
  };

  const costColors = [
    { max: 10000, color: [100, 255, 100], label: '<1万' },
    { max: 20000, color: [255, 200, 100], label: '1-2万' },
    { max: 35000, color: [255, 100, 100], label: '2-3.5万' },
    { max: Infinity, color: [200, 50, 200], label: '>3.5万' }
  ];

  function getCostColor(cost) {
    for (const tier of costColors) {
      if (cost < tier.max) {
        return tier.color;
      }
    }
    return costColors[costColors.length - 1].color;
  }

  const PI = Math.PI;
  const A = 6378245.0;
  const EE = 0.00669342162296594323;

  function outOfChina(lng, lat) {
    if (lng < 72.004 || lng > 137.8347) return true;
    if (lat < 0.8293 || lat > 55.8271) return true;
    return false;
  }

  function transformLat(x, y) {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }

  function transformLon(x, y) {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
  }

  function wgs84ToGcj02(lng, lat) {
    if (outOfChina(lng, lat)) {
      return [lng, lat];
    }
    let dLat = transformLat(lng - 105.0, lat - 35.0);
    let dLon = transformLon(lng - 105.0, lat - 35.0);
    let radLat = lat / 180.0 * PI;
    let magic = Math.sin(radLat);
    magic = 1 - EE * magic * magic;
    let sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
    dLon = (dLon * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);
    let mgLat = lat + dLat;
    let mgLng = lng + dLon;
    return [mgLng, mgLat];
  }

  function convertCoordsForMap(coord, isGaodeMode) {
    if (isGaodeMode) {
      return wgs84ToGcj02(coord[0], coord[1]);
    }
    return coord;
  }

  $: filteredRoutes = currentRegion 
    ? allRoutes.filter(r => {
        const provinceRegionMap = {};
        allProvinces.forEach(p => {
          provinceRegionMap[p.name] = p.region;
        });
        return provinceRegionMap[r.from.name] === currentRegion;
      })
    : allRoutes;

  $: {
    if (deckgl && allRoutes.length > 0 && mapLoaded) {
      renderMap();
    }
  }

  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        gaodeApiKey = data.gaodeApiKey || '';
      }
    } catch (e) {
      console.warn('加载配置失败:', e);
    }
  }

  async function loadData() {
    try {
      loading = true;
      error = null;

      const [routesRes, provincesRes, destinationsRes, statsRes] = await Promise.all([
        fetch('/api/routes'),
        fetch('/api/provinces'),
        fetch('/api/destinations'),
        fetch('/api/statistics')
      ]);

      if (!routesRes.ok || !provincesRes.ok || !destinationsRes.ok || !statsRes.ok) {
        throw new Error('API 请求失败');
      }

      allRoutes = await routesRes.json();
      allProvinces = await provincesRes.json();
      allDestinations = await destinationsRes.json();
      statistics = await statsRes.json();

      loading = false;
    } catch (err) {
      console.error('加载数据失败:', err);
      error = err.message;
      loading = false;
      loadMockData();
    }
  }

  function loadMockData() {
    allRoutes = [
      {
        from: { name: '上海', coordinates: [121.4737, 31.2304] },
        to: { name: '日本-东京', coordinates: [139.6917, 35.6895] },
        count: 83,
        avgCost: 22000,
        income: 84034,
        distance: 1780,
        sourcePosition: [121.4737, 31.2304],
        targetPosition: [139.6917, 35.6895],
        regionColor: [255, 100, 100],
        costColor: [255, 100, 100]
      },
      {
        from: { name: '广东', coordinates: [113.2644, 23.1291] },
        to: { name: '普吉岛', coordinates: [98.3923, 7.9519] },
        count: 38,
        avgCost: 15000,
        income: 56905,
        distance: 2200,
        sourcePosition: [113.2644, 23.1291],
        targetPosition: [98.3923, 7.9519],
        regionColor: [100, 200, 255],
        costColor: [255, 200, 100]
      }
    ];
    allProvinces = [
      { name: '上海', coord: [121.4737, 31.2304], income: 84034, region: '长三角' },
      { name: '广东', coord: [113.2644, 23.1291], income: 56905, region: '珠三角' }
    ];
    allDestinations = [
      { name: '日本-东京', coord: [139.6917, 35.6895], cost: 22000, tier: 'high' },
      { name: '普吉岛', coord: [98.3923, 7.9519], cost: 15000, tier: 'mid' }
    ];
    statistics = {
      totalPackages: 3000,
      totalRoutes: 542,
      avgCost: 18500,
      regionStats: {
        '长三角': {
          count: 649,
          avgCost: 21000,
          topDestinations: [
            { destination: '日本-东京', count: 83 },
            { destination: '马尔代夫', count: 74 },
            { destination: '日本-冲绳', count: 69 }
          ]
        }
      }
    };
  }

  function loadGaodeScript() {
    return new Promise((resolve, reject) => {
      if (!gaodeApiKey) {
        reject(new Error('未配置高德地图 API Key'));
        return;
      }

      if (window.AMap) {
        resolve(window.AMap);
        return;
      }

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${gaodeApiKey}`;
      script.onload = () => {
        if (window.AMap) {
          resolve(window.AMap);
        } else {
          reject(new Error('高德地图 SDK 加载失败'));
        }
      };
      script.onerror = () => reject(new Error('高德地图脚本加载失败'));
      document.head.appendChild(script);
    });
  }

  async function initGaodeMap() {
    try {
      mapLoading = true;
      mapError = null;

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('地图加载超时')), 5000);
      });

      const AMap = await Promise.race([
        loadGaodeScript(),
        timeoutPromise
      ]);

      gaodeMap = new AMap.Map(mapContainer, {
        viewMode: '3D',
        pitch: 45,
        rotation: 0,
        zoom: 3,
        center: [110, 30],
        mapStyle: 'amap://styles/dark',
        features: ['bg', 'road', 'building', 'point']
      });

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('地图初始化超时')), 5000);
        gaodeMap.on('complete', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      mapMode = 'gaode';
      mapLoading = false;
      return gaodeMap;
    } catch (e) {
      console.warn('高德地图初始化失败，使用纯 Deck.gl 模式:', e);
      mapError = e.message;
      mapMode = 'deckgl';
      mapLoading = false;
      return null;
    }
  }

  function renderMap() {
    if (!mapContainer || !deckgl) return;

    const deck = window.deck || {};
    const { ArcLayer, ScatterplotLayer, TextLayer } = deck;
    if (!ArcLayer) return;

    const isGaodeMode = mapMode === 'gaode';

    const processedRoutes = filteredRoutes.map(r => ({
      ...r,
      sourcePosition: convertCoordsForMap(r.sourcePosition, isGaodeMode),
      targetPosition: convertCoordsForMap(r.targetPosition, isGaodeMode)
    }));

    const processedProvinces = allProvinces.map(p => ({
      ...p,
      coord: convertCoordsForMap(p.coord, isGaodeMode)
    }));

    const processedDestinations = allDestinations.map(d => ({
      ...d,
      coord: convertCoordsForMap(d.coord, isGaodeMode)
    }));

    const arcLayer = new ArcLayer({
      id: 'flight-arcs',
      data: processedRoutes,
      getSourcePosition: d => d.sourcePosition,
      getTargetPosition: d => d.targetPosition,
      getSourceColor: d => currentColorMode === 'region' ? d.regionColor : getCostColor(d.avgCost),
      getTargetColor: d => currentColorMode === 'region' ? d.regionColor : getCostColor(d.avgCost),
      getWidth: d => Math.max(1, Math.log2(d.count + 1) * arcWidth),
      getHeight: 0.5,
      greatCircle: true,
      pickable: true,
      onHover: ({ object }) => {
        hoveredRoute = object || null;
      },
      updateTriggers: {
        getSourceColor: [currentColorMode],
        getTargetColor: [currentColorMode],
        getWidth: [arcWidth]
      }
    });

    const provinceLayer = new ScatterplotLayer({
      id: 'province-points',
      data: processedProvinces,
      getPosition: d => d.coord,
      getRadius: d => Math.sqrt(d.income) * 150,
      getFillColor: [100, 150, 255, 200],
      getLineColor: [255, 255, 255],
      lineWidthMinPixels: 1,
      pickable: true,
      radiusUnits: 'meters',
      radiusScale: 1
    });

    const destinationLayer = new ScatterplotLayer({
      id: 'destination-points',
      data: processedDestinations,
      getPosition: d => d.coord,
      getRadius: 200000,
      getFillColor: [255, 100, 200, 200],
      getLineColor: [255, 255, 255],
      lineWidthMinPixels: 2,
      pickable: true,
      radiusUnits: 'meters',
      radiusScale: 1
    });

    const destTextLayer = new TextLayer({
      id: 'destination-labels',
      data: processedDestinations,
      getPosition: d => d.coord,
      getText: d => d.name,
      getSize: 14,
      getColor: [255, 255, 255],
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom',
      getPixelOffset: [0, -25],
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: 500,
      outlineWidth: 2,
      outlineColor: [0, 0, 0, 200]
    });

    const provinceTextLayer = new TextLayer({
      id: 'province-labels',
      data: processedProvinces,
      getPosition: d => d.coord,
      getText: d => d.name,
      getSize: 12,
      getColor: [200, 220, 255],
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'top',
      getPixelOffset: [0, 15],
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: 400,
      outlineWidth: 2,
      outlineColor: [0, 0, 0, 150]
    });

    deckgl.setProps({
      layers: [arcLayer, provinceLayer, destinationLayer, destTextLayer, provinceTextLayer]
    });
  }

  function syncDeckWithGaode() {
    if (!gaodeMap || !deckgl) return;

    const updateView = () => {
      const center = gaodeMap.getCenter();
      const zoom = gaodeMap.getZoom();
      const pitch = gaodeMap.getPitch();
      const rotation = gaodeMap.getRotation();

      deckgl.setProps({
        viewState: {
          longitude: center.getLng(),
          latitude: center.getLat(),
          zoom: zoom - 1,
          pitch: pitch,
          bearing: -rotation,
          transitionDuration: 0
        }
      });
    };

    gaodeMap.on('viewchange', updateView);
    gaodeMap.on('zoom', updateView);
    gaodeMap.on('rotate', updateView);
    gaodeMap.on('pitch', updateView);

    updateView();
  }

  onMount(async () => {
    const DeckGL = window.DeckGL || (window.deck && window.deck.DeckGL);
    
    if (DeckGL) {
      deckgl = new DeckGL({
        container: mapContainer,
        initialViewState: {
          longitude: 110,
          latitude: 30,
          zoom: 2.5,
          minZoom: 1,
          maxZoom: 10,
          pitch: 45,
          bearing: 0
        },
        controller: true,
        layers: [],
        useDevicePixels: true
      });
    }

    await loadConfig();

    if (gaodeApiKey) {
      await initGaodeMap();
      if (gaodeMap) {
        syncDeckWithGaode();
      }
    } else {
      mapLoading = false;
      mapMode = 'deckgl';
    }

    mapLoaded = true;
    loadData();
  });

  onDestroy(() => {
    if (deckgl) {
      deckgl.finalize();
      deckgl = null;
    }
    if (gaodeMap) {
      gaodeMap.destroy();
      gaodeMap = null;
    }
  });
</script>

<div class="app">
  <header class="header">
    <h1>💕 蜜月目的地可视化分析</h1>
    <p>全国新人"爱情航线"3D展示</p>
  </header>

  {#if mapLoading}
    <div class="map-status loading">
      <span class="status-icon">🗺️</span>
      <span>高德地图加载中...</span>
    </div>
  {:else if mapError}
    <div class="map-status warning">
      <span class="status-icon">⚠️</span>
      <span>高德地图加载失败: {mapError}，当前使用纯 Deck.gl 模式</span>
    </div>
  {:else if mapMode === 'deckgl'}
    <div class="map-status info">
      <span class="status-icon">💡</span>
      <span>当前使用纯 Deck.gl 模式（无底图）</span>
    </div>
  {/if}

  <div class="controls">
    <div class="control-group">
      <label>地区筛选：</label>
      <select bind:value={currentRegion}>
        <option value="">全部地区</option>
        <option value="长三角">长三角</option>
        <option value="珠三角">珠三角</option>
        <option value="环渤海">环渤海</option>
        <option value="中西部">中西部</option>
      </select>
    </div>
    <div class="control-group">
      <label>颜色模式：</label>
      <select bind:value={currentColorMode}>
        <option value="region">按地区</option>
        <option value="cost">按花费</option>
      </select>
    </div>
    <div class="control-group">
      <label>弧线宽度：</label>
      <input type="range" bind:value={arcWidth} min="1" max="10" />
      <span>{arcWidth}</span>
    </div>
    <div class="control-group">
      <label>坐标系：</label>
      <span class="coord-badge">{mapMode === 'gaode' ? 'GCJ-02' : 'WGS84'}</span>
    </div>
  </div>

  <div class="main-content">
    <div class="map-container">
      <div class="map-wrapper" bind:this={mapContainer}></div>
      {#if loading}
        <div class="loading-overlay">
          <div class="spinner"></div>
          <p>数据加载中...</p>
        </div>
      {/if}
      {#if error}
        <div class="error-overlay">
          <p>⚠️ 数据加载失败: {error}</p>
          <p class="hint">已使用模拟数据显示</p>
        </div>
      {/if}
    </div>

    <aside class="info-panel">
      <div class="stat-card">
        <h3>📊 总体统计</h3>
        {#if statistics}
          <div class="stat-item">
            <span class="stat-label">总订单数</span>
            <span class="stat-value">{statistics.totalPackages}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">航线数量</span>
            <span class="stat-value">{statistics.totalRoutes}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">平均花费</span>
            <span class="stat-value">¥{statistics.avgCost.toLocaleString()}</span>
          </div>
        {:else}
          <p class="loading-text">{loading ? '加载中...' : '暂无数据'}</p>
        {/if}
      </div>

      <div class="stat-card">
        <h3>🏆 长三角热门目的地</h3>
        {#if statistics?.regionStats?.['长三角']}
          {#each statistics.regionStats['长三角'].topDestinations as dest, i}
            <div class="dest-item">
              <span>{i + 1}. {dest.destination}</span>
              <span>{dest.count}次</span>
            </div>
          {/each}
        {:else}
          <p class="loading-text">{loading ? '加载中...' : '暂无数据'}</p>
        {/if}
      </div>

      <div class="stat-card">
        <h3>📍 航线详情</h3>
        {#if hoveredRoute}
          <div class="route-detail">
            <strong>{hoveredRoute.from.name} → {hoveredRoute.to.name}</strong><br />
            订单数: {hoveredRoute.count}<br />
            平均花费: ¥{hoveredRoute.avgCost.toLocaleString()}<br />
            人均收入: ¥{hoveredRoute.income.toLocaleString()}<br />
            距离: {hoveredRoute.distance} km
          </div>
        {:else}
          <p class="hint">悬停弧线查看详情</p>
        {/if}
      </div>
    </aside>
  </div>

  <div class="legend">
    <h4>图例</h4>
    <div class="legend-content">
      {#if currentColorMode === 'region'}
        {#each Object.entries(regionColors) as [name, color]}
          <div class="legend-item">
            <div class="legend-color" style="background: rgb({color.join(',')})"></div>
            <span>{name}</span>
          </div>
        {/each}
      {:else}
        {#each costColors as tier}
          <div class="legend-item">
            <div class="legend-color" style="background: rgb({tier.color.join(',')})"></div>
            <span>{tier.label}</span>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .app {
    display: grid;
    grid-template-rows: auto auto auto 1fr auto;
    grid-template-columns: 1fr 300px;
    grid-template-areas:
      "header header"
      "map-status map-status"
      "controls controls"
      "main main"
      "legend legend";
    height: 100vh;
    gap: 10px;
    padding: 10px;
  }

  .header {
    grid-area: header;
    text-align: center;
    color: white;
    padding: 15px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 12px;
  }

  .header h1 {
    font-size: 28px;
    margin-bottom: 5px;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  }

  .header p {
    font-size: 14px;
    opacity: 0.9;
  }

  .map-status {
    grid-area: map-status;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 14px;
    animation: slideIn 0.3s ease;
  }

  .map-status.loading {
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #3b82f6;
  }

  .map-status.warning {
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.3);
    color: #f59e0b;
  }

  .map-status.info {
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #10b981;
  }

  .status-icon {
    font-size: 18px;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .controls {
    grid-area: controls;
    display: flex;
    gap: 20px;
    padding: 15px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .control-group label {
    font-weight: 600;
    font-size: 14px;
    color: #555;
  }

  .control-group select,
  .control-group input[type="range"] {
    padding: 8px 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    background: white;
    cursor: pointer;
    transition: all 0.3s;
  }

  .control-group select:hover,
  .control-group input[type="range"]:hover {
    border-color: #667eea;
  }

  .control-group select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
  }

  .coord-badge {
    padding: 6px 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
  }

  .main-content {
    grid-area: main;
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 10px;
  }

  .map-container {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    background: #1a1a2e;
  }

  .map-wrapper {
    width: 100%;
    height: 100%;
    min-height: 500px;
  }

  .map-wrapper :global(.deckgl-overlay) {
    position: absolute !important;
    top: 0;
    left: 0;
    pointer-events: none;
  }

  .loading-overlay,
  .error-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(26, 26, 46, 0.9);
    color: white;
    z-index: 10;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 15px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-overlay p {
    margin: 5px 0;
  }

  .error-overlay .hint {
    font-size: 12px;
    opacity: 0.7;
  }

  .info-panel {
    display: flex;
    flex-direction: column;
    gap: 15px;
    overflow-y: auto;
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    padding: 15px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .stat-card h3 {
    font-size: 16px;
    margin-bottom: 12px;
    color: #667eea;
    border-bottom: 2px solid #f0f0f0;
    padding-bottom: 8px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .stat-label {
    color: #666;
  }

  .stat-value {
    font-weight: 600;
    color: #333;
  }

  .dest-item {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px dashed #eee;
  }

  .dest-item:last-child {
    border-bottom: none;
  }

  .loading-text,
  .hint {
    color: #999;
    font-size: 13px;
  }

  .route-detail {
    background: #f8f9ff;
    padding: 10px;
    border-radius: 8px;
    margin-top: 8px;
    font-size: 13px;
    line-height: 1.8;
  }

  .route-detail strong {
    color: #667eea;
  }

  .legend {
    grid-area: legend;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .legend h4 {
    font-size: 14px;
    color: #555;
    margin-right: 10px;
  }

  .legend-content {
    display: flex;
    gap: 25px;
    flex-wrap: wrap;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }

  .legend-color {
    width: 20px;
    height: 12px;
    border-radius: 3px;
  }

  @media (max-width: 1024px) {
    .app {
      grid-template-columns: 1fr;
      grid-template-areas:
        "header"
        "map-status"
        "controls"
        "main"
        "legend";
    }

    .main-content {
      grid-template-columns: 1fr;
    }

    .info-panel {
      flex-direction: row;
      flex-wrap: wrap;
    }

    .stat-card {
      flex: 1;
      min-width: 250px;
    }
  }
</style>
