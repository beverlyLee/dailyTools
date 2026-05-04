import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { ParameterScanData, ParameterScanResult } from '../types';

interface ParameterScanPlotProps {
  scanData: ParameterScanData;
  width?: number;
  height?: number;
}

const COLORS = [
  '#3b82f6',
  '#ef4444',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
];

export const ParameterScanPlot: React.FC<ParameterScanPlotProps> = ({
  scanData,
  width = 800,
  height = 400,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [plotType, setPlotType] = useState<'max' | 'mean' | 'std'>('max');

  const { parameter_values: paramValues, results, variables } = scanData;

  const validResults = results.filter((r: ParameterScanResult) => r.success);

  useEffect(() => {
    if (!svgRef.current || !validResults.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 80, bottom: 50, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(paramValues) as [number, number])
      .range([0, innerWidth]);

    let allValues: number[] = [];
    variables.forEach((_, idx) => {
      validResults.forEach((r) => {
        if (r.final_state) {
          if (plotType === 'max' && r.max_values) {
            allValues.push(r.max_values[idx]);
          } else if (plotType === 'mean' && r.mean_values) {
            allValues.push(r.mean_values[idx]);
          } else if (plotType === 'std' && r.std_steady_state) {
            allValues.push(r.std_steady_state[idx]);
          }
        }
      });
    });

    const yScale = d3
      .scaleLinear()
      .domain([
        d3.min(allValues) as number,
        d3.max(allValues) as number,
      ])
      .range([innerHeight, 0])
      .nice();

    const xAxis = d3.axisBottom(xScale).ticks(10);
    const yAxis = d3.axisLeft(yScale).ticks(8);

    g.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    g.append('g')
      .attr('class', 'y axis')
      .call(yAxis);

    g.append('text')
      .attr('class', 'x label')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '12px')
      .text(scanData.scan_parameter);

    const yLabelText = plotType === 'max' ? '最大值' : plotType === 'mean' ? '平均值' : '稳态标准差';
    g.append('text')
      .attr('class', 'y label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '12px')
      .text(yLabelText);

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

    variables.forEach((variable, varIdx) => {
      const line = d3
        .line<[number, number]>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]))
        .curve(d3.curveMonotoneX);

      const data: [number, number][] = [];
      validResults.forEach((r, i) => {
        if (r.final_state) {
          let val: number | undefined;
          if (plotType === 'max' && r.max_values) {
            val = r.max_values[varIdx];
          } else if (plotType === 'mean' && r.mean_values) {
            val = r.mean_values[varIdx];
          } else if (plotType === 'std' && r.std_steady_state) {
            val = r.std_steady_state[varIdx];
          }
          if (val !== undefined) {
            data.push([r.parameter_value, val]);
          }
        }
      });

      if (data.length > 1) {
        g.append('path')
          .attr('class', 'trajectory-line')
          .attr('d', line(data))
          .attr('stroke', COLORS[varIdx % COLORS.length])
          .attr('stroke-width', 2)
          .attr('fill', 'none');
      }

      data.forEach((d) => {
        g.append('circle')
          .attr('cx', xScale(d[0]))
          .attr('cy', yScale(d[1]))
          .attr('r', 4)
          .attr('fill', COLORS[varIdx % COLORS.length])
          .attr('opacity', 0.8);
      });
    });

    const legend = g
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${innerWidth + 10}, 0)`);

    variables.forEach((variable, idx) => {
      const legendItem = legend
        .append('g')
        .attr('transform', `translate(0, ${idx * 25})`);

      legendItem
        .append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', COLORS[idx % COLORS.length]);

      legendItem
        .append('text')
        .attr('x', 20)
        .attr('y', 10)
        .attr('fill', '#64748b')
        .attr('font-size', '11px')
        .text(variable);
    });
  }, [scanData, validResults, variables, paramValues, plotType, width, height]);

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <label className="form-label" style={{ marginBottom: '4px' }}>绘图类型:</label>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${plotType === 'max' ? 'active' : ''}`}
            onClick={() => setPlotType('max')}
          >
            最大值
          </button>
          <button
            className={`toggle-btn ${plotType === 'mean' ? 'active' : ''}`}
            onClick={() => setPlotType('mean')}
          >
            平均值
          </button>
          <button
            className={`toggle-btn ${plotType === 'std' ? 'active' : ''}`}
            onClick={() => setPlotType('std')}
          >
            标准差
          </button>
        </div>
      </div>
      <div style={{ marginBottom: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>方程</div>
            <div style={{ fontWeight: '500', color: '#1e293b' }}>{scanData.equation_name}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>扫描参数</div>
            <div style={{ fontWeight: '500', color: '#1e293b' }}>{scanData.scan_parameter}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>范围</div>
            <div style={{ fontWeight: '500', color: '#1e293b' }}>
              {scanData.parameter_range[0]} → {scanData.parameter_range[1]}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>点数</div>
            <div style={{ fontWeight: '500', color: '#1e293b' }}>{scanData.parameter_steps}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>成功率</div>
            <div style={{ fontWeight: '500', color: validResults.length === results.length ? '#22c55e' : '#f59e0b' }}>
              {validResults.length}/{results.length}
            </div>
          </div>
        </div>
      </div>
      <div className="viz-container">
        {results.length === 0 ? (
          <div className="loading">
            <span>暂无参数扫描数据</span>
          </div>
        ) : (
          <svg ref={svgRef} />
        )}
      </div>
    </div>
  );
};
