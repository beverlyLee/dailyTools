import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import G6 from '@antv/g6';

const HairlineChart = ({ data }) => {
  const containerRef = useRef(null);
  const graphInstanceRef = useRef(null);
  const eventHandlersRef = useRef(new Map());
  const renderTimeoutRef = useRef(null);
  const isMountedRef = useRef(false);
  const dataHashRef = useRef('');

  const COLORS = useMemo(() => [
    '#e74c3c',
    '#e67e22',
    '#f39c12',
    '#3498db',
    '#2ecc71',
    '#9b59b6',
    '#1abc9c',
    '#34495e'
  ], []);

  const [dimensions, setDimensions] = useState({ width: 0, height: 400 });

  const getDataHash = useCallback((dataArray) => {
    if (!dataArray || dataArray.length === 0) return '';
    return dataArray.map(d => `${d.language}-${d.risk_score}`).join('|');
  }, []);

  const removeEventListeners = useCallback(() => {
    if (!graphInstanceRef.current) return;
    
    const handlers = eventHandlersRef.current;
    handlers.forEach((handler, eventName) => {
      try {
        graphInstanceRef.current.off(eventName, handler);
      } catch (e) {
        console.warn(`Failed to remove event listener: ${eventName}`, e);
      }
    });
    handlers.clear();
  }, []);

  const destroyGraph = useCallback(() => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
      renderTimeoutRef.current = null;
    }

    removeEventListeners();

    if (graphInstanceRef.current) {
      try {
        graphInstanceRef.current.destroy();
      } catch (e) {
        console.warn('Graph destroy error:', e);
      }
      graphInstanceRef.current = null;
    }
    
    dataHashRef.current = '';
  }, [removeEventListeners]);

  const createGraphData = useCallback((inputData, colors) => {
    if (!inputData || inputData.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodes = inputData.map((item, index) => ({
      id: item.language,
      label: item.language,
      size: Math.max(35, 35 + item.risk_score * 0.8),
      style: {
        fill: colors[index % colors.length],
        stroke: '#ffffff',
        lineWidth: 3,
        shadowColor: 'rgba(0,0,0,0.15)',
        shadowBlur: 8
      },
      labelCfg: {
        style: {
          fill: '#ffffff',
          fontSize: 13,
          fontWeight: 'bold'
        }
      }
    }));

    const edges = inputData.slice(0, -1).map((item, index) => ({
      source: item.language,
      target: inputData[index + 1].language,
      style: {
        stroke: '#e0e0e0',
        lineWidth: 2,
        opacity: 0.5
      }
    }));

    return { nodes, edges };
  }, []);

  const bindEventHandlers = useCallback((graph) => {
    const onNodeMouseEnter = (e) => {
      if (!graph || !e.item) return;
      graph.updateItem(e.item, {
        style: {
          lineWidth: 5,
          shadowColor: 'rgba(0,0,0,0.35)',
          shadowBlur: 15
        }
      });
      if (containerRef.current) {
        containerRef.current.style.cursor = 'pointer';
      }
    };

    const onNodeMouseLeave = (e) => {
      if (!graph || !e.item) return;
      graph.updateItem(e.item, {
        style: {
          lineWidth: 3,
          shadowColor: 'rgba(0,0,0,0.15)',
          shadowBlur: 8
        }
      });
      if (containerRef.current) {
        containerRef.current.style.cursor = 'default';
      }
    };

    graph.on('node:mouseenter', onNodeMouseEnter);
    graph.on('node:mouseleave', onNodeMouseLeave);

    eventHandlersRef.current.set('node:mouseenter', onNodeMouseEnter);
    eventHandlersRef.current.set('node:mouseleave', onNodeMouseLeave);
  }, []);

  const doRender = useCallback(() => {
    if (!isMountedRef.current) return;
    if (!containerRef.current) return;
    if (!data || data.length === 0) return;
    if (dimensions.width <= 0) return;

    const newHash = getDataHash(data);
    if (newHash === dataHashRef.current && graphInstanceRef.current) {
      return;
    }

    destroyGraph();
    dataHashRef.current = newHash;

    const { width, height } = dimensions;
    const graphData = createGraphData(data, COLORS);

    try {
      const graph = new G6.Graph({
        container: containerRef.current,
        width,
        height,
        modes: {
          default: ['drag-canvas', 'zoom-canvas', 'drag-node']
        },
        defaultNode: {
          type: 'circle'
        },
        defaultEdge: {
          type: 'line'
        },
        layout: {
          type: 'circular',
          center: [width / 2, height / 2],
          radius: Math.min(width, height) * 0.3
        },
        animate: false,
        fitView: true,
        fitViewPadding: 40
      });

      graph.data(graphData);
      graph.render();

      bindEventHandlers(graph);

      graphInstanceRef.current = graph;
    } catch (error) {
      console.error('Failed to render graph:', error);
    }
  }, [data, dimensions, COLORS, destroyGraph, createGraphData, bindEventHandlers, getDataHash]);

  const scheduleRender = useCallback(() => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }
    renderTimeoutRef.current = setTimeout(() => {
      doRender();
      renderTimeoutRef.current = null;
    }, 50);
  }, [doRender]);

  useEffect(() => {
    isMountedRef.current = true;

    const updateDimensions = () => {
      if (!containerRef.current || !isMountedRef.current) return;
      
      const newWidth = containerRef.current.clientWidth;
      if (newWidth > 0 && newWidth !== dimensions.width) {
        setDimensions({
          width: newWidth,
          height: 400
        });
      }
    };

    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateDimensions, 150);
    };

    requestAnimationFrame(updateDimensions);
    window.addEventListener('resize', handleResize);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  useEffect(() => {
    if (dimensions.width > 0 && data && data.length > 0) {
      scheduleRender();
    }

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [dimensions, data, scheduleRender]);

  useEffect(() => {
    return () => {
      destroyGraph();
    };
  }, [destroyGraph]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div 
        ref={containerRef} 
        className="chart-container"
        style={{
          width: '100%',
          height: '400px',
          position: 'relative',
          minHeight: '400px',
          overflow: 'hidden'
        }}
      />
      
      {data && data.length > 0 && (
        <div className="legend" style={{ marginTop: '15px' }}>
          {data.map((item, index) => (
            <div key={item.language} className="legend-item">
              <div 
                className="legend-color" 
                style={{ 
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: COLORS[index % COLORS.length]
                }}
              />
              <span style={{ fontSize: '13px', color: '#666' }}>
                {item.language}: {item.risk_score}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(HairlineChart);
