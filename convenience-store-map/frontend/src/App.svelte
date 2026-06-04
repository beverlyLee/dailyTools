<script>
  let mapContainer;
  let map = null;
  let locaContainer = null;
  let prismLayer = null;
  let prismsLayer = null;
  let poisLayer = null;
  let sidebarOpen = $state(true);
  let loading = $state(false);
  let crawlRunning = $state(false);
  let crawlStatus = $state('');
  let activeTab = $state('overview');
  let overview = $state({});
  let gridsData = $state([]);
  let blindSpots = $state([]);
  let analysis = $state({});
  let pois = $state([]);
  let showPois = $state(false);
  let showBlindSpots = $state(true);
  let maxDensity = $state(0);
  let selectedGrid = $state(null);
  let show3D = $state(true);
  let mapError = $state(null);
  let dataError = $state(null);
  let mapScriptLoaded = $state(false);
  let crawlError = $state(null);
  let crawlStats = $state(null);
  let heightScale = $state(1.0);
  let heightOffset = $state(500);
  let colorIntensity = $state(1.0);

  const GAODE_JS_KEY = import.meta.env.VITE_GAODE_JS_KEY || '';
  const SHANGHAI_CENTER = [121.4737, 31.2304];

  function getDensityColor(count, max) {
    if (max === 0) return '#1e293b';
    const ratio = Math.min((count / max) * colorIntensity, 1);
    if (ratio === 0) return 'rgba(30, 41, 59, 0.3)';
    if (ratio < 0.2) return '#3b82f6';
    if (ratio < 0.4) return '#06b6d4';
    if (ratio < 0.6) return '#10b981';
    if (ratio < 0.8) return '#f59e0b';
    return '#ef4444';
  }

  function getDensityHeight(count, max) {
    if (max === 0 || count === 0) return 0;
    const ratio = Math.min(count / max, 1);
    return (heightOffset + ratio * 8000) * heightScale;
  }

  async function fetchApi(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (e) {
      console.error('API error:', e);
      dataError = e.message || String(e);
      return null;
    }
  }

  async function loadOverview() {
    const data = await fetchApi('/api/overview');
    if (data) {
      overview = data;
      dataError = null;
    }
  }

  async function loadDensity() {
    const data = await fetchApi('/api/density');
    if (data && data.grids) {
      gridsData = data.grids;
      maxDensity = Math.max(...data.grids.map(g => g.count), 0);
    }
  }

  async function loadBlindSpotsData() {
    const data = await fetchApi('/api/blind-spots');
    if (data) blindSpots = data.blind_spots || [];
  }

  async function loadAnalysisData() {
    const data = await fetchApi('/api/analysis');
    if (data) analysis = data;
  }

  async function loadPoisData() {
    const data = await fetchApi('/api/pois');
    if (data) pois = data.pois || [];
  }

  async function startCrawl(area = 'full') {
    if (crawlRunning) return;
    crawlRunning = true;
    crawlStatus = '正在启动爬虫...';
    crawlError = null;
    crawlStats = null;
    await fetchApi(`/api/crawl?area=${area}`);
    pollCrawlStatus();
  }

  async function pollCrawlStatus() {
    const check = async () => {
      const data = await fetchApi('/api/crawl/status');
      if (data) {
        if (data.running) {
          let statusText = data.progress || '运行中...';
          if (data.pois_count > 0) {
            statusText = `${statusText} · 已获取 ${data.pois_count} 条`;
          }
          crawlStatus = statusText;
          crawlStats = {
            total: data.grid_count || 0,
            success: data.success_grid_count || 0,
            empty: data.empty_grid_count || 0,
            failed: data.failed_grid_count || 0,
          };
          setTimeout(check, 2000);
        } else {
          crawlRunning = false;

          if (data.has_error) {
            const errorTitles = {
              'api_error': 'API 调用失败',
              'no_data': '无数据返回',
              'internal_error': '内部错误',
            };
            crawlError = {
              title: errorTitles[data.error_type] || '爬取异常',
              message: data.error_message || '未知错误',
              detail: data.status_code ? `状态码: ${data.status_code}` : null,
            };
            crawlStatus = data.progress === 'completed_with_errors' ? '部分完成' : '失败';
          } else {
            crawlError = null;
            crawlStatus = '完成';
          }

          crawlStats = {
            total: data.grid_count || 0,
            success: data.success_grid_count || 0,
            empty: data.empty_grid_count || 0,
            failed: data.failed_grid_count || 0,
          };

          await refreshAll();
        }
      }
    };
    check();
  }

  async function refreshAll() {
    loading = true;
    dataError = null;
    try {
      await Promise.all([
        loadOverview(),
        loadDensity(),
        loadBlindSpotsData(),
        loadAnalysisData(),
        loadPoisData(),
      ]);
      if (map) renderMap();
    } catch (e) {
      console.error('Refresh error:', e);
      dataError = e.message || '数据加载失败';
    } finally {
      loading = false;
    }
  }

  function initMap() {
    if (typeof AMap !== 'undefined' && typeof Loca !== 'undefined') {
      createMap();
      return;
    }

    if (mapScriptLoaded) return;

    if (!GAODE_JS_KEY) {
      mapError = '未配置高德地图 JS API Key，请在 .env 文件中设置 VITE_GAODE_JS_KEY';
      return;
    }

    mapScriptLoaded = true;

    try {
      const mapScript = document.createElement('script');
      mapScript.src = `https://webapi.amap.com/maps?v=2.0&key=${GAODE_JS_KEY}&plugin=AMap.DistrictSearch`;
      mapScript.onerror = (e) => {
        console.error('Failed to load Gaode map script:', e);
        mapError = '地图脚本加载失败，请检查网络连接或 API Key';
        mapScriptLoaded = false;
      };
      mapScript.onload = () => {
        const locaScript = document.createElement('script');
        locaScript.src = `https://webapi.amap.com/loca?v=2.0.0&key=${GAODE_JS_KEY}`;
        locaScript.onerror = (e) => {
          console.error('Failed to load Loca script:', e);
          mapError = 'Loca 可视化库加载失败，3D 功能不可用';
        };
        locaScript.onload = () => {
          try {
            createMap();
            mapError = null;
          } catch (e) {
            console.error('Failed to create map:', e);
            mapError = '地图初始化失败: ' + (e.message || String(e));
          }
        };
        document.head.appendChild(locaScript);
      };
      document.head.appendChild(mapScript);
    } catch (e) {
      console.error('Failed to inject map script:', e);
      mapError = '地图加载失败: ' + (e.message || String(e));
    }
  }

  function createMap() {
    if (!mapContainer) {
      mapError = '地图容器未找到';
      return;
    }

    try {
      map = new AMap.Map(mapContainer, {
        viewMode: show3D ? '3D' : '2D',
        pitch: 50,
        rotation: -15,
        zoom: 12,
        center: SHANGHAI_CENTER,
        mapStyle: 'amap://styles/dark',
        showLabel: true,
        showBuildings: true,
      });

      map.on('click', (e) => {
        try {
          const lng = e.lnglat.getLng();
          const lat = e.lnglat.getLat();
          const found = gridsData.find(g =>
            lng >= g.sw_lng && lng <= g.ne_lng &&
            lat >= g.sw_lat && lat <= g.ne_lat
          );
          selectedGrid = found || null;
        } catch (e) {
          console.error('Map click error:', e);
        }
      });

      if (typeof Loca !== 'undefined') {
        locaContainer = new Loca.Container({ map: map });
        new Loca.AmbientLight({ intensity: 0.6, color: '#fff' }, locaContainer);
        new Loca.DirectionalLight({
          intensity: 0.5,
          color: '#fff',
          position: [0, -1, 1],
          target: [0, 0, 0],
        }, locaContainer);
      }

      renderMap();
    } catch (e) {
      mapError = '地图创建失败: ' + (e.message || String(e));
      throw e;
    }
  }

  function renderMap() {
    if (!map) return;

    try {
      if (locaContainer && prismLayer) {
        locaContainer.remove(prismLayer);
        prismLayer = null;
      }
      if (prismsLayer) {
        try { map.remove(prismsLayer); } catch (e) {}
        prismsLayer = null;
      }
      if (poisLayer) {
        try { map.remove(poisLayer); } catch (e) {}
        poisLayer = null;
      }

      renderPrisms();
      if (showPois && pois.length > 0) renderPois();
      if (showBlindSpots && blindSpots.length > 0) renderBlindSpots();
    } catch (e) {
      console.error('Render map error:', e);
    }
  }

  let prismRenderFailed = $state(false);

  function renderPrisms() {
    if (!map || gridsData.length === 0) return;

    if (locaContainer && prismLayer) {
      locaContainer.remove(prismLayer);
      prismLayer = null;
    }
    if (prismsLayer) {
      try { map.remove(prismsLayer); } catch (e) {}
      prismsLayer = null;
    }

    try {
      if (typeof Loca === 'undefined' || typeof Loca.PrismLayer === 'undefined') {
        throw new Error('Loca.PrismLayer 不可用');
      }

      const features = gridsData
        .filter(g => g.count > 0)
        .map(g => ({
          type: 'Feature',
          properties: {
            count: g.count,
            height: getDensityHeight(g.count, maxDensity),
            color: getDensityColor(g.count, maxDensity),
            center_lng: g.center_lng,
            center_lat: g.center_lat,
            brands: g.brands || {},
          },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [g.sw_lng, g.sw_lat],
              [g.ne_lng, g.sw_lat],
              [g.ne_lng, g.ne_lat],
              [g.sw_lng, g.ne_lat],
              [g.sw_lng, g.sw_lat],
            ]],
          },
        }));

      const geoJSONData = {
        type: 'FeatureCollection',
        features: features,
      };

      const source = new Loca.GeoJSONSource({ data: geoJSONData });

      prismLayer = new Loca.PrismLayer({
        zIndex: 10,
        opacity: 0.8,
        visible: true,
      });

      prismLayer.setSource(source);
      prismLayer.setStyle({
        unit: 'meter',
        sideNumber: 4,
        topColor: (index, feature) => feature.properties.color,
        sideTopColor: (index, feature) => feature.properties.color,
        sideBottomColor: (index, feature) => {
          const c = feature.properties.color;
          return c + '88';
        },
        height: (index, feature) => feature.properties.height * heightScale,
        radius: 250,
      });

      locaContainer.add(prismLayer);
      locaContainer.animate.start();

      prismRenderFailed = false;
    } catch (e) {
      console.error('3D 柱体渲染失败，降级为 2D 显示:', e);
      prismRenderFailed = true;
      renderFallback2D();
    }
  }

  function renderFallback2D() {
    if (!map || gridsData.length === 0) return;

    try {
      const fallbackOverlays = gridsData
        .filter(g => g.count > 0)
        .map(g => {
          const color = getDensityColor(g.count, maxDensity);
          const polygon = new AMap.Polygon({
            path: [
              [g.sw_lng, g.sw_lat],
              [g.ne_lng, g.sw_lat],
              [g.ne_lng, g.ne_lat],
              [g.sw_lng, g.ne_lat],
            ],
            fillColor: color,
            fillOpacity: 0.6,
            strokeColor: color,
            strokeWeight: 0.5,
            strokeOpacity: 0.8,
          });

          polygon.on('click', () => {
            selectedGrid = g;
          });

          polygon.on('mouseover', () => {
            polygon.setOptions({ fillOpacity: 0.85 });
          });

          polygon.on('mouseout', () => {
            polygon.setOptions({ fillOpacity: 0.6 });
          });

          return polygon;
        });

      prismsLayer = new AMap.OverlayGroup(fallbackOverlays);
      map.add(prismsLayer);
    } catch (e) {
      console.error('2D 降级渲染也失败:', e);
      mapError = '图层渲染失败: ' + (e.message || String(e));
    }
  }

  function renderPois() {
    if (!map || pois.length === 0) return;

    try {
      const markers = pois.slice(0, 2000).map(poi => {
        const marker = new AMap.CircleMarker({
          center: [poi.lng, poi.lat],
          radius: 3,
          fillColor: getBrandColor(poi.brand),
          fillOpacity: 0.8,
          strokeColor: '#fff',
          strokeWeight: 0.5,
          strokeOpacity: 0.3,
        });
        marker._poiInfo = poi;
        return marker;
      });

      poisLayer = new AMap.OverlayGroup(markers);
      map.add(poisLayer);
    } catch (e) {
      console.error('Render POIs error:', e);
    }
  }

  function renderBlindSpots() {
    if (!map || blindSpots.length === 0) return;

    try {
      const overlays = blindSpots.map(spot => {
        const polygon = new AMap.Polygon({
          path: [
            [spot.sw_lng, spot.sw_lat],
            [spot.ne_lng, spot.sw_lat],
            [spot.ne_lng, spot.ne_lat],
            [spot.sw_lng, spot.ne_lat],
          ],
          fillColor: '#ef4444',
          fillOpacity: 0.2,
          strokeColor: '#ef4444',
          strokeWeight: 1,
          strokeOpacity: 0.6,
        });

        polygon.on('click', () => {
          selectedGrid = {
            count: 0,
            blind_spot_type: spot.blind_spot_type,
            nearest_store_distance_m: spot.nearest_store_distance_m,
            center_lng: spot.center_lng,
            center_lat: spot.center_lat,
          };
        });

        return polygon;
      });

      const blindLayer = new AMap.OverlayGroup(overlays);
      map.add(blindLayer);
    } catch (e) {
      console.error('Render blind spots error:', e);
    }
  }

  function getBrandColor(brand) {
    const colors = {
      '罗森': '#3b82f6',
      '全家': '#8b5cf6',
      '7-Eleven': '#ef4444',
      '快客': '#f59e0b',
      '可的': '#10b981',
      '好德': '#06b6d4',
      '良友': '#ec4899',
    };
    return colors[brand] || '#64748b';
  }

  function toggleViewMode() {
    show3D = !show3D;
    if (map) {
      map.setViewMode(show3D ? '3D' : '2D');
      map.setPitch(show3D ? 50 : 0);
    }
  }

  function getPriorityIcon(priority) {
    switch (priority) {
      case '极高': return '🔴';
      case '高': return '🟠';
      case '中高': return '🟡';
      case '中': return '🟢';
      default: return '📍';
    }
  }

  $effect(() => {
    if (mapContainer) {
      initMap();
      refreshAll();
    }
  });
</script>

<div class="app-container">
  <div class="sidebar" class:collapsed={!sidebarOpen}>
    <div class="sidebar-toggle" onclick={() => sidebarOpen = !sidebarOpen}>
      {sidebarOpen ? '◀' : '▶'}
    </div>

    {#if sidebarOpen}
      <div class="sidebar-content">
        <div class="sidebar-header">
          <h1>🏪 便利店密度地图</h1>
          <p class="subtitle">网格化分布密度 3D 可视化</p>
        </div>

        {#if dataError}
          <div class="error-banner">
            <span class="error-icon">⚠️</span>
            <div class="error-content">
              <div class="error-title">数据加载异常</div>
              <div class="error-message">{dataError}</div>
            </div>
            <button class="error-close" onclick={() => dataError = null}>✕</button>
          </div>
        {/if}

        <div class="tabs">
          <button class="tab" class:active={activeTab === 'overview'} onclick={() => activeTab = 'overview'}>概览</button>
          <button class="tab" class:active={activeTab === 'crawl'} onclick={() => activeTab = 'crawl'}>抓取</button>
          <button class="tab" class:active={activeTab === 'analysis'} onclick={() => activeTab = 'analysis'}>分析</button>
        </div>

        {#if activeTab === 'overview'}
          <div class="tab-content">
            {#if overview.data_health}
              <div class="health-banner" class:warning={overview.data_health.status === 'warning'} class:demo={overview.data_health.status === 'demo'}>
                <span class="health-icon">
                  {overview.data_health.status === 'healthy' ? '✅' : overview.data_health.status === 'demo' ? '🧪' : '⚠️'}
                </span>
                <div class="health-content">
                  <div class="health-title">
                    {overview.data_health.status === 'demo' ? '演示数据' : overview.data_health.status === 'healthy' ? '数据正常' : '数据警告'}
                  </div>
                  <div class="health-message">{overview.data_health.message}</div>
                  {#if overview.data_source?.source}
                    <div class="health-source">
                      来源: {overview.data_source.source === 'demo' ? '模拟生成' : '高德 API 爬取'}
                      {#if overview.data_source?.generated_at}
                        · {new Date(overview.data_source.generated_at).toLocaleString()}
                      {/if}
                    </div>
                  {/if}
                </div>
              </div>
            {/if}

            <div class="stat-grid">
              <div class="stat-card">
                <div class="stat-value">{overview.pois_count || 0}</div>
                <div class="stat-label">便利店总数</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{overview.grids_count || 0}</div>
                <div class="stat-label">网格数量</div>
              </div>
              <div class="stat-card accent">
                <div class="stat-value">{overview.blind_spots_count || 0}</div>
                <div class="stat-label">服务盲区</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">{overview.analysis?.coverage_rate || 0}%</div>
                <div class="stat-label">覆盖率</div>
              </div>
            </div>

            {#if overview.analysis?.brand_distribution}
              <div class="section">
                <h3>品牌分布</h3>
                <div class="brand-list">
                  {#each Object.entries(overview.analysis.brand_distribution) as [brand, count]}
                    <div class="brand-item">
                      <span class="brand-dot" style="background: {getBrandColor(brand)}"></span>
                      <span class="brand-name">{brand}</span>
                      <span class="brand-count">{count}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            {#if overview.analysis}
              <div class="section">
                <h3>密度统计</h3>
                <div class="detail-list">
                  <div class="detail-item">
                    <span>最高密度</span>
                    <span class="detail-value">{overview.analysis.max_density || 0} 家/网格</span>
                  </div>
                  <div class="detail-item">
                    <span>平均密度</span>
                    <span class="detail-value">{overview.analysis.avg_density || 0} 家/网格</span>
                  </div>
                  <div class="detail-item">
                    <span>已覆盖网格</span>
                    <span class="detail-value">{overview.analysis.covered_grids || 0}</span>
                  </div>
                  <div class="detail-item">
                    <span>空白网格</span>
                    <span class="detail-value">{overview.analysis.blind_grids || 0}</span>
                  </div>
                </div>
              </div>
            {/if}

            <div class="section">
              <h3>图层控制</h3>
              <div class="toggle-group">
                <label class="toggle-item">
                  <input type="checkbox" bind:checked={show3D} onchange={toggleViewMode} />
                  <span>3D 柱体视图</span>
                </label>
                <label class="toggle-item">
                  <input type="checkbox" bind:checked={showPois} onchange={renderMap} />
                  <span>便利店标记</span>
                </label>
                <label class="toggle-item">
                  <input type="checkbox" bind:checked={showBlindSpots} onchange={renderMap} />
                  <span>服务盲区</span>
                </label>
              </div>
            </div>

            {#if show3D}
              <div class="section">
                <h3>3D 柱体调节</h3>
                {#if prismRenderFailed}
                  <div class="prism-fallback-notice">
                    ⚠️ 3D 柱体渲染失败，当前为 2D 降级显示
                  </div>
                {/if}
                <div class="slider-group">
                  <div class="slider-item">
                    <label>高度缩放</label>
                    <input type="range" min="0.2" max="3" step="0.1" bind:value={heightScale} oninput={renderMap} />
                    <span class="slider-value">{heightScale.toFixed(1)}x</span>
                  </div>
                  <div class="slider-item">
                    <label>基础高度</label>
                    <input type="range" min="0" max="2000" step="100" bind:value={heightOffset} oninput={renderMap} />
                    <span class="slider-value">{heightOffset}m</span>
                  </div>
                  <div class="slider-item">
                    <label>颜色强度</label>
                    <input type="range" min="0.3" max="2" step="0.1" bind:value={colorIntensity} oninput={renderMap} />
                    <span class="slider-value">{colorIntensity.toFixed(1)}x</span>
                  </div>
                </div>
              </div>
            {/if}

            <button class="btn btn-primary full-width" onclick={refreshAll} disabled={loading}>
              {loading ? '加载中...' : '🔄 刷新数据'}
            </button>
          </div>
        {/if}

        {#if activeTab === 'crawl'}
          <div class="tab-content">
            <div class="section">
              <h3>POI 数据抓取</h3>
              <p class="section-desc">从高德地图 API 批量抓取便利店 POI 数据</p>

              <div class="crawl-buttons">
                <button class="btn btn-primary" onclick={() => startCrawl('inner')} disabled={crawlRunning}>
                  🏙️ 上海内环
                </button>
                <button class="btn btn-accent" onclick={() => startCrawl('full')} disabled={crawlRunning}>
                  🗺️ 上海全市
                </button>
              </div>

              {#if crawlRunning || crawlStatus}
                <div class="crawl-status">
                  <div class="status-indicator" class:running={crawlRunning}></div>
                  <span>{crawlStatus}</span>
                </div>
              {/if}

              {#if crawlError}
                <div class="error-banner" style="margin-top: 12px;">
                  <span class="error-icon">⚠️</span>
                  <div class="error-content">
                    <div class="error-title">{crawlError.title}</div>
                    <div class="error-message">{crawlError.message}</div>
                    {#if crawlError.detail}
                      <div class="error-detail">{crawlError.detail}</div>
                    {/if}
                  </div>
                </div>
              {/if}

              {#if crawlStats}
                <div class="crawl-stats">
                  <div class="stat-mini">
                    <span class="stat-mini-value">{crawlStats.total}</span>
                    <span class="stat-mini-label">网格总数</span>
                  </div>
                  <div class="stat-mini success">
                    <span class="stat-mini-value">{crawlStats.success}</span>
                    <span class="stat-mini-label">成功</span>
                  </div>
                  <div class="stat-mini warning">
                    <span class="stat-mini-value">{crawlStats.empty}</span>
                    <span class="stat-mini-label">无数据</span>
                  </div>
                  <div class="stat-mini danger">
                    <span class="stat-mini-value">{crawlStats.failed}</span>
                    <span class="stat-mini-label">失败</span>
                  </div>
                </div>
              {/if}
            </div>

            <div class="section">
              <h3>配置提示</h3>
              <div class="notice-box">
                <div class="notice-icon">📝</div>
                <div class="notice-content">
                  <p>在项目根目录的 <code>.env</code> 文件中配置：</p>
                  <p><code>GAODE_WEB_SERVICE_KEY=你的API密钥</code></p>
                </div>
              </div>
            </div>

            <div class="section">
              <h3>网格参数</h3>
              <div class="param-item">
                <span>网格尺寸</span>
                <span class="param-value">500m × 500m</span>
              </div>
              <div class="param-item">
                <span>POI 类型</span>
                <span class="param-value">便利店 (050400)</span>
              </div>
              <div class="param-item">
                <span>品牌识别</span>
                <span class="param-value">罗森/全家/7-Eleven等</span>
              </div>
            </div>
          </div>
        {/if}

        {#if activeTab === 'analysis'}
          <div class="tab-content">
            <div class="section">
              <h3>服务盲区分析</h3>
              <p class="section-desc">识别便利店数量为 0 且远离现有设施的居住区</p>
              <div class="blind-spot-summary">
                <div class="stat-card danger">
                  <div class="stat-value">{blindSpots.length}</div>
                  <div class="stat-label">服务盲区</div>
                </div>
              </div>

              {#if analysis?.blind_spot_types}
                <div class="section">
                  <h4 style="font-size: 13px; margin-bottom: 8px; color: var(--text-primary);">盲区类型分布</h4>
                  <div class="brand-list">
                    {#each Object.entries(analysis.blind_spot_types) as [type, count]}
                      <div class="brand-item">
                        <span class="brand-dot" style="background: var(--danger); opacity: 0.7;"></span>
                        <span class="brand-name">{type}</span>
                        <span class="brand-count">{count}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              {#if blindSpots.length > 0}
                <div class="blind-spot-list">
                  {#each blindSpots.slice(0, 20) as spot}
                    <div class="blind-spot-item" onclick={() => {
                      if (map) map.setCenter([spot.center_lng, spot.center_lat]);
                      selectedGrid = spot;
                    }}>
                      <div class="blind-spot-icon">
                        {getPriorityIcon(spot.blind_spot_priority)}
                      </div>
                      <div class="blind-spot-info">
                        <div class="blind-spot-type-row">
                          <span class="blind-spot-type">{spot.blind_spot_type || '服务盲区'}</span>
                          <span class="priority-tag" class:p0={spot.blind_spot_priority === '极高'} class:p1={spot.blind_spot_priority === '高'}>
                            {spot.blind_spot_priority || '中'}
                          </span>
                        </div>
                        {#if spot.blind_spot_sub_type}
                          <div class="blind-spot-sub">{spot.blind_spot_sub_type}</div>
                        {/if}
                        <div class="blind-spot-meta">
                          <span>{spot.blind_spot_category}</span>
                          <span>·</span>
                          <span>距最近 {spot.nearest_store_distance_m}m</span>
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {/if}

        {#if selectedGrid}
          <div class="selected-grid-panel">
            <div class="panel-header">
              <h3>网格详情</h3>
              <button class="close-btn" onclick={() => selectedGrid = null}>✕</button>
            </div>
            <div class="panel-body">
              <div class="detail-item">
                <span>便利店数量</span>
                <span class="detail-value highlight">{selectedGrid.count}</span>
              </div>
              <div class="detail-item">
                <span>坐标</span>
                <span class="detail-value">{selectedGrid.center_lng?.toFixed(4)}, {selectedGrid.center_lat?.toFixed(4)}</span>
              </div>
              {#if selectedGrid.brands && Object.keys(selectedGrid.brands).length > 0}
                <div class="detail-item column">
                  <span>品牌构成</span>
                  <div class="brand-composition">
                    {#each Object.entries(selectedGrid.brands) as [brand, count]}
                      <span class="brand-tag" style="background: {getBrandColor(brand)}20; color: {getBrandColor(brand)}; border: 1px solid {getBrandColor(brand)}40">
                        {brand} ×{count}
                      </span>
                    {/each}
                  </div>
                </div>
              {/if}
              {#if selectedGrid.blind_spot_type}
                <div class="detail-item">
                  <span>盲区类型</span>
                  <span class="detail-value danger">{selectedGrid.blind_spot_type}</span>
                </div>
                {#if selectedGrid.blind_spot_sub_type}
                  <div class="detail-item">
                    <span>子类型</span>
                    <span class="detail-value">{selectedGrid.blind_spot_sub_type}</span>
                  </div>
                {/if}
                {#if selectedGrid.blind_spot_category}
                  <div class="detail-item">
                    <span>分类</span>
                    <span class="detail-value">{selectedGrid.blind_spot_category}</span>
                  </div>
                {/if}
                {#if selectedGrid.blind_spot_priority}
                  <div class="detail-item">
                    <span>优先级</span>
                    <span class="detail-value danger">{selectedGrid.blind_spot_priority}</span>
                  </div>
                {/if}
                <div class="detail-item">
                  <span>最近便利店</span>
                  <span class="detail-value">{selectedGrid.nearest_store_distance_m}m</span>
                </div>
                {#if selectedGrid.estimated_pop_density}
                  <div class="detail-item">
                    <span>人口密度估算</span>
                    <span class="detail-value">{selectedGrid.estimated_pop_density}</span>
                  </div>
                {/if}
                {#if selectedGrid.surrounding_density}
                  <div class="detail-item">
                    <span>周边密度</span>
                    <span class="detail-value">{selectedGrid.surrounding_density}</span>
                  </div>
                {/if}
                {#if selectedGrid.distance_to_center_m}
                  <div class="detail-item">
                    <span>距市中心</span>
                    <span class="detail-value">{selectedGrid.distance_to_center_m > 1000 ? (selectedGrid.distance_to_center_m / 1000).toFixed(1) + 'km' : selectedGrid.distance_to_center_m + 'm'}</span>
                  </div>
                {/if}
              {/if}
            </div>
          </div>
        {/if}

        <div class="legend">
          <h3>密度图例</h3>
          <div class="legend-bar">
            <div class="legend-gradient"></div>
            <div class="legend-labels">
              <span>0</span>
              <span>低</span>
              <span>中</span>
              <span>高</span>
            </div>
          </div>
          <div class="legend-items">
            <div class="legend-item">
              <span class="legend-color" style="background: #ef4444"></span>
              <span>便利店森林</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background: #3b82f6"></span>
              <span>便利店稀疏区</span>
            </div>
            <div class="legend-item">
              <span class="legend-color" style="background: rgba(239,68,68,0.3); border: 1px dashed #ef4444"></span>
              <span>便利店荒漠</span>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <div class="map-wrapper">
    <div class="map-container" bind:this={mapContainer}></div>

    {#if loading}
      <div class="loading-overlay">
        <div class="spinner"></div>
        <span>加载数据中...</span>
      </div>
    {/if}

    {#if mapError}
      <div class="map-error-overlay">
        <div class="map-error-card">
          <div class="error-icon-large">🗺️</div>
          <h3>地图加载失败</h3>
          <p class="map-error-text">{mapError}</p>
          <div class="map-error-hint">
            <p>请检查以下配置：</p>
            <ul>
              <li>在项目根目录 <code>.env</code> 文件中配置 <code>VITE_GAODE_JS_KEY=你的API密钥</code></li>
              <li>确保网络可访问高德地图服务</li>
              <li>检查浏览器控制台获取详细错误信息</li>
            </ul>
          </div>
          <button class="btn btn-primary" onclick={() => { mapError = null; mapScriptLoaded = false; initMap(); }}>
            🔄 重试加载地图
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .app-container {
    display: flex;
    width: 100%;
    height: 100vh;
    position: relative;
  }

  .sidebar {
    width: 340px;
    min-width: 340px;
    height: 100vh;
    background: var(--bg-card);
    border-right: 1px solid var(--border);
    display: flex;
    position: relative;
    z-index: 10;
    transition: width 0.3s, min-width 0.3s;
    overflow: hidden;
  }

  .sidebar.collapsed {
    width: 40px;
    min-width: 40px;
  }

  .sidebar-toggle {
    position: absolute;
    right: -32px;
    top: 50%;
    transform: translateY(-50%);
    width: 32px;
    height: 48px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-left: none;
    border-radius: 0 8px 8px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-secondary);
    font-size: 12px;
    z-index: 11;
  }

  .sidebar-toggle:hover {
    background: var(--bg-card-hover);
    color: var(--text-primary);
  }

  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .sidebar-header {
    margin-bottom: 16px;
  }

  .sidebar-header h1 {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .subtitle {
    font-size: 12px;
    color: var(--text-secondary);
  }

  .error-banner {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .error-icon {
    font-size: 18px;
    flex-shrink: 0;
  }

  .error-content {
    flex: 1;
  }

  .error-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--danger);
    margin-bottom: 2px;
  }

  .error-message {
    font-size: 11px;
    color: var(--text-secondary);
    word-break: break-all;
  }

  .error-detail {
    font-size: 10px;
    color: var(--text-secondary);
    margin-top: 4px;
    opacity: 0.8;
  }

  .error-close {
    background: transparent;
    color: var(--text-secondary);
    font-size: 14px;
    padding: 2px;
    cursor: pointer;
  }

  .crawl-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    margin-top: 12px;
  }

  .stat-mini {
    background: var(--bg-dark);
    border-radius: 6px;
    padding: 8px 4px;
    text-align: center;
    border: 1px solid var(--border);
  }

  .stat-mini.success {
    border-color: var(--success);
  }

  .stat-mini.warning {
    border-color: var(--warning);
  }

  .stat-mini.danger {
    border-color: var(--danger);
  }

  .stat-mini-value {
    display: block;
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .stat-mini.success .stat-mini-value {
    color: var(--success);
  }

  .stat-mini.warning .stat-mini-value {
    color: var(--warning);
  }

  .stat-mini.danger .stat-mini-value {
    color: var(--danger);
  }

  .stat-mini-label {
    font-size: 10px;
    color: var(--text-secondary);
  }

  .tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 16px;
    background: var(--bg-dark);
    border-radius: 8px;
    padding: 4px;
  }

  .tab {
    flex: 1;
    padding: 8px 12px;
    background: transparent;
    color: var(--text-secondary);
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .tab:hover {
    color: var(--text-primary);
  }

  .tab.active {
    background: var(--primary);
    color: white;
  }

  .tab-content {
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .stat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 16px;
  }

  .stat-card {
    background: var(--bg-dark);
    border-radius: 10px;
    padding: 14px;
    text-align: center;
    border: 1px solid var(--border);
  }

  .stat-card.accent {
    border-color: var(--accent);
  }

  .stat-card.danger {
    border-color: var(--danger);
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .stat-card.danger .stat-value {
    color: var(--danger);
  }

  .stat-label {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 4px;
  }

  .section {
    margin-bottom: 16px;
  }

  .section h3 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .section-desc {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 12px;
  }

  .brand-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .brand-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: var(--bg-dark);
    border-radius: 6px;
    font-size: 13px;
  }

  .brand-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .brand-name {
    flex: 1;
    color: var(--text-primary);
  }

  .brand-count {
    color: var(--text-secondary);
    font-size: 12px;
  }

  .detail-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--bg-dark);
    border-radius: 6px;
    font-size: 13px;
  }

  .detail-item.column {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .detail-value {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .detail-value.highlight {
    color: var(--accent);
    font-size: 16px;
  }

  .detail-value.danger {
    color: var(--danger);
  }

  .toggle-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .toggle-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text-primary);
    cursor: pointer;
  }

  .toggle-item input[type="checkbox"] {
    accent-color: var(--primary);
  }

  .btn {
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--primary);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--primary-light);
  }

  .btn-accent {
    background: var(--accent);
    color: white;
  }

  .btn-accent:hover:not(:disabled) {
    opacity: 0.9;
  }

  .full-width {
    width: 100%;
  }

  .crawl-buttons {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .crawl-buttons .btn {
    flex: 1;
  }

  .crawl-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px;
    background: var(--bg-dark);
    border-radius: 6px;
    font-size: 13px;
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-secondary);
  }

  .status-indicator.running {
    background: var(--success);
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .notice-box {
    display: flex;
    gap: 10px;
    padding: 12px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .notice-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .notice-content {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .notice-content code {
    background: var(--bg-dark);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    color: var(--accent);
  }

  .param-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
  }

  .param-value {
    color: var(--accent);
  }

  .blind-spot-summary {
    margin-bottom: 12px;
  }

  .blind-spot-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 400px;
    overflow-y: auto;
  }

  .blind-spot-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: var(--bg-dark);
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
    border: 1px solid transparent;
  }

  .blind-spot-item:hover {
    background: var(--bg-card-hover);
    border-color: var(--danger);
  }

  .blind-spot-icon {
    font-size: 16px;
  }

  .blind-spot-info {
    flex: 1;
  }

  .blind-spot-type-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .blind-spot-subtype {
    font-size: 10px;
    color: var(--text-secondary);
    background: var(--bg-dark);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .blind-spot-type {
    font-size: 13px;
    font-weight: 600;
    color: var(--danger);
  }

  .blind-spot-dist {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 2px;
  }

  .selected-grid-panel {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bg-card);
    border-top: 1px solid var(--border);
    border-radius: 12px 12px 0 0;
    padding: 16px;
    z-index: 5;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .panel-header h3 {
    font-size: 14px;
    font-weight: 600;
  }

  .close-btn {
    background: transparent;
    color: var(--text-secondary);
    font-size: 16px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .close-btn:hover {
    background: var(--bg-card-hover);
  }

  .panel-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .brand-composition {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }

  .brand-tag {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
  }

  .legend {
    margin-top: auto;
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }

  .legend h3 {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .legend-bar {
    margin-bottom: 10px;
  }

  .legend-gradient {
    height: 8px;
    border-radius: 4px;
    background: linear-gradient(to right, #3b82f6, #06b6d4, #10b981, #f59e0b, #ef4444);
  }

  .legend-labels {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--text-secondary);
    margin-top: 4px;
  }

  .legend-items {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .map-wrapper {
    flex: 1;
    position: relative;
    height: 100vh;
  }

  .map-container {
    width: 100%;
    height: 100%;
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.7);
    z-index: 5;
    gap: 12px;
    color: var(--text-secondary);
    font-size: 14px;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .map-error-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-dark);
    z-index: 5;
    padding: 20px;
  }

  .map-error-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 32px;
    max-width: 450px;
    text-align: center;
  }

  .error-icon-large {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .map-error-card h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--danger);
    margin-bottom: 12px;
  }

  .map-error-text {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 20px;
    word-break: break-all;
  }

  .map-error-hint {
    text-align: left;
    background: var(--bg-dark);
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .map-error-hint p {
    font-size: 12px;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .map-error-hint ul {
    margin: 0;
    padding-left: 20px;
  }

  .map-error-hint li {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 6px;
    line-height: 1.5;
  }

  .map-error-hint code {
    background: var(--bg-card);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    color: var(--accent);
  }

  .health-banner {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 16px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .health-banner.demo {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.3);
  }

  .health-banner.warning {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.3);
  }

  .health-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .health-content {
    flex: 1;
  }

  .health-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 2px;
  }

  .health-message {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }

  .health-source {
    font-size: 10px;
    color: var(--text-muted);
  }

  .slider-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .slider-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .slider-item label {
    font-size: 12px;
    color: var(--text-secondary);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .slider-item input[type="range"] {
    width: 100%;
    accent-color: var(--primary);
  }

  .slider-value {
    font-size: 11px;
    color: var(--text-primary);
    font-weight: 500;
  }

  .priority-tag {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    background: var(--bg-muted);
    color: var(--text-secondary);
  }

  .priority-tag.p0 {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }

  .priority-tag.p1 {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
  }

  .blind-spot-sub {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .blind-spot-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .prism-fallback-notice {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    margin-bottom: 12px;
    text-align: center;
  }
</style>
