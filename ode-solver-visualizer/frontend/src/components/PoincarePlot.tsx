import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { PoincareAnalysis } from '../types';

interface PoincarePlotProps {
  points: number[][];
  variables: string[];
  analysis?: PoincareAnalysis;
  width?: number;
  height?: number;
}

export const PoincarePlot: React.FC<PoincarePlotProps> = ({
  points,
  variables,
  analysis,
  width = 800,
  height = 400,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !points.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xData = points.map((p) => p[0]);
    const yData = points.map((p) => p[1] || 0);

    const xExtent = d3.extent(xData) as [number, number];
    const yExtent = d3.extent(yData) as [number, number];

    const padding = 0.1;
    const xPadding = (xExtent[1] - xExtent[0]) * padding;
    const yPadding = (yExtent[1] - yExtent[0]) * padding;

    const xScale = d3
      .scaleLinear()
      .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
      .range([innerHeight, 0]);

    const xAxisScale = d3.axisBottom(xScale).ticks(10);
    const yAxisScale = d3.axisLeft(yScale).ticks(8);

    g.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxisScale);

    g.append('g')
      .attr('class', 'y axis')
      .call(yAxisScale);

    g.append('text')
      .attr('class', 'x label')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '12px')
      .text(variables[0] || 'x');

    if (variables.length > 1) {
      g.append('text')
        .attr('class', 'y label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -45)
        .attr('text-anchor', 'middle')
        .attr('fill', '#64748b')
        .attr('font-size', '12px')
        .text(variables[1] || 'y');
    }

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(10)
          .tickSize(-innerHeight)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#e2e8f0');

    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(8)
          .tickSize(-innerWidth)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#e2e8f0');

    const data: [number, number][] = xData.map((x, i) => [x, yData[i]]);

    g.selectAll('.point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'point')
      .attr('cx', (d) => xScale(d[0]))
      .attr('cy', (d) => yScale(d[1]))
      .attr('r', 3)
      .attr('fill', '#8b5cf6')
      .attr('opacity', 0.8);

    g.append('text')
      .attr('x', 10)
      .attr('y', 20)
      .attr('fill', '#64748b')
      .attr('font-size', '13px')
      .attr('font-weight', '500')
      .text(`点数量: ${points.length}`);
  }, [points, variables, width, height]);

  const getBehaviorColor = (behavior: string): string => {
    switch (behavior) {
      case 'fixed_point':
        return '#22c55e';
      case 'periodic':
        return '#3b82f6';
      case 'chaotic':
        return '#ef4444';
      case 'quasiperiodic':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  const getBehaviorLabel = (behavior: string): string => {
    switch (behavior) {
      case 'fixed_point':
        return '固定点';
      case 'periodic':
        return '周期轨道';
      case 'chaotic':
        return '混沌运动';
      case 'quasiperiodic':
        return '拟周期运动';
      case 'insufficient_data':
        return '数据不足';
      case 'uncertain':
        return '不确定';
      default:
        return behavior;
    }
  };

  return (
    <div>
      {analysis && (
        <div
          className="message"
          style={{
            marginBottom: '16px',
            backgroundColor: '#f1f5f9',
            borderLeft: `4px solid ${getBehaviorColor(analysis.behavior)}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ color: getBehaviorColor(analysis.behavior) }}>
                动力学行为: {getBehaviorLabel(analysis.behavior)}
              </strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                {analysis.description}
              </p>
            </div>
            {analysis.num_unique_points && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>唯一点数</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#3b82f6' }}>
                  {analysis.num_unique_points}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="viz-container">
        {points.length === 0 ? (
          <div className="loading">
            <span>暂无庞加莱截面数据</span>
          </div>
        ) : (
          <svg ref={svgRef} />
        )}
      </div>
    </div>
  );
};
