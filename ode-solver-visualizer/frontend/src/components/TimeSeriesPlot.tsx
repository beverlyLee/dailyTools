import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface TimeSeriesPlotProps {
  time: number[];
  states: number[][];
  variables: string[];
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

export const TimeSeriesPlot: React.FC<TimeSeriesPlotProps> = ({
  time,
  states,
  variables,
  width = 800,
  height = 400,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !time.length || !states.length) return;

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
      .domain(d3.extent(time) as [number, number])
      .range([0, innerWidth]);

    const allValues = states.flat();
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
      .text('时间 t');

    g.append('text')
      .attr('class', 'y label')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64748b')
      .attr('font-size', '12px')
      .text('状态变量');

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

    variables.forEach((variable, idx) => {
      const line = d3
        .line<[number, number]>()
        .x((d) => xScale(d[0]))
        .y((d) => yScale(d[1]))
        .curve(d3.curveMonotoneX);

      const data: [number, number][] = time.map((t, i) => [
        t,
        states[i][idx],
      ]);

      g.append('path')
        .attr('class', 'trajectory-line')
        .attr('d', line(data))
        .attr('stroke', COLORS[idx % COLORS.length])
        .attr('stroke-width', 2)
        .attr('fill', 'none');
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
  }, [time, states, variables, width, height]);

  return (
    <div className="viz-container">
      <svg ref={svgRef} />
    </div>
  );
};
