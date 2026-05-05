import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { BlochSphereState } from '../types';
import './BlochSphere.css';

interface BlochSphereProps {
  state: BlochSphereState;
  qubitIndex: number;
}

const BlochSphere: React.FC<BlochSphereProps> = ({ state, qubitIndex }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 400;
    const height = 400;
    const radius = 150;
    const centerX = width / 2;
    const centerY = height / 2;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const gradient = defs
      .append('radialGradient')
      .attr('id', 'sphereGradient')
      .attr('cx', '30%')
      .attr('cy', '30%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#4a5568');
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#1a202c');

    const glow = defs
      .append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    glow
      .append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');

    const feMerge = glow.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const sphereGroup = svg.append('g').attr('transform', `translate(${centerX}, ${centerY})`);

    sphereGroup
      .append('ellipse')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('rx', radius)
      .attr('ry', radius)
      .attr('fill', 'url(#sphereGradient)')
      .attr('stroke', '#4a5568')
      .attr('stroke-width', 2);

    sphereGroup
      .append('ellipse')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('rx', radius)
      .attr('ry', 0)
      .attr('fill', 'none')
      .attr('stroke', '#64ffda')
      .attr('stroke-width', 1)
      .attr('opacity', 0.5)
      .transition()
      .duration(1000)
      .attr('ry', radius * 0.3);

    sphereGroup
      .append('ellipse')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('rx', radius)
      .attr('ry', radius)
      .attr('fill', 'none')
      .attr('stroke', '#64ffda')
      .attr('stroke-width', 1)
      .attr('opacity', 0.3)
      .attr('stroke-dasharray', '5,5');

    const axisLength = radius * 1.2;

    sphereGroup
      .append('line')
      .attr('x1', 0)
      .attr('y1', -axisLength)
      .attr('x2', 0)
      .attr('y2', axisLength)
      .attr('stroke', '#64ffda')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.7);

    sphereGroup
      .append('text')
      .attr('x', 5)
      .attr('y', -axisLength - 10)
      .attr('fill', '#64ffda')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('|0⟩');

    sphereGroup
      .append('text')
      .attr('x', 5)
      .attr('y', axisLength + 20)
      .attr('fill', '#64ffda')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('|1⟩');

    sphereGroup
      .append('line')
      .attr('x1', -axisLength)
      .attr('y1', 0)
      .attr('x2', axisLength)
      .attr('y2', 0)
      .attr('stroke', '#fd79a8')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.7);

    sphereGroup
      .append('text')
      .attr('x', axisLength + 10)
      .attr('y', 5)
      .attr('fill', '#fd79a8')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('X');

    const startX = 0;
    const startY = radius;
    const endX = state.x * radius;
    const endY = -state.z * radius;

    const stateVector = sphereGroup.append('g');

    stateVector
      .append('line')
      .attr('x1', startX)
      .attr('y1', startY)
      .attr('x2', startX)
      .attr('y2', startY)
      .attr('stroke', '#1de9b6')
      .attr('stroke-width', 3)
      .attr('filter', 'url(#glow)')
      .transition()
      .duration(800)
      .attr('x2', endX)
      .attr('y2', endY);

    stateVector
      .append('circle')
      .attr('cx', startX)
      .attr('cy', startY)
      .attr('r', 0)
      .attr('fill', '#1de9b6')
      .attr('filter', 'url(#glow)')
      .transition()
      .duration(800)
      .attr('cx', endX)
      .attr('cy', endY)
      .attr('r', 8);

    const arcPath = d3.arc();
    const angleY = Math.atan2(-state.z, state.x);

    sphereGroup
      .append('path')
      .attr(
        'd',
        arcPath({
          innerRadius: radius * 0.8,
          outerRadius: radius * 0.85,
          startAngle: 0,
          endAngle: angleY,
        } as any)
      )
      .attr('fill', '#fd79a8')
      .attr('opacity', 0.3)
      .attr('transform', `translate(0, 0)`);

    sphereGroup
      .append('text')
      .attr('x', -120)
      .attr('y', height / 2 - 30)
      .attr('fill', '#a0a0a0')
      .attr('font-size', '12px')
      .text(`Qubit q${qubitIndex}`);

    sphereGroup
      .append('text')
      .attr('x', -120)
      .attr('y', height / 2 - 10)
      .attr('fill', '#64ffda')
      .attr('font-size', '11px')
      .text(`X: ${state.x.toFixed(3)}`);

    sphereGroup
      .append('text')
      .attr('x', -120)
      .attr('y', height / 2 + 10)
      .attr('fill', '#fd79a8')
      .attr('font-size', '11px')
      .text(`Y: ${state.y.toFixed(3)}`);

    sphereGroup
      .append('text')
      .attr('x', -120)
      .attr('y', height / 2 + 30)
      .attr('fill', '#a29bfe')
      .attr('font-size', '11px')
      .text(`Z: ${state.z.toFixed(3)}`);
  }, [state, qubitIndex]);

  return (
    <div className="bloch-sphere-container">
      <svg ref={svgRef} width="400" height="400" className="bloch-svg" />
      <div className="bloch-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#1de9b6' }}></span>
          <span>状态向量</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#64ffda' }}></span>
          <span>Z 轴 (|0⟩ → |1⟩)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: '#fd79a8' }}></span>
          <span>X 轴</span>
        </div>
      </div>
    </div>
  );
};

export default BlochSphere;
