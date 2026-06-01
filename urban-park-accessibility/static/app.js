mapboxgl.accessToken = 'pk.eyJ1IjoiZGVtby11c2VyIiwiYSI6ImNrbm93dDFiYzBsemYyb25zaHY4Y3R1N2UifQ.demo-token';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [113.94, 22.55],
    zoom: 13
});

map.addControl(new mapboxgl.NavigationControl(), 'top-right');

const API_BASE = '/api';

let visibleLayers = {
    parks: true,
    residential: true,
    isochrones: false,
    deserts: true
};

let demoMode = false;

map.on('load', async () => {
    initLayers();
    await refreshStats();
    setupEventListeners();
    
    try {
        await loadAllData();
    } catch (e) {
        console.log('Using demo mode:', e);
        enableDemoMode();
    }
});

function initLayers() {
    map.addSource('parks', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
    });
    
    map.addLayer({
        id: 'parks-layer',
        type: 'fill',
        source: 'parks',
        paint: {
            'fill-color': '#22c55e',
            'fill-opacity': 0.6
        }
    });
    
    map.addLayer({
        id: 'parks-outline',
        type: 'line',
        source: 'parks',
        paint: {
            'line-color': '#16a34a',
            'line-width': 2
        }
    });
    
    map.addSource('residential', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
    });
    
    map.addLayer({
        id: 'residential-layer',
        type: 'circle',
        source: 'residential',
        paint: {
            'circle-radius': 6,
            'circle-color': [
                'case',
                ['get', 'has_park_access'],
                '#3b82f6',
                '#ef4444'
            ],
            'circle-opacity': 0.8
        }
    });
    
    map.addSource('isochrones', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
    });
    
    map.addLayer({
        id: 'isochrones-layer',
        type: 'fill',
        source: 'isochrones',
        paint: {
            'fill-color': '#667eea',
            'fill-opacity': 0.3
        }
    });
    
    map.addLayer({
        id: 'isochrones-outline',
        type: 'line',
        source: 'isochrones',
        paint: {
            'line-color': '#667eea',
            'line-width': 2
        }
    });
    
    map.addSource('click-isochrone', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
    });
    
    map.addLayer({
        id: 'click-isochrone-layer',
        type: 'fill',
        source: 'click-isochrone',
        paint: {
            'fill-color': '#f59e0b',
            'fill-opacity': 0.4
        }
    });
}

function setupEventListeners() {
    document.querySelectorAll('.layer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const layer = btn.dataset.layer;
            visibleLayers[layer] = !visibleLayers[layer];
            btn.classList.toggle('active', visibleLayers[layer]);
            toggleLayer(layer, visibleLayers[layer]);
        });
    });
    
    const travelTimeSlider = document.getElementById('travel-time');
    travelTimeSlider.addEventListener('input', (e) => {
        document.getElementById('time-value').textContent = e.target.value;
    });
    
    document.getElementById('load-data').addEventListener('click', loadShenzhenData);
    document.getElementById('refresh-stats').addEventListener('click', refreshStats);
    
    map.on('click', handleMapClick);
    
    map.on('click', 'parks-layer', (e) => {
        const feature = e.features[0];
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
                <div class="popup-title">🌳 ${feature.properties.name || '公园'}</div>
                <div class="popup-content">
                    面积：${(feature.properties.area / 10000).toFixed(2)} 公顷
                </div>
            `)
            .addTo(map);
    });
    
    map.on('click', 'residential-layer', (e) => {
        const feature = e.features[0];
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
                <div class="popup-title">🏠 ${feature.properties.name || '居住区'}</div>
                <div class="popup-content">
                    公园可达：${feature.properties.has_park_access ? '✅ 是' : '❌ 否'}<br>
                    人口：约 ${feature.properties.population} 人
                </div>
            `)
            .addTo(map);
    });
}

async function loadAllData() {
    showLoading(true);
    
    try {
        const [parksRes, residentialRes, isochronesRes] = await Promise.all([
            fetch(`${API_BASE}/parks`),
            fetch(`${API_BASE}/residential`),
            fetch(`${API_BASE}/isochrones`)
        ]);
        
        if (!parksRes.ok) throw new Error('API not available');
        
        const parks = await parksRes.json();
        const residential = await residentialRes.json();
        const isochrones = await isochronesRes.json();
        
        updateParksLayer(parks);
        updateResidentialLayer(residential);
        updateIsochronesLayer(isochrones);
        
        await refreshStats();
    } finally {
        showLoading(false);
    }
}

async function loadShenzhenData() {
    showLoading(true);
    
    try {
        const response = await fetch(`${API_BASE}/load-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bbox: '22.53,113.92,22.57,113.96',
                type: 'all'
            })
        });
        
        if (!response.ok) {
            enableDemoMode();
            return;
        }
        
        await loadAllData();
    } catch (e) {
        console.log('Failed to load data, using demo mode:', e);
        enableDemoMode();
    } finally {
        showLoading(false);
    }
}

async function refreshStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        if (!response.ok) throw new Error('API not available');
        
        const stats = await response.json();
        
        document.getElementById('coverage-value').textContent = 
            `${stats.coverage.coverage_percentage}%`;
        document.getElementById('coverage-detail').textContent = 
            `${stats.coverage.covered_residential} / ${stats.coverage.total_residential} 个居住区覆盖`;
    } catch (e) {
        if (demoMode) {
            document.getElementById('coverage-value').textContent = '68.5%';
            document.getElementById('coverage-detail').textContent = 
                '42 / 61 个居住区覆盖（演示数据）';
        } else {
            document.getElementById('coverage-value').textContent = '--%';
            document.getElementById('coverage-detail').textContent = '暂无数据';
        }
    }
}

async function handleMapClick(e) {
    const travelTime = parseInt(document.getElementById('travel-time').value);
    
    try {
        const response = await fetch(`${API_BASE}/isochrone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lon: e.lngLat.lng,
                lat: e.lngLat.lat,
                travel_time: travelTime
            })
        });
        
        if (!response.ok) throw new Error('Failed to calculate isochrone');
        
        const result = await response.json();
        
        if (result.nearby_parks && result.nearby_parks.length > 0) {
            const isochrone = createCircleIsochrone(e.lngLat.lng, e.lngLat.lat, 
                (travelTime / 60) * 5 * 1000);
            
            map.getSource('click-isochrone').setData(isochrone);
            
            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(`
                    <div class="popup-title">📍 步行${travelTime}分钟可达范围</div>
                    <div class="popup-content">
                        附近公园：${result.nearby_parks_count} 个<br>
                        可达状态：${result.has_park_access ? '✅ 有公园可达' : '❌ 公园荒漠'}
                    </div>
                `)
                .addTo(map);
        }
    } catch (e) {
        const isochrone = createCircleIsochrone(e.lngLat.lng, e.lngLat.lat, 
            (travelTime / 60) * 5 * 1000);
        
        map.getSource('click-isochrone').setData(isochrone);
        
        const hasParkAccess = Math.random() > 0.3;
        
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
                <div class="popup-title">📍 步行${travelTime}分钟可达范围（演示）</div>
                <div class="popup-content">
                    附近公园：${Math.floor(Math.random() * 5)} 个<br>
                    可达状态：${hasParkAccess ? '✅ 有公园可达' : '❌ 公园荒漠'}
                </div>
            `)
            .addTo(map);
    }
}

function createCircleIsochrone(lon, lat, radiusMeters) {
    const earthRadius = 6371008;
    const points = 64;
    const coords = [];
    
    for (let i = 0; i < points; i++) {
        const angle = (i / points) * 2 * Math.PI;
        const latRadians = lat * Math.PI / 180;
        const lonRadians = lon * Math.PI / 180;
        
        const newLat = Math.asin(
            Math.sin(latRadians) * Math.cos(radiusMeters / earthRadius) +
            Math.cos(latRadians) * Math.sin(radiusMeters / earthRadius) * Math.cos(angle)
        );
        
        const newLon = lonRadians + Math.atan2(
            Math.sin(angle) * Math.sin(radiusMeters / earthRadius) * Math.cos(latRadians),
            Math.cos(radiusMeters / earthRadius) - Math.sin(latRadians) * Math.sin(newLat)
        );
        
        coords.push([
            newLon * 180 / Math.PI,
            newLat * 180 / Math.PI
        ]);
    }
    
    coords.push(coords[0]);
    
    return {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'Polygon',
                coordinates: [coords]
            }
        }]
    };
}

function updateParksLayer(data) {
    map.getSource('parks').setData(data);
}

function updateResidentialLayer(data) {
    map.getSource('residential').setData(data);
}

function updateIsochronesLayer(data) {
    const features = data.map(iso => ({
        type: 'Feature',
        properties: {
            has_park_access: iso.has_park_access
        },
        geometry: iso.geometry
    }));
    
    map.getSource('isochrones').setData({
        type: 'FeatureCollection',
        features
    });
}

function toggleLayer(layer, visible) {
    const visibility = visible ? 'visible' : 'none';
    
    switch(layer) {
        case 'parks':
            map.setLayoutProperty('parks-layer', 'visibility', visibility);
            map.setLayoutProperty('parks-outline', 'visibility', visibility);
            break;
        case 'residential':
            map.setLayoutProperty('residential-layer', 'visibility', visibility);
            break;
        case 'isochrones':
            map.setLayoutProperty('isochrones-layer', 'visibility', visibility);
            map.setLayoutProperty('isochrones-outline', 'visibility', visibility);
            break;
        case 'deserts':
            map.setFilter('residential-layer', 
                visible ? null : ['==', ['get', 'has_park_access'], true]
            );
            break;
    }
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function enableDemoMode() {
    demoMode = true;
    
    const demoParks = generateDemoParks();
    const demoResidential = generateDemoResidential();
    
    updateParksLayer(demoParks);
    updateResidentialLayer(demoResidential);
    
    refreshStats();
}

function generateDemoParks() {
    const parks = [];
    const center = [113.94, 22.55];
    
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * 2 * Math.PI;
        const distance = 0.01 + Math.random() * 0.015;
        const parkCenter = [
            center[0] + Math.cos(angle) * distance,
            center[1] + Math.sin(angle) * distance
        ];
        
        const polygon = [];
        const points = 12;
        const parkSize = 0.003 + Math.random() * 0.003;
        
        for (let j = 0; j < points; j++) {
            const a = (j / points) * 2 * Math.PI;
            const r = parkSize * (0.7 + Math.random() * 0.6);
            polygon.push([
                parkCenter[0] + Math.cos(a) * r,
                parkCenter[1] + Math.sin(a) * r
            ]);
        }
        polygon.push(polygon[0]);
        
        parks.push({
            type: 'Feature',
            properties: {
                id: i + 1,
                name: `公园 ${i + 1}`,
                area: Math.random() * 50000 + 10000
            },
            geometry: {
                type: 'Polygon',
                coordinates: [polygon]
            }
        });
    }
    
    return { type: 'FeatureCollection', features: parks };
}

function generateDemoResidential() {
    const residential = [];
    const center = [113.94, 22.55];
    
    for (let i = 0; i < 60; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * 0.03;
        const point = [
            center[0] + Math.cos(angle) * distance,
            center[1] + Math.sin(angle) * distance
        ];
        
        const distToCenter = Math.sqrt(
            Math.pow((point[0] - center[0]) * 85, 2) + 
            Math.pow((point[1] - center[1]) * 111, 2)
        );
        const hasParkAccess = distToCenter < 2;
        
        residential.push({
            type: 'Feature',
            properties: {
                id: i + 1,
                name: `小区 ${i + 1}`,
                population: Math.floor(Math.random() * 2000 + 500),
                has_park_access: hasParkAccess
            },
            geometry: {
                type: 'Point',
                coordinates: point
            }
        });
    }
    
    return { type: 'FeatureCollection', features: residential };
}
