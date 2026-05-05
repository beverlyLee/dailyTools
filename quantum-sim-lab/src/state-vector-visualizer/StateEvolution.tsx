import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { CircuitState } from '../types';
import './StateEvolution.css';

interface StateEvolutionProps {
  stepStates: CircuitState[];
  currentStep: number;
  onStepSelect: (step: number) => void;
}

const StateEvolution: React.FC<StateEvolutionProps> = ({
  stepStates,
  currentStep,
  onStepSelect,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || stepStates.length === 0) return;

    const width = 1000;
    const height = 200;
    const margin = { top: 30, right: 30, bottom: 40, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const chartGroup = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const xScale = d3
      .scaleLinear()
      .domain([0, stepStates.length - 1])
      .range([0, chartWidth]);

    const yScale = d3.scaleLinear().domain([0, 1]).range([chartHeight, 0]);

    const xAxis = d3
      .axisBottom(xScale)
      .ticks(stepStates.length)
      .tickFormat((d) => `步骤 ${d}`);

    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat((d) => (d * 100).toFixed(0) + '%');

    chartGroup
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#a0a0a0')
      .attr('font-size', '10px');

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

    const colors = ['#1de9b6', '#fd79a8', '#a29bfe', '#ffeb3b', '#ff6b6b', '#4ecdc4'];
    const qubitCount = stepStates[0].bloch_spheres.length;

    for (let qubit = 0; qubit < Math.min(qubitCount, 6); qubit++) {
      const lineData = stepStates.map((state, index) => ({
        step: index,
        probability: state.probabilities.reduce((sum, _, i) => {
          const bit = (i >> qubit) & 1;
          return sum + (bit === 0 ? 0 : state.probabilities[i]);
        }, 0),
      }));

      const line = d3
        .line<{ step: number; probability: number }>()
        .x((d) => xScale(d.step))
        .y((d) => yScale(d.probability))
        .curve(d3.curveMonotoneX);

      chartGroup
        .append('path')
        .datum(lineData)
        .attr('class', `evolution-line qubit-${qubit}`)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', colors[qubit])
        .attr('stroke-width', 2.5)
        .attr('opacity', 0.8);

      chartGroup
        .selectAll(`.dot-qubit-${qubit}`)
        .data(lineData)
        .enter()
        .append('circle')
        .attr('class', `evolution-dot dot-qubit-${qubit}`)
        .attr('cx', (d) => xScale(d.step))
        .attr('cy', (d) => yScale(d.probability))
        .attr('r', 5)
        .attr('fill', colors[qubit])
        .attr('stroke', '#fff')
        .attr('stroke-width', 1.5)
        .attr('opacity', (_, i) => (i === currentStep ? 1 : 0.6));
    }

    const stepIndicator = chartGroup
      .append('g')
      .attr('class', 'step-indicator-group');

    stepIndicator
      .append('line')
      .attr('class', 'step-indicator-line')
      .attr('x1', xScale(currentStep))
      .attr('y1', 0)
      .attr('x2', xScale(currentStep))
      .attr('y2', chartHeight)
      .attr('stroke', '#64ffda')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('opacity', 0.8);

    stepIndicator
      .append('circle')
      .attr('class', 'step-indicator-dot')
      .attr('cx', xScale(currentStep))
      .attr('cy', chartHeight + 10)
      .attr('r', 8)
      .attr('fill', '#64ffda')
      .attr('cursor', 'pointer');

    chartGroup
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -chartHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#64ffda')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .text('各量子比特为|1⟩的概率');

    const legendGroup = chartGroup
      .append('g')
      .attr('class', 'evolution-legend')
      .attr('transform', `translate(${chartWidth - 150}, 0)`);

    for (let qubit = 0; qubit < Math.min(qubitCount, 6); qubit++) {
      const legendY = qubit * 20;
      legendGroup
        .append('rect')
        .attr('x', 0)
        .attr('y', legendY - 6)
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', colors[qubit])
        .attr('rx', 2);

      legendGroup
        .append('text')
        .attr('x', 20)
        .attr('y', legendY + 4)
        .attr('fill', '#a0a0a0')
        .attr('font-size', '11px')
        .text(`q${qubit}`);
    }

    const overlay = chartGroup
      .append('rect')
      .attr('class', 'click-overlay')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', chartWidth)
      .attr('height', chartHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'pointer')
      .on('click', (event) => {
        const [x] = d3.pointer(event);
        const step = Math.round(xScale.invert(x));
        if (step >= 0 && step < stepStates.length) {
          onStepSelect(step);
        }
      });
  }, [stepStates, currentStep, onStepSelect]);

  return (
    <div className="state-evolution-container">
      <svg ref={svgRef} width="1000" height="200" className="evolution-svg" />
      <div className="evolution-info">
        <p>
          点击图表中的任意位置跳转到对应步骤。当前显示步骤 <strong>{currentStep}</strong> /{' '}
          <strong>{stepStates.length - 1}</strong>
        </p>
      </div>
    </div>
  );
};

export default StateEvolution;
