const { DeckGL, ArcLayer, ScatterplotLayer, TextLayer } = deck;

let deckgl;
let allRoutes = [];
let allProvinces = [];
let allDestinations = [];
let statistics = null;
let currentColorMode = 'region';
let currentRegion = '';
let arcWidth = 3;

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

async function loadData() {
    try {
        const [routesRes, provincesRes, destinationsRes, statsRes] = await Promise.all([
            fetch('/api/routes'),
            fetch('/api/provinces'),
            fetch('/api/destinations'),
            fetch('/api/statistics')
        ]);
        
        allRoutes = await routesRes.json();
        allProvinces = await provincesRes.json();
        allDestinations = await destinationsRes.json();
        statistics = await statsRes.json();
        
        updateStatsDisplay();
        updateLegend();
        renderMap();
    } catch (error) {
        console.error('加载数据失败:', error);
        loadMockData();
    }
}

function loadMockData() {
    allRoutes = window.MOCK_ROUTES || [];
    allProvinces = window.MOCK_PROVINCES || [];
    allDestinations = window.MOCK_DESTINATIONS || [];
    renderMap();
}

function updateStatsDisplay() {
    if (!statistics) return;
    
    const statsHtml = `
        <div class="stat-item">
            <span class="stat-label">总订单数</span>
            <span class="stat-value">${statistics.totalPackages}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">航线数量</span>
            <span class="stat-value">${statistics.totalRoutes}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">平均花费</span>
            <span class="stat-value">¥${statistics.avgCost.toLocaleString()}</span>
        </div>
    `;
    document.getElementById('stats-overview').innerHTML = statsHtml;
    
    if (statistics.regionStats && statistics.regionStats['长三角']) {
        const topDest = statistics.regionStats['长三角'].topDestinations;
        const destHtml = topDest.map((d, i) => `
            <div class="dest-item">
                <span>${i + 1}. ${d.destination}</span>
                <span>${d.count}次</span>
            </div>
        `).join('');
        document.getElementById('top-destinations').innerHTML = destHtml;
    }
}

function updateLegend() {
    const legendContent = document.getElementById('legend-content');
    
    if (currentColorMode === 'region') {
        legendContent.innerHTML = Object.entries(regionColors).map(([name, color]) => `
            <div class="legend-item">
                <div class="legend-color" style="background: rgb(${color.join(',')})"></div>
                <span>${name}</span>
            </div>
        `).join('');
    } else {
        legendContent.innerHTML = costColors.map(tier => `
            <div class="legend-item">
                <div class="legend-color" style="background: rgb(${tier.color.join(',')})"></div>
                <span>${tier.label}</span>
            </div>
        `).join('');
    }
}

function getFilteredRoutes() {
    if (!currentRegion) return allRoutes;
    const provinceRegionMap = {};
    allProvinces.forEach(p => {
        provinceRegionMap[p.name] = p.region;
    });
    return allRoutes.filter(r => provinceRegionMap[r.from.name] === currentRegion);
}

function renderMap() {
    const filteredRoutes = getFilteredRoutes();
    
    const arcLayer = new ArcLayer({
        id: 'flight-arcs',
        data: filteredRoutes,
        getSourcePosition: d => d.sourcePosition,
        getTargetPosition: d => d.targetPosition,
        getSourceColor: d => currentColorMode === 'region' ? d.regionColor : getCostColor(d.avgCost),
        getTargetColor: d => currentColorMode === 'region' ? d.regionColor : getCostColor(d.avgCost),
        getWidth: d => Math.max(1, Math.log2(d.count + 1) * arcWidth),
        getHeight: 0.5,
        greatCircle: true,
        pickable: true,
        onHover: ({ object, x, y }) => {
            const el = document.getElementById('route-info');
            if (object) {
                el.innerHTML = `
                    <div class="route-detail">
                        <strong>${object.from.name} → ${object.to.name}</strong><br>
                        订单数: ${object.count}<br>
                        平均花费: ¥${object.avgCost.toLocaleString()}<br>
                        人均收入: ¥${object.income.toLocaleString()}<br>
                        距离: ${object.distance} km
                    </div>
                `;
            } else {
                el.innerHTML = '悬停弧线查看详情';
            }
        },
        updateTriggers: {
            getSourceColor: [currentColorMode],
            getTargetColor: [currentColorMode],
            getWidth: [arcWidth]
        }
    });
    
    const provinceLayer = new ScatterplotLayer({
        id: 'province-points',
        data: allProvinces,
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
        data: allDestinations,
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
        data: allDestinations,
        getPosition: d => d.coord,
        getText: d => d.name,
        getSize: 12,
        getColor: [255, 255, 255],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'bottom',
        getPixelOffset: [0, -20]
    });
    
    if (!deckgl) {
        deckgl = new DeckGL({
            container: 'deckgl-container',
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
            layers: [arcLayer, provinceLayer, destinationLayer, destTextLayer]
        });
    } else {
        deckgl.setProps({
            layers: [arcLayer, provinceLayer, destinationLayer, destTextLayer]
        });
    }
}

document.getElementById('regionFilter').addEventListener('change', (e) => {
    currentRegion = e.target.value;
    renderMap();
});

document.getElementById('colorMode').addEventListener('change', (e) => {
    currentColorMode = e.target.value;
    updateLegend();
    renderMap();
});

document.getElementById('arcWidth').addEventListener('input', (e) => {
    arcWidth = parseInt(e.target.value);
    document.getElementById('arcWidthValue').textContent = arcWidth;
    renderMap();
});

loadData();
