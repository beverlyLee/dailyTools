import React, { useEffect, useRef, useState } from 'react';
import { Graph } from '@antv/g6';
import { Spin, Modal } from 'antd';
import { getCarrierDetail } from '../api/logistics';

const statusColors = {
  healthy: '#52c41a',
  degraded: '#faad14',
  error: '#ff4d4f',
  unknown: '#bfbfbf',
};

const typeIcons = {
  supplier: '🏭',
  warehouse: '🏠',
  carrier: '🚚',
  retailer: '🏪',
};

const TopologyGraph = ({ topology, onNodeClick, loading }) => {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [carrierDetail, setCarrierDetail] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !topology) return;

    const container = containerRef.current;
    const width = container.offsetWidth;
    const height = container.offsetHeight;

    if (graphRef.current) {
      graphRef.current.destroy();
    }

    const graph = new Graph({
      container,
      width,
      height,
      modes: {
        default: ['drag-canvas', 'zoom-canvas', 'drag-node', 'click-select'],
      },
      layout: {
        type: 'force',
        linkDistance: 150,
        nodeStrength: -300,
        collideStrength: 0.8,
        alphaDecay: 0.028,
        preventOverlap: true,
        nodeSize: 60,
      },
      defaultNode: {
        type: 'circle',
        size: 60,
        style: {
          fill: '#fff',
          stroke: '#1890ff',
          lineWidth: 2,
        },
        labelCfg: {
          style: {
            fill: '#000',
            fontSize: 12,
          },
          position: 'bottom',
        },
      },
      defaultEdge: {
        type: 'quadratic',
        style: {
          stroke: '#1890ff',
          lineWidth: 2,
          endArrow: true,
        },
        labelCfg: {
          style: {
            fill: '#666',
            fontSize: 10,
          },
          autoRotate: true,
        },
      },
    });

    graphRef.current = graph;

    const nodes = topology.nodes.map((node) => ({
      id: node.id,
      label: node.name,
      type: 'circle',
      size: 60,
      style: {
        fill: '#fff',
        stroke: statusColors[node.status] || statusColors.unknown,
        lineWidth: 3,
      },
      icon: typeIcons[node.type] || '📦',
      data: node,
    }));

    const edges = topology.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      style: {
        stroke: edge.isAbnormal ? '#ff4d4f' : '#1890ff',
        lineWidth: edge.isAbnormal ? 3 : 2,
        lineDash: edge.isAbnormal ? [5, 5] : null,
        endArrow: {
          path: 'M 0,0 L 8,4 L 8,-4 Z',
          fill: edge.isAbnormal ? '#ff4d4f' : '#1890ff',
        },
      },
      data: edge,
    }));

    graph.data({ nodes, edges });
    graph.render();

    graph.on('node:click', async (evt) => {
      const { item } = evt;
      const model = item.getModel();
      setSelectedNode(model.id);

      if (onNodeClick) {
        onNodeClick(model.data);
      }

      if (model.data.type === 'carrier') {
        showCarrierDetail(model.data.id);
      }
    });

    graph.on('node:mouseenter', (evt) => {
      const { item } = evt;
      graph.setItemState(item, 'hover', true);
    });

    graph.on('node:mouseleave', (evt) => {
      const { item } = evt;
      graph.setItemState(item, 'hover', false);
    });

    return () => {
      if (graphRef.current) {
        graphRef.current.destroy();
      }
    };
  }, [topology]);

  const showCarrierDetail = async (carrierId) => {
    setDetailLoading(true);
    setDetailModalVisible(true);
    try {
      const response = await getCarrierDetail(carrierId);
      setCarrierDetail(response.data);
    } catch (error) {
      console.error('获取承运商详情失败:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="topology-container topology-loading">
        <Spin size="large" tip="加载拓扑图数据..." />
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="topology-container" />
      
      <Modal
        title="承运商详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={700}
        className="carrier-detail-modal"
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin />
          </div>
        ) : carrierDetail ? (
          <div>
            <div className="carrier-info">
              <h3>{carrierDetail.name}</h3>
              <p>类型: {carrierDetail.type === 'express' ? '快递' : '物流'}</p>
              <p>
                状态: 
                <span className="status-badge">
                  <span className={`status-dot ${carrierDetail.status}`} />
                  {carrierDetail.status === 'healthy' ? '正常' : 
                   carrierDetail.status === 'degraded' ? '降级' : '异常'}
                </span>
              </p>
              <p>准点率: {(carrierDetail.onTimeRate * 100).toFixed(1)}%</p>
              <p>在途车辆: {carrierDetail.activeVehicles}/{carrierDetail.totalVehicles}</p>
              <p>当前订单: {carrierDetail.currentOrders}</p>
              <p>今日配送: {carrierDetail.deliveredToday}</p>
              <p>联系电话: {carrierDetail.contactInfo?.phone}</p>
              <p>邮箱: {carrierDetail.contactInfo?.email}</p>
              <p>地址: {carrierDetail.contactInfo?.address}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
};

export default TopologyGraph;
