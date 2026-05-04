import * as d3 from 'd3';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';

class PieChart {
    constructor(options) {
        this.container = options.container;
        this.width = options.width;
        this.height = options.height;
        this.margin = options.margin || {top: 20, right: 30, bottom: 30, left: 40};
        this.data = options.data;
        this.nameKey = options.nameKey;
        this.valueKey = options.valueKey;
        this.colors = options.colors || d3.schemeCategory10;
        this.tooltip = options.tooltip;
        
        this.innerWidth = this.width - this.margin.left - this.margin.right;
        this.innerHeight = this.height - this.margin.top - this.margin.bottom;
        this.radius = Math.min(this.innerWidth, this.innerHeight) / 2;
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
            .attr('transform', `translate(${this.margin.left + this.innerWidth/2},${this.margin.top + this.innerHeight/2})`);
        
        // 创建缩放行为（饼图的缩放主要用于查看细节）
        this.zoom = d3Zoom()
            .scaleExtent([1, 5])
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
        
        // 绘制饼图
        this.drawPie();
        
        // 添加图例
        this.addLegend();
        
        // 添加标题
        this.addTitle();
    }
    
    prepareData() {
        // 按值排序
        this.data.sort((a, b) => b[this.valueKey] - a[this.valueKey]);
        
        // 计算总和
        this.total = d3.sum(this.data, d => d[this.valueKey]);
        
        // 创建饼图生成器
        this.pie = d3.pie()
            .value(d => d[this.valueKey])
            .sort(null);
        
        // 创建弧生成器
        this.arc = d3.arc()
            .innerRadius(0)
            .outerRadius(this.radius - 20);
        
        // 创建悬停时的弧生成器
        this.arcHover = d3.arc()
            .innerRadius(0)
            .outerRadius(this.radius - 10);
    }
    
    createScales() {
        // 颜色比例尺
        this.color = d3.scaleOrdinal()
            .domain(this.data.map(d => d[this.nameKey]))
            .range(this.colors);
    }
    
    drawPie() {
        // 生成饼图数据
        const pieData = this.pie(this.data);
        
        // 绘制扇形
        const arcs = this.zoomG.selectAll('.arc')
            .data(pieData)
            .join('g')
            .attr('class', 'arc');
        
        arcs.append('path')
            .attr('d', this.arc)
            .attr('fill', d => this.color(d.data[this.nameKey]))
            .attr('opacity', 0.8)
            .on('mouseover', (event, d) => {
                // 高亮扇形
                d3.select(event.target)
                    .transition()
                    .duration(200)
                    .attr('d', this.arcHover)
                    .attr('opacity', 1);
                
                // 显示tooltip
                if (this.tooltip) {
                    const percentage = (d.data[this.valueKey] / this.total * 100).toFixed(2);
                    this.tooltip.innerHTML = `
                        <strong>${d.data[this.nameKey]}</strong><br>
                        值: ${d.data[this.valueKey].toFixed(2)}<br>
                        占比: ${percentage}%
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
            .on('mouseout', (event, d) => {
                // 恢复扇形样式
                d3.select(event.target)
                    .transition()
                    .duration(200)
                    .attr('d', this.arc)
                    .attr('opacity', 0.8);
                
                // 隐藏tooltip
                if (this.tooltip) {
                    this.tooltip.style.opacity = '0';
                }
            });
        
        // 添加标签
        arcs.append('text')
            .attr('transform', d => `translate(${this.arc.centroid(d)})`)
            .attr('text-anchor', 'middle')
            .style('font-size', '10px')
            .style('fill', 'white')
            .style('font-weight', 'bold')
            .text(d => {
                const percentage = (d.data[this.valueKey] / this.total * 100).toFixed(1);
                return percentage > 5 ? `${percentage}%` : '';
            });
    }
    
    addLegend() {
        const legend = this.g.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${this.radius + 30}, -${this.radius})`);
        
        this.data.forEach((item, i) => {
            const legendRow = legend.append('g')
                .attr('transform', `translate(0, ${i * 20})`);
            
            legendRow.append('rect')
                .attr('width', 10)
                .attr('height', 10)
                .attr('fill', this.color(item[this.nameKey]));
            
            legendRow.append('text')
                .attr('x', 15)
                .attr('y', 8)
                .text(item[this.nameKey])
                .style('font-size', '10px');
        });
    }
    
    addTitle() {
        this.g.append('text')
            .attr('class', 'chart-title')
            .attr('x', 0)
            .attr('y', -this.radius - 10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .text('能源结构饼图');
    }
    
    handleZoom(event) {
        // 获取缩放变换
        const transform = event.transform;
        
        // 应用缩放变换到缩放组
        this.zoomG.attr('transform', transform);
    }
}

export default PieChart;
