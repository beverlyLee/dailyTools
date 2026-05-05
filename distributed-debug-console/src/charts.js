import * as d3 from 'd3';

export class GanttChart {
  constructor(container) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    this.margin = { top: 20, right: 40, bottom: 40, left: 150 };
    this.tooltip = null;
  }

  render(data) {
    if (!data || !data.spans || data.spans.length === 0) {
      this.container.innerHTML = '<div class="empty-state">暂无数据</div>';
      return;
    }

    this.container.innerHTML = '';
    
    const width = this.container.clientWidth - this.margin.left - this.margin.right;
    const rowHeight = 35;
    const height = data.spans.length * rowHeight + this.margin.top + this.margin.bottom;

    const svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.container.clientWidth)
      .attr('height', height);

    this.createTooltip();

    const x = d3.scaleLinear()
      .domain([0, data.total_duration_ms])
      .range([0, width]);

    const y = d3.scaleBand()
      .domain(data.spans.map(d => d.id))
      .range([this.margin.top, height - this.margin.bottom])
      .padding(0.1);

    const criticalPathSet = new Set(data.critical_path);
    const slowSpansSet = new Set(data.slow_spans);
    const errorSpansSet = new Set(data.error_spans);

    const getColor = (span) => {
      if (errorSpansSet.has(span.id)) return '#ef4444';
      if (criticalPathSet.has(span.id)) return '#8b5cf6';
      if (slowSpansSet.has(span.id) || span.is_slow) return '#f59e0b';
      return '#3b82f6';
    };

    const g = svg.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height - this.margin.top - this.margin.bottom})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat(d => this.formatMs(d)))
      .selectAll('text')
      .attr('fill', '#a0a0a0');

    g.selectAll('.domain, .tick line')
      .attr('stroke', '#2d3748');

    g.selectAll('.gantt-bar')
      .data(data.spans)
      .enter()
      .append('rect')
      .attr('class', 'gantt-bar')
      .attr('x', d => x(d.start_ms))
      .attr('y', d => y(d.id))
      .attr('width', d => Math.max(x(d.start_ms + d.duration_ms) - x(d.start_ms), 2))
      .attr('height', y.bandwidth())
      .attr('fill', d => getColor(d))
      .attr('rx', 3)
      .on('mouseenter', (event, d) => this.showTooltip(event, d))
      .on('mouseleave', () => this.hideTooltip());

    g.selectAll('.gantt-label')
      .data(data.spans)
      .enter()
      .append('text')
      .attr('class', 'gantt-label')
      .attr('x', -10)
      .attr('y', d => y(d.id) + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', '#eaeaea')
      .attr('font-size', '11px')
      .text(d => `${d.label} (${d.service})`);

    if (data.critical_path.length > 1) {
      const criticalSpans = data.spans.filter(s => criticalPathSet.has(s.id));
      
      svg.append('defs')
        .append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 5)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .append('path')
        .attr('d', 'M 0,-5 L 10,0 L 0,5')
        .attr('fill', '#8b5cf6');
    }
  }

  formatMs(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  createTooltip() {
    if (this.tooltip) return;
    
    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);
  }

  showTooltip(event, span) {
    if (!this.tooltip) return;
    
    const html = `
      <div><strong>${span.label}</strong></div>
      <div>服务: ${span.service}</div>
      <div>开始: ${span.start_ms}ms</div>
      <div>耗时: ${span.duration_ms}ms</div>
      <div>状态: ${span.status}</div>
      ${span.is_slow ? '<div style="color:#f59e0b">⚠️ 延迟过高</div>' : ''}
      ${span.status === 'Error' ? '<div style="color:#ef4444">❌ 错误</div>' : ''}
    `;
    
    this.tooltip
      .html(html)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .style('opacity', 1);
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style('opacity', 0);
    }
  }

  destroy() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }
}

export class HeatmapChart {
  constructor(container) {
    this.container = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    this.margin = { top: 50, right: 20, bottom: 100, left: 120 };
    this.tooltip = null;
  }

  render(data) {
    if (!data || data.length === 0) {
      this.container.innerHTML = '<div class="empty-state">暂无热力图数据</div>';
      return;
    }

    this.container.innerHTML = '';
    
    const width = this.container.clientWidth - this.margin.left - this.margin.right;
    const height = this.container.clientHeight - this.margin.top - this.margin.bottom;

    const svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.container.clientWidth)
      .attr('height', this.container.clientHeight);

    this.createTooltip();

    const timeBuckets = [...new Set(data.map(d => d.time_bucket))].sort();
    const nodes = [...new Set(data.map(d => d.node))].sort();

    const dataMap = new Map();
    data.forEach(d => {
      const key = `${d.time_bucket}|${d.node}`;
      dataMap.set(key, d);
    });

    const x = d3.scaleBand()
      .domain(timeBuckets)
      .range([0, width])
      .padding(0.05);

    const y = d3.scaleBand()
      .domain(nodes)
      .range([0, height])
      .padding(0.05);

    const maxValue = d3.max(data, d => d.error_count + d.warn_count) || 1;
    
    const color = d3.scaleSequential()
      .domain([0, maxValue])
      .interpolator(d3.interpolateReds);

    const g = svg.append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('fill', '#a0a0a0')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    g.selectAll('.domain, .tick line')
      .attr('stroke', '#2d3748');

    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .attr('fill', '#a0a0a0');

    g.selectAll('.domain, .tick line')
      .attr('stroke', '#2d3748');

    const rects = g.selectAll('.heatmap-cell')
      .data(timeBuckets.flatMap(tb => nodes.map(n => ({ time_bucket: tb, node: n }))))
      .enter()
      .append('rect')
      .attr('class', 'heatmap-cell')
      .attr('x', d => x(d.time_bucket))
      .attr('y', d => y(d.node))
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('fill', d => {
        const key = `${d.time_bucket}|${d.node}`;
        const data = dataMap.get(key);
        if (!data) return '#1a1a2e';
        const value = data.error_count + data.warn_count;
        return value === 0 ? '#1a1a2e' : color(value);
      })
      .attr('rx', 2)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        const key = `${d.time_bucket}|${d.node}`;
        const data = dataMap.get(key);
        this.showTooltip(event, data || { 
          time_bucket: d.time_bucket, 
          node: d.node, 
          error_count: 0, 
          warn_count: 0,
          total_count: 0 
        });
      })
      .on('mouseleave', () => this.hideTooltip());
  }

  createTooltip() {
    if (this.tooltip) return;
    
    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);
  }

  showTooltip(event, data) {
    if (!this.tooltip) return;
    
    const html = `
      <div><strong>时间:</strong> ${data.time_bucket}</div>
      <div><strong>节点:</strong> ${data.node}</div>
      <div><strong>错误数:</strong> <span style="color:#ef4444">${data.error_count}</span></div>
      <div><strong>警告数:</strong> <span style="color:#fbbf24">${data.warn_count}</span></div>
      <div><strong>总数:</strong> ${data.total_count}</div>
    `;
    
    this.tooltip
      .html(html)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .style('opacity', 1);
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style('opacity', 0);
    }
  }

  destroy() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }
}
