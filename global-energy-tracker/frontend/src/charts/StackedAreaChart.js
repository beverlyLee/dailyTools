import * as d3 from 'd3';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';

class StackedAreaChart {
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
        
        // 绘制堆叠面积
        this.drawAreas();
        
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
        this.x = d3.scaleLinear()
            .domain(d3.extent(this.data, d => d[this.xKey]))
            .range([0, this.innerWidth]);
        
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
            .call(d3.axisBottom(this.x).tickFormat(d3.format('d')));
        
        // y轴
        this.yAxis = this.g.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(this.y));
    }
    
    drawAreas() {
        // 创建面积生成器
        const area = d3.area()
            .x(d => this.x(d.data[this.xKey]))
            .y0(d => this.y(d[0]))
            .y1(d => this.y(d[1]))
            .curve(d3.curveMonotoneX);
        
        // 绘制堆叠面积
        const areas = this.zoomG.selectAll('.area')
            .data(this.stackData)
            .join('g')
            .attr('class', 'area');
        
        areas.append('path')
            .attr('d', area)
            .attr('fill', d => this.color(d.key))
            .attr('opacity', 0.6)
            .on('mouseover', (event, d) => {
                // 高亮面积
                d3.select(event.target)
                    .attr('opacity', 0.9);
                
                // 显示tooltip
                if (this.tooltip) {
                    this.tooltip.innerHTML = `
                        <strong>${d.key}</strong><br>
                        鼠标悬停查看详细数据
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
                // 恢复面积样式
                d3.select(event.target)
                    .attr('opacity', 0.6);
                
                // 隐藏tooltip
                if (this.tooltip) {
                    this.tooltip.style.opacity = '0';
                }
            });
        
        // 添加悬停线以显示详细数据
        this.addHoverLine();
    }
    
    addHoverLine() {
        // 创建悬停线组
        const hoverGroup = this.zoomG.append('g')
            .attr('class', 'hover-group')
            .style('opacity', 0);
        
        // 垂直悬停线
        hoverGroup.append('line')
            .attr('class', 'hover-line')
            .attr('y1', 0)
            .attr('y2', this.innerHeight)
            .attr('stroke', '#000')
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '5,5');
        
        // 创建透明的鼠标捕获区域
        this.zoomG.append('rect')
            .attr('class', 'mouse-capture')
            .attr('width', this.innerWidth)
            .attr('height', this.innerHeight)
            .attr('fill', 'none')
            .attr('pointer-events', 'all')
            .on('mouseover', () => {
                hoverGroup.style('opacity', 1);
            })
            .on('mouseout', () => {
                hoverGroup.style('opacity', 0);
                
                // 隐藏tooltip
                if (this.tooltip) {
                    this.tooltip.style.opacity = '0';
                }
            })
            .on('mousemove', (event) => {
                // 获取鼠标位置
                const [mouseX] = d3.pointer(event);
                
                // 反转获取x值
                const xValue = this.x.invert(mouseX);
                
                // 找到最接近的x值
                const closestData = this.data.reduce((prev, curr) => {
                    return Math.abs(curr[this.xKey] - xValue) < Math.abs(prev[this.xKey] - xValue) ? curr : prev;
                });
                
                // 更新悬停线位置
                const xPos = this.x(closestData[this.xKey]);
                hoverGroup.select('.hover-line')
                    .attr('x1', xPos)
                    .attr('x2', xPos);
                
                // 显示tooltip
                if (this.tooltip) {
                    let tooltipContent = `<strong>${this.xKey}: ${closestData[this.xKey]}</strong><br>`;
                    
                    this.yKeys.forEach(key => {
                        tooltipContent += `${key}: ${closestData[key].toFixed(2)}<br>`;
                    });
                    
                    this.tooltip.innerHTML = tooltipContent;
                    this.tooltip.style.opacity = '1';
                    this.tooltip.style.left = (event.pageX + 10) + 'px';
                    this.tooltip.style.top = (event.pageY - 10) + 'px';
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
            .text('能源消耗堆叠面积图');
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

export default StackedAreaChart;
