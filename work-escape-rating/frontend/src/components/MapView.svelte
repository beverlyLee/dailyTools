<script>
    import { createEventDispatcher, onMount, onDestroy } from 'svelte';

    export let places = [];
    export let selectedPlace = null;
    const dispatch = createEventDispatcher();

    let mapContainer;
    let mapLoaded = false;
    let hoveredPlaceId = null;

    const BEIJING_CENTER = { lat: 39.9042, lng: 116.4074 };
    const MAP_BOUNDS = {
        minLat: 39.85,
        maxLat: 40.02,
        minLng: 116.28,
        maxLng: 116.52
    };

    function latLngToXY(lat, lng, width, height) {
        const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * width;
        const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * height;
        return { x, y };
    }

    function xyToLatLng(x, y, width, height) {
        const lng = (x / width) * (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng) + MAP_BOUNDS.minLng;
        const lat = MAP_BOUNDS.maxLat - (y / height) * (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
        return { lat, lng };
    }

    function getMarkerColor(type) {
        return type === 'bookstore' 
            ? { main: '#8B5CF6', light: '#C4B5FD', dark: '#7C3AED' }
            : { main: '#F59E0B', light: '#FDE68A', dark: '#D97706' };
    }

    function getPlaceScoreColor(score) {
        if (score >= 9) return '#10B981';
        if (score >= 8) return '#3B82F6';
        if (score >= 7) return '#6366F1';
        if (score >= 6) return '#F59E0B';
        return '#EF4444';
    }

    function handleMarkerClick(place) {
        dispatch('select', place);
    }

    function handleMarkerHover(placeId) {
        hoveredPlaceId = placeId;
    }

    function getDistrict(lat, lng) {
        if (lng > 116.45) return '朝阳区';
        if (lng < 116.35) return '海淀区';
        if (lat < 39.9) return '西城区';
        return '东城区';
    }

    onMount(() => {
        mapLoaded = true;
    });
</script>

<div class="map-wrapper">
    <div class="map-header">
        <h2 class="map-title">🗺️ 摸鱼地点分布图</h2>
        <div class="map-legend">
            <span class="legend-item">
                <span class="legend-dot cafe"></span>
                咖啡馆
            </span>
            <span class="legend-item">
                <span class="legend-dot bookstore"></span>
                书店
            </span>
        </div>
    </div>
    
    <div class="map-container-wrapper">
        <!-- 交互式 SVG 地图 -->
        <div class="map-container">
            {#if mapLoaded}
                <svg 
                    class="interactive-map"
                    viewBox="0 0 800 600"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <!-- 地图背景 -->
                    <defs>
                        <linearGradient id="mapBg" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="#f8fafc"/>
                            <stop offset="100%" stop-color="#e2e8f0"/>
                        </linearGradient>
                        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.2"/>
                        </filter>
                        <filter id="markerShadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.3"/>
                        </filter>
                    </defs>

                    <!-- 地图底板 -->
                    <rect width="800" height="600" fill="url(#mapBg)" rx="12"/>

                    <!-- 主要道路/区域线 -->
                    <g stroke="#cbd5e1" stroke-width="1.5" fill="none" opacity="0.6">
                        <!-- 长安街 -->
                        <line x1="50" y1="300" x2="750" y2="300"/>
                        <!-- 三环 -->
                        <ellipse cx="400" cy="300" rx="320" ry="200" stroke-dasharray="8,4"/>
                        <!-- 二环 -->
                        <ellipse cx="400" cy="300" rx="200" ry="130" stroke-dasharray="8,4"/>
                    </g>

                    <!-- 区域标签 -->
                    <g font-size="12" fill="#94a3b8" font-weight="500">
                        <text x="680" y="150" text-anchor="middle">朝阳区</text>
                        <text x="120" y="150" text-anchor="middle">海淀区</text>
                        <text x="400" y="480" text-anchor="middle">丰台区</text>
                        <text x="400" y="120" text-anchor="middle">东城区</text>
                    </g>

                    <!-- 地点标记 -->
                    {#each places as place}
                        {#if place.latitude && place.longitude}
                            {@const pos = latLngToXY(place.latitude, place.longitude, 800, 600)}
                            {@const colors = getMarkerColor(place.type)}
                            {@const isHovered = hoveredPlaceId === place.id}
                            {@const isSelected = selectedPlace && selectedPlace.id === place.id}
                            {@const scale = isHovered || isSelected ? 1.3 : 1}
                            {@const markerY = pos.y - 20 * scale}

                            <!-- 悬停时的连接线 -->
                            {#if isHovered || isSelected}
                                <line 
                                    x1={pos.x} 
                                    y1={pos.y} 
                                    x2={pos.x} 
                                    y2={markerY + 10}
                                    stroke={colors.main}
                                    stroke-width="2"
                                    stroke-dasharray="4,2"
                                    opacity="0.6"
                                />
                            {/if}

                            <!-- Marker 组 -->
                            <g 
                                transform={`translate(${pos.x}, ${markerY}) scale(${scale})`}
                                style="cursor: pointer; transform-origin: bottom center;"
                                on:click={() => handleMarkerClick(place)}
                                on:mouseenter={() => handleMarkerHover(place.id)}
                                on:mouseleave={() => handleMarkerHover(null)}
                                filter="url(#markerShadow)"
                            >
                                <!-- Marker 主体 -->
                                <path 
                                    d="M-20,-40 L-20,-10 Q-20,0 -10,0 L-3,0 L0,10 L3,0 L10,0 Q20,0 20,-10 L20,-40 Q20,-50 10,-50 L-10,-50 Q-20,-50 -20,-40 Z"
                                    fill={colors.main}
                                    stroke="white"
                                    stroke-width="3"
                                />
                                <!-- 内部圆形 -->
                                <circle cx="0" cy="-25" r="14" fill="white"/>
                                <!-- 图标 -->
                                <text 
                                    x="0" 
                                    y="-20" 
                                    text-anchor="middle" 
                                    font-size="16"
                                >
                                    {place.type === 'bookstore' ? '📚' : '☕'}
                                </text>
                                <!-- 评分徽章 -->
                                <g transform="translate(12, -48)">
                                    <circle r="10" fill={getPlaceScoreColor(place.overall_score)}/>
                                    <text 
                                        y="3" 
                                        text-anchor="middle" 
                                        fill="white" 
                                        font-size="9" 
                                        font-weight="bold"
                                    >
                                        {place.overall_score.toFixed(0)}
                                    </text>
                                </g>
                            </g>

                            <!-- 信息卡片（悬停/选中时显示） -->
                            {#if isHovered || isSelected}
                                <g transform={`translate(${pos.x + 30}, ${pos.y - 80})`} filter="url(#shadow)">
                                    <rect 
                                        width="200" 
                                        height="90" 
                                        rx="10" 
                                        fill="white"
                                        stroke={colors.main}
                                        stroke-width="2"
                                    />
                                    <foreignObject x="10" y="10" width="180" height="70">
                                        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                                            <div style="font-weight: 700; font-size: 13px; color: #1e293b; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                                {place.name}
                                            </div>
                                            <div style="font-size: 11px; color: #64748b; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                                📍 {getDistrict(place.latitude, place.longitude)}
                                            </div>
                                            <div style="display: flex; gap: 8px;">
                                                <span style="background: #dbeafe; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 500;">
                                                    📶 {(place.wifi_score * 10).toFixed(0)}
                                                </span>
                                                <span style="background: #d1fae5; color: #047857; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 500;">
                                                    🔌 {place.socket_count}
                                                </span>
                                                <span style="background: #ede9fe; color: #6d28d9; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 500;">
                                                    🤫 {(place.noise_level * 10).toFixed(0)}
                                                </span>
                                            </div>
                                        </div>
                                    </foreignObject>
                                </g>
                            {/if}
                        {/if}
                    {/each}

                    <!-- 指南针 -->
                    <g transform="translate(730, 60)">
                        <circle r="25" fill="white" stroke="#e2e8f0" stroke-width="2"/>
                        <path d="M0,-18 L5,8 L0,2 L-5,8 Z" fill="#EF4444"/>
                        <path d="M0,18 L5,-8 L0,-2 L-5,-8 Z" fill="#94a3b8"/>
                        <text y="5" text-anchor="middle" font-size="8" font-weight="bold" fill="#64748b">N</text>
                    </g>

                    <!-- 比例尺 -->
                    <g transform="translate(30, 550)">
                        <line x1="0" y1="0" x2="80" y2="0" stroke="#64748b" stroke-width="2"/>
                        <line x1="0" y1="-5" x2="0" y2="5" stroke="#64748b" stroke-width="2"/>
                        <line x1="40" y1="-3" x2="40" y2="3" stroke="#64748b" stroke-width="1"/>
                        <line x1="80" y1="-5" x2="80" y2="5" stroke="#64748b" stroke-width="2"/>
                        <text x="40" y="18" text-anchor="middle" font-size="10" fill="#64748b">5 km</text>
                    </g>
                </svg>
            {/if}
        </div>

        <!-- 地点列表面板 -->
        <div class="places-list-panel">
            <div class="panel-header">
                <span class="panel-title">附近地点 ({places.length})</span>
            </div>
            <div class="places-scroll">
                {#each places as place}
                    <div 
                        class="place-item"
                        class:selected={selectedPlace && selectedPlace.id === place.id}
                        on:click={() => dispatch('select', place)}
                        on:mouseenter={() => handleMarkerHover(place.id)}
                        on:mouseleave={() => handleMarkerHover(null)}
                    >
                        <span class="place-type-icon">
                            {place.type === 'bookstore' ? '📚' : '☕'}
                        </span>
                        <div class="place-info">
                            <div class="place-name">{place.name}</div>
                            <div class="place-address">{getDistrict(place.latitude, place.longitude)} · {place.address.slice(0, 12)}...</div>
                            <div class="place-tags">
                                <span class="tag wifi">WiFi {(place.wifi_score * 10).toFixed(0)}</span>
                                <span class="tag socket">🔌 {place.socket_count}</span>
                                <span class="tag quiet">🤫 {(place.noise_level * 10).toFixed(0)}</span>
                            </div>
                        </div>
                        <div class="place-score" style="color: {getPlaceScoreColor(place.overall_score)}">
                            {place.overall_score.toFixed(1)}
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>

<style>
    .map-wrapper {
        background: white;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        margin-bottom: 32px;
    }

    .map-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }

    .map-title {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
    }

    .map-legend {
        display: flex;
        gap: 16px;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        opacity: 0.95;
    }

    .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
    }

    .legend-dot.cafe {
        background: #F59E0B;
    }

    .legend-dot.bookstore {
        background: #8B5CF6;
    }

    .map-container-wrapper {
        display: flex;
        min-height: 520px;
    }

    .map-container {
        flex: 1;
        min-height: 520px;
        position: relative;
        background: #f1f5f9;
        padding: 16px;
    }

    .interactive-map {
        width: 100%;
        height: 100%;
        min-height: 488px;
    }

    /* 地点列表面板 */
    .places-list-panel {
        width: 320px;
        border-left: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        background: #f8fafc;
    }

    .panel-header {
        padding: 16px 20px;
        border-bottom: 1px solid #e2e8f0;
        background: white;
    }

    .panel-title {
        font-weight: 600;
        font-size: 14px;
        color: #1e293b;
    }

    .places-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        max-height: 440px;
    }

    .place-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px;
        background: white;
        border-radius: 12px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.2s;
        border: 2px solid transparent;
    }

    .place-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        border-color: #667eea;
    }

    .place-item.selected {
        border-color: #667eea;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
    }

    .place-type-icon {
        font-size: 24px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f3f4f6;
        border-radius: 8px;
        flex-shrink: 0;
    }

    .place-info {
        flex: 1;
        min-width: 0;
    }

    .place-name {
        font-weight: 600;
        font-size: 14px;
        color: #1e293b;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .place-address {
        font-size: 11px;
        color: #64748b;
        margin-bottom: 6px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .place-tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
    }

    .tag {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 500;
    }

    .tag.wifi {
        background: #dbeafe;
        color: #1d4ed8;
    }

    .tag.socket {
        background: #d1fae5;
        color: #047857;
    }

    .tag.quiet {
        background: #ede9fe;
        color: #6d28d9;
    }

    .place-score {
        font-size: 22px;
        font-weight: 700;
        flex-shrink: 0;
        align-self: center;
    }

    /* 响应式 */
    @media (max-width: 900px) {
        .map-container-wrapper {
            flex-direction: column;
        }

        .places-list-panel {
            width: 100%;
            border-left: none;
            border-top: 1px solid #e2e8f0;
        }

        .places-scroll {
            max-height: 240px;
        }

        .map-container {
            min-height: 380px;
        }

        .interactive-map {
            min-height: 350px;
        }
    }
</style>
