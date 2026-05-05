import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Tooltip } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';

const TopologyGraph = ({ topology, onNodeClick, selectedNode }) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const simulationRef = useRef(null);
  const nodesRef = useRef([]);
  const linksRef = useRef([]);

  // 状态颜色映射
  const statusColors = {
    healthy: '#52c41a',
    degraded: '#faad14',
    error: '#ff4d4f',
    unknown: '#bfbfbf',
  };

  const statusIcons = {
    healthy: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    degraded: <WarningOutlined style={{ color: '#faad14' }} />,
    error: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
    unknown: <QuestionCircleOutlined style={{ color: '#bfbfbf' }} />,
  };

  // 监听容器尺寸变化
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // 初始化和更新图表
  useEffect(() => {
    if (!topology || !svgRef.current || dimensions.width === 0) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);

    // 清空现有内容
    svg.selectAll('*').remove();

    // 准备数据
    const nodes = topology.nodes.map((d) => ({ ...d }));
    const links = topology.edges.map((d) => ({ ...d }));

    // 保存引用
    nodesRef.current = nodes;
    linksRef.current = links;

    // 创建力导向图
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(150)
          .strength(0.7)
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));

    simulationRef.current = simulation;

    // 定义箭头标记
    const defs = svg.append('defs');

    // 正常箭头
    defs
      .append('marker')
      .attr('id', 'arrow-normal')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 35)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#1890ff');

    // 异常箭头
    defs
      .append('marker')
      .attr('id', 'arrow-abnormal')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 35)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#ff4d4f');

    // 创建缩放行为
    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // 创建主容器
    const g = svg.append('g');

    // 绘制链接
    const linkGroup = g
      .append('g')
      .attr('class', 'topology-edges')
      .selectAll('g')
      .data(links)
      .enter()
      .append('g');

    // 链接路径
    const linkPath = linkGroup
      .append('path')
      .attr('class', (d) =>
        d.isAbnormal ? 'topology-edge topology-edge-abnormal' : 'topology-edge topology-edge-normal'
      )
      .attr('marker-end', (d) =>
        d.isAbnormal ? 'url(#arrow-abnormal)' : 'url(#arrow-normal)'
      );

    // 链接标签（显示错误率和延迟）
    const linkLabel = linkGroup
      .append('text')
      .attr('class', 'topology-edge-label')
      .attr('text-anchor', 'middle')
      .attr('dy', -5)
      .style('font-size', '10px')
      .style('fill', (d) => (d.isAbnormal ? '#ff4d4f' : '#666'))
      .text((d) => {
        const errorRate = (d.metrics?.errorRate * 100).toFixed(1) || '0';
        const latency = d.metrics?.avgLatencyMs?.toFixed(0) || '0';
        return `${errorRate}% | ${latency}ms`;
      });

    // 绘制节点
    const nodeGroup = g
      .append('g')
      .attr('class', 'topology-nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'topology-node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick && onNodeClick(d);
      });

    // 节点背景圆
    nodeGroup
      .append('circle')
      .attr('r', 30)
      .attr('fill', (d) => statusColors[d.status] || statusColors.unknown)
      .attr('stroke', (d) => (selectedNode?.id === d.id ? '#1890ff' : 'white'))
      .attr('stroke-width', (d) => (selectedNode?.id === d.id ? 4 : 2))
      .style('cursor', 'pointer');

    // 节点图标（根据服务类型）
    nodeGroup
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('font-size', '18px')
      .text((d) => {
        if (d.type === 'gateway') return '🌐';
        return '🔧';
      });

    // 节点标签
    nodeGroup
      .append('text')
      .attr('class', 'topology-node-label')
      .attr('dy', 50)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#333')
      .text((d) => d.serviceName);

    // 节点状态指示器（右上角小图标）
    nodeGroup
      .append('g')
      .attr('transform', (d) => `translate(20, -20)`);

    // 添加动画效果（流量流动）
    const flowGroup = g.append('g').attr('class', 'flow-animations');

    links.forEach((link, index) => {
      const flowCount = link.isAbnormal ? 3 : 2;
      for (let i = 0; i < flowCount; i++) {
        flowGroup
          .append('circle')
          .attr('r', 4)
          .attr('fill', link.isAbnormal ? '#ff4d4f' : '#1890ff')
          .attr('opacity', 0.7)
          .attr('class', 'flow-marker')
          .transition()
          .duration(link.isAbnormal ? 2000 : 3000)
          .delay((i * 1000) / flowCount)
          .ease(d3.easeLinear)
          .on('start', function repeat() {
            d3.select(this)
              .transition()
              .duration(link.isAbnormal ? 2000 : 3000)
              .ease(d3.easeLinear)
              .attrTween('transform', () => {
                const source = nodes.find((n) => n.id === link.source);
                const target = nodes.find((n) => n.id === link.target);
                if (!source || !target) return () => 'translate(0,0)';

                return (t) => {
                  const x = source.x + (target.x - source.x) * t;
                  const y = source.y + (target.y - source.y) * t;
                  return `translate(${x},${y})`;
                };
              })
              .on('end', repeat);
          });
      }
    });

    // 更新位置
    simulation.on('tick', () => {
      // 更新链接路径（贝塞尔曲线）
      linkPath.attr('d', (d) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        
        // 使用贝塞尔曲线
        const cx = (d.source.x + d.target.x) / 2;
        const cy = (d.source.y + d.target.y) / 2 - 30;
        
        return `M${d.source.x},${d.source.y} Q${cx},${cy} ${d.target.x},${d.target.y}`;
      });

      // 更新标签位置
      linkLabel.attr('transform', (d) => {
        const cx = (d.source.x + d.target.x) / 2;
        const cy = (d.source.y + d.target.y) / 2 - 30;
        return `translate(${cx},${cy})`;
      });

      // 更新节点位置
      nodeGroup.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // 拖拽函数
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // 清理函数
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [topology, dimensions, selectedNode]);

  // 点击节点时高亮
  useEffect(() => {
    if (!topology || !selectedNode) return;

    // 这里可以添加更多的高亮逻辑
  }, [selectedNode, topology]);

  return (
    <div ref={containerRef} className="topology-graph-container">
      <svg ref={svgRef} className="topology-svg" />
    </div>
  );
};

export default TopologyGraph;
