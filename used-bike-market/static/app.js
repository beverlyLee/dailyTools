let map;
let heatmap;
let markers = [];
let currentData = [];
let currentHotspots = [];
let gaodeApiLoaded = false;
let loadRetryCount = 0;
const MAX_RETRY = 3;

async function fetchData(type = 'all', keyword = '') {
    try {
        const response = await fetch('/api/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: type,
                keyword: keyword
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        currentData = data.items;
        currentHotspots = data.hotspots;
        return data;
    } catch (error) {
        console.error('获取数据失败:', error);
        throw error;
    }
}

async function fetchStats() {
    const response = await fetch('/api/stats');
    return await response.json();
}

function initMap() {
    if (typeof AMap === 'undefined') {
        console.error('高德地图 API 未加载');
        return;
    }
    
    try {
        map = new AMap.Map('map', {
            zoom: 5,
            center: [110.0, 35.0],
            viewMode: '2D',
            pitch: 0
        });

        map.on('complete', function() {
            console.log('地图加载完成');
            loadMapPlugins();
        });
        
    } catch (error) {
        console.error('地图初始化失败:', error);
    }
}

function loadMapPlugins() {
    if (typeof AMap.plugin !== 'function') {
        console.warn('AMap.plugin 不可用，尝试直接加载插件');
        initMapControls();
        return;
    }

    const plugins = ['AMap.ToolBar', 'AMap.Scale', 'AMap.HeatMap'];
    
    AMap.plugin(plugins, function() {
        console.log('地图插件加载完成');
        initMapControls();
    });
}

function initMapControls() {
    try {
        if (AMap.ToolBar) {
            map.addControl(new AMap.ToolBar({
                position: 'RB'
            }));
        }
        if (AMap.Scale) {
            map.addControl(new AMap.Scale());
        }
    } catch (e) {
        console.warn('部分地图控件加载失败:', e);
    }
}

function updateHeatmap(items) {
    if (heatmap) {
        try {
            map.remove(heatmap);
        } catch (e) {
            console.warn('移除热力图失败:', e);
        }
        heatmap = null;
    }

    const heatmapData = items.map(item => ({
        lng: item.lng,
        lat: item.lat,
        count: 1
    }));

    try {
        if (typeof AMap.HeatMap === 'function') {
            heatmap = new AMap.HeatMap(map, {
                radius: 25,
                opacity: [0, 0.8],
                gradient: {
                    0.4: 'blue',
                    0.65: 'rgb(117,211,248)',
                    0.7: 'rgb(0, 255, 0)',
                    0.9: '#ffea00',
                    1.0: 'red'
                }
            });

            heatmap.setDataSet({
                data: heatmapData,
                max: 10
            });
        } else {
            console.warn('热力图插件不可用，使用标记点替代');
            updateMarkers(items);
        }
    } catch (error) {
        console.error('热力图创建失败:', error);
        updateMarkers(items);
    }
}

function updateMarkers(items) {
    markers.forEach(marker => {
        try {
            map.remove(marker);
        } catch (e) {}
    });
    markers = [];

    items.forEach(item => {
        try {
            const marker = new AMap.Marker({
                position: [item.lng, item.lat],
                title: item.title,
                icon: new AMap.Icon({
                    size: new AMap.Size(24, 36),
                    image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
                    imageSize: new AMap.Size(24, 36)
                })
            });

            const infoWindow = new AMap.InfoWindow({
                content: `
                    <div style="padding: 10px; min-width: 200px;">
                        <h4 style="margin: 0 0 8px 0;">${item.title}</h4>
                        <p style="margin: 4px 0;"><strong>价格:</strong> ¥${item.price}</p>
                        <p style="margin: 4px 0;"><strong>位置:</strong> ${item.location}</p>
                        <p style="margin: 4px 0;"><strong>类型:</strong> ${item.type}</p>
                    </div>
                `,
                offset: new AMap.Pixel(0, -30)
            });

            marker.on('click', () => {
                infoWindow.open(map, marker.getPosition());
            });

            markers.push(marker);
            map.add(marker);
        } catch (e) {
            console.error('标记点创建失败:', e);
        }
    });
}

function updateDisplay(items, mode) {
    if (mode === 'heatmap') {
        updateHeatmap(items);
        markers.forEach(marker => {
            try {
                map.remove(marker);
            } catch (e) {}
        });
        markers = [];
    } else {
        if (heatmap) {
            try {
                map.remove(heatmap);
            } catch (e) {}
            heatmap = null;
        }
        updateMarkers(items);
    }
}

function updateStats(data) {
    document.getElementById('totalCount').textContent = data.total_count;
    document.getElementById('avgPrice').textContent = '¥' + data.avg_price;
    document.getElementById('medianPrice').textContent = '¥' + data.median_price;
    document.getElementById('hotspotCount').textContent = currentHotspots.length;
}

function updateHotspotList(hotspots) {
    const container = document.getElementById('hotspotList');
    container.innerHTML = '';

    hotspots.slice(0, 5).forEach(hotspot => {
        const item = document.createElement('div');
        item.className = 'hotspot-item';
        item.innerHTML = `
            <div class="location">${hotspot.location}</div>
            <div class="details">
                <span>${hotspot.count} 件商品</span>
                <span>均价 ¥${hotspot.avg_price}</span>
            </div>
        `;
        item.onclick = () => {
            map.setCenter([hotspot.center.lng, hotspot.center.lat]);
            map.setZoom(13);
        };
        container.appendChild(item);
    });
}

function updateLocationStats(stats) {
    const container = document.getElementById('locationStats');
    container.innerHTML = '';

    Object.entries(stats.top_locations || {}).forEach(([name, count]) => {
        const item = document.createElement('div');
        item.className = 'location-item';
        item.innerHTML = `
            <span class="location-name">${name}</span>
            <span class="location-count">${count} 件</span>
        `;
        container.appendChild(item);
    });
}

async function loadData() {
    try {
        const type = document.getElementById('typeFilter').value;
        const keyword = document.getElementById('keywordFilter').value;
        const displayMode = document.getElementById('displayMode').value;

        const data = await fetchData(type, keyword);
        const stats = await fetchStats();

        if (map) {
            updateDisplay(data.items, displayMode);
        }
        updateStats(data);
        updateHotspotList(data.hotspots);
        updateLocationStats(data);
    } catch (error) {
        console.error('加载数据失败:', error);
    }
}

function loadGaodeScript(apiKey) {
    return new Promise((resolve, reject) => {
        if (typeof AMap !== 'undefined' && AMap.Map) {
            console.log('高德地图 API 已加载');
            gaodeApiLoaded = true;
            resolve();
            return;
        }

        window._AMapSecurityConfig = {
            securityJsCode: '',
        };

        const script = document.createElement('script');
        script.type = 'text/javascript';
        
        const scriptUrl = new URL('https://webapi.amap.com/maps');
        scriptUrl.searchParams.set('v', '2.0');
        scriptUrl.searchParams.set('key', apiKey);
        
        script.src = scriptUrl.toString();
        
        console.log('加载地图脚本:', script.src);
        
        script.onload = () => {
            console.log('高德地图脚本加载完成，等待初始化...');
            
            const checkAMap = setInterval(() => {
                if (typeof AMap !== 'undefined' && AMap.Map) {
                    clearInterval(checkAMap);
                    console.log('高德地图 API 初始化成功');
                    gaodeApiLoaded = true;
                    resolve();
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(checkAMap);
                if (typeof AMap !== 'undefined') {
                    resolve();
                } else {
                    reject(new Error('高德地图 API 初始化超时'));
                }
            }, 10000);
        };
        
        script.onerror = () => {
            console.error('高德地图脚本加载失败');
            reject(new Error('高德地图脚本加载失败'));
        };
        
        document.head.appendChild(script);
    });
}

async function retryLoadGaode(apiKey) {
    while (loadRetryCount < MAX_RETRY) {
        try {
            await loadGaodeScript(apiKey);
            return true;
        } catch (error) {
            loadRetryCount++;
            console.log(`重试加载地图 API (${loadRetryCount}/${MAX_RETRY})`);
            await new Promise(resolve => setTimeout(resolve, 1000 * loadRetryCount));
        }
    }
    return false;
}

function showApiKeyHelp() {
    const helpHtml = `
        <div style="padding: 20px; max-width: 500px;">
            <h3 style="margin-top: 0;">高德地图 API Key 配置指南</h3>
            <p style="color: #666; line-height: 1.6;">
                检测到 API Key 可能存在问题，请确保：
            </p>
            <ol style="color: #666; line-height: 1.8;">
                <li>访问 <a href="https://console.amap.com/dev/key/app" target="_blank" style="color: #667eea;">高德开放平台控制台</a></li>
                <li>创建新应用，添加 <strong>"Web 端 (JS API)"</strong> 类型的 Key</li>
                <li><strong style="color: #e74c3c;">不要</strong> 使用 "Web 服务" 或其他类型的 Key</li>
                <li>域名白名单可设置为 <code>*</code> 或 <code>localhost</code></li>
                <li>将 Key 填入项目 <code>.env</code> 文件中的 <code>GAODE_JS_API_KEY</code></li>
            </ol>
            <p style="color: #999; font-size: 12px; margin-top: 15px;">
                注意：USERKEY_PLAT_NOMATCH 错误表示 Key 类型不匹配
            </p>
        </div>
    `;
    
    const mapDiv = document.getElementById('map');
    if (mapDiv) {
        mapDiv.innerHTML = helpHtml;
        mapDiv.style.overflow = 'auto';
    }
}

async function init() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        if (!config.gaode_api_key || 
            config.gaode_api_key === 'YOUR_DEFAULT_API_KEY' || 
            config.gaode_api_key === '') {
            console.warn('未配置高德地图 API Key');
            showApiKeyHelp();
            return;
        }

        console.log('使用 API Key:', config.gaode_api_key.substring(0, 8) + '...');

        const loadSuccess = await retryLoadGaode(config.gaode_api_key);
        
        if (!loadSuccess) {
            console.error('地图 API 加载失败，已达到最大重试次数');
            showApiKeyHelp();
            return;
        }

        initMap();
        
        setTimeout(() => {
            if (map) {
                loadData();
            } else {
                console.warn('地图未初始化，延迟加载数据');
                setTimeout(loadData, 1000);
            }
        }, 500);
        
    } catch (error) {
        console.error('初始化失败:', error);
        showApiKeyHelp();
    }
}

document.getElementById('typeFilter').addEventListener('change', loadData);
document.getElementById('keywordFilter').addEventListener('change', loadData);
document.getElementById('displayMode').addEventListener('change', loadData);
document.getElementById('refreshBtn').addEventListener('click', loadData);

document.addEventListener('DOMContentLoaded', init);
