import * as d3 from 'd3';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';

class LineChart {
    constructor(options) {
        this.container = options.container;
        this.width = options.width;
        this.height = options.height;
        this.margin = options.margin || {top: 20, right: 30, bottom: 30, left: 40};
        this.data = options.data;
        this.xKey = options.xKey;
        this.yKeys = options.yKeys;
        this.colors = options.colors || d3.schemeCategory10;
        this.tooltip = options.tooltip;
        
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;
    }
    
    render() {
        // 清除容器内容
        d3.select(this.container).selectAll('*').remove();
        
        // 创建SVG
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);
        
        // 创建主组
        this.g = this.svg.append('g')
            .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        
        // 创建缩放行为
        this.zoom = d3Zoom()
            .scaleExtent([1, 10])
            .translateExtent([[0, 0], [this.innerWidth, this.innerHeight]])
            .on('zoom', (event) => this.handleZoom(event));
        
        // 创建缩放组
        this.zoomG = this.g.append('g')
            .attr('class', 'zoom-group');
        
        // 应用缩放行为
        this.svg.call(this.zoom);
        
        // 准备数据
        this.prepareData();
        
        // 创建比例尺
        this.createScales();
        
        // 绘制坐标轴
        this.drawAxes();
        
        // 绘制折线
        this.drawLines();
        
        // 绘制数据点
        this.drawPoints();
        
        // 添加图例
        this.addLegend();
        
        // 添加标题
        this.addTitle();
    }
    
    prepareData() {
        // 确保数据按x轴排序
        this.data.sort((a, b) => a[this.xKey] - b[this.xKey]);
    }
    
    createScales() {
        // x轴比例尺
        this.x = d3.scaleLinear()
            .domain(d3.extent(this.data, d => d[this.xKey]))
            .range([0, this.innerWidth]);
        
        // y轴比例尺
        const maxY = d3.max(this.data, d => 
            d3.max(this.yKeys, key => d[key])
        );
        
        this.y = d3.scaleLinear()
            .domain([0, maxY * 1.1])
            .range([this.innerHeight, 0]);
        
        // 颜色比例尺
        this.color = d3.scaleOrdinal()
            .domain(this.yKeys)
            .range(this.colors);
    }
    
    drawAxes() {
        // x轴
        this.xAxis = this.g.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${this.innerHeight})`)
            .call(d3.axisBottom(this.x).tickFormat(d3.format('d')));
        
        // y轴
        this.yAxis = this.g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(this.y));
    }
    
    drawLines() {
        const line = d3.line()
            .x(d => this.x(d[this.xKey]))
            .y(d => this.y(d.value))
            .curve(d3.curveMonotoneX);
        
        // 为每个yKey创建一条线
        this.yKeys.forEach(key => {
            const lineData = this.data.map(d => ({
                [this.xKey]: d[this.xKey],
                value: d[key]
            }));
            
            this.zoomG.append('path')
                .datum(lineData)
                .attr('class', `line-${key.replace(/\s+/g, '-')}`)
                .attr('fill', 'none')
                .attr('stroke', this.color(key))
                .attr('stroke-width', 2)
                .attr('d', line)
                .attr('opacity', 0.8);
        });
    }
    
    drawPoints() {
        // 为每个yKey创建数据点
        this.yKeys.forEach(key => {
            this.zoomG.selectAll(`.point-${key.replace(/\s+/g, '-')}`)
                .data(this.data)
                .join('circle')
                .attr('class', `point-${key.replace(/\s+/g, '-')}`)
                .attr('cx', d => this.x(d[this.xKey]))
                .attr('cy', d => this.y(d[key]))
                .attr('r', 3)
                .attr('fill', this.color(key))
                .attr('opacity', 0)
                .on('mouseover', (event, d) => {
                    // 高亮数据点
                    d3.select(event.target)
                        .attr('opacity', 1)
                        .attr('r', 5);
                    
                    // 显示tooltip
                    if (this.tooltip) {
                        this.tooltip.innerHTML = `
                            <strong>${key}</strong><br>
                            ${this.xKey}: ${d[this.xKey]}<br>
                            值: ${d[key].toFixed(2)}
                        `;
                        this.tooltip.style.opacity = '1';
                        this.tooltip.style.left = (event.pageX + 10) + 'px';
                        this.tooltip.style.top = (event.pageY - 10) + 'px';
                    }
                })
                .on('mousemove', (event) => {
                    // 移动tooltip
                    if (this.tooltip) {
                        this.tooltip.style.left = (event.pageX + 10) + 'px';
                        this.tooltip.style.top = (event.pageY - 10) + 'px';
                    }
                })
                .on('mouseout', (event) => {
                    // 恢复数据点样式
                    d3.select(event.target)
                        .attr('opacity', 0)
                        .attr('r', 3);
                    
                    // 隐藏tooltip
                    if (this.tooltip) {
                        this.tooltip.style.opacity = '0';
                    }
                });
        });
    }
    
    addLegend() {
        const legend = this.g.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.innerWidth - 150}, 10)`);
        
        this.yKeys.forEach((key, i) => {
            const legendRow = legend.append('g')
                .attr('transform', `translate(0, ${i * 20})`);
            
            legendRow.append('rect')
                .attr('width', 10)
                .attr('height', 10)
                .attr('fill', this.color(key));
            
            legendRow.append('text')
                .attr('x', 15)
                .attr('y', 8)
                .text(key)
                .style('font-size', '10px');
        });
    }
    
    addTitle() {
        this.g.append('text')
            .attr('class', 'chart-title')
            .attr('x', this.innerWidth / 2)
            .attr('y', -10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('能源消耗趋势');
    }
    
    handleZoom(event) {
        // 获取缩放变换
        const transform = event.transform;
        
        // 应用缩放变换到缩放组
        this.zoomG.attr('transform', transform);
        
        // 更新坐标轴
        const newX = transform.rescaleX(this.x);
        const newY = transform.rescaleY(this.y);
        
        this.xAxis.call(d3.axisBottom(newX).tickFormat(d3.format('d')));
        this.yAxis.call(d3.axisLeft(newY));
    }
}

export default LineChart;
