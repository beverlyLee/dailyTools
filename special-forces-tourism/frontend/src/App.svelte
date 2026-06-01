<script>
  import { onMount, onDestroy, tick } from 'svelte'
  import { Deck, TileLayer, BitmapLayer } from 'deck.gl'
  import * as layers from '@deck.gl/layers'

  let selectedCity = 'all'
  let selectedRouteId = null
  let arcData = []
  let pois = []
  let topPois = []
  let recommendations = []
  let cityStats = {}
  let overallStats = null
  let loading = true
  let deckgl = null
  let mapContainer = null

  const cities = ['all', '南京', '重庆', '长沙']
  const cityLabels = { 'all': '全部', '南京': '南京', '重庆': '重庆', '长沙': '长沙' }

  const cityViewStates = {
    'all': {
      longitude: 113.5,
      latitude: 31.0,
      zoom: 4.8,
      pitch: 30,
      bearing: 0
    },
    '南京': {
      longitude: 118.78,
      latitude: 32.05,
      zoom: 11.5,
      pitch: 45,
      bearing: 0
    },
    '重庆': {
      longitude: 106.56,
      latitude: 29.56,
      zoom: 11.5,
      pitch: 45,
      bearing: 0
    },
    '长沙': {
      longitude: 112.95,
      latitude: 28.19,
      zoom: 12,
      pitch: 45,
      bearing: 0
    }
  }

  async function fetchData() {
    loading = true
    try {
      const city = selectedCity === 'all' ? '' : selectedCity

      const [arcsRes, topPoisRes, statsRes] = await Promise.all([
        fetch(`/api/arcs${city ? '/' + city : ''}`),
        fetch(`/api/hotspots/top-pois${city ? '/' + city : ''}`),
        fetch('/api/stats')
      ])

      arcData = await arcsRes.json()
      topPois = await topPoisRes.json()
      overallStats = await statsRes.json()

      if (selectedCity !== 'all') {
        const [recRes, cityStatsRes] = await Promise.all([
          fetch(`/api/recommendations/${selectedCity}`),
          fetch(`/api/stats/${selectedCity}`)
        ])
        recommendations = await recRes.json()
        cityStats = await cityStatsRes.json()
      } else {
        recommendations = []
        cityStats = {}
      }

      const poiIds = new Set()
      arcData.forEach(a => {
        poiIds.add(`${a.from.city} - ${a.from.name}`)
        poiIds.add(`${a.to.city} - ${a.to.name}`)
      })
      pois = Array.from(poiIds).map(id => {
        const arc = arcData.find(a => `${a.from.city} - ${a.from.name}` === id || `${a.to.city} - ${a.to.name}` === id)
        if (!arc) return null
        const point = `${arc.from.city} - ${arc.from.name}` === id ? arc.from : arc.to
        return {
          id,
          name: point.name,
          city: point.city,
          coordinates: point.coordinates
        }
      }).filter(Boolean)

      updateMap()
    } catch (e) {
      console.error('Failed to fetch data:', e)
    } finally {
      loading = false
    }
  }

  function updateMap() {
    if (!deckgl || !mapContainer) return

    const maxCount = Math.max(...arcData.map(a => a.count), 1)

    const arcLayer = new layers.ArcLayer({
      id: 'arcs',
      data: arcData,
      getSourcePosition: d => d.from.coordinates,
      getTargetPosition: d => d.to.coordinates,
      getSourceColor: d => {
        if (d.from.city === '南京') return [245, 158, 11]
        if (d.from.city === '重庆') return [239, 68, 68]
        if (d.from.city === '长沙') return [59, 130, 246]
        return [245, 158, 11]
      },
      getTargetColor: d => {
        if (d.to.city === '南京') return [245, 158, 11]
        if (d.to.city === '重庆') return [239, 68, 68]
        if (d.to.city === '长沙') return [59, 130, 246]
        return [245, 158, 11]
      },
      getWidth: d => Math.max(1, (d.count / maxCount) * 9),
      getHeight: 0.6,
      greatCircle: false,
      opacity: 0.75,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 200],
      onHover: info => {
        const canvas = mapContainer && mapContainer.querySelector('canvas')
        if (info.object) {
          if (canvas) canvas.style.cursor = 'pointer'
          document.title = `${info.object.from.name} → ${info.object.to.name} (${info.object.count}次)`
        } else {
          if (canvas) canvas.style.cursor = 'grab'
          document.title = '特种兵旅游 - 高强度路线挖掘'
        }
      },
      onClick: info => {
        if (info.object) {
          console.log('Arc clicked:', info.object)
        }
      }
    })

    const poiLayer = new layers.ScatterplotLayer({
      id: 'pois',
      data: topPois,
      getPosition: d => d.coordinates,
      getRadius: d => Math.max(80, d.count * 15),
      getFillColor: d => {
        if (d.city === '南京') return [245, 158, 11, 200]
        if (d.city === '重庆') return [239, 68, 68, 200]
        if (d.city === '长沙') return [59, 130, 246, 200]
        return [245, 158, 11, 200]
      },
      getLineColor: [255, 255, 255, 255],
      getLineWidth: 2,
      opacity: 0.9,
      pickable: true,
      radiusMinPixels: 4,
      radiusMaxPixels: 25,
      stroked: true
    })

    const textLayer = new layers.TextLayer({
      id: 'poi-labels',
      data: topPois.slice(0, 8),
      getPosition: d => [d.coordinates[0], d.coordinates[1], 50],
      getText: d => d.name,
      getSize: 11,
      getAngle: 0,
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom',
      getPixelOffset: [0, -8],
      getColor: [226, 232, 240, 220],
      getOutlineWidth: 2,
      getOutlineColor: [10, 15, 26, 255],
      sizeScale: 1,
      sizeMinPixels: 10,
      sizeMaxPixels: 18
    })

    let selectedRouteLayer = null
    if (selectedRouteId && recommendations.length > 0) {
      const route = recommendations.find(r => r.id === selectedRouteId)
      if (route && route.poi_details && route.poi_details.length > 1) {
        const routeArcs = []
        for (let i = 0; i < route.poi_details.length - 1; i++) {
          const from = route.poi_details[i]
          const to = route.poi_details[i + 1]
          routeArcs.push({
            from: { coordinates: from.coordinates, name: from.name },
            to: { coordinates: to.coordinates, name: to.name },
            count: 1
          })
        }
        selectedRouteLayer = new layers.ArcLayer({
          id: 'selected-route',
          data: routeArcs,
          getSourcePosition: d => d.from.coordinates,
          getTargetPosition: d => d.to.coordinates,
          getSourceColor: [34, 197, 94],
          getTargetColor: [34, 197, 94],
          getWidth: 4,
          getHeight: 0.8,
          greatCircle: false,
          opacity: 1,
          pickable: false
        })
      }
    }

    const tileLayer = new TileLayer({
      id: 'basemap',
      data: 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
      minZoom: 0,
      maxZoom: 18,
      tileSize: 256,
      opacity: 1,
      maxRequests: 8,
      renderSubLayers: props => {
        const {tile} = props
        if (!tile || !tile.data) return []
        return [new BitmapLayer({
          id: `${props.id}-bitmap`,
          data: {
            bounds: tile.boundingBox,
            image: tile.data
          },
          pickable: false,
          _imageCoordinateSystem: 1
        })]
      }
    })

    const allLayers = [tileLayer, arcLayer, poiLayer]
    if (selectedRouteLayer) {
      allLayers.push(selectedRouteLayer)
    }

    const viewState = { ...cityViewStates[selectedCity] }

    deckgl.setProps({
      layers: allLayers,
      initialViewState: viewState,
      viewState
    })
  }

  function selectCity(city) {
    selectedCity = city
    selectedRouteId = null
    fetchData()
  }

  function selectRoute(routeId) {
    selectedRouteId = selectedRouteId === routeId ? null : routeId
    tick().then(() => updateMap())
  }

  function getDifficultyClass(d) {
    if (d === '入门') return 'easy'
    if (d === '硬核') return 'medium'
    return ''
  }

  onMount(async () => {
    const initDeck = () => {
      const container = document.querySelector('.map-container')
      if (!container) {
        requestAnimationFrame(initDeck)
        return
      }

      deckgl = new Deck({
        container,
        width: '100%',
        height: '100%',
        initialViewState: cityViewStates['all'],
        controller: true,
        layers: []
      })

      mapContainer = container
      fetchData()
    }

    requestAnimationFrame(initDeck)
  })

  onDestroy(() => {
    if (deckgl) {
      deckgl.finalize()
    }
  })

  $: {
    if (deckgl) {
      updateMap()
    }
  }
</script>

<div class="app-container">
  <div class="map-container" bind:this={mapContainer}>
    <div class="top-bar">
      <div class="brand">
        <div class="brand-logo">⚡</div>
        <div class="brand-text">
          <div class="main">特种兵旅游路线挖掘</div>
          <div class="sub">30小时吃6顿 · 高强度行程分析</div>
        </div>
      </div>
      {#if overallStats}
        <div class="stats-banner">
          <div class="banner-stat">
            <div class="value">{overallStats.route_statistics.total_routes}</div>
            <div class="label">路线总数</div>
          </div>
          <div class="banner-stat">
            <div class="value">{overallStats.route_statistics.avg_pois}</div>
            <div class="label">平均景点</div>
          </div>
          <div class="banner-stat">
            <div class="value">{overallStats.total_pois}</div>
            <div class="label">POI总数</div>
          </div>
          <div class="banner-stat">
            <div class="value">3</div>
            <div class="label">热门城市</div>
          </div>
        </div>
      {/if}
    </div>

    <div class="legend">
      <div class="legend-title">图例</div>
      <div class="legend-item">
        <div class="legend-line" style="width: 24px; background: #f59e0b;"></div>
        <span>南京路线</span>
      </div>
      <div class="legend-item">
        <div class="legend-line" style="width: 24px; background: #ef4444;"></div>
        <span>重庆路线</span>
      </div>
      <div class="legend-item">
        <div class="legend-line" style="width: 24px; background: #3b82f6;"></div>
        <span>长沙路线</span>
      </div>
      <div class="legend-item">
        <div class="legend-poi"></div>
        <span>热门景点</span>
      </div>
      <div class="legend-item" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
        <span style="color: #64748b;">线宽 = 热度</span>
      </div>
    </div>
  </div>

  <div class="sidebar">
    <div class="header">
      <div class="title">⚡ 高强度路线挖掘</div>
      <div class="subtitle">从社交媒体数据中识别高频串联的景点组合</div>
    </div>

    <div class="section">
      <div class="section-title">📍 选择城市</div>
      <div class="city-tabs">
        {#each cities as city}
          <button
            class="city-tab {selectedCity === city ? 'active' : ''}"
            on:click={() => selectCity(city)}
          >
            {cityLabels[city]}
          </button>
        {/each}
      </div>

      {#if selectedCity !== 'all' && cityStats.basic_stats}
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{cityStats.basic_stats.total_flow}</div>
            <div class="stat-label">总流动次数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{cityStats.basic_stats.total_pairs}</div>
            <div class="stat-label">景点组合数</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{cityStats.total_routes}</div>
            <div class="stat-label">有效路线</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{cityStats.basic_stats.unique_pois}</div>
            <div class="stat-label">覆盖POI</div>
          </div>
        </div>
      {/if}
    </div>

    {#if selectedCity !== 'all'}
      <div class="section">
        <div class="section-title">🏆 热门景点 TOP 10</div>
        {#if topPois.length > 0}
          <div class="poi-list">
            {#each topPois as poi, i}
              <div class="poi-item">
                <span class="poi-rank">{i + 1}</span>
                <span class="poi-name">{poi.name}</span>
                <span class="poi-count">{poi.count}次</span>
              </div>
            {/each}
          </div>
        {:else}
          <div class="empty">暂无数据</div>
        {/if}
      </div>

      <div class="section">
        <div class="section-title">⚡ 推荐路线</div>
        {#if loading}
          <div class="loading">加载中...</div>
        {:else if recommendations.length > 0}
          {#each recommendations as route}
            <div
              class="route-card {selectedRouteId === route.id ? 'active' : ''}"
              on:click={() => selectRoute(route.id)}
            >
              <div class="route-title">{route.title}</div>
              <div class="route-meta">
                <span>⏱ {route.total_duration_hours}h</span>
                <span>📍 {route.poi_sequence.length}景点</span>
                <span>🍜 {route.meal_count}顿</span>
                <span class="difficulty-badge {getDifficultyClass(route.difficulty)}">
                  {route.difficulty}
                </span>
              </div>
              <div class="time-schedule">
                {#each route.time_schedule as item}
                  <div class="schedule-item">
                    <span class="schedule-time">{item.split(' ')[0]}</span>
                    <span class="schedule-arrow">→</span>
                    <span class="schedule-poi">{item.split(' ').slice(1).join(' ')}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        {:else}
          <div class="empty">暂无推荐路线</div>
        {/if}
      </div>
    {:else}
      <div class="section">
        <div class="section-title">🏆 城市热度排名</div>
        {#if overallStats && overallStats.city_rankings}
          <div class="poi-list">
            {#each overallStats.city_rankings as city, i}
              <div class="poi-item">
                <span class="poi-rank">{i + 1}</span>
                <span class="poi-name">{city.city}</span>
                <span class="poi-count">{city.total_flow}次流动</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="section">
        <div class="section-title">💡 说明</div>
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.7;">
          本工具基于小红书"特种兵旅游"话题数据，挖掘大学生"30小时吃6顿"的高强度行程规律。弧线越粗代表该路径被越多人采用。
        </p>
        <p style="font-size: 12px; color: #64748b; line-height: 1.7; margin-top: 10px;">
          选择具体城市可查看详细的景点热度排名和AI生成的推荐路线。
        </p>
      </div>
    {/if}
  </div>
</div>
