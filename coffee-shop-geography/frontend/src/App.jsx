import React, { useState, useEffect, useCallback, useRef } from 'react'
import DeckGL from '@deck.gl/react'
import { Map } from 'react-map-gl/maplibre'
import { HexagonLayer } from '@deck.gl/aggregation-layers'
import { ScatterplotLayer } from '@deck.gl/layers'
import { MapController } from '@deck.gl/core'
import './index.css'

const INITIAL_VIEW_STATE = {
  longitude: 121.502,
  latitude: 31.236,
  zoom: 15,
  pitch: 45,
  bearing: 0
}

const MAP_STYLE = 'https://demotiles.maplibre.org/style.json'

function App() {
  const [hexagonData, setHexagonData] = useState([])
  const [coffeeShops, setCoffeeShops] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [selectedCoffee, setSelectedCoffee] = useState(null)
  const [nearestOffice, setNearestOffice] = useState(null)
  const [loading, setLoading] = useState(true)
  const popupRef = useRef(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [hexRes, coffeeRes, overlapRes] = await Promise.all([
        fetch('/api/analysis/hexagon?use_mock=true'),
        fetch('/api/poi/coffee-shops?use_mock=true'),
        fetch('/api/analysis/overlap?use_mock=true')
      ])

      if (!hexRes.ok || !coffeeRes.ok || !overlapRes.ok) {
        throw new Error('API response not ok')
      }

      const hexData = await hexRes.json()
      const coffeeData = await coffeeRes.json()
      const overlapData = await overlapRes.json()

      console.log('Hexagon data loaded:', hexData.data?.length || 0, 'points')
      console.log('Coffee shops loaded:', coffeeData.data?.length || 0, 'points')

      setHexagonData(hexData.data || [])
      setCoffeeShops(coffeeData.data || [])
      setStatistics(overlapData.statistics || null)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      const mockOffices = [
        { name: '上海环球金融中心', lng: 121.5038, lat: 31.2358 },
        { name: '金茂大厦', lng: 121.5030, lat: 31.2365 },
        { name: '上海中心大厦', lng: 121.5015, lat: 31.2355 },
        { name: '国金中心', lng: 121.4995, lat: 31.2370 },
        { name: '东亚银行金融大厦', lng: 121.5010, lat: 31.2380 },
        { name: '恒生银行大厦', lng: 121.5025, lat: 31.2390 },
        { name: '花旗集团大厦', lng: 121.5000, lat: 31.2395 },
        { name: '震旦国际大楼', lng: 121.5045, lat: 31.2375 },
        { name: '太平金融大厦', lng: 121.5008, lat: 31.2345 },
        { name: '上海国金中心二期', lng: 121.4988, lat: 31.2362 },
        { name: '中银大厦', lng: 121.4992, lat: 31.2340 },
        { name: '交银金融大厦', lng: 121.4985, lat: 31.2335 },
        { name: '汇丰大厦', lng: 121.5020, lat: 31.2350 },
        { name: '上海银行大厦', lng: 121.4978, lat: 31.2348 },
        { name: '渣打银行大厦', lng: 121.5040, lat: 31.2342 }
      ]
      const mockCoffees = [
        { name: '瑞幸咖啡(环球金融中心店)', lng: 121.5040, lat: 31.2355, type: 'luckin', address: '浦东新区世纪大道100号B1层' },
        { name: '星巴克(金茂大厦店)', lng: 121.5028, lat: 31.2368, type: 'starbucks', address: '浦东新区世纪大道88号1层' },
        { name: '瑞幸咖啡(上海中心店)', lng: 121.5012, lat: 31.2352, type: 'luckin', address: '浦东新区银城中路501号B1' },
        { name: '星巴克(国金中心店)', lng: 121.4993, lat: 31.2372, type: 'starbucks', address: '浦东新区世纪大道8号L2层' },
        { name: '瑞幸咖啡(东亚银行店)', lng: 121.5012, lat: 31.2382, type: 'luckin', address: '浦东新区花园石桥路66号1层' },
        { name: '星巴克(恒生银行大厦店)', lng: 121.5027, lat: 31.2392, type: 'starbucks', address: '浦东新区陆家嘴环路1000号1层' }
      ]
      setHexagonData(mockOffices)
      setCoffeeShops(mockCoffees)
      setStatistics({
        total_offices: mockOffices.length,
        total_coffee_shops: mockCoffees.length,
        luckin_count: mockCoffees.filter(c => c.type === 'luckin').length,
        starbucks_count: mockCoffees.filter(c => c.type === 'starbucks').length
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCoffeeClick = useCallback(async (info) => {
    if (info.object) {
      const coffee = info.object
      setSelectedCoffee(coffee)
      
      try {
        const response = await fetch(
          `/api/coffee/nearest-office?coffee_lng=${coffee.lng}&coffee_lat=${coffee.lat}&use_mock=true`
        )
        const data = await response.json()
        setNearestOffice(data.nearest_office)
      } catch (error) {
        console.error('Failed to fetch nearest office:', error)
      }
    }
  }, [])

  const handleMapClick = useCallback((info) => {
    if (!info.object) {
      setSelectedCoffee(null)
      setNearestOffice(null)
    }
  }, [])

  const hexagonLayer = new HexagonLayer({
    id: 'hexagon-layer',
    data: hexagonData,
    pickable: true,
    extruded: true,
    radius: 100,
    elevationScale: 50,
    elevationRange: [0, 500],
    coverage: 0.9,
    getPosition: d => [d.lng, d.lat],
    colorRange: [
      [59, 130, 246, 120],
      [99, 102, 241, 160],
      [139, 92, 246, 190],
      [217, 70, 239, 210],
      [236, 72, 153, 230],
      [239, 68, 68, 255]
    ],
    material: {
      ambient: 0.6,
      diffuse: 0.6,
      shininess: 32,
      specularColor: [30, 30, 30]
    },
    upperPercentile: 100
  })

  const coffeeLayer = new ScatterplotLayer({
    id: 'coffee-layer',
    data: coffeeShops,
    pickable: true,
    stroked: true,
    filled: true,
    radiusScale: 6,
    radiusMinPixels: 10,
    radiusMaxPixels: 20,
    getPosition: d => [d.lng, d.lat],
    getFillColor: d => d.type === 'luckin' ? [0, 168, 107, 200] : [0, 112, 74, 200],
    getLineColor: [255, 255, 255, 255],
    getLineWidth: 2,
    onClick: handleCoffeeClick
  })

  const layers = [hexagonLayer, coffeeLayer]

  if (loading) {
    return <div className="app"><div className="loading">加载中...</div></div>
  }

  return (
    <div className="app">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={{ type: MapController, touchRotate: true }}
        layers={layers}
        onClick={handleMapClick}
        getTooltip={({ object }) => {
          if (object && object.name) {
            return `${object.name}\n${object.address || ''}`
          }
          return null
        }}
      >
        <Map
          reuseMaps
          mapStyle={MAP_STYLE}
          maplibreApiUrl="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"
        />
      </DeckGL>

      <div className="header">
        <h1>咖啡店铺地理分析</h1>
        <p>上海陆家嘴商圈 - 甲级写字楼与咖啡店分布</p>
        {statistics && (
          <div className="stats">
            <div className="stat-item">
              <div className="value">{statistics.total_offices}</div>
              <div className="label">甲级写字楼</div>
            </div>
            <div className="stat-item">
              <div className="value">{statistics.total_coffee_shops}</div>
              <div className="label">咖啡店总数</div>
            </div>
            <div className="stat-item">
              <div className="value">{statistics.luckin_count}</div>
              <div className="label">瑞幸咖啡</div>
            </div>
            <div className="stat-item">
              <div className="value">{statistics.starbucks_count}</div>
              <div className="label">星巴克</div>
            </div>
          </div>
        )}
      </div>

      <div className="legend">
        <h3>图例</h3>
        <div className="legend-item">
          <div className="legend-color hexagon-high"></div>
          <span>写字楼高密度区</span>
        </div>
        <div className="legend-item">
          <div className="legend-color hexagon-low"></div>
          <span>写字楼低密度区</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot luckin"></div>
          <span>瑞幸咖啡</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot starbucks"></div>
          <span>星巴克</span>
        </div>
      </div>

      {selectedCoffee && (
        <div 
          className="info-popup"
          style={{
            top: '50%',
            right: '20px',
            transform: 'translateY(-50%)'
          }}
          ref={popupRef}
        >
          <button className="close-btn" onClick={() => {
            setSelectedCoffee(null)
            setNearestOffice(null)
          }}>×</button>
          
          <h3>{selectedCoffee.name}</h3>
          <span className={`type ${selectedCoffee.type}`}>
            {selectedCoffee.type === 'luckin' ? '瑞幸咖啡' : '星巴克'}
          </span>
          
          <div className="address">{selectedCoffee.address}</div>
          
          {nearestOffice && (
            <div className="distance-info">
              <div>
                <span className="distance">
                  {Math.round(Math.sqrt(
                    Math.pow((selectedCoffee.lng - nearestOffice.lng) * 88, 2) +
                    Math.pow((selectedCoffee.lat - nearestOffice.lat) * 111, 2)
                  ) * 1000)}
                </span>
                <span className="distance-label">米到最近写字楼</span>
              </div>
              <div className="office-name">
                最近: {nearestOffice.name}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
