import React, { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import axios from 'axios'




function App() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markersRef = useRef([])
  const popupRef = useRef(null)
  const [sites, setSites] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSite, setSelectedSite] = useState(null)

  const fetchSites = useCallback(async () => {
    try {
      const response = await axios.get('/api/sites')
      if (response.data.success) {
        setSites(response.data.data)
        return response.data.data
      }
    } catch (error) {
      console.error('获取露营地数据失败:', error)
      return []
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get('/api/stats')
      if (response.data.success) {
        setStats(response.data.data)
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
  }, [])

  const createPopupContent = (site) => {
    const comfort = site.comfort || {}
    const weather = site.weather || {}
    const details = comfort.details || []

    return `
      <div class="popup-content">
        <div class="popup-header">
          <h3 class="popup-title">${site.name}</h3>
          <p class="popup-location">📍 ${site.location}</p>
        </div>
        
        <div class="popup-score">
          <div class="score-circle" style="background-color: ${comfort.color || '#666'}">
            <span class="score-value">${comfort.total_score || 0}</span>
            <span class="score-grade">${comfort.grade || '-'}</span>
          </div>
          <div class="score-info">
            <p class="score-recommendation">${comfort.recommendation || '-'}</p>
            <div class="score-metrics">
              <span>🌬️ ${comfort.wind_level_desc || '-'}</span>
              <span>🌿 ${comfort.grass_coverage || 0}%</span>
            </div>
          </div>
        </div>

        <div class="popup-details">
          ${details.map(detail => `
            <div class="detail-item ${detail.positive ? 'detail-positive' : 'detail-negative'}">
              <span class="detail-icon">${detail.icon}</span>
              <div class="detail-text">
                <p class="detail-title">${detail.title}</p>
                <p class="detail-desc">${detail.desc}</p>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="popup-weather">
          <p class="weather-title">📊 历史天气回顾</p>
          <div class="weather-grid">
            <div class="weather-item">
              <p class="weather-value">${weather.wind_level || '-'}</p>
              <p class="weather-label">平均风级</p>
            </div>
            <div class="weather-item">
              <p class="weather-value">${weather.rain_days || 0}天</p>
              <p class="weather-label">年降雨天数</p>
            </div>
            <div class="weather-item">
              <p class="weather-value">${weather.avg_temperature || '-'}°C</p>
              <p class="weather-label">年均气温</p>
            </div>
          </div>
        </div>
      </div>
    `
  }

  const addMarkers = useCallback((sitesData) => {
    if (!map.current) return

    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    sitesData.forEach((site) => {
      const el = document.createElement('div')
      el.className = 'marker-pulse'
      el.style.backgroundColor = site.comfort?.color || '#666'
      el.dataset.siteId = site.id

      const marker = new mapboxgl.Marker(el)
        .setLngLat([site.lng, site.lat])
        .addTo(map.current)

      el.addEventListener('click', () => {
        if (popupRef.current) {
          popupRef.current.remove()
        }

        const popup = new mapboxgl.Popup({
          offset: 25,
          maxWidth: '350px',
          closeButton: true,
        })
          .setLngLat([site.lng, site.lat])
          .setHTML(createPopupContent(site))
          .addTo(map.current)

        popupRef.current = popup
        setSelectedSite(site)

        markersRef.current.forEach(m => {
          m.getElement().classList.remove('selected')
        })
        el.classList.add('selected')
      })

      markersRef.current.push(marker)
    })
  }, [])

  useEffect(() => {
    if (!mapContainer.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [110, 35],
      zoom: 3.5,
      minZoom: 3,
      maxZoom: 15,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-right')

    const initData = async () => {
      const sitesData = await fetchSites()
      await fetchStats()
      addMarkers(sitesData)
      setLoading(false)
    }

    map.current.on('load', initData)

    return () => {
      if (map.current) {
        map.current.remove()
      }
    }
  }, [fetchSites, fetchStats, addMarkers])

  const legendItems = [
    { color: '#22c55e', label: 'S/A 强烈推荐' },
    { color: '#84cc16', label: 'B 推荐' },
    { color: '#eab308', label: 'C 一般' },
    { color: '#ef4444', label: 'D 不推荐' },
  ]

  return (
    <div className="app-container">
      <div className="header">
        <h1>🏕️ 露营地舒适度评估系统</h1>
        <p>基于气象数据和社交媒体的露营地综合评分</p>
      </div>

      <div ref={mapContainer} className="map-container" />

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p className="loading-text">正在加载露营地数据...</p>
        </div>
      )}

      {stats && (
        <div className="stats-panel">
          <p className="stats-title">📈 数据统计</p>
          <div className="stats-item">
            <span className="stats-label">露营地总数</span>
            <span className="stats-value">{stats.total_sites}</span>
          </div>
          <div className="stats-item">
            <span className="stats-label">平均评分</span>
            <span className="stats-value">{stats.average_score}</span>
          </div>
          {Object.entries(stats.grade_distribution).map(([grade, count]) => (
            count > 0 && (
              <div className="stats-item" key={grade}>
                <span className="stats-label">{grade} 级营地</span>
                <span className="stats-value">{count}</span>
              </div>
            )
          ))}
        </div>
      )}

      <div className="legend">
        <p className="legend-title">🎨 舒适度等级</p>
        <div className="legend-items">
          {legendItems.map((item, index) => (
            <div className="legend-item" key={index}>
              <div
                className="legend-color"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
