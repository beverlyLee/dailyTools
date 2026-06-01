let map;
let markers = [];
let polylines = [];

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    bindEvents();
});

function initMap() {
    map = L.map('map').setView([39.9042, 116.4074], 12);
    
    const gaodeNormalLayer = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
        subdomains: ['1', '2', '3', '4'],
        attribution: '&copy; 高德地图'
    });
    
    const gaodeSatelliteLayer = L.tileLayer('https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', {
        subdomains: ['1', '2', '3', '4'],
        attribution: '&copy; 高德卫星'
    });
    
    gaodeNormalLayer.addTo(map);
    
    L.control.layers({
        '标准地图': gaodeNormalLayer,
        '卫星地图': gaodeSatelliteLayer
    }).addTo(map);
}

function bindEvents() {
    document.getElementById('generateBtn').addEventListener('click', generatePlan);
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
    
    document.getElementById('tripInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            generatePlan();
        }
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName);
    });
}

async function generatePlan() {
    const input = document.getElementById('tripInput').value.trim();
    
    if (!input) {
        alert('请输入目的地和天数');
        return;
    }
    
    showLoading(true);
    hideContent();
    
    try {
        const response = await fetch('/api/generate-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ input })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayResult(result.data);
        } else {
            alert('生成失败：' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('网络错误，请稍后重试');
    } finally {
        showLoading(false);
    }
}

function displayResult(data) {
    const { city, days, route, polished_trip } = data;
    
    document.getElementById('resultTitle').textContent = `${city}${days}天行程`;
    document.getElementById('totalDistance').textContent = 
        `总步行距离：${formatDistance(route.total_distance)}`;
    
    displayItinerary(route.days);
    displayPolishedTrip(polished_trip);
    displayRouteOnMap(route);
    
    showContent();
}

function formatMinutes(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function displayItinerary(days) {
    const daysList = document.getElementById('daysList');
    daysList.innerHTML = '';
    
    days.forEach(day => {
        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';
        
        const schedule = day.schedule || [];
        const poiCount = day.pois ? day.pois.length : 0;
        
        dayCard.innerHTML = `
            <div class="day-header">
                <h4>第 ${day.day} 天</h4>
                <div class="day-stats">
                    <span class="day-pois">📍 ${poiCount} 个景点</span>
                    <span class="day-distance">🚶 步行 ${formatDistance(day.total_distance)}</span>
                    <span class="day-duration">⏱️ 行程 ${Math.round(day.total_duration / 60)} 小时</span>
                </div>
            </div>
            <div class="timeline-container">
                ${schedule.map((item, index) => {
                    const startTime = formatMinutes(item.start_time);
                    const endTime = formatMinutes(item.end_time);
                    const isPoi = item.type === 'poi';
                    const isTransport = item.type === 'transport';
                    const isMeal = item.type === 'breakfast' || item.type === 'lunch' || item.type === 'dinner';
                    const isRest = item.type === 'rest';
                    const isReturn = item.type === 'return';
                    
                    let itemClass = 'timeline-item';
                    if (isPoi) itemClass += ' timeline-poi';
                    if (isTransport) itemClass += ' timeline-transport';
                    if (isMeal) itemClass += ' timeline-meal';
                    if (isRest) itemClass += ' timeline-rest';
                    if (isReturn) itemClass += ' timeline-return';
                    
                    let detailText = '';
                    if (isPoi && item.category) {
                        detailText = item.category;
                    } else if (isTransport && item.transport_type) {
                        detailText = `约 ${item.distance} 米`;
                    }
                    
                    return `
                        <div class="${itemClass}">
                            <div class="timeline-icon">${item.icon}</div>
                            <div class="timeline-content">
                                <div class="timeline-name">${item.name}</div>
                                <div class="timeline-time">
                                    <span>${startTime} - ${endTime}</span>
                                    <span class="timeline-duration">${item.duration} 分钟</span>
                                </div>
                                ${detailText ? `<div class="timeline-detail">${detailText}</div>` : ''}
                                ${isPoi ? `<div class="timeline-address">位置: ${item.poi_data?.name || ''}</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        daysList.appendChild(dayCard);
    });
}

function displayPolishedTrip(polished) {
    document.getElementById('polishedTitle').textContent = polished.title;
    document.getElementById('polishedText').textContent = polished.content;
}

function displayRouteOnMap(route) {
    clearMapLayers();
    
    const allPois = route.all_pois;
    
    if (allPois.length === 0) return;
    
    const bounds = L.latLngBounds(allPois.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
    
    allPois.forEach((poi, index) => {
        const marker = L.marker([poi.lat, poi.lng], {
            icon: createNumberIcon(index + 1)
        }).addTo(map);
        
        marker.bindPopup(`<b>${index + 1}. ${poi.name}</b>`);
        markers.push(marker);
    });
    
    for (let i = 0; i < allPois.length - 1; i++) {
        const start = allPois[i];
        const end = allPois[i + 1];
        
        const polyline = L.polyline(
            [[start.lat, start.lng], [end.lat, end.lng]],
            {
                color: '#667eea',
                weight: 4,
                opacity: 0.8,
                dashArray: '10, 10'
            }
        ).addTo(map);
        
        polylines.push(polyline);
    }
}

function createNumberIcon(number) {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.3);
            border: 2px solid white;
        ">${number}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
}

function clearMapLayers() {
    markers.forEach(marker => map.removeLayer(marker));
    polylines.forEach(polyline => map.removeLayer(polyline));
    markers = [];
    polylines = [];
}

function formatDistance(meters) {
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(1)} 公里`;
    }
    return `${meters} 米`;
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showContent() {
    document.getElementById('content').style.display = 'block';
}

function hideContent() {
    document.getElementById('content').style.display = 'none';
}
