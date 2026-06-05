import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer, TextLayer } from '@deck.gl/layers';

const INITIAL_VIEW_STATE = {
  longitude: 113.93,
  latitude: 22.54,
  zoom: 13.5,
  minZoom: 11,
  maxZoom: 18,
  pitch: 45,
  bearing: 0
};

const MAP_PROVIDERS = {
  osm: {
    name: 'OpenStreetMap',
    style: {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm-tiles',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    }
  },
  gaode: {
    name: '高德地图',
    style: {
      version: 8,
      sources: {
        'gaode-tiles': {
          type: 'raster',
          tiles: [
            'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
            'https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
            'https://webrd03.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
            'https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}'
          ],
          tileSize: 256,
          attribution: '© 高德地图'
        }
      },
      layers: [
        {
          id: 'gaode-tiles',
          type: 'raster',
          source: 'gaode-tiles',
          minzoom: 0,
          maxzoom: 18
        }
      ]
    }
  },
  gaode_satellite: {
    name: '高德卫星',
    style: {
      version: 8,
      sources: {
        'gaode-satellite': {
          type: 'raster',
          tiles: [
            'https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
            'https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
            'https://webst03.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
            'https://webst04.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}'
          ],
          tileSize: 256,
          attribution: '© 高德地图'
        }
      },
      layers: [
        {
          id: 'gaode-satellite',
          type: 'raster',
          source: 'gaode-satellite',
          minzoom: 0,
          maxzoom: 18
        }
      ]
    }
  }
};

class BuildingVisualization {
  constructor() {
    this.allBuildings = [];
    this.currentBuildings = [];
    this.currentYear = 2000;
    this.isPlaying = false;
    this.playInterval = null;
    this.playSpeed = 1000;
    this.showLabels = true;
    this.colorByYear = false;
    this.currentMapProvider = 'gaode';
    this.map = null;
    this.deckOverlay = null;
    
    this.initMap();
    this.bindEvents();
    this.loadData();
  }

  initMap() {
    const container = document.getElementById('map-container');
    const mapStyle = MAP_PROVIDERS[this.currentMapProvider].style;
    
    this.map = new maplibregl.Map({
      container: container,
      style: mapStyle,
      center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
      zoom: INITIAL_VIEW_STATE.zoom,
      minZoom: INITIAL_VIEW_STATE.minZoom,
      maxZoom: INITIAL_VIEW_STATE.maxZoom,
      pitch: INITIAL_VIEW_STATE.pitch,
      bearing: INITIAL_VIEW_STATE.bearing,
      antialias: true
    });

    this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
    this.map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    this.deckOverlay = new MapboxOverlay({
      interleaved: true,
      layers: []
    });

    this.map.addControl(this.deckOverlay);

    this.map.on('load', () => {
      console.log('Map loaded');
      this.updateVisualization();
    });

    this.map.on('mousemove', (e) => {
      const features = this.deckOverlay._deck ? 
        this.deckOverlay._deck.pickObject({ x: e.point.x, y: e.point.y }) : null;
      this.handleHover(features, e.point);
    });
  }

  switchMapProvider(provider) {
    if (!MAP_PROVIDERS[provider]) return;
    
    this.currentMapProvider = provider;
    const mapStyle = MAP_PROVIDERS[provider].style;
    this.map.setStyle(mapStyle);
    
    this.map.once('styledata', () => {
      this.updateVisualization();
    });
  }

  async loadData() {
    try {
      const response = await fetch('/api/timeline');
      const data = await response.json();
      this.allBuildings = data.buildings || [];
      this.stats = data.stats || {};
      console.log(`Loaded ${this.allBuildings.length} buildings from API`);
      this.updateVisualization();
    } catch (error) {
      console.warn('Failed to load data from API, using mock data:', error);
      this.loadMockData();
    }
  }

  loadMockData() {
    const centerLng = 113.93;
    const centerLat = 22.54;
    const types = ['住宅', '公寓', '写字楼', '商业综合体', '商住楼'];
    
    for (let i = 0; i < 300; i++) {
      const lng = centerLng + (Math.random() - 0.5) * 0.16;
      const lat = centerLat + (Math.random() - 0.5) * 0.12;
      
      const dist = Math.sqrt((lng - centerLng) ** 2 + (lat - centerLat) ** 2);
      let buildYear;
      if (dist < 0.02) {
        buildYear = Math.floor(Math.random() * 11) + 2010;
      } else if (dist < 0.04) {
        buildYear = Math.floor(Math.random() * 11) + 2005;
      } else {
        buildYear = Math.floor(Math.random() * 11) + 2000;
      }
      
      let floors;
      if (buildYear >= 2015) {
        floors = Math.floor(Math.random() * 36) + 20;
      } else if (buildYear >= 2010) {
        floors = Math.floor(Math.random() * 26) + 15;
      } else if (buildYear >= 2005) {
        floors = Math.floor(Math.random() * 21) + 10;
      } else {
        floors = Math.floor(Math.random() * 15) + 6;
      }
      
      const height = floors * 3 + Math.random() * 2;
      const type = types[Math.floor(Math.random() * types.length)];
      
      const size = 0.00015 + Math.min(height / 1000, 0.0001);
      const aspectRatio = 0.6 + Math.random() * 0.9;
      const rotation = Math.random() * Math.PI / 6;
      const cosR = Math.cos(rotation);
      const sinR = Math.sin(rotation);
      
      const dx = size;
      const dy = size * aspectRatio;
      
      const corners = [
        [-dx, -dy], [dx, -dy], [dx, dy], [-dx, dy]
      ];
      
      const polygon = corners.map(([x, y]) => [
        lng + x * cosR - y * sinR,
        lat + x * sinR + y * cosR
      ]);
      
      this.allBuildings.push({
        id: `building_${i}`,
        name: `建筑${i}`,
        polygon: polygon,
        height: height,
        baseHeight: 0,
        buildYear: buildYear,
        floors: floors,
        type: type,
        color: this.getColorByType(type, height),
        centroid: [lng, lat]
      });
    }
    
    console.log(`Generated ${this.allBuildings.length} mock buildings`);
    this.updateVisualization();
  }

  getColorByType(type, height) {
    const colorMap = {
      '住宅': [70, 130, 180],
      '公寓': [100, 149, 237],
      '写字楼': [105, 105, 105],
      '商业综合体': [205, 92, 92],
      '商住楼': [147, 112, 219]
    };
    
    const baseColor = colorMap[type] || [128, 128, 128];
    const heightFactor = Math.min(height / 150, 1);
    const brighten = Math.floor(heightFactor * 30);
    
    return [
      Math.min(255, baseColor[0] + brighten),
      Math.min(255, baseColor[1] + brighten),
      Math.min(255, baseColor[2] + brighten)
    ];
  }

  getColorByYear(buildYear) {
    if (buildYear >= 2015) {
      return [100, 149, 237];
    } else if (buildYear >= 2010) {
      return [70, 130, 180];
    } else if (buildYear >= 2005) {
      return [95, 158, 160];
    } else {
      return [128, 128, 128];
    }
  }

  updateVisualization() {
    if (!this.deckOverlay) return;
    
    this.currentBuildings = this.allBuildings.filter(
      b => b.buildYear <= this.currentYear
    );
    
    this.updateStats();
    this.renderLayers();
  }

  updateStats() {
    const buildings = this.currentBuildings;
    const count = buildings.length;
    const totalHeight = buildings.reduce((sum, b) => sum + b.height, 0);
    const avgHeight = count > 0 ? totalHeight / count : 0;
    const maxHeight = count > 0 ? Math.max(...buildings.map(b => b.height)) : 0;
    
    document.getElementById('current-year').textContent = this.currentYear;
    document.getElementById('building-count').textContent = count;
    document.getElementById('total-height').textContent = Math.round(totalHeight).toLocaleString();
    document.getElementById('max-height').textContent = Math.round(maxHeight);
  }

  renderLayers() {
    if (!this.deckOverlay || !this.map) return;

    const buildingData = this.currentBuildings.map(b => ({
      ...b,
      color: this.colorByYear ? this.getColorByYear(b.buildYear) : b.color
    }));

    const layers = [];

    const buildingLayer = new GeoJsonLayer({
      id: 'buildings',
      data: {
        type: 'FeatureCollection',
        features: buildingData.map(b => ({
          type: 'Feature',
          properties: b,
          geometry: {
            type: 'Polygon',
            coordinates: [b.polygon]
          }
        }))
      },
      extruded: true,
      wireframe: true,
      filled: true,
      getElevation: f => f.properties.height,
      getFillColor: f => [...f.properties.color, 200],
      getLineColor: [255, 255, 255, 50],
      lineWidthMinPixels: 1,
      pickable: true
    });
    
    layers.push(buildingLayer);

    if (this.showLabels) {
      const labelData = buildingData
        .filter(b => b.height >= 40)
        .map(b => ({
          ...b,
          position: b.centroid
        }));

      const textLayer = new TextLayer({
        id: 'building-labels',
        data: labelData,
        getPosition: d => d.position,
        getText: d => d.name,
        getSize: 12,
        getColor: [255, 255, 255],
        getAngle: 0,
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'bottom',
        billboard: true
      });
      
      layers.push(textLayer);
    }

    this.deckOverlay.setProps({ layers });
  }

  handleHover(feature, point) {
    const tooltip = document.getElementById('tooltip');
    
    if (feature && feature.object) {
      const props = feature.object.properties;
      tooltip.innerHTML = `
        <h4>${props.name}</h4>
        <p><strong>高度:</strong> ${Math.round(props.height)} 米</p>
        <p><strong>楼层:</strong> ${props.floors} 层</p>
        <p><strong>类型:</strong> ${props.type}</p>
        <p><strong>建成年份:</strong> ${props.buildYear}</p>
      `;
      tooltip.style.left = `${point.x + 15}px`;
      tooltip.style.top = `${point.y + 15}px`;
      tooltip.classList.add('visible');
    } else {
      tooltip.classList.remove('visible');
    }
  }

  setYear(year) {
    this.currentYear = Math.max(2000, Math.min(2020, year));
    document.getElementById('year-slider').value = this.currentYear;
    this.updateVisualization();
  }

  play() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    document.getElementById('play-icon').textContent = '⏸';
    document.querySelector('#play-btn').innerHTML = '<span id="play-icon">⏸</span> 暂停';
    
    this.playInterval = setInterval(() => {
      if (this.currentYear >= 2020) {
        this.stop();
        return;
      }
      this.setYear(this.currentYear + 1);
    }, this.playSpeed);
  }

  stop() {
    this.isPlaying = false;
    document.getElementById('play-icon').textContent = '▶';
    document.querySelector('#play-btn').innerHTML = '<span id="play-icon">▶</span> 播放';
    
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }

  reset() {
    this.stop();
    this.setYear(2000);
  }

  setSpeed(speed) {
    this.playSpeed = parseInt(speed);
    if (this.isPlaying) {
      this.stop();
      this.play();
    }
  }

  toggleLabels(show) {
    this.showLabels = show;
    this.renderLayers();
  }

  toggleColorByYear(colorByYear) {
    this.colorByYear = colorByYear;
    this.renderLayers();
  }

  bindEvents() {
    document.getElementById('year-slider').addEventListener('input', (e) => {
      this.setYear(parseInt(e.target.value));
    });

    document.getElementById('play-btn').addEventListener('click', () => {
      if (this.isPlaying) {
        this.stop();
      } else {
        this.play();
      }
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
      this.reset();
    });

    document.getElementById('speed-select').addEventListener('change', (e) => {
      this.setSpeed(e.target.value);
    });

    document.getElementById('show-labels').addEventListener('change', (e) => {
      this.toggleLabels(e.target.checked);
    });

    document.getElementById('color-by-year').addEventListener('change', (e) => {
      this.toggleColorByYear(e.target.checked);
    });

    const mapSelect = document.getElementById('map-provider');
    if (mapSelect) {
      mapSelect.addEventListener('change', (e) => {
        this.switchMapProvider(e.target.value);
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new BuildingVisualization();
});
