const { createApp, ref, onMounted, watch } = Vue;

createApp({
    setup() {
        const peakType = ref('morning');
        const stats = ref({ total: 0, directional: 0 });
        const topFlows = ref([]);
        const stations = ref({ metro: [], office: [] });
        const vectors = ref([]);
        const loading = ref(false);
        const mapLoading = ref(true);
        const mapLoadingText = ref('正在加载数据...');
        const mapFallback = ref(true);
        const dataSource = ref({});
        let chart = null;
        let amapLoaded = false;
        let amapInstance = null;
        let dataLoaded = false;

        const loadAmapScript = (apiKey) => {
            return new Promise((resolve, reject) => {
                if (typeof AMap !== 'undefined') {
                    resolve(true);
                    return;
                }

                window._AMapSecurityConfig = {
                    securityJsCode: apiKey
                };

                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = `https://webapi.amap.com/maps?v=2.0&key=${apiKey}&plugin=AMap.Scale,AMap.ToolBar`;
                
                let loaded = false;
                script.onload = () => {
                    loaded = true;
                    setTimeout(() => {
                        if (typeof AMap !== 'undefined') {
                            resolve(true);
                        } else {
                            reject(new Error('高德地图对象未创建'));
                        }
                    }, 500);
                };
                script.onerror = () => reject(new Error('高德地图脚本加载失败'));
                document.head.appendChild(script);

                setTimeout(() => {
                    if (!loaded) {
                        reject(new Error('高德地图加载超时'));
                    }
                }, 10000);
            });
        };

        const initChart = () => {
            const chartDom = document.getElementById('map');
            chart = echarts.init(chartDom);
            
            window.addEventListener('resize', () => {
                chart.resize();
            });
        };

        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/config');
                return await res.json();
            } catch (error) {
                console.warn('获取配置失败，使用降级模式:', error);
                return null;
            }
        };

        const fetchDataSource = async () => {
            try {
                const res = await fetch('/api/data-source');
                dataSource.value = await res.json();
            } catch (error) {
                console.warn('获取数据来源失败:', error);
            }
        };

        const fetchData = async () => {
            loading.value = true;
            try {
                const summaryRes = await fetch('/api/tidal/summary');
                if (!summaryRes.ok) {
                    throw new Error(`HTTP error! status: ${summaryRes.status}`);
                }
                const summaryData = await summaryRes.json();
                
                stations.value = summaryData.stations;
                
                const peakData = peakType.value === 'morning' ? summaryData.morning : summaryData.evening;
                vectors.value = peakData.vectors;
                stats.value.total = peakData.total_trips;
                stats.value.directional = peakType.value === 'morning' ? peakData.metro_to_office : peakData.office_to_metro;
                
                topFlows.value = vectors.value.slice(0, 5);
                dataLoaded = true;
                
                renderChart();
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                loading.value = false;
                mapLoading.value = false;
            }
        };

        const renderChart = () => {
            if (!chart || !dataLoaded) return;

            const metroPoints = stations.value.metro.map(s => ({
                name: s.name,
                value: [s.lng, s.lat],
                itemStyle: { color: '#3498db' },
                symbolSize: 18
            }));

            const officePoints = stations.value.office.map(s => ({
                name: s.name,
                value: [s.lng, s.lat],
                itemStyle: { color: '#e74c3c' },
                symbolSize: 22
            }));

            const lines = vectors.value.map((v, idx) => {
                const maxCount = Math.max(...vectors.value.map(x => x.count));
                const lineWidth = (v.count / maxCount) * 6 + 2;
                
                return {
                    coords: v.coords,
                    lineStyle: {
                        width: lineWidth,
                        color: peakType.value === 'morning' ? '#667eea' : '#f5576c',
                        opacity: 0.9
                    },
                    label: {
                        show: true,
                        formatter: `${v.count}次`,
                        position: 'middle',
                        fontSize: 12,
                        color: '#333',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        padding: [2, 6],
                        borderRadius: 4
                    }
                };
            });

            const effectLines = vectors.value.map((v, idx) => ({
                coords: v.coords,
                effect: {
                    show: true,
                    period: 4 + idx * 0.5,
                    trailLength: 0.3,
                    symbol: 'arrow',
                    symbolSize: 10,
                    color: peakType.value === 'morning' ? '#764ba2' : '#f093fb'
                },
                lineStyle: {
                    width: 0
                }
            }));

            const allPoints = [...metroPoints, ...officePoints];
            const minLng = Math.min(...allPoints.map(p => p.value[0])) - 0.01;
            const maxLng = Math.max(...allPoints.map(p => p.value[0])) + 0.01;
            const minLat = Math.min(...allPoints.map(p => p.value[1])) - 0.01;
            const maxLat = Math.max(...allPoints.map(p => p.value[1])) + 0.01;

            let option = {
                title: {
                    text: peakType.value === 'morning' ? '早高峰潮汐流向图' : '晚高峰潮汐流向图',
                    left: 'center',
                    top: 10,
                    textStyle: {
                        fontSize: 20,
                        fontWeight: 'bold',
                        color: '#333'
                    }
                },
                tooltip: {
                    trigger: 'item',
                    formatter: (params) => {
                        if (params.seriesType === 'scatter') {
                            return `<strong>${params.name}</strong>`;
                        }
                        return '';
                    }
                },
                series: []
            };

            if (amapLoaded && !mapFallback.value) {
                const centerLng = (116.365 + 116.468) / 2;
                const centerLat = (39.905 + 39.918) / 2;
                
                option.amap = {
                    center: [centerLng, centerLat],
                    zoom: 14,
                    resizeEnable: true,
                    mapStyle: 'amap://styles/light',
                    features: ['bg', 'road', 'building', 'point']
                };
                
                option.series = [
                    {
                        name: '流向线路',
                        type: 'lines',
                        coordinateSystem: 'amap',
                        zlevel: 1,
                        data: lines,
                        emphasis: { focus: 'series' }
                    },
                    {
                        name: '动态效果',
                        type: 'lines',
                        coordinateSystem: 'amap',
                        zlevel: 2,
                        effect: {
                            show: true,
                            symbolSize: 10,
                            trailLength: 0.3,
                            symbol: 'arrow'
                        },
                        lineStyle: { width: 0 },
                        data: effectLines
                    },
                    {
                        name: '地铁站',
                        type: 'scatter',
                        coordinateSystem: 'amap',
                        zlevel: 3,
                        data: metroPoints,
                        label: {
                            show: true,
                            formatter: '{b}',
                            position: 'bottom',
                            fontSize: 12,
                            color: '#2c3e50',
                            fontWeight: 'bold'
                        },
                        itemStyle: {
                            shadowBlur: 15,
                            shadowColor: 'rgba(52, 152, 219, 0.6)'
                        }
                    },
                    {
                        name: '写字楼',
                        type: 'scatter',
                        coordinateSystem: 'amap',
                        zlevel: 3,
                        data: officePoints,
                        label: {
                            show: true,
                            formatter: '{b}',
                            position: 'bottom',
                            fontSize: 12,
                            color: '#2c3e50',
                            fontWeight: 'bold'
                        },
                        itemStyle: {
                            shadowBlur: 15,
                            shadowColor: 'rgba(231, 76, 60, 0.6)'
                        }
                    }
                ];
            } else {
                option.xAxis = {
                    type: 'value',
                    min: minLng,
                    max: maxLng,
                    show: false
                };
                option.yAxis = {
                    type: 'value',
                    min: minLat,
                    max: maxLat,
                    show: false
                };
                option.grid = {
                    left: 50,
                    right: 50,
                    top: 50,
                    bottom: 50
                };
                option.series = [
                    {
                        name: '流向线路',
                        type: 'lines',
                        coordinateSystem: 'cartesian2d',
                        zlevel: 1,
                        data: lines,
                        emphasis: { focus: 'series' }
                    },
                    {
                        name: '动态效果',
                        type: 'lines',
                        coordinateSystem: 'cartesian2d',
                        zlevel: 2,
                        effect: {
                            show: true,
                            symbolSize: 10,
                            trailLength: 0.3,
                            symbol: 'arrow'
                        },
                        lineStyle: { width: 0 },
                        data: effectLines
                    },
                    {
                        name: '地铁站',
                        type: 'scatter',
                        coordinateSystem: 'cartesian2d',
                        zlevel: 3,
                        data: metroPoints,
                        label: {
                            show: true,
                            formatter: '{b}',
                            position: 'bottom',
                            fontSize: 12,
                            color: '#2c3e50',
                            fontWeight: 'bold'
                        },
                        itemStyle: {
                            shadowBlur: 15,
                            shadowColor: 'rgba(52, 152, 219, 0.6)'
                        }
                    },
                    {
                        name: '写字楼',
                        type: 'scatter',
                        coordinateSystem: 'cartesian2d',
                        zlevel: 3,
                        data: officePoints,
                        label: {
                            show: true,
                            formatter: '{b}',
                            position: 'bottom',
                            fontSize: 12,
                            color: '#2c3e50',
                            fontWeight: 'bold'
                        },
                        itemStyle: {
                            shadowBlur: 15,
                            shadowColor: 'rgba(231, 76, 60, 0.6)'
                        }
                    }
                ];
            }

            chart.setOption(option, true);

            if (amapLoaded && !mapFallback.value && !amapInstance) {
                try {
                    amapInstance = chart.getModel().getComponent('amap').getAMap();
                    if (amapInstance) {
                        amapInstance.addControl(new AMap.Scale());
                        amapInstance.addControl(new AMap.ToolBar({ position: 'RB' }));
                    }
                } catch (e) {
                    console.warn('获取高德地图实例失败:', e);
                }
            }
        };

        const switchPeak = (type) => {
            if (peakType.value !== type) {
                peakType.value = type;
            }
        };

        watch(peakType, () => {
            fetchData();
        });

        const initApp = async () => {
            mapLoading.value = true;
            mapLoadingText.value = '正在加载数据...';

            initChart();
            await Promise.all([fetchData(), fetchDataSource()]);

            try {
                const config = await fetchConfig();
                if (config && config.gaode_js_api_key) {
                    mapLoadingText.value = '正在加载地图服务...';
                    try {
                        await loadAmapScript(config.gaode_js_api_key);
                        amapLoaded = true;
                        mapFallback.value = false;
                        if (dataLoaded) {
                            renderChart();
                        }
                    } catch (mapError) {
                        console.warn('地图加载失败，使用简化模式:', mapError);
                    }
                }
            } catch (error) {
                console.warn('地图初始化跳过:', error);
            } finally {
                mapLoading.value = false;
            }
        };

        onMounted(() => {
            setTimeout(() => {
                initApp();
            }, 100);
        });

        return {
            peakType,
            stats,
            topFlows,
            switchPeak,
            loading,
            mapLoading,
            mapLoadingText,
            mapFallback,
            dataSource
        };
    }
}).mount('#app');
