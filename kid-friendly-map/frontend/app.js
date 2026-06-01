const { createApp, ref, reactive, onMounted, computed } = Vue;

const DISNEYLAND_CENTER = [121.6570, 31.1416];
const DEFAULT_QUERY_CENTER = { lat: 31.1416, lng: 121.6570 };

createApp({
    setup() {
        const loading = ref(true);
        const showFilterPanel = ref(false);
        const showPopup = ref(false);
        const selectedPoi = ref(null);
        const pois = ref([]);
        const markers = ref([]);
        const useDefaultCenter = ref(false);
        let map = null;
        let amap = null;
        let initialLoadDone = false;

        const config = reactive({
            gaodeJsApiKey: '',
            defaultCenter: { lat: 31.1416, lng: 121.6570 },
            scoreLevels: {},
            poiTypes: []
        });

        const selectedTypes = ref([]);
        const minScore = ref(0);
        const selectedRadius = ref(5000);
        const radiusOptions = [
            { value: 2000, label: '2公里' },
            { value: 5000, label: '5公里' },
            { value: 10000, label: '10公里' }
        ];

        const scoreLevels = computed(() => {
            return Object.entries(config.scoreLevels).map(([key, value]) => ({
                key,
                ...value
            }));
        });

        const poiTypes = computed(() => config.poiTypes);

        function getScoreColor(level) {
            return config.scoreLevels[level]?.color || '#FBBF24';
        }

        function getScoreLabel(level) {
            return config.scoreLevels[level]?.label || '一般';
        }

        function getScoreColorByValue(score) {
            if (score >= 9) return '#36D399';
            if (score >= 7) return '#A3E635';
            if (score >= 5) return '#FBBF24';
            return '#F87272';
        }

        function getTypeIcon(type) {
            const icons = { mall: '🏬', park: '🌳', museum: '🏛️' };
            return icons[type] || '📍';
        }

        function getFacilityIcon(key) {
            const icons = {
                babyRoom: '🍼',
                changingTable: '🚼',
                strollerRental: '👶',
                playArea: '🎠',
                nursingRoom: '🤱'
            };
            return icons[key] || '✅';
        }

        function getMarkerContent(poi) {
            const score = poi.totalScore.toFixed(1);
            return `
                <div class="custom-marker level-${poi.scoreLevel}" data-poi-id="${poi.id}" onclick="window.__handleMarkerClick && window.__handleMarkerClick('${poi.id}')">
                    <span class="marker-score">${score}</span>
                </div>
            `;
        }

        function createMarker(poi) {
            const content = getMarkerContent(poi);
            const marker = new amap.Marker({
                position: [poi.lng, poi.lat],
                content: content,
                offset: new amap.Pixel(-20, -45),
                zIndex: 100
            });

            marker.on('click', () => {
                console.log('[Marker] AMap click event:', poi.name);
                handleMarkerClick(poi);
            });

            marker.on('mouseover', () => marker.setzIndex(1000));
            marker.on('mouseout', () => marker.setzIndex(100));

            return marker;
        }

        function clearMarkers() {
            if (map && markers.value.length > 0) {
                try {
                    map.remove(markers.value);
                } catch (e) {
                    console.warn('[Clear] map.remove error:', e);
                }
                markers.value = [];
            }
            const cleared = markers.value.length === 0;
            console.log(`[Clear] markers cleared: ${cleared} (length=${markers.value.length})`);
            return cleared;
        }

        function renderMarkers(poiList, skipFitView) {
            console.log(`[Render] API returned ${poiList.length} POIs`);

            if (!clearMarkers()) {
                console.error('[Render] Failed to clear old markers');
            }

            const newMarkers = [];
            poiList.forEach(poi => {
                const marker = createMarker(poi);
                newMarkers.push(marker);
            });

            markers.value = newMarkers;

            if (map && newMarkers.length > 0) {
                try {
                    map.add(newMarkers);
                } catch (e) {
                    console.error('[Render] map.add error:', e);
                }

                if (!skipFitView) {
                    try {
                        map.setFitView(newMarkers, false, [60, 60, 60, 60]);
                    } catch (e) {
                        console.warn('[Render] setFitView error:', e);
                    }
                }
            }

            console.log(`[Render] Rendered ${markers.value.length} markers (expected ${poiList.length})`);
            console.log(`[Render] Verify: ${markers.value.length === poiList.length ? '✓ PASS' : '✗ FAIL - count mismatch'}`);

            return markers.value.length === poiList.length;
        }

        async function fetchConfig() {
            try {
                const response = await fetch('/api/config');
                const data = await response.json();
                if (data.code === 200) {
                    Object.assign(config, data.data);
                }
            } catch (error) {
                console.error('[Config] Failed:', error);
            }
        }

        function getQueryCenter() {
            if (useDefaultCenter.value) {
                console.log('[Query] Using DEFAULT center:', DEFAULT_QUERY_CENTER);
                return { lat: DEFAULT_QUERY_CENTER.lat, lng: DEFAULT_QUERY_CENTER.lng };
            }

            if (map && map.getCenter) {
                const c = map.getCenter();
                if (c && typeof c.lat === 'number') {
                    console.log('[Query] Using map center:', { lat: c.lat, lng: c.lng });
                    return { lat: c.lat, lng: c.lng };
                }
            }

            console.log('[Query] Using fallback center:', DEFAULT_QUERY_CENTER);
            return { lat: DEFAULT_QUERY_CENTER.lat, lng: DEFAULT_QUERY_CENTER.lng };
        }

        function buildQueryUrl(lat, lng) {
            let url = `/api/pois?lat=${lat}&lng=${lng}&radius=${selectedRadius.value}`;

            if (selectedTypes.value.length > 0) {
                url += `&type=${selectedTypes.value.join(',')}`;
                console.log(`[Query] type filter: ${selectedTypes.value.join(',')}`);
            }

            if (minScore.value > 0) {
                url += `&minScore=${minScore.value}`;
                console.log(`[Query] minScore filter: ${minScore.value}`);
            }

            return url;
        }

        async function loadPois(options = {}) {
            const { skipFitView = false } = options;

            try {
                loading.value = true;

                const center = getQueryCenter();
                const url = buildQueryUrl(center.lat, center.lng);

                console.log(`[Load] Fetching: ${url}`);
                const response = await fetch(url);
                const data = await response.json();

                if (data.code === 200) {
                    console.log(`[Load] API returned ${data.data.length} items`);
                    pois.value = data.data;
                    const ok = renderMarkers(data.data, skipFitView);
                    if (!ok) {
                        console.warn('[Load] Warning: render count mismatch');
                    }
                } else {
                    console.error('[Load] API error:', data.message);
                }
            } catch (error) {
                console.error('[Load] Failed:', error);
            } finally {
                loading.value = false;
                useDefaultCenter.value = false;
            }
        }

        async function loadPoiDetail(poiId) {
            try {
                const response = await fetch(`/api/poi/${poiId}`);
                const data = await response.json();
                if (data.code === 200) {
                    selectedPoi.value = data.data;
                    return data.data;
                }
            } catch (error) {
                console.error('[Detail] Failed:', error);
            }
            return null;
        }

        async function handleMarkerClick(poi) {
            console.log('[Click]', poi.name);
            selectedPoi.value = poi;
            showPopup.value = true;

            if (map) {
                map.panTo([poi.lng, poi.lat]);
            }

            const detail = await loadPoiDetail(poi.id);
            if (detail) {
                selectedPoi.value = detail;
            }
        }

        function closePopup() {
            showPopup.value = false;
            setTimeout(() => {
                selectedPoi.value = null;
            }, 300);
        }

        function toggleFilterPanel() {
            showFilterPanel.value = !showFilterPanel.value;
        }

        function applyFilters() {
            console.log('[Filter] Apply - types:', selectedTypes.value, 'minScore:', minScore.value, 'radius:', selectedRadius.value);
            loadPois({ skipFitView: true });
        }

        function resetFilters() {
            console.log('[Filter] Reset - restoring all defaults');
            selectedTypes.value = [];
            minScore.value = 0;
            selectedRadius.value = 5000;
            useDefaultCenter.value = true;
            loadPois({ skipFitView: false });
        }

        async function initMap() {
            try {
                window.__handleMarkerClick = function(poiId) {
                    console.log('[Marker] Global onclick:', poiId);
                    const poi = pois.value.find(p => p.id === poiId);
                    if (poi) handleMarkerClick(poi);
                };

                document.addEventListener('click', function(e) {
                    if (showFilterPanel.value) {
                        const filterPanel = document.querySelector('.filter-panel');
                        const filterBtn = document.querySelector('.filter-btn');
                        if (filterPanel && !filterPanel.contains(e.target) &&
                            filterBtn && !filterBtn.contains(e.target)) {
                            showFilterPanel.value = false;
                        }
                    }
                });

                await fetchConfig();

                AMapLoader.load({
                    key: config.gaodeJsApiKey || 'demo_key',
                    version: '2.0',
                    plugins: ['AMap.Scale', 'AMap.ToolBar', 'AMap.ControlBar']
                }).then((AMap) => {
                    amap = AMap;
                    map = new AMap.Map('map-container', {
                        zoom: 13,
                        center: DISNEYLAND_CENTER,
                        mapStyle: 'amap://styles/whitesmoke',
                        features: ['bg', 'road', 'building', 'point']
                    });
                    map.addControl(new AMap.Scale());
                    map.addControl(new AMap.ToolBar({ position: 'RB' }));
                    map.addControl(new AMap.ControlBar({ position: { top: '110px', right: '16px' } }));
                    loadPois();
                }).catch((error) => {
                    console.error('[AMap] Load error:', error);
                    loading.value = false;
                    map = {
                        getCenter: () => ({ lat: DISNEYLAND_CENTER[1], lng: DISNEYLAND_CENTER[0] }),
                        panTo: () => {},
                        add: () => {},
                        remove: () => {},
                        setFitView: () => {}
                    };
                    amap = {
                        Marker: class {
                            constructor(opts) { this.opts = opts; }
                            on() {}
                            setzIndex() {}
                        },
                        Pixel: class {
                            constructor(x, y) { this.x = x; this.y = y; }
                        }
                    };
                    loadPois();
                });
            } catch (error) {
                console.error('[Init] Error:', error);
                loading.value = false;
            }
        }

        onMounted(() => {
            initMap();
        });

        return {
            loading,
            showFilterPanel,
            showPopup,
            selectedPoi,
            pois,
            config,
            scoreLevels,
            poiTypes,
            selectedTypes,
            minScore,
            selectedRadius,
            radiusOptions,
            getScoreColor,
            getScoreLabel,
            getScoreColorByValue,
            getTypeIcon,
            getFacilityIcon,
            loadPois,
            closePopup,
            toggleFilterPanel,
            applyFilters,
            resetFilters
        };
    }
}).mount('#app');
