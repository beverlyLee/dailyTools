import React, { useEffect, useRef, useState, useCallback } from 'react'
import axios from 'axios'

function App() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markersRef = useRef([])
  const infoWindowRef = useRef(null)
  const cleanupRef = useRef(null)
  const gaodeScriptRef = useRef(null)

  const [sites, setSites] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingText, setLoadingText] = useState('正在加载配置...')
  const [error, setError] = useState(null)
  const [selectedSite, setSelectedSite] = useState(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapProvider, setMapProvider] = useState(null)

  const cleanupGaodeResources = useCallback(() => {
    try {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }

      if (gaodeScriptRef.current && gaodeScriptRef.current.parentNode) {
        gaodeScriptRef.current.parentNode.removeChild(gaodeScriptRef.current)
        gaodeScriptRef.current = null
      }

      window._AMapSecurityConfig = null

      const scripts = document.querySelectorAll('script[src*="amap.com"]')
      scripts.forEach(script => {
        if (script.parentNode) {
          script.parentNode.removeChild(script)
        }
      })

      const links = document.querySelectorAll('link[href*="amap.com"]')
      links.forEach(link => {
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      })

      if (window.AMap) {
        try {
          if (window.AMap._instances) {
            window.AMap._instances.forEach(instance => {
              if (instance && instance.destroy) {
                instance.destroy()
              }
            })
          }
        } catch (e) {}
        window.AMap = undefined
      }
    } catch (e) {
      console.warn('清理高德资源时出错:', e.message)
    }
  }, [])

  const loadGaodeScript = useCallback((apiKey) => {
    return new Promise((resolve, reject) => {
      if (window.AMap) {
        resolve(window.AMap)
        return
      }

      let hasResolved = false
      let timeoutId = null

      const handleError = (message) => {
        if (hasResolved) return
        hasResolved = true
        if (timeoutId) clearTimeout(timeoutId)
        cleanupGaodeResources()
        reject(new Error(message || '高德地图加载失败'))
      }

      window._AMapSecurityConfig = {
        securityJsCode: apiKey,
        serviceHost: 'https://webapi.amap.com',
      }

      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.async = true
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${apiKey}&plugin=AMap.Scale,AMap.ToolBar,AMap.InfoWindow`
      gaodeScriptRef.current = script

      script.onerror = () => handleError('高德地图脚本加载失败，请检查网络连接')
      script.onload = () => {
        if (window.AMap) {
          timeoutId = setTimeout(() => {
            if (!hasResolved && window.AMap) {
              hasResolved = true
              resolve(window.AMap)
            }
          }, 500)
        } else {
          handleError('高德地图加载失败')
        }
      }
      document.head.appendChild(script)

      timeoutId = setTimeout(() => {
        handleError('高德地图加载超时，请检查网络连接')
      }, 15000)
    })
  }, [cleanupGaodeResources])

  const fetchConfig = useCallback(async () => {
    try {
      setLoadingText('正在加载配置...')
      const response = await axios.get('/api/config', { timeout: 5000 })
      if (response.data.success) {
        return response.data.data
      }
      throw new Error('获取配置失败')
    } catch (error) {
      console.error('获取配置失败:', error)
      throw new Error('无法获取地图配置，请检查后端服务')
    }
  }, [])

  const fetchSites = useCallback(async () => {
    try {
      setLoadingText('正在加载露营地数据...')
      const response = await axios.get('/api/sites', { timeout: 10000 })
      if (response.data.success) {
        setSites(response.data.data)
        return response.data.data
      }
      throw new Error('获取露营地数据失败')
    } catch (error) {
      console.error('获取露营地数据失败:', error)
      throw new Error('加载露营地数据失败')
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get('/api/stats', { timeout: 5000 })
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

  const addGaodeMarkers = useCallback((AMap, sitesData) => {
    if (!map.current) return

    markersRef.current.forEach(marker => {
      try {
        marker.setMap(null)
      } catch (e) {}
    })
    markersRef.current = []

    sitesData.forEach((site) => {
      const marker = new AMap.Marker({
        position: [site.lng, site.lat],
        map: map.current,
        offset: new AMap.Pixel(-10, -10),
        zIndex: 10,
        content: `
          <div class="marker-pulse" style="background-color: ${site.comfort?.color || '#666'}" data-site-id="${site.id}"></div>
        `,
      })

      marker.on('click', () => {
        try {
          if (infoWindowRef.current) {
            infoWindowRef.current.close()
          }
        } catch (e) {}

        const infoWindow = new AMap.InfoWindow({
          content: createPopupContent(site),
          offset: new AMap.Pixel(0, -20),
        })

        infoWindow.open(map.current, [site.lng, site.lat])
        infoWindowRef.current = infoWindow
        setSelectedSite(site)
      })

      markersRef.current.push(marker)
    })
  }, [])

  const addLeafletMarkers = useCallback((sitesData) => {
    if (!map.current || !window.L) return

    markersRef.current.forEach(marker => {
      try {
        marker.remove()
      } catch (e) {}
    })
    markersRef.current = []

    sitesData.forEach((site) => {
      const markerIcon = window.L.divIcon({
        className: 'custom-marker',
        html: `<div class="marker-pulse" style="background-color: ${site.comfort?.color || '#666'}" data-site-id="${site.id}"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })

      const marker = window.L.marker([site.lat, site.lng], { icon: markerIcon })
        .addTo(map.current)
        .bindPopup(createPopupContent(site), {
          maxWidth: 350,
          className: 'custom-popup',
        })

      marker.on('click', () => {
        setSelectedSite(site)
      })

      markersRef.current.push(marker)
    })
  }, [])

  const initGaodeMap = useCallback(async (AMap) => {
    if (!mapContainer.current) return

    return new Promise((resolve, reject) => {
      try {
        const originalOnError = window.onerror
        const originalConsoleError = console.error
        let mapInitTimeout = null
        let hasRejected = false

        const cleanup = () => {
          window.onerror = originalOnError
          console.error = originalConsoleError
          if (mapInitTimeout) clearTimeout(mapInitTimeout)
        }

        cleanupRef.current = cleanup

        const handleMapError = (message) => {
          if (hasRejected) return
          hasRejected = true
          cleanup()
          reject(new Error(message))
        }

        window.onerror = (msg, url, line, col, error) => {
          const msgStr = String(msg || '')
          if (msgStr.includes('INVALID_USER_KEY') || msgStr.includes('FlyDataAuthTask')) {
            handleMapError('高德地图 API Key 无效')
            return true
          }
          if (originalOnError) {
            return originalOnError(msg, url, line, col, error)
          }
          return false
        }

        console.error = (...args) => {
          const errorStr = args.join(' ')
          if (errorStr.includes('INVALID_USER_KEY') || errorStr.includes('FlyDataAuthTask')) {
            handleMapError('高德地图 API Key 无效')
            return
          }
          originalConsoleError.apply(console, args)
        }

        map.current = new AMap.Map(mapContainer.current, {
          zoom: 4,
          center: [110, 35],
          zooms: [3, 15],
          mapStyle: 'amap://styles/light',
          viewMode: '2D',
        })

        map.current.on('error', (error) => {
          handleMapError('地图加载失败: ' + (error.message || '未知错误'))
        })

        map.current.on('complete', () => {
          if (hasRejected) return
          cleanup()
          cleanupRef.current = null

          map.current.addControl(new AMap.Scale())
          map.current.addControl(new AMap.ToolBar({
            position: 'RT',
          }))

          setMapLoaded(true)
          resolve(map.current)
        })

        mapInitTimeout = setTimeout(() => {
          if (hasRejected) return
          if (map.current && mapContainer.current.children.length > 0) {
            cleanup()
            cleanupRef.current = null
            setMapLoaded(true)
            resolve(map.current)
          } else {
            handleMapError('地图初始化超时')
          }
        }, 10000)
      } catch (error) {
        console.error('地图初始化失败:', error)
        reject(new Error('地图初始化失败: ' + error.message))
      }
    })
  }, [])

  const initLeafletMap = useCallback(async () => {
    if (!mapContainer.current || !window.L) {
      throw new Error('Leaflet 地图库未加载')
    }

    return new Promise((resolve, reject) => {
      try {
        map.current = window.L.map(mapContainer.current, {
          zoomControl: true,
        }).setView([35, 110], 4)

        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '© OpenStreetMap contributors',
        }).addTo(map.current)

        window.L.control.scale({
          imperial: false,
          metric: true,
        }).addTo(map.current)

        let mapInitTimeout = setTimeout(() => {
          setMapLoaded(true)
          resolve(map.current)
        }, 500)

        map.current.whenReady(() => {
          clearTimeout(mapInitTimeout)
          setMapLoaded(true)
          resolve(map.current)
        })
      } catch (error) {
        console.error('Leaflet 地图初始化失败:', error)
        reject(new Error('地图初始化失败: ' + error.message))
      }
    })
  }, [])

  useEffect(() => {
    let isMounted = true
    let mapLoadTimeout = null

    const initApp = async () => {
      try {
        mapLoadTimeout = setTimeout(() => {
          if (isMounted && loading) {
            setError('加载超时，请检查网络连接后刷新页面')
            setLoading(false)
          }
        }, 45000)

        const config = await fetchConfig()
        if (!isMounted) return

        const sitesData = await fetchSites()
        if (!isMounted) return

        await fetchStats()
        if (!isMounted) return

        let currentMapProvider = 'leaflet'
        let addMarkersFunc = addLeafletMarkers

        try {
          setLoadingText('正在加载高德地图...')
          const AMap = await loadGaodeScript(config.gaode_js_api_key)
          if (isMounted) {
            await initGaodeMap(AMap)
            currentMapProvider = 'gaode'
            addMarkersFunc = addGaodeMarkers.bind(null, AMap)
          }
        } catch (gaodeError) {
          console.warn('高德地图加载失败，切换到备用地图:', gaodeError.message)
          cleanupGaodeResources()
          if (isMounted) {
            setLoadingText('正在加载备用地图...')
            await initLeafletMap()
            currentMapProvider = 'leaflet'
            addMarkersFunc = addLeafletMarkers
          }
        }

        if (isMounted) {
          setMapProvider(currentMapProvider)
          addMarkersFunc(sitesData)

          clearTimeout(mapLoadTimeout)
          setLoading(false)
          setError(null)
        }
      } catch (error) {
        console.error('初始化失败:', error)
        cleanupGaodeResources()
        if (isMounted) {
          clearTimeout(mapLoadTimeout)
          setError(error.message || '应用初始化失败，请刷新页面重试')
          setLoading(false)
        }
      }
    }

    initApp()

    return () => {
      isMounted = false
      if (mapLoadTimeout) clearTimeout(mapLoadTimeout)

      markersRef.current.forEach(marker => {
        try {
          if (marker.remove) marker.remove()
          if (marker.setMap) marker.setMap(null)
        } catch (e) {}
      })
      markersRef.current = []

      if (map.current) {
        try {
          if (map.current.remove) {
            map.current.remove()
          } else if (map.current.destroy) {
            map.current.destroy()
          }
        } catch (e) {}
        map.current = null
      }

      cleanupGaodeResources()
    }
  }, [fetchConfig, fetchSites, fetchStats, loadGaodeScript, initGaodeMap, initLeafletMap, addGaodeMarkers, addLeafletMarkers, cleanupGaodeResources, loading])

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    setLoadingText('正在重新加载...')
    window.location.reload()
  }

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
        <p>基于气象数据和社交媒体的露营地综合评分 {mapProvider === 'leaflet' && '（备用地图）'}</p>
      </div>

      <div ref={mapContainer} className="map-container" />

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p className="loading-text">{loadingText}</p>
        </div>
      )}

      {error && (
        <div className="error-overlay">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h2 className="error-title">加载失败</h2>
            <p className="error-message">{error}</p>
            <button className="error-retry" onClick={handleRetry}>
              重新加载
            </button>
          </div>
        </div>
      )}

      {!loading && !error && stats && (
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

      {!loading && !error && (
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
      )}
    </div>
  )
}

export default App
