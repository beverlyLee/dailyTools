import * as d3 from 'd3';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';

class BarChart {
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
        
        // 绘制柱状
        this.drawBars();
        
        // 添加图例
        this.addLegend();
        
        // 添加标题
        this.addTitle();
    }
    
    prepareData() {
        // 确保数据按x轴排序
        this.data.sort((a, b) => a[this.xKey] - b[this.xKey]);
        
        // 转换为堆叠数据格式
        this.stackData = d3.stack()
            .keys(this.yKeys)(this.data);
    }
    
    createScales() {
        // x轴比例尺
        this.x = d3.scaleBand()
            .domain(this.data.map(d => d[this.xKey]))
            .range([0, this.innerWidth])
            .padding(0.2);
        
        // y轴比例尺
        const maxY = d3.max(this.stackData, d => d3.max(d, d => d[1]));
        
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
            .call(d3.axisBottom(this.x).tickFormat(d3.format('d')))
            .selectAll('text')
            .attr('transform', 'rotate(-45)')
            .style('text-anchor', 'end')
            .style('font-size', '10px');
        
        // y轴
        this.yAxis = this.g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(this.y));
    }
    
    drawBars() {
        // 绘制堆叠柱状
        const groups = this.zoomG.selectAll('.bar-group')
            .data(this.stackData)
            .join('g')
            .attr('class', 'bar-group')
            .attr('fill', d => this.color(d.key));
        
        groups.selectAll('rect')
            .data(d => d)
            .join('rect')
            .attr('class', 'bar')
            .attr('x', d => this.x(d.data[this.xKey]))
            .attr('y', d => this.y(d[1]))
            .attr('width', this.x.bandwidth())
            .attr('height', d => this.y(d[0]) - this.y(d[1]))
            .attr('opacity', 0.8)
            .on('mouseover', (event, d) => {
                // 高亮柱状
                d3.select(event.target)
                    .attr('opacity', 1);
                
                // 显示tooltip
                if (this.tooltip) {
                    // 找到对应的yKey
                    const key = this.stackData.find(stack => 
                        stack.some(point => point[0] === d[0] && point[1] === d[1])
                    )?.key;
                    
                    this.tooltip.innerHTML = `
                        <strong>${key}</strong><br>
                        ${this.xKey}: ${d.data[this.xKey]}<br>
                        值: ${(d[1] - d[0]).toFixed(2)}
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
                // 恢复柱状样式
                d3.select(event.target)
                    .attr('opacity', 0.8);
                
                // 隐藏tooltip
                if (this.tooltip) {
                    this.tooltip.style.opacity = '0';
                }
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
            .text('能源消耗柱状图');
    }
    
    handleZoom(event) {
        // 获取缩放变换
        const transform = event.transform;
        
        // 应用缩放变换到缩放组
        this.zoomG.attr('transform', transform);
        
        // 更新坐标轴（柱状图的x轴是分类轴，缩放时需要特殊处理）
        // 这里简单处理，只缩放y轴
        const newY = transform.rescaleY(this.y);
        this.yAxis.call(d3.axisLeft(newY));
    }
}

export default BarChart;
