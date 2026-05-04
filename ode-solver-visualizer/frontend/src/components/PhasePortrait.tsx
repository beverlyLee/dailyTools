import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface PhasePortraitProps {
  states: number[][];
  variables: string[];
  xAxis?: number;
  yAxis?: number;
  zAxis?: number;
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

export const PhasePortrait: React.FC<PhasePortraitProps> = ({
  states,
  variables,
  xAxis = 0,
  yAxis = 1,
  zAxis = 2,
  width = 800,
  height = 400,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedX, setSelectedX] = useState(xAxis);
  const [selectedY, setSelectedY] = useState(yAxis);
  const [is3D, setIs3D] = useState(false);

  useEffect(() => {
    if (!svgRef.current || !states.length) return;

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

    const xData = states.map((s) => s[selectedX]);
    const yData = states.map((s) => s[selectedY]);

    const xScale = d3
      .scaleLinear()
      .domain([
        d3.min(xData) as number,
        d3.max(xData) as number,
      ])
      .range([0, innerWidth])
      .nice();

    const yScale = d3
      .scaleLinear()
      .domain([
        d3.min(yData) as number,
        d3.max(yData) as number,
      ])
      .range([innerHeight, 0])
      .nice();

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
      .text(variables[selectedX]);

    g.append('text')
      .attr('class', 'y label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '12px')
      .text(variables[selectedY]);

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

    const line = d3
      .line<[number, number]>()
      .x((d) => xScale(d[0]))
      .y((d) => yScale(d[1]))
      .curve(d3.curveLinear);

    const data: [number, number][] = xData.map((x, i) => [x, yData[i]]);

    if (is3D && variables.length >= 3) {
      const zData = states.map((s) => s[zAxis]);
      const zMin = d3.min(zData) as number;
      const zMax = d3.max(zData) as number;

      const colorScale = d3
        .scaleLinear<string, string>()
        .domain([zMin, (zMin + zMax) / 2, zMax])
        .range(['#22c55e', '#3b82f6', '#ef4444']);

      for (let i = 0; i < data.length - 1; i++) {
        const segmentColor = colorScale(zData[i]);
        g.append('line')
          .attr('x1', xScale(data[i][0]))
          .attr('y1', yScale(data[i][1]))
          .attr('x2', xScale(data[i + 1][0]))
          .attr('y2', yScale(data[i + 1][1]))
          .attr('stroke', segmentColor)
          .attr('stroke-width', 2)
          .attr('opacity', 0.8);
      }
    } else {
      g.append('path')
        .attr('class', 'trajectory-line')
        .attr('d', line(data))
        .attr('stroke', COLORS[0])
        .attr('stroke-width', 2)
        .attr('fill', 'none');
    }

    g.append('circle')
      .attr('class', 'start-point')
      .attr('cx', xScale(data[0][0]))
      .attr('cy', yScale(data[0][1]))
      .attr('r', 6);

    g.append('circle')
      .attr('class', 'end-point')
      .attr('cx', xScale(data[data.length - 1][0]))
      .attr('cy', yScale(data[data.length - 1][1]))
      .attr('r', 6);

    const startLegend = g
      .append('g')
      .attr('transform', `translate(${innerWidth - 100}, 0)`);
    
    startLegend
      .append('circle')
      .attr('cx', 6)
      .attr('cy', 6)
      .attr('r', 6)
      .attr('fill', '#22c55e')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);
    
    startLegend
      .append('text')
      .attr('x', 20)
      .attr('y', 10)
      .attr('fill', '#64748b')
      .attr('font-size', '11px')
      .text('起点');

    const endLegend = g
      .append('g')
      .attr('transform', `translate(${innerWidth - 100}, 25)`);
    
    endLegend
      .append('circle')
      .attr('cx', 6)
      .attr('cy', 6)
      .attr('r', 6)
      .attr('fill', '#ef4444')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);
    
    endLegend
      .append('text')
      .attr('x', 20)
      .attr('y', 10)
      .attr('fill', '#64748b')
      .attr('font-size', '11px')
      .text('终点');
  }, [states, variables, selectedX, selectedY, selectedX, is3D, width, height]);

  return (
    <div>
      <div style={{ marginBottom: '12px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div>
          <label className="form-label" style={{ marginBottom: '4px' }}>X轴:</label>
          <select
            className="form-select"
            style={{ width: '120px' }}
            value={selectedX}
            onChange={(e) => setSelectedX(Number(e.target.value))}
          >
            {variables.map((v, i) => (
              <option key={i} value={i}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" style={{ marginBottom: '4px' }}>Y轴:</label>
          <select
            className="form-select"
            style={{ width: '120px' }}
            value={selectedY}
            onChange={(e) => setSelectedY(Number(e.target.value))}
          >
            {variables.map((v, i) => (
              <option key={i} value={i}>{v}</option>
            ))}
          </select>
        </div>
        {variables.length >= 3 && (
          <div>
            <label className="form-label" style={{ marginBottom: '4px' }}>着色:</label>
            <div className="toggle-group">
              <button
                className={`toggle-btn ${!is3D ? 'active' : ''}`}
                onClick={() => setIs3D(false)}
              >
                单色
              </button>
              <button
                className={`toggle-btn ${is3D ? 'active' : ''}`}
                onClick={() => setIs3D(true)}
              >
                按{variables[zAxis]}颜色
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="viz-container">
        <svg ref={svgRef} />
      </div>
    </div>
  );
};
