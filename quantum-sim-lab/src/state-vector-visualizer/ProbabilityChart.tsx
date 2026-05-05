import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import './ProbabilityChart.css';

interface ProbabilityChartProps {
  probabilities: number[];
  qubitCount: number;
  labels?: string[];
}

const ProbabilityChart: React.FC<ProbabilityChartProps> = ({
  probabilities,
  qubitCount,
  labels,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || probabilities.length === 0) return;

    const width = 600;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'barGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#1de9b6');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#1dc4e9');

    const glow = defs
      .append('filter')
      .attr('id', 'barGlow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glow
      .append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'coloredBlur');

    const feMerge = glow.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const chartGroup = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const xScale = d3
      .scaleBand()
      .domain(
        labels || Array.from({ length: probabilities.length }, (_, i) => i.toString())
      )
      .range([0, chartWidth])
      .padding(0.3);

    const yScale = d3.scaleLinear().domain([0, 1]).range([chartHeight, 0]);

    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat((d) => {
        if (labels) return d;
        const num = parseInt(d as string);
        return '|' + num.toString(2).padStart(qubitCount, '0') + '⟩';
      });

    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat((d) => (d * 100).toFixed(0) + '%');

    chartGroup
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#a0a0a0')
      .attr('font-size', '10px')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    chartGroup
      .append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#a0a0a0')
      .attr('font-size', '11px');

    chartGroup
      .selectAll('.y-axis path, .y-axis line')
      .attr('stroke', '#4a5568');

    chartGroup
      .selectAll('.x-axis path, .x-axis line')
      .attr('stroke', '#4a5568');

    chartGroup
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -chartHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64ffda')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .text('概率');

    const bars = chartGroup
      .selectAll('.bar')
      .data(probabilities)
      .enter()
      .append('g')
      .attr('class', 'bar-group');

    bars
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (_, i) => xScale(labels ? labels[i] : i.toString()) || 0)
      .attr('y', chartHeight)
      .attr('width', xScale.bandwidth())
      .attr('height', 0)
      .attr('fill', 'url(#barGradient)')
      .attr('rx', 4)
      .attr('filter', 'url(#barGlow)')
      .transition()
      .duration(800)
      .delay((_, i) => i * 50)
      .attr('y', (d) => yScale(d))
      .attr('height', (d) => chartHeight - yScale(d));

    bars
      .append('text')
      .attr('class', 'bar-label')
      .attr(
        'x',
        (_, i) => (xScale(labels ? labels[i] : i.toString()) || 0) + xScale.bandwidth() / 2
      )
      .attr('y', chartHeight)
      .attr('text-anchor', 'middle')
      .attr('fill', '#1de9b6')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .transition()
      .duration(800)
      .delay((_, i) => i * 50)
      .attr('y', (d) => yScale(d) - 8)
      .text((d) => (d * 100).toFixed(1) + '%');

    const maxProb = Math.max(...probabilities);
    const maxIndex = probabilities.indexOf(maxProb);

    chartGroup
      .append('text')
      .attr('x', chartWidth - 10)
      .attr('y', 15)
      .attr('text-anchor', 'end')
      .attr('fill', '#a0a0a0')
      .attr('font-size', '11px')
      .text(
        `最大概率: ${(maxProb * 100).toFixed(2)}% (|${maxIndex
          .toString(2)
          .padStart(qubitCount, '0')}⟩)`
      );
  }, [probabilities, qubitCount, labels]);

  return (
    <div className="probability-chart-container">
      <svg ref={svgRef} width="600" height="300" className="probability-svg" />
    </div>
  );
};

export default ProbabilityChart;
