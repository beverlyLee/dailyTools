import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MapPin,
  Navigation,
  Shield,
  Lightbulb,
  AlertTriangle,
  Map,
  Route,
  Loader2,
  Search,
  RefreshCw,
  Moon,
  Footprints,
  Info,
  CheckCircle,
  XCircle,
  ExternalLink,
  Layers,
  Monitor,
  Globe2,
} from 'lucide-react';
import {
  getConfig,
  getSegments,
  getSegmentInfo,
  findRoute,
  getSafetyStats,
  crawlData,
} from './services/api';
import CanvasMap, { getSafetyColor as getCanvasSafetyColor } from './components/CanvasMap';

const SAFETY_COLORS = [
  { score: 80, color: '#22c55e', label: '非常安全' },
  { score: 60, color: '#84cc16', label: '安全' },
  { score: 40, color: '#eab308', label: '一般' },
  { score: 20, color: '#f97316', label: '较危险' },
  { score: 0, color: '#ef4444', label: '危险' },
];

const LOAD_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  LOADED: 'loaded',
  RENDERED: 'rendered',
  ERROR: 'error',
};

const MAP_MODE = {
  AUTO: 'auto',
  AMAP: 'amap',
  CANVAS: 'canvas',
};

const GAODE_KEY_ERRORS = {
  INVALID_USER_KEY: 'Key 无效，请检查 Key 是否正确',
  USERKEY_PLAT_NOMATCH: 'Key 与应用平台不匹配，请确认使用的是「Web端(JS API)」类型的 Key',
  INVALID_SCODE: '安全码验证失败，请检查应用域名白名单配置',
  QUOTA_PLAN: 'Key 配额已用完，请升级配额',
  SYS_ERROR: '系统错误，请稍后重试',
  UNKNOWN: '未知错误，请检查控制台详情',
};

const getSafetyColor = (score) => {
  for (const level of SAFETY_COLORS) {
    if (score >= level.score) {
      return level.color;
    }
  }
  return '#ef4444';
};

const getSafetyLevel = (score) => {
  for (const level of SAFETY_COLORS) {
    if (score >= level.score) {
      return level.label;
    }
  }
  return '危险';
};

const getGaodeErrorMessage = (errorCode) => {
  return GAODE_KEY_ERRORS[errorCode] || GAODE_KEY_ERRORS.UNKNOWN;
};

const checkAmapLoaded = () => {
  return typeof window !== 'undefined' && typeof window.AMap !== 'undefined';
};

const checkAmapValid = () => {
  if (!checkAmapLoaded()) return false;
  if (window._AMapSecurityConfig && window._AMapSecurityConfig.securityJsCode === 'INVALID_KEY') {
    return false;
  }
  return true;
};

const loadGaodeScript = (apiKey) => {
  return new Promise((resolve, reject) => {
    if (checkAmapLoaded()) {
      if (!checkAmapValid()) {
        reject(new Error('AMap Key 验证失败，请检查 Key 有效性'));
        return;
      }
      resolve(window.AMap);
      return;
    }

    window._AMapSecurityConfig = {
      securityJsCode: apiKey,
    };

    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${apiKey}&plugin=AMap.Scale,AMap.ToolBar,AMap.InfoWindow`;
    script.async = true;

    const timeoutId = setTimeout(() => {
      reject(new Error('高德地图脚本加载超时，请检查网络连接或 Key 配置'));
    }, 15000);

    script.onload = () => {
      clearTimeout(timeoutId);
      setTimeout(() => {
        if (!checkAmapLoaded()) {
          reject(new Error('AMap 未正确定义，请检查 Key 是否为「Web端(JS API)」类型'));
          return;
        }
        if (window.AMap && typeof window.AMap.Map === 'function') {
          resolve(window.AMap);
        } else {
          reject(new Error('AMap 对象异常，可能是 Key 验证失败或版本不兼容'));
        }
      }, 500);
    };

    script.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error('高德地图脚本加载失败，请检查网络连接'));
    };

    document.head.appendChild(script);
  });
};

const createSvgIcon = (type, color) => {
  const icons = {
    alert: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    pin: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 0 1 16 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
  };
  return icons[type] || '';
};

const parseInputCoords = (input) => {
  const parts = input.split(/[,，]/).map((s) => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts;
  }
  return null;
};

const App = () => {
  const [loadStatus, setLoadStatus] = useState(LOAD_STATUS.IDLE);
  const [config, setConfig] = useState(null);
  const [segments, setSegments] = useState([]);
  const [stats, setStats] = useState(null);
  const [route, setRoute] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('map');
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [amapError, setAmapError] = useState(null);
  const [amapKeyInfo, setAmapKeyInfo] = useState(null);
  const [mapMode, setMapMode] = useState(MAP_MODE.AUTO);
  const [forcedCanvasMode, setForcedCanvasMode] = useState(false);

  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [preferSafe, setPreferSafe] = useState(true);
  const [avoidDark, setAvoidDark] = useState(true);
  const [avoidUnpaved, setAvoidUnpaved] = useState(true);

  const [parsedStartPoint, setParsedStartPoint] = useState(null);
  const [parsedEndPoint, setParsedEndPoint] = useState(null);

  const mapRef = useRef(null);
  const amapRef = useRef(null);
  const amapInstanceRef = useRef(null);
  const infoWindowRef = useRef(null);
  const polylinesRef = useRef([]);
  const routePolylinesRef = useRef([]);
  const intersectionMarkersRef = useRef([]);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const segmentsDataRef = useRef([]);
  const mountRef = useRef(false);
  const segmentsDrawnRef = useRef(false);

  const segmentsLoaded = useMemo(() => segments.length > 0, [segments]);
  const mapReady = useMemo(() => amapInstanceRef.current !== null, []);

  const useCanvasMode = useMemo(() => {
    return forcedCanvasMode || mapMode === MAP_MODE.CANVAS || 
           (mapMode === MAP_MODE.AUTO && amapError !== null);
  }, [forcedCanvasMode, mapMode, amapError]);

  const loadStats = useCallback(async () => {
    try {
      const res = await getSafetyStats();
      if (mountRef.current) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  const loadSegments = useCallback(async () => {
    try {
      const res = await getSegments();
      const data = res.data.segments || [];
      const segmentsWithId = data.map((s, idx) => ({ ...s, id: idx }));
      segmentsDataRef.current = segmentsWithId;
      if (mountRef.current) {
        setSegments(segmentsWithId);
        segmentsDrawnRef.current = false;
      }
    } catch (err) {
      console.error('Failed to load segments:', err);
    }
  }, []);

  const clearPolylines = useCallback(() => {
    polylinesRef.current.forEach((p) => {
      try { p.setMap(null); } catch (e) {}
    });
    routePolylinesRef.current.forEach((p) => {
      try { p.setMap(null); } catch (e) {}
    });
    intersectionMarkersRef.current.forEach((m) => {
      try { m.setMap(null); } catch (e) {}
    });
    polylinesRef.current = [];
    routePolylinesRef.current = [];
    intersectionMarkersRef.current = [];
  }, []);

  const clearRouteMarkers = useCallback(() => {
    routePolylinesRef.current.forEach((p) => {
      try { p.setMap(null); } catch (e) {}
    });
    routePolylinesRef.current = [];

    if (startMarkerRef.current) {
      try { startMarkerRef.current.setMap(null); } catch (e) {}
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      try { endMarkerRef.current.setMap(null); } catch (e) {}
      endMarkerRef.current = null;
    }
  }, []);

  const showInfoWindow = useCallback((content, lnglat) => {
    if (!infoWindowRef.current || !amapInstanceRef.current) return;
    infoWindowRef.current.setContent(content);
    infoWindowRef.current.open(amapInstanceRef.current, lnglat);
  }, []);

  const closeInfoWindow = useCallback(() => {
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  }, []);

  const drawSegmentsAmap = useCallback(() => {
    const mapInstance = amapInstanceRef.current;
    const AMap = amapRef.current;
    const segs = segmentsDataRef.current;

    if (!mapInstance || !AMap || segs.length === 0) return;
    if (segmentsDrawnRef.current) return;
    
    if (typeof mapInstance.getCenter !== 'function') {
      console.warn('地图尚未完全初始化，稍后重试绘制');
      return;
    }
    
    segmentsDrawnRef.current = true;

    clearPolylines();

    const newPolylines = [];
    const intersections = [];
    const processed = new Set();

    const isValidCoord = (coord) => {
      return Array.isArray(coord) && coord.length >= 2 &&
             typeof coord[0] === 'number' && typeof coord[1] === 'number' &&
             !isNaN(coord[0]) && !isNaN(coord[1]) &&
             isFinite(coord[0]) && isFinite(coord[1]);
    };

    for (const segment of segs) {
      try {
        if (!segment.coordinates || segment.coordinates.length < 2) continue;
        
        const validCoords = segment.coordinates.filter(isValidCoord);
        if (validCoords.length < 2) continue;

        const path = validCoords.map(([lng, lat]) => [lng, lat]);

        const polyline = new AMap.Polyline({
          path,
          strokeColor: segment.safety_color || getSafetyColor(segment.safety_score),
          strokeWeight: 6,
          strokeOpacity: 0.8,
          lineJoin: 'round',
          lineCap: 'round',
          cursor: 'pointer',
          zIndex: 10,
        });

        polyline.on('mouseover', async (e) => {
          if (mountRef.current) {
            setHoveredSegment(segment);
          }

          try {
            const centerLng = segment.coordinates.reduce((sum, c) => sum + c[0], 0) / segment.coordinates.length;
            const centerLat = segment.coordinates.reduce((sum, c) => sum + c[1], 0) / segment.coordinates.length;

            const info = await getSegmentInfo(centerLng, centerLat);
            const data = info.data;

            const content = `
              <div class="info-window">
                <h4>${data.road_name || '未知道路'}</h4>
                <div class="info-row">
                  <span class="info-label">路灯</span>
                  <span class="info-value">${data.has_lighting ? '<span style="color: #22c55e;">有</span>' : '<span style="color: #ef4444;">无</span>'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">安全评分</span>
                  <span class="info-value" style="color: ${data.safety_color};">${data.safety_score}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">安全等级</span>
                  <span class="info-value">${data.safety_level}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">道路宽度</span>
                  <span class="info-value">${data.road_width.toFixed(1)}m</span>
                </div>
                <div class="info-row">
                  <span class="info-label">人流量</span>
                  <span class="info-value">${(data.traffic_flow * 25).toFixed(0)}%</span>
                </div>
              </div>
            `;

            showInfoWindow(content, e.lnglat);
          } catch (err) {
            const content = `
              <div class="info-window">
                <h4>${segment.road_name || '未知道路'}</h4>
                <div class="info-row">
                  <span class="info-label">路灯</span>
                  <span class="info-value">${segment.has_lighting ? '<span style="color: #22c55e;">有</span>' : '<span style="color: #ef4444;">无</span>'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">安全评分</span>
                  <span class="info-value" style="color: ${segment.safety_color};">${segment.safety_score}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">安全等级</span>
                  <span class="info-value">${segment.safety_level}</span>
                </div>
              </div>
            `;
            showInfoWindow(content, e.lnglat);
          }
        });

        polyline.on('mouseout', () => {
          if (mountRef.current) {
            setHoveredSegment(null);
          }
          closeInfoWindow();
        });

        polyline.setMap(mapInstance);
        newPolylines.push(polyline);
      } catch (segErr) {
        console.warn('绘制路段失败:', segErr, segment);
        continue;
      }
    }

    polylinesRef.current = newPolylines;

    for (const seg of segs) {
      try {
        if (!seg.coordinates || seg.coordinates.length === 0) continue;
        if (typeof seg.safety_score !== 'number' || seg.safety_score >= 60) continue;

        const firstCoord = seg.coordinates[0];
        if (!isValidCoord(firstCoord)) continue;

        const key = `${firstCoord[0].toFixed(5)},${firstCoord[1].toFixed(5)}`;

        if (!processed.has(key)) {
          processed.add(key);

          const marker = new AMap.Marker({
            position: [firstCoord[0], firstCoord[1]],
            content: `<div class="intersection-marker">${createSvgIcon('alert')}注意路口</div>`,
            offset: new AMap.Pixel(-30, -15),
            zIndex: 50,
          });

          marker.setMap(mapInstance);
          intersections.push(marker);
        }
      } catch (markerErr) {
        console.warn('创建路口标记失败:', markerErr);
        continue;
      }
    }

    intersectionMarkersRef.current = intersections;

    if (mountRef.current) {
      setLoadStatus(LOAD_STATUS.RENDERED);
    }
  }, [clearPolylines, showInfoWindow, closeInfoWindow]);

  const initMap = useCallback((apiKey, center) => {
    return new Promise(async (resolve, reject) => {
      try {
        setAmapKeyInfo({ key: apiKey.substring(0, 8) + '...', status: 'checking', keyType: 'js' });
        
        const AMap = await loadGaodeScript(apiKey);
        amapRef.current = AMap;

        setAmapKeyInfo({ key: apiKey.substring(0, 8) + '...', status: 'valid', keyType: 'js' });
        setAmapError(null);

        const mapInstance = new AMap.Map('amap-container', {
          center: center,
          zoom: 14,
          pitch: 0,
          viewMode: '3D',
          mapStyle: 'amap://styles/darkblue',
        });

        mapInstance.addControl(new AMap.Scale());
        mapInstance.addControl(new AMap.ToolBar());

        infoWindowRef.current = new AMap.InfoWindow({
          offset: new AMap.Pixel(0, -30),
        });

        amapInstanceRef.current = mapInstance;
        resolve(mapInstance);
      } catch (mapErr) {
        console.error('高德地图 JS API Key 加载失败:', mapErr);
        
        const config = window._appConfig;
        if (config && config.gaode_web_api_key && config.gaode_web_api_key !== apiKey) {
          console.log('尝试使用 Web API Key 备用...');
          try {
            setAmapKeyInfo({ key: config.gaode_web_api_key.substring(0, 8) + '...', status: 'checking', keyType: 'web' });
            
            const AMap = await loadGaodeScript(config.gaode_web_api_key);
            amapRef.current = AMap;

            setAmapKeyInfo({ key: config.gaode_web_api_key.substring(0, 8) + '...', status: 'valid', keyType: 'web' });
            setAmapError(null);

            const mapInstance = new AMap.Map('amap-container', {
              center: center,
              zoom: 14,
              pitch: 0,
              viewMode: '3D',
              mapStyle: 'amap://styles/darkblue',
            });

            mapInstance.addControl(new AMap.Scale());
            mapInstance.addControl(new AMap.ToolBar());

            infoWindowRef.current = new AMap.InfoWindow({
              offset: new AMap.Pixel(0, -30),
            });

            amapInstanceRef.current = mapInstance;
            resolve(mapInstance);
            return;
          } catch (webErr) {
            console.error('Web API Key 也失败:', webErr);
          }
        }
        
        setAmapKeyInfo({ 
          key: apiKey.substring(0, 8) + '...', 
          status: 'invalid', 
          keyType: 'js',
          triedBoth: config?.gaode_js_api_key && config?.gaode_web_api_key
        });
        setAmapError(mapErr.message);
        reject(mapErr);
      }
    });
  }, []);

  const drawRouteAmap = useCallback((routeSegments) => {
    clearRouteMarkers();

    const AMap = amapRef.current;
    const mapInstance = amapInstanceRef.current;
    if (!AMap || !mapInstance) return;

    const newRoutePolylines = [];

    for (const segment of routeSegments) {
      const path = segment.coordinates.map(([lng, lat]) => [lng, lat]);
      const color = getSafetyColor(segment.safety_score);

      const polyline = new AMap.Polyline({
        path,
        strokeColor: color,
        strokeWeight: 10,
        strokeOpacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
        zIndex: 30,
        showDir: true,
      });

      polyline.on('mouseover', (e) => {
        const content = `
          <div class="info-window">
            <h4>${segment.road_name || '未知道路'}</h4>
            <div class="info-row">
              <span class="info-label">路灯</span>
              <span class="info-value">${segment.has_lighting ? '<span style="color: #22c55e;">有</span>' : '<span style="color: #ef4444;">无</span>'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">安全评分</span>
              <span class="info-value" style="color: ${color};">${segment.safety_score}</span>
            </div>
            <div class="info-row">
              <span class="info-label">距离</span>
              <span class="info-value">${segment.length.toFixed(0)}m</span>
            </div>
          </div>
        `;
        showInfoWindow(content, e.lnglat);
      });

      polyline.on('mouseout', closeInfoWindow);

      polyline.setMap(mapInstance);
      newRoutePolylines.push(polyline);
    }

    routePolylinesRef.current = newRoutePolylines;
  }, [clearRouteMarkers, showInfoWindow, closeInfoWindow]);

  const handleGenerateRoute = useCallback(async () => {
    if (!startPoint || !endPoint) {
      alert('请输入起点和终点');
      return;
    }

    const startCoords = parseInputCoords(startPoint);
    const endCoords = parseInputCoords(endPoint);

    if (!startCoords || !endCoords) {
      alert('请输入正确的坐标格式：经度,纬度');
      return;
    }

    if (!useCanvasMode && (!amapInstanceRef.current || !amapRef.current)) {
      alert('地图尚未加载完成，请稍候');
      return;
    }

    try {
      setLoadStatus(LOAD_STATUS.LOADING);
      setRoute(null);
      setParsedStartPoint(startCoords);
      setParsedEndPoint(endCoords);

      if (!useCanvasMode) {
        clearRouteMarkers();

        const AMap = amapRef.current;
        const mapInstance = amapInstanceRef.current;

        const sMarker = new AMap.Marker({
          position: startCoords,
          content: `<div class="marker-icon start">${createSvgIcon('pin', '#22c55e')}</div>`,
          offset: new AMap.Pixel(-12, -12),
          zIndex: 100,
        });
        sMarker.setMap(mapInstance);
        startMarkerRef.current = sMarker;

        const eMarker = new AMap.Marker({
          position: endCoords,
          content: `<div class="marker-icon end">${createSvgIcon('pin', '#ef4444')}</div>`,
          offset: new AMap.Pixel(-12, -12),
          zIndex: 100,
        });
        eMarker.setMap(mapInstance);
        endMarkerRef.current = eMarker;

        const res = await findRoute({
          start: startCoords,
          end: endCoords,
          prefer_safe: preferSafe,
          avoid_dark: avoidDark,
          avoid_unpaved: avoidUnpaved,
        });

        setRoute(res.data);
        drawRouteAmap(res.data.route);

        mapInstance.setFitView([sMarker, eMarker], false, [100, 100, 100, 100]);
        setLoadStatus(LOAD_STATUS.RENDERED);
      } else {
        const res = await findRoute({
          start: startCoords,
          end: endCoords,
          prefer_safe: preferSafe,
          avoid_dark: avoidDark,
          avoid_unpaved: avoidUnpaved,
        });

        setRoute(res.data);
        setLoadStatus(LOAD_STATUS.RENDERED);
      }
    } catch (err) {
      console.error('路线规划失败:', err);
      setError(err.message);
      alert('路线规划失败：' + (err.message || '未知错误'));
      setLoadStatus(LOAD_STATUS.RENDERED);
    }
  }, [startPoint, endPoint, preferSafe, avoidDark, avoidUnpaved, useCanvasMode, clearRouteMarkers, drawRouteAmap]);

  const handleClearRoute = useCallback(() => {
    setRoute(null);
    setParsedStartPoint(null);
    setParsedEndPoint(null);
    clearRouteMarkers();
  }, [clearRouteMarkers]);

  const handleCrawl = useCallback(async () => {
    try {
      setLoadStatus(LOAD_STATUS.LOADING);
      const res = await crawlData({});
      alert(`数据爬取成功！获取了 ${res.data.segments_count} 个路段`);
      segmentsDrawnRef.current = false;
      await Promise.all([loadSegments(), loadStats()]);
      setLoadStatus(LOAD_STATUS.LOADED);
    } catch (err) {
      console.error('数据爬取失败:', err);
      alert('数据爬取失败：' + (err.message || '未知错误'));
      setLoadStatus(LOAD_STATUS.RENDERED);
    }
  }, [loadSegments, loadStats]);

  const handleCanvasSegmentHover = useCallback((segment) => {
    setHoveredSegment(segment);
  }, []);

  const handleMapModeChange = useCallback((mode) => {
    setMapMode(mode);
    if (mode === MAP_MODE.CANVAS) {
      setForcedCanvasMode(true);
    } else if (mode === MAP_MODE.AMAP) {
      setForcedCanvasMode(false);
      setAmapError(null);
      if (config) {
        initMap(config.gaode_js_api_key, config.center).catch(() => {
          console.warn('高德地图加载失败，可在模式切换中选择 Canvas 模式');
        });
      }
    } else {
      setForcedCanvasMode(false);
    }
  }, [config, initMap]);

  useEffect(() => {
    mountRef.current = true;

    const init = async () => {
      setLoadStatus(LOAD_STATUS.LOADING);
      setError(null);

      try {
        const cfg = await getConfig();
        if (!mountRef.current) return;
        setConfig(cfg.data);
        window._appConfig = cfg.data;

        if (cfg.data.gaode_js_api_key) {
          try {
            await initMap(cfg.data.gaode_js_api_key, cfg.data.center);
          } catch (mapErr) {
            console.warn('地图加载失败，将自动降级到 Canvas 模式:', mapErr);
          }
        } else {
          setAmapError('未配置高德地图 API Key');
        }

        await Promise.all([loadStats(), loadSegments()]);
        if (mountRef.current) {
          setLoadStatus(LOAD_STATUS.LOADED);
        }
      } catch (err) {
        console.error('初始化失败:', err);
        if (mountRef.current) {
          setError(err.message || '系统初始化失败');
          setLoadStatus(LOAD_STATUS.ERROR);
        }
      }
    };

    init();

    return () => {
      mountRef.current = false;
      clearPolylines();
      clearRouteMarkers();
      if (infoWindowRef.current) {
        try { infoWindowRef.current.close(); } catch (e) {}
      }
      if (amapInstanceRef.current) {
        try { amapInstanceRef.current.destroy(); } catch (e) {}
      }
    };
  }, [initMap, loadStats, loadSegments, clearPolylines, clearRouteMarkers]);

  useEffect(() => {
    if (!useCanvasMode && loadStatus === LOAD_STATUS.LOADED && mapReady && segmentsLoaded && !segmentsDrawnRef.current) {
      drawSegmentsAmap();
    }
  }, [loadStatus, mapReady, segmentsLoaded, drawSegmentsAmap, useCanvasMode]);

  const renderAmapStatus = () => {
    if (!amapKeyInfo) return null;

    const statusConfig = {
      checking: { icon: <Loader2 size="14" className="animate-spin" />, color: 'text-blue-500', label: '验证中' },
      valid: { icon: <CheckCircle size="14" />, color: 'text-green-500', label: '验证通过' },
      invalid: { icon: <XCircle size="14" />, color: 'text-red-500', label: '验证失败' },
    };

    const config = statusConfig[amapKeyInfo.status] || statusConfig.checking;
    const keyTypeLabel = amapKeyInfo.keyType === 'web' ? 'Web API' : 'JS API';

    return (
      <div className="amap-status">
        <div className={`flex items-center gap-2 ${config.color}`}>
          {config.icon}
          <span>Key: {amapKeyInfo.key} ({keyTypeLabel}) - {config.label}</span>
        </div>
        {amapKeyInfo.status === 'invalid' && amapError && (
          <div className="amap-error-details">
            <p className="text-red-600 text-sm mt-1">{amapError}</p>
            <div className="mt-2 p-3 bg-amber-50 rounded text-xs text-amber-800">
              <p className="font-semibold mb-1">排障指南：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>登录 <a href="https://console.amap.com/dev/key/app" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">高德开放平台控制台</a></li>
                <li>确认 Key 类型为 <strong>「Web端(JS API)」</strong></li>
                <li>检查域名白名单是否包含 <code>localhost</code> 或当前域名</li>
                <li>确认已开启 <strong>「Web服务API」</strong> 和 <strong>「地图JS API」</strong> 服务</li>
                <li>或切换到 <strong>Canvas 模拟模式</strong> 继续使用</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderModeSelector = () => (
    <div className="mode-selector" style={{
      display: 'flex',
      gap: '4px',
      padding: '4px',
      background: '#f3f4f6',
      borderRadius: '8px',
      marginBottom: '12px',
    }}>
      <button
        onClick={() => handleMapModeChange(MAP_MODE.AUTO)}
        style={{
          flex: 1,
          padding: '6px 8px',
          border: 'none',
          borderRadius: '6px',
          background: mapMode === MAP_MODE.AUTO ? '#3b82f6' : 'transparent',
          color: mapMode === MAP_MODE.AUTO ? '#fff' : '#6b7280',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          fontWeight: 500,
        }}
      >
        <Monitor size="12" />
        自动
      </button>
      <button
        onClick={() => handleMapModeChange(MAP_MODE.AMAP)}
        style={{
          flex: 1,
          padding: '6px 8px',
          border: 'none',
          borderRadius: '6px',
          background: mapMode === MAP_MODE.AMAP ? '#3b82f6' : 'transparent',
          color: mapMode === MAP_MODE.AMAP ? '#fff' : '#6b7280',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          fontWeight: 500,
        }}
      >
        <Globe2 size="12" />
        高德
      </button>
      <button
        onClick={() => handleMapModeChange(MAP_MODE.CANVAS)}
        style={{
          flex: 1,
          padding: '6px 8px',
          border: 'none',
          borderRadius: '6px',
          background: mapMode === MAP_MODE.CANVAS ? '#3b82f6' : 'transparent',
          color: mapMode === MAP_MODE.CANVAS ? '#fff' : '#6b7280',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          fontWeight: 500,
        }}
      >
        <Layers size="12" />
        Canvas
      </button>
    </div>
  );

  const isLoading = loadStatus === LOAD_STATUS.LOADING;

  const mapBounds = config?.bounds || {
    min_lng: 121.40,
    min_lat: 31.15,
    max_lng: 121.55,
    max_lat: 31.25,
  };

  const mapCenter = config?.center || [121.475, 31.2];

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Moon size="24" />
            夜跑安全地图
          </h1>
          <p>Night Run Safety Map | 为您推荐最安全的夜跑路线</p>
          {renderAmapStatus()}
        </div>

        <div className="sidebar-content">
          {renderModeSelector()}

          <div className="tabs">
            <div
              className={`tab ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              <Map size="14" style={{ marginRight: '4px' }} />
              地图
            </div>
            <div
              className={`tab ${activeTab === 'route' ? 'active' : ''}`}
              onClick={() => setActiveTab('route')}
            >
              <Route size="14" style={{ marginRight: '4px' }} />
              路线
            </div>
            <div
              className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              <Shield size="14" style={{ marginRight: '4px' }} />
              统计
            </div>
          </div>

          {activeTab === 'route' && (
            <>
              <div className="section-title">
                <Navigation size="16" />
                路线规划
              </div>

              <div className="form-group">
                <label>起点 (经度, 纬度)</label>
                <input
                  type="text"
                  placeholder="例如: 121.4737, 31.2304"
                  value={startPoint}
                  onChange={(e) => setStartPoint(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>终点 (经度, 纬度)</label>
                <input
                  type="text"
                  placeholder="例如: 121.5000, 31.2400"
                  value={endPoint}
                  onChange={(e) => setEndPoint(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>路线偏好</label>
                <div className="checkbox-group">
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={preferSafe}
                      onChange={(e) => setPreferSafe(e.target.checked)}
                    />
                    <Shield size="14" color="#22c55e" />
                    优先安全路线
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={avoidDark}
                      onChange={(e) => setAvoidDark(e.target.checked)}
                    />
                    <Lightbulb size="14" color="#eab308" />
                    避开黑暗区域
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={avoidUnpaved}
                      onChange={(e) => setAvoidUnpaved(e.target.checked)}
                    />
                    <Footprints size="14" color="#f97316" />
                    避开未铺装道路
                  </label>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleGenerateRoute}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 size="16" className="animate-spin" />
                ) : (
                  <Search size="16" />
                )}
                {isLoading ? '规划中...' : '生成安全路线'}
              </button>

              {route && (
                <>
                  <div className="divider" />

                  <div className="route-info">
                    <h4>
                      <Shield size="14" style={{ marginRight: '6px' }} />
                      路线已生成
                    </h4>
                    <div className="route-details">
                      <span>总距离</span>
                      <strong>{(route.total_distance / 1000).toFixed(2)} km</strong>
                    </div>
                    <div className="route-details">
                      <span>预计时间</span>
                      <strong>{route.estimated_time.toFixed(0)} 分钟</strong>
                    </div>
                    <div className="route-details">
                      <span>平均安全评分</span>
                      <strong
                        style={{ color: getSafetyColor(route.total_safety_score) }}
                      >
                        {route.total_safety_score}
                      </strong>
                    </div>
                    <div className="route-details">
                      <span>有路灯路段</span>
                      <strong>{route.paved_segments_count} 段</strong>
                    </div>
                    <div className="route-details">
                      <span>无路灯路段</span>
                      <strong>{route.dark_segments_count} 段</strong>
                    </div>
                  </div>

                  <div className="section-title">
                    <Info size="16" />
                    路线详情
                  </div>

                  <div className="route-steps">
                    {route.route.map((seg, idx) => (
                      <div key={idx} className="route-step">
                        <div className="step-index">{idx + 1}</div>
                        <div className="step-content">
                          <div className="step-road">{seg.road_name}</div>
                          {seg.instruction && (
                            <div className="step-instruction">
                              {seg.instruction}
                            </div>
                          )}
                          <div className="step-info">
                            <span
                              className="step-score"
                              style={{
                                color: getSafetyColor(seg.safety_score),
                              }}
                            >
                              安全分: {seg.safety_score}
                            </span>
                            <span className="light-indicator">
                              <span
                                className={`dot ${seg.has_lighting ? 'on' : 'off'}`}
                              />
                              {seg.has_lighting ? '有灯' : '无灯'}
                            </span>
                            <span>{seg.length.toFixed(0)}m</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="btn btn-secondary"
                    onClick={handleClearRoute}
                    style={{ marginTop: '12px' }}
                  >
                    清除路线
                  </button>
                </>
              )}

              <div className="safety-tip">
                <AlertTriangle size="12" style={{ marginRight: '6px' }} />
                建议：夜跑时尽量选择有路灯的主干道或河滨绿道，避免单独进入偏僻小巷。
              </div>
            </>
          )}

          {activeTab === 'stats' && stats && (
            <>
              <div className="section-title">
                <Shield size="16" />
                城市安全概览
              </div>

              <div className="stats-panel">
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-value">{stats.total_segments}</div>
                    <div className="stat-label">总路段数</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{stats.avg_score}</div>
                    <div className="stat-label">平均安全分</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value" style={{ color: '#22c55e' }}>
                      {stats.lit_segments}
                    </div>
                    <div className="stat-label">有路灯路段</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value" style={{ color: '#ef4444' }}>
                      {stats.dark_segments}
                    </div>
                    <div className="stat-label">黑暗路段</div>
                  </div>
                </div>
              </div>

              <div className="section-title">
                <Map size="16" />
                安全评分分布
              </div>

              <div className="stats-panel">
                {Object.entries(stats.score_distribution || {}).map(([range, count]) => (
                  <div
                    key={range}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                    }}
                  >
                    <span style={{ fontSize: '12px', width: '50px' }}>{range}</span>
                    <div
                      style={{
                        flex: 1,
                        height: '20px',
                        background: '#e5e7eb',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          background: getSafetyColor(
                            parseInt(range.split('-')[0]) + 10
                          ),
                          width: `${stats.total_segments > 0 ? (count / stats.total_segments) * 100 : 0}%`,
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: '12px',
                        width: '40px',
                        textAlign: 'right',
                      }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
              </div>

              <div className="section-title">
                <AlertTriangle size="16" />
                危险区域提醒
              </div>

              <div className="stats-panel">
                <div style={{ fontSize: '13px', color: '#374151' }}>
                  共 <strong style={{ color: '#ef4444' }}>{stats.dangerous_segments}</strong>{' '}
                  个路段安全评分低于 40 分，建议避开这些区域。
                </div>
              </div>

              <div className="divider" />

              <div className="section-title">
                <RefreshCw size="16" />
                数据管理
              </div>

              <button
                className="btn btn-secondary"
                onClick={handleCrawl}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 size="16" className="animate-spin" />
                ) : (
                  <RefreshCw size="16" />
                )}
                {isLoading ? '爬取中...' : '重新爬取 OSM 数据'}
              </button>
            </>
          )}

          {activeTab === 'map' && (
            <>
              <div className="section-title">
                <Map size="16" />
                安全指数图例
              </div>

              <div className="legend">
                {SAFETY_COLORS.map((level) => (
                  <div key={level.score} className="legend-item">
                    <span
                      className="legend-color"
                      style={{ background: level.color }}
                    />
                    <span>
                      {level.score >= 80 ? '≥ 80' : `${level.score}-${level.score + 19}`}
                      <span style={{ color: '#6b7280', marginLeft: '8px' }}>
                        {level.label}
                      </span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="divider" />

              <div className="section-title">
                <Info size="16" />
                使用说明
              </div>

              <div
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  lineHeight: '1.6',
                }}
              >
                <p style={{ marginBottom: '8px' }}>
                  <strong>1. 地图模式：</strong>可在顶部切换「自动」「高德」「Canvas」三种模式，高德 Key 无效时自动降级到 Canvas 模式。
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong>2. 查看路段详情：</strong>将鼠标移动到任意路段上，可以查看该路段的路灯状态、安全评分等详细信息。
                </p>
                <p style={{ marginBottom: '8px' }}>
                  <strong>3. 生成安全路线：</strong>切换到"路线"标签，输入起点和终点坐标，系统会自动推荐最安全的夜跑路线。
                </p>
                <p>
                  <strong>4. Canvas 模式操作：</strong>拖拽平移、滚轮缩放、悬停查看信息，高德地图不可用时完全保持功能。
                </p>
              </div>

              {hoveredSegment && (
                <div className="divider" />
              )}

              {hoveredSegment && (
                <div className="route-info">
                  <h4>
                    <Info size="14" style={{ marginRight: '6px' }} />
                    当前路段
                  </h4>
                  <div className="route-details">
                    <span>道路名称</span>
                    <strong>{hoveredSegment.road_name || '未知'}</strong>
                  </div>
                  <div className="route-details">
                    <span>路灯</span>
                    <strong style={{ color: hoveredSegment.has_lighting ? '#22c55e' : '#ef4444' }}>
                      {hoveredSegment.has_lighting ? '有' : '无'}
                    </strong>
                  </div>
                  <div className="route-details">
                    <span>安全评分</span>
                    <strong style={{ color: hoveredSegment.safety_color || getSafetyColor(hoveredSegment.safety_score) }}>
                      {hoveredSegment.safety_score}
                    </strong>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="sidebar-footer">
          <div
            style={{
              fontSize: '11px',
              color: '#9ca3af',
              textAlign: 'center',
            }}
          >
            数据来源：OpenStreetMap · {useCanvasMode ? 'Canvas 模拟渲染' : '高德地图'}
          </div>
        </div>
      </div>

      <div className="map-container">
        {!useCanvasMode ? (
          <div id="amap-container" ref={mapRef} />
        ) : (
          <CanvasMap
            segments={segments}
            bounds={mapBounds}
            center={mapCenter}
            onSegmentHover={handleCanvasSegmentHover}
            routeSegments={route?.route}
            startPoint={parsedStartPoint}
            endPoint={parsedEndPoint}
          />
        )}

        {isLoading && (
          <div className="loading-overlay">
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" />
              <div style={{ marginTop: '12px', color: '#6b7280' }}>加载中...</div>
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#9ca3af' }}>
                状态: {loadStatus} | 模式: {useCanvasMode ? 'Canvas' : '高德地图'}
              </div>
            </div>
          </div>
        )}

        {error && loadStatus === LOAD_STATUS.ERROR && (
          <div className="loading-overlay">
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <AlertTriangle size="48" color="#ef4444" />
              <div style={{ marginTop: '12px', color: '#6b7280' }}>
                {error}
              </div>
              <div
                style={{
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#9ca3af',
                  maxWidth: '300px',
                }}
              >
                请确保后端服务已启动并正确配置 API Key
              </div>
            </div>
          </div>
        )}

        {!useCanvasMode && amapError && !mapReady && (
          <div className="loading-overlay">
            <div style={{ textAlign: 'center', padding: '20px', maxWidth: '400px' }}>
              <AlertTriangle size="48" color="#f59e0b" />
              <div style={{ marginTop: '12px', fontSize: '16px', fontWeight: 600, color: '#374151' }}>
                高德地图加载失败
              </div>
              <div style={{ marginTop: '8px', color: '#6b7280', fontSize: '13px' }}>
                {amapError}
              </div>
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: '#fffbeb',
                  borderRadius: '8px',
                  textAlign: 'left',
                  fontSize: '12px',
                }}
              >
                <p className="font-semibold text-amber-800 mb-2">可用方案：</p>
                <div className="space-y-3">
                  <button
                    onClick={() => handleMapModeChange(MAP_MODE.CANVAS)}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Layers size="14" />
                    切换到 Canvas 模拟模式
                  </button>
                  <ol className="list-decimal list-inside text-amber-700 space-y-1 text-xs pl-2">
                    <li>
                      访问 <a href="https://console.amap.com/dev/key/app" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                        高德开放平台 <ExternalLink size="10" />
                      </a>
                    </li>
                    <li>创建或选择应用，添加 <strong>Web端(JS API)</strong> 类型的 Key</li>
                    <li>在「域名白名单」中添加 <code>localhost</code></li>
                    <li>将正确的 Key 配置到后端 <code>.env</code> 文件的 <code>GAODE_JS_API_KEY</code> 变量</li>
                    <li>重启后端服务</li>
                  </ol>
                </div>
              </div>
              <div
                style={{
                  marginTop: '12px',
                  fontSize: '11px',
                  color: '#9ca3af',
                }}
              >
                当前使用的 Key: {amapKeyInfo?.key || '未获取'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
