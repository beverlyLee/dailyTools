import * as d3 from 'd3';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import './styles.css';

// 导入图表组件
import LineChart from './charts/LineChart';
import BarChart from './charts/BarChart';
import PieChart from './charts/PieChart';
import StackedAreaChart from './charts/StackedAreaChart';

// 中英文映射
const translations = {
    // 能源类型
    'Oil': '石油',
    'Natural Gas': '天然气',
    'Coal': '煤炭',
    'Nuclear': '核能',
    'Renewables': '可再生能源',
    
    // 可再生能源类型
    'Solar': '太阳能',
    'Wind': '风能',
    'Hydro': '水能',
    'Biomass': '生物质能',
    'Geothermal': '地热能',
    
    // 国家
    'China': '中国',
    'United States': '美国',
    'India': '印度',
    'Russia': '俄罗斯',
    'Japan': '日本',
    'Germany': '德国',
    'Brazil': '巴西',
    'Canada': '加拿大',
    'France': '法国',
    'United Kingdom': '英国',
    'Italy': '意大利',
    
    // 图表类型
    'line': '趋势折线图',
    'bar': '能源消耗柱状图',
    'pie': '能源结构饼图',
    'stacked': '堆叠面积图',
    
    // 数据源
    'bp': 'BP能源统计',
    'eia': 'EIA能源统计'
};

// 图表颜色配置
const chartColors = {
    'Oil': '#ef4444',
    'Natural Gas': '#3b82f6',
    'Coal': '#374151',
    'Nuclear': '#8b5cf6',
    'Renewables': '#10b981'
};

// 全局状态
let currentData = null;
let currentChartType = 'line';
let currentDataSource = 'bp';
let currentCountry = 'all';
let currentYearRange = [2000, 2022];
let fixedData = null;
let selectedChartElement = null;

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    initializeDateSelectors();
    initializeEventListeners();
    loadData();
});

// 初始化日期选择器
function initializeDateSelectors() {
    const startYearSelect = document.getElementById('start-year');
    const endYearSelect = document.getElementById('end-year');
    
    // 生成年份选项 (2000-2022)
    for (let year = 2000; year <= 2022; year++) {
        const startOption = document.createElement('option');
        startOption.value = year;
        startOption.textContent = year + '年';
        startOption.selected = year === 2000;
        startYearSelect.appendChild(startOption);
        
        const endOption = document.createElement('option');
        endOption.value = year;
        endOption.textContent = year + '年';
        endOption.selected = year === 2022;
        endYearSelect.appendChild(endOption);
    }
    
    // 添加日期验证逻辑
    startYearSelect.addEventListener('change', validateDateRange);
    endYearSelect.addEventListener('change', validateDateRange);
}

// 验证日期范围
function validateDateRange() {
    const startYear = parseInt(document.getElementById('start-year').value);
    const endYear = parseInt(document.getElementById('end-year').value);
    
    // 确保开始年份不大于结束年份
    if (startYear > endYear) {
        // 重置为有效范围
        document.getElementById('start-year').value = currentYearRange[0];
        document.getElementById('end-year').value = currentYearRange[1];
        
        // 显示提示
        showNotification('开始年份不能大于结束年份', 'warning');
        return false;
    }
    
    // 确保年份范围在有效范围内
    if (startYear < 2000 || endYear > 2022) {
        showNotification('年份范围必须在2000-2022之间', 'warning');
        return false;
    }
    
    // 更新当前年份范围
    currentYearRange = [startYear, endYear];
    
    // 更新头部显示
    document.getElementById('header-year-range').textContent = 
        `${currentYearRange[0]}-${currentYearRange[1]}`;
    
    return true;
}

// 显示通知提示
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // 添加样式
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '0.5rem',
        zIndex: '10000',
        animation: 'slideInRight 0.3s ease-out',
        fontWeight: '500'
    });
    
    // 根据类型设置颜色
    const colors = {
        info: { bg: '#dbeafe', text: '#1e40af' },
        success: { bg: '#d1fae5', text: '#065f46' },
        warning: { bg: '#fef3c7', text: '#92400e' },
        error: { bg: '#fee2e2', text: '#991b1b' }
    };
    
    const color = colors[type] || colors.info;
    notification.style.backgroundColor = color.bg;
    notification.style.color = color.text;
    notification.style.border = `1px solid ${color.text}20`;
    
    document.body.appendChild(notification);
    
    // 3秒后移除
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 初始化事件监听器
function initializeEventListeners() {
    // 数据源选择
    document.getElementById('data-source').addEventListener('change', (e) => {
        currentDataSource = e.target.value;
        document.getElementById('header-data-source').textContent = 
            e.target.options[e.target.selectedIndex].text;
        loadData();
    });
    
    // 图表类型选择
    document.getElementById('chart-type').addEventListener('change', (e) => {
        currentChartType = e.target.value;
        renderMainChart();
    });
    
    // 国家/地区筛选
    document.getElementById('country-filter').addEventListener('change', (e) => {
        currentCountry = e.target.value;
        renderMainChart();
        updateStats();
    });
    
    // 开始年份选择
    document.getElementById('start-year').addEventListener('change', () => {
        if (validateDateRange()) {
            renderMainChart();
            renderSecondaryCharts();
            updateStats();
        }
    });
    
    // 结束年份选择
    document.getElementById('end-year').addEventListener('change', () => {
        if (validateDateRange()) {
            renderMainChart();
            renderSecondaryCharts();
            updateStats();
        }
    });
    
    // 刷新按钮
    document.getElementById('refresh-btn').addEventListener('click', () => {
        loadData();
        showNotification('数据已刷新', 'success');
    });
    
    // 重置按钮
    document.getElementById('reset-btn').addEventListener('click', () => {
        resetFilters();
    });
    
    // 关闭固定数据面板
    document.getElementById('close-fixed-panel').addEventListener('click', () => {
        closeFixedDataPanel();
    });
    
    // 点击页面其他地方关闭固定数据展示
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('fixed-data-panel');
        const isInsidePanel = panel.contains(e.target);
        const isChartElement = e.target.closest('.chart') || 
                              e.target.closest('.bar') || 
                              e.target.closest('.point') ||
                              e.target.closest('.arc');
        
        if (!isInsidePanel && !isChartElement && fixedData) {
            closeFixedDataPanel();
        }
    });
}

// 重置筛选条件
function resetFilters() {
    // 重置数据源
    document.getElementById('data-source').value = 'bp';
    currentDataSource = 'bp';
    document.getElementById('header-data-source').textContent = 'BP能源统计';
    
    // 重置图表类型
    document.getElementById('chart-type').value = 'line';
    currentChartType = 'line';
    
    // 重置国家选择
    document.getElementById('country-filter').value = 'all';
    currentCountry = 'all';
    
    // 重置年份范围
    document.getElementById('start-year').value = 2000;
    document.getElementById('end-year').value = 2022;
    currentYearRange = [2000, 2022];
    document.getElementById('header-year-range').textContent = '2000-2022';
    
    // 关闭固定数据面板
    closeFixedDataPanel();
    
    // 重新加载数据
    loadData();
    
    showNotification('筛选条件已重置', 'info');
}

// 关闭固定数据面板
function closeFixedDataPanel() {
    const panel = document.getElementById('fixed-data-panel');
    panel.classList.add('hidden');
    fixedData = null;
    
    // 移除选中状态
    if (selectedChartElement) {
        selectedChartElement.classList.remove('selected');
        selectedChartElement = null;
    }
}

// 加载数据
function loadData() {
    // 显示加载状态
    showLoading();
    
    // 模拟从后端加载数据
    setTimeout(() => {
        currentData = generateSampleData();
        hideLoading();
        
        // 渲染图表
        renderMainChart();
        renderSecondaryCharts();
        updateStats();
    }, 500);
}

// 生成示例数据（模拟从后端获取的数据）
function generateSampleData() {
    const years = Array.from({length: 23}, (_, i) => 2000 + i);
    const countries = ['China', 'United States', 'India', 'Russia', 'Japan', 'Germany', 'Brazil', 'Canada', 'France'];
    const energyTypes = ['Oil', 'Natural Gas', 'Coal', 'Nuclear', 'Renewables'];
    
    const data = [];
    
    // 基础数据（2000年）
    const baseData = {
        'China': {'Oil': 200, 'Natural Gas': 30, 'Coal': 500, 'Nuclear': 5, 'Renewables': 20},
        'United States': {'Oil': 350, 'Natural Gas': 250, 'Coal': 200, 'Nuclear': 30, 'Renewables': 30},
        'India': {'Oil': 80, 'Natural Gas': 20, 'Coal': 150, 'Nuclear': 3, 'Renewables': 15},
        'Russia': {'Oil': 120, 'Natural Gas': 150, 'Coal': 80, 'Nuclear': 10, 'Renewables': 10},
        'Japan': {'Oil': 200, 'Natural Gas': 80, 'Coal': 100, 'Nuclear': 25, 'Renewables': 10},
        'Germany': {'Oil': 120, 'Natural Gas': 70, 'Coal': 80, 'Nuclear': 15, 'Renewables': 15},
        'Brazil': {'Oil': 80, 'Natural Gas': 10, 'Coal': 20, 'Nuclear': 2, 'Renewables': 25},
        'Canada': {'Oil': 80, 'Natural Gas': 60, 'Coal': 30, 'Nuclear': 5, 'Renewables': 20},
        'France': {'Oil': 90, 'Natural Gas': 40, 'Coal': 20, 'Nuclear': 40, 'Renewables': 15}
    };
    
    // 生成各年份数据
    years.forEach(year => {
        countries.forEach(country => {
            energyTypes.forEach(energyType => {
                const baseValue = baseData[country][energyType];
                
                // 计算年度增长因子
                let growthFactor;
                if (energyType === 'Renewables') {
                    // 可再生能源增长更快
                    growthFactor = 1 + (year - 2000) * 0.05;
                } else if (energyType === 'Coal') {
                    // 煤炭增长较慢，后期甚至下降
                    if (year < 2010) {
                        growthFactor = 1 + (year - 2000) * 0.02;
                    } else {
                        growthFactor = 1 + (2010 - 2000) * 0.02 - (year - 2010) * 0.01;
                    }
                } else {
                    // 其他能源类型正常增长
                    growthFactor = 1 + (year - 2000) * 0.02;
                }
                
                // 添加随机噪声
                const noise = 1 + (Math.random() - 0.5) * 0.1;
                
                const value = Math.max(0, baseValue * growthFactor * noise);
                
                data.push({
                    Year: year,
                    Country: country,
                    Energy_Type: energyType,
                    Value: value,
                    Unit: 'Million Tonnes of Oil Equivalent'
                });
            });
        });
    });
    
    return data;
}

// 显示加载状态
function showLoading() {
    const charts = document.querySelectorAll('.chart');
    charts.forEach(chart => {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="loading-spinner"></div>';
        chart.style.position = 'relative';
        chart.appendChild(overlay);
    });
}

// 隐藏加载状态
function hideLoading() {
    const overlays = document.querySelectorAll('.loading-overlay');
    overlays.forEach(overlay => overlay.remove());
}

// 渲染主图表
function renderMainChart() {
    if (!currentData) return;
    
    // 过滤数据
    let filteredData = currentData.filter(d => 
        d.Year >= currentYearRange[0] && d.Year <= currentYearRange[1]
    );
    
    if (currentCountry !== 'all') {
        filteredData = filteredData.filter(d => d.Country === currentCountry);
    }
    
    // 清空图表容器
    const mainChartContainer = document.getElementById('main-chart');
    mainChartContainer.innerHTML = '';
    
    // 更新图表标题
    updateChartTitle();
    
    // 更新图例
    updateLegend();
    
    // 根据图表类型渲染不同的图表
    switch (currentChartType) {
        case 'line':
            renderLineChart(filteredData);
            break;
        case 'bar':
            renderBarChart(filteredData);
            break;
        case 'pie':
            renderPieChart(filteredData);
            break;
        case 'stacked':
            renderStackedAreaChart(filteredData);
            break;
        default:
            renderLineChart(filteredData);
    }
}

// 更新图表标题
function updateChartTitle() {
    const titles = {
        'line': '能源消耗趋势分析',
        'bar': '能源消耗柱状图',
        'pie': '能源结构分布',
        'stacked': '能源结构变化趋势'
    };
    
    const subtitles = {
        'line': '各能源类型年度消耗趋势变化',
        'bar': '各年份能源消耗详细数据',
        'pie': '当前年份范围能源类型占比',
        'stacked': '各能源类型占比变化趋势'
    };
    
    document.getElementById('main-chart-title').textContent = titles[currentChartType];
    document.getElementById('main-chart-subtitle').textContent = subtitles[currentChartType];
}

// 更新图例
function updateLegend() {
    const legendContainer = document.getElementById('chart-legend');
    legendContainer.innerHTML = '';
    
    const energyTypes = ['Oil', 'Natural Gas', 'Coal', 'Nuclear', 'Renewables'];
    
    energyTypes.forEach(type => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        
        const colorDiv = document.createElement('div');
        colorDiv.className = 'legend-color';
        colorDiv.style.backgroundColor = chartColors[type];
        
        const labelSpan = document.createElement('span');
        labelSpan.textContent = translations[type] || type;
        
        legendItem.appendChild(colorDiv);
        legendItem.appendChild(labelSpan);
        legendContainer.appendChild(legendItem);
    });
}

// 渲染折线图
function renderLineChart(data) {
    const container = document.getElementById('main-chart');
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = {top: 40, right: 30, bottom: 50, left: 60};
    
    // 准备数据 - 按年份和能源类型聚合
    const aggregatedData = d3.rollup(
        data,
        v => d3.sum(v, d => d.Value),
        d => d.Year,
        d => d.Energy_Type
    );
    
    // 转换为数组格式
    const chartData = Array.from(aggregatedData, ([year, types]) => {
        const obj = {Year: year};
        types.forEach((value, type) => {
            obj[type] = value;
        });
        return obj;
    }).sort((a, b) => a.Year - b.Year);
    
    // 创建SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // 比例尺
    const x = d3.scaleLinear()
        .domain(d3.extent(chartData, d => d.Year))
        .range([0, innerWidth]);
    
    const energyTypes = ['Oil', 'Natural Gas', 'Coal', 'Nuclear', 'Renewables'];
    const maxY = d3.max(chartData, d => d3.max(energyTypes, key => d[key]));
    
    const y = d3.scaleLinear()
        .domain([0, maxY * 1.1])
        .range([innerHeight, 0]);
    
    // 绘制网格线
    g.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(y)
            .tickSize(-innerWidth)
            .tickFormat(''));
    
    // 绘制坐标轴
    g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('d')))
        .style('font-size', '11px');
    
    g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y).ticks(5))
        .style('font-size', '11px');
    
    // 创建提示框
    const tooltip = document.getElementById('chart-tooltip');
    
    // 绘制折线和数据点
    energyTypes.forEach((type, index) => {
        const lineData = chartData.filter(d => d[type] !== undefined);
        
        if (lineData.length === 0) return;
        
        const line = d3.line()
            .x(d => x(d.Year))
            .y(d => y(d[type]))
            .curve(d3.curveMonotoneX);
        
        // 绘制折线
        const path = g.append('path')
            .datum(lineData)
            .attr('fill', 'none')
            .attr('stroke', chartColors[type])
            .attr('stroke-width', 2.5)
            .attr('d', line)
            .attr('opacity', 0.8)
            .attr('class', `chart-element line-${type.replace(/\s+/g, '-')}`);
        
        // 添加动画效果
        const totalLength = path.node().getTotalLength();
        path.attr('stroke-dasharray', totalLength)
            .attr('stroke-dashoffset', totalLength)
            .transition()
            .duration(1000)
            .delay(index * 200)
            .attr('stroke-dashoffset', 0);
        
        // 绘制数据点
        g.selectAll(`.point-${type.replace(/\s+/g, '-')}`)
            .data(lineData)
            .join('circle')
            .attr('class', `chart-element point-${type.replace(/\s+/g, '-')}`)
            .attr('cx', d => x(d.Year))
            .attr('cy', d => y(d[type]))
            .attr('r', 5)
            .attr('fill', chartColors[type])
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('opacity', 0)
            .on('mouseover', function(event, d) {
                // 高亮当前点
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 8)
                    .attr('opacity', 1);
                
                // 高亮对应的线
                g.selectAll(`.line-${type.replace(/\s+/g, '-')}`)
                    .transition()
                    .duration(200)
                    .attr('stroke-width', 4)
                    .attr('opacity', 1);
                
                // 其他线变暗
                g.selectAll('.chart-element')
                    .filter(function() {
                        return !this.classList.contains(`line-${type.replace(/\s+/g, '-')}`) &&
                               !this.classList.contains(`point-${type.replace(/\s+/g, '-')}`);
                    })
                    .transition()
                    .duration(200)
                    .attr('opacity', 0.3);
                
                // 显示tooltip
                showTooltip(tooltip, event, {
                    title: translations[type] || type,
                    items: [
                        { label: '年份', value: d.Year + '年' },
                        { label: '消耗量', value: d[type].toFixed(2) + ' 百万吨油当量' }
                    ]
                });
            })
            .on('mousemove', function(event) {
                moveTooltip(tooltip, event);
            })
            .on('mouseout', function(event, d) {
                // 恢复当前点样式
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 5)
                    .attr('opacity', 0);
                
                // 恢复所有线的样式
                g.selectAll('.chart-element')
                    .transition()
                    .duration(200)
                    .attr('stroke-width', function() {
                        return this.classList.contains('line') ? 2.5 : null;
                    })
                    .attr('opacity', function() {
                        return this.classList.contains('line') ? 0.8 : 0;
                    });
                
                // 隐藏tooltip
                hideTooltip(tooltip);
            })
            .on('click', function(event, d) {
                // 点击固定数据展示
                event.stopPropagation();
                
                // 移除之前的选中状态
                if (selectedChartElement) {
                    selectedChartElement.classList.remove('selected');
                }
                
                // 添加选中状态
                this.classList.add('selected');
                selectedChartElement = this;
                
                // 显示固定数据面板
                showFixedData({
                    type: type,
                    year: d.Year,
                    value: d[type],
                    country: currentCountry === 'all' ? '全部国家' : (translations[currentCountry] || currentCountry),
                    dataRange: currentYearRange
                });
            });
        
        // 延迟显示数据点
        g.selectAll(`.point-${type.replace(/\s+/g, '-')}`)
            .transition()
            .duration(300)
            .delay(1000 + index * 200)
            .attr('opacity', 0.8);
    });
}

// 渲染柱状图（带数据标注）
function renderBarChart(data) {
    const container = document.getElementById('main-chart');
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = {top: 40, right: 30, bottom: 70, left: 60};
    
    // 准备数据 - 按年份和能源类型聚合
    const aggregatedData = d3.rollup(
        data,
        v => d3.sum(v, d => d.Value),
        d => d.Year,
        d => d.Energy_Type
    );
    
    // 转换为数组格式
    const chartData = Array.from(aggregatedData, ([year, types]) => {
        const obj = {Year: year};
        types.forEach((value, type) => {
            obj[type] = value;
        });
        return obj;
    }).sort((a, b) => a.Year - b.Year);
    
    // 创建堆叠数据
    const energyTypes = ['Oil', 'Natural Gas', 'Coal', 'Nuclear', 'Renewables'];
    const stack = d3.stack().keys(energyTypes)(chartData);
    
    // 创建SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // 比例尺
    const x = d3.scaleBand()
        .domain(chartData.map(d => d.Year))
        .range([0, innerWidth])
        .padding(0.2);
    
    const maxY = d3.max(stack, d => d3.max(d, d => d[1]));
    const y = d3.scaleLinear()
        .domain([0, maxY * 1.15])  // 增加顶部空间用于数据标签
        .range([innerHeight, 0]);
    
    // 绘制网格线
    g.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(y)
            .tickSize(-innerWidth)
            .tickFormat(''));
    
    // 绘制坐标轴
    g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('d')))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '11px');
    
    g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y).ticks(5))
        .style('font-size', '11px');
    
    // 创建提示框
    const tooltip = document.getElementById('chart-tooltip');
    
    // 绘制堆叠柱状
    const groups = g.selectAll('.bar-group')
        .data(stack)
        .join('g')
        .attr('class', 'bar-group')
        .attr('fill', d => chartColors[d.key]);
    
    groups.selectAll('rect')
        .data(d => d)
        .join('rect')
        .attr('class', 'chart-element bar')
        .attr('x', d => x(d.data.Year))
        .attr('y', innerHeight)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('opacity', 0.85)
        .on('mouseover', function(event, d) {
            // 高亮当前柱子
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 1);
            
            // 其他柱子变暗
            groups.selectAll('rect')
                .filter(function() {
                    return this !== event.target;
                })
                .transition()
                .duration(200)
                .attr('opacity', 0.4);
            
            // 找到对应的能源类型
            const key = stack.find(s => 
                s.some(point => point[0] === d[0] && point[1] === d[1])
            )?.key;
            
            // 显示tooltip
            showTooltip(tooltip, event, {
                title: translations[key] || key,
                items: [
                    { label: '年份', value: d.data.Year + '年' },
                    { label: '消耗量', value: (d[1] - d[0]).toFixed(2) + ' 百万吨油当量' },
                    { label: '累计值', value: d[1].toFixed(2) + ' 百万吨油当量' }
                ]
            });
        })
        .on('mousemove', function(event) {
            moveTooltip(tooltip, event);
        })
        .on('mouseout', function() {
            // 恢复所有柱子样式
            groups.selectAll('rect')
                .transition()
                .duration(200)
                .attr('opacity', 0.85);
            
            // 隐藏tooltip
            hideTooltip(tooltip);
        })
        .on('click', function(event, d) {
            // 点击固定数据展示
            event.stopPropagation();
            
            // 移除之前的选中状态
            if (selectedChartElement) {
                selectedChartElement.classList.remove('selected');
            }
            
            // 添加选中状态
            this.classList.add('selected');
            selectedChartElement = this;
            
            // 找到对应的能源类型
            const key = stack.find(s => 
                s.some(point => point[0] === d[0] && point[1] === d[1])
            )?.key;
            
            // 显示固定数据面板
            showFixedData({
                type: key,
                year: d.data.Year,
                value: d[1] - d[0],
                total: d[1],
                country: currentCountry === 'all' ? '全部国家' : (translations[currentCountry] || currentCountry),
                dataRange: currentYearRange
            });
        })
        .transition()
        .duration(800)
        .delay((d, i) => i * 50)
        .attr('y', d => y(d[1]))
        .attr('height', d => y(d[0]) - y(d[1]));
    
    // 添加数据标签（显示每个柱子的数值）
    addBarLabels(g, stack, x, y, chartData, energyTypes);
}

// 添加柱状图数据标签
function addBarLabels(g, stack, x, y, chartData, energyTypes) {
    // 为每个年份添加总数值标签
    chartData.forEach((d, yearIndex) => {
        // 计算该年份的总值
        const total = energyTypes.reduce((sum, type) => sum + (d[type] || 0), 0);
        
        // 在柱子顶部添加总数值标签
        g.append('text')
            .attr('class', 'bar-label bar-label-total')
            .attr('x', x(d.Year) + x.bandwidth() / 2)
            .attr('y', y(total) - 8)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', '600')
            .attr('fill', '#374151')
            .attr('opacity', 0)
            .text(total.toFixed(1))
            .transition()
            .duration(500)
            .delay(1000 + yearIndex * 100)
            .attr('opacity', 1);
    });
}

// 渲染饼图
function renderPieChart(data) {
    const container = document.getElementById('main-chart');
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = {top: 40, right: 120, bottom: 40, left: 120};
    
    // 准备数据 - 按能源类型聚合
    const aggregatedData = d3.rollup(
        data,
        v => d3.sum(v, d => d.Value),
        d => d.Energy_Type
    );
    
    // 转换为数组格式
    const chartData = Array.from(aggregatedData, ([type, value]) => ({
        Energy_Type: type,
        Value: value
    }));
    
    // 创建SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const radius = Math.min(innerWidth, innerHeight) / 2;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left + innerWidth/2},${margin.top + innerHeight/2})`);
    
    // 颜色比例尺
    const color = d3.scaleOrdinal()
        .domain(chartData.map(d => d.Energy_Type))
        .range(Object.values(chartColors));
    
    // 创建饼图生成器
    const pie = d3.pie()
        .value(d => d.Value)
        .sort(null);
    
    // 创建弧生成器
    const arc = d3.arc()
        .innerRadius(radius * 0.5)
        .outerRadius(radius * 0.9);
    
    // 创建悬停时的弧生成器
    const arcHover = d3.arc()
        .innerRadius(radius * 0.45)
        .outerRadius(radius * 0.95);
    
    // 计算总和
    const total = d3.sum(chartData, d => d.Value);
    
    // 创建提示框
    const tooltip = document.getElementById('chart-tooltip');
    
    // 绘制扇形
    const arcs = g.selectAll('.arc')
        .data(pie(chartData))
        .join('g')
        .attr('class', 'chart-element arc');
    
    arcs.append('path')
        .attr('d', arc)
        .attr('fill', d => chartColors[d.data.Energy_Type])
        .attr('opacity', 0.9)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .on('mouseover', function(event, d) {
            // 高亮当前扇形
            d3.select(this)
                .transition()
                .duration(200)
                .attr('d', arcHover);
            
            // 其他扇形变暗
            arcs.selectAll('path')
                .filter(function() {
                    return this !== event.target;
                })
                .transition()
                .duration(200)
                .attr('opacity', 0.4);
            
            // 计算百分比
            const percentage = (d.data.Value / total * 100).toFixed(2);
            
            // 显示tooltip
            showTooltip(tooltip, event, {
                title: translations[d.data.Energy_Type] || d.data.Energy_Type,
                items: [
                    { label: '消耗量', value: d.data.Value.toFixed(2) + ' 百万吨油当量' },
                    { label: '占比', value: percentage + '%' }
                ]
            });
        })
        .on('mousemove', function(event) {
            moveTooltip(tooltip, event);
        })
        .on('mouseout', function() {
            // 恢复所有扇形样式
            arcs.selectAll('path')
                .transition()
                .duration(200)
                .attr('d', arc)
                .attr('opacity', 0.9);
            
            // 隐藏tooltip
            hideTooltip(tooltip);
        })
        .on('click', function(event, d) {
            // 点击固定数据展示
            event.stopPropagation();
            
            // 移除之前的选中状态
            if (selectedChartElement) {
                selectedChartElement.classList.remove('selected');
            }
            
            // 添加选中状态
            this.classList.add('selected');
            selectedChartElement = this;
            
            // 计算百分比
            const percentage = (d.data.Value / total * 100).toFixed(2);
            
            // 显示固定数据面板
            showFixedData({
                type: d.data.Energy_Type,
                value: d.data.Value,
                percentage: percentage,
                total: total,
                country: currentCountry === 'all' ? '全部国家' : (translations[currentCountry] || currentCountry),
                dataRange: currentYearRange
            });
        })
        .transition()
        .duration(1000)
        .attrTween('d', function(d) {
            const interpolate = d3.interpolate({startAngle: 0, endAngle: 0}, d);
            return t => arc(interpolate(t));
        });
    
    // 添加中心文本
    g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.5em')
        .attr('font-size', '24px')
        .attr('font-weight', '700')
        .attr('fill', '#374151')
        .text(total.toFixed(0));
    
    g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.2em')
        .attr('font-size', '12px')
        .attr('fill', '#6b7280')
        .text('总消耗量');
    
    // 添加扇形标签
    arcs.append('text')
        .attr('transform', d => `translate(${arc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', 'white')
        .attr('opacity', 0)
        .text(d => {
            const percentage = (d.data.Value / total * 100).toFixed(1);
            return percentage > 5 ? percentage + '%' : '';
        })
        .transition()
        .duration(500)
        .delay(1200)
        .attr('opacity', 1);
}

// 渲染堆叠面积图
function renderStackedAreaChart(data) {
    const container = document.getElementById('main-chart');
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = {top: 40, right: 30, bottom: 50, left: 60};
    
    // 准备数据 - 按年份和能源类型聚合
    const aggregatedData = d3.rollup(
        data,
        v => d3.sum(v, d => d.Value),
        d => d.Year,
        d => d.Energy_Type
    );
    
    // 转换为数组格式
    const chartData = Array.from(aggregatedData, ([year, types]) => {
        const obj = {Year: year};
        types.forEach((value, type) => {
            obj[type] = value;
        });
        return obj;
    }).sort((a, b) => a.Year - b.Year);
    
    // 创建堆叠数据
    const energyTypes = ['Oil', 'Natural Gas', 'Coal', 'Nuclear', 'Renewables'];
    const stack = d3.stack().keys(energyTypes)(chartData);
    
    // 创建SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // 比例尺
    const x = d3.scaleLinear()
        .domain(d3.extent(chartData, d => d.Year))
        .range([0, innerWidth]);
    
    const maxY = d3.max(stack, d => d3.max(d, d => d[1]));
    const y = d3.scaleLinear()
        .domain([0, maxY * 1.1])
        .range([innerHeight, 0]);
    
    // 绘制网格线
    g.append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.1)
        .call(d3.axisLeft(y)
            .tickSize(-innerWidth)
            .tickFormat(''));
    
    // 绘制坐标轴
    g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('d')))
        .style('font-size', '11px');
    
    g.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(y).ticks(5))
        .style('font-size', '11px');
    
    // 创建面积生成器
    const area = d3.area()
        .x(d => x(d.data.Year))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveMonotoneX);
    
    // 创建提示框
    const tooltip = document.getElementById('chart-tooltip');
    
    // 创建透明的鼠标捕获层
    const mouseG = g.append('g')
        .attr('class', 'mouse-over-effects');
    
    // 添加垂直线
    mouseG.append('path')
        .attr('class', 'mouse-line')
        .attr('stroke', '#9ca3af')
        .attr('stroke-width', '1px')
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', '0');
    
    // 绘制堆叠面积
    const areas = g.selectAll('.area')
        .data(stack)
        .join('g')
        .attr('class', 'area-group');
    
    areas.append('path')
        .attr('class', 'chart-element area')
        .attr('d', area)
        .attr('fill', d => chartColors[d.key])
        .attr('opacity', 0.75)
        .on('mouseover', function(event, d) {
            // 高亮当前面积
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 0.95);
            
            // 其他面积变暗
            g.selectAll('.area')
                .filter(function() {
                    return this !== event.target;
                })
                .transition()
                .duration(200)
                .attr('opacity', 0.3);
        })
        .on('mouseout', function() {
            // 恢复所有面积样式
            g.selectAll('.area')
                .transition()
                .duration(200)
                .attr('opacity', 0.75);
        })
        .transition()
        .duration(1000)
        .attr('d', area);
    
    // 添加鼠标交互
    const bisect = d3.bisector(d => d.Year).left;
    
    // 创建透明的鼠标捕获层
    mouseG.append('rect')
        .attr('class', 'mouse-capture')
        .attr('width', innerWidth)
        .attr('height', innerHeight)
        .attr('fill', 'none')
        .attr('pointer-events', 'all')
        .on('mouseover', function() {
            mouseG.select('.mouse-line').style('opacity', '1');
        })
        .on('mouseout', function() {
            mouseG.select('.mouse-line').style('opacity', '0');
            hideTooltip(tooltip);
        })
        .on('mousemove', function(event) {
            const [mouseX] = d3.pointer(event);
            const x0 = x.invert(mouseX);
            const i = bisect(chartData, x0, 1);
            const d0 = chartData[i - 1];
            const d1 = chartData[i];
            const d = x0 - d0.Year > d1.Year - x0 ? d1 : d0;
            
            // 更新垂直线位置
            mouseG.select('.mouse-line')
                .attr('d', () => {
                    const xPos = x(d.Year);
                    return `M${xPos},${innerHeight} ${xPos},0`;
                });
            
            // 准备tooltip数据
            const tooltipItems = energyTypes.map(type => ({
                label: translations[type] || type,
                value: (d[type] || 0).toFixed(2),
                color: chartColors[type]
            })).filter(item => parseFloat(item.value) > 0);
            
            // 显示tooltip
            showTooltip(tooltip, event, {
                title: d.Year + '年',
                items: tooltipItems,
                showColors: true
            });
        })
        .on('click', function(event) {
            event.stopPropagation();
            
            const [mouseX] = d3.pointer(event);
            const x0 = x.invert(mouseX);
            const i = bisect(chartData, x0, 1);
            const d0 = chartData[i - 1];
            const d1 = chartData[i];
            const d = x0 - d0.Year > d1.Year - x0 ? d1 : d0;
            
            // 显示固定数据面板
            showFixedData({
                type: 'all',
                year: d.Year,
                data: d,
                country: currentCountry === 'all' ? '全部国家' : (translations[currentCountry] || currentCountry),
                dataRange: currentYearRange
            });
        });
}

// 显示tooltip
function showTooltip(tooltip, event, data) {
    if (!tooltip) return;
    
    let html = `<div class="tooltip-title">${data.title}</div>`;
    
    if (data.items && data.items.length > 0) {
        data.items.forEach(item => {
            if (data.showColors && item.color) {
                html += `
                    <div class="tooltip-item">
                        <span class="tooltip-label">
                            <span class="tooltip-dot" style="background-color: ${item.color};"></span>
                            ${item.label}
                        </span>
                        <span class="tooltip-value">${item.value}</span>
                    </div>
                `;
            } else {
                html += `
                    <div class="tooltip-item">
                        <span class="tooltip-label">${item.label}</span>
                        <span class="tooltip-value">${item.value}</span>
                    </div>
                `;
            }
        });
    }
    
    tooltip.innerHTML = html;
    tooltip.style.opacity = '1';
    tooltip.style.display = 'block';
    
    moveTooltip(tooltip, event);
}

// 移动tooltip
function moveTooltip(tooltip, event) {
    if (!tooltip) return;
    
    const tooltipRect = tooltip.getBoundingClientRect();
    const containerRect = document.getElementById('main-chart').getBoundingClientRect();
    
    let x = event.pageX + 15;
    let y = event.pageY - 10;
    
    // 防止超出右边界
    if (x + tooltipRect.width > window.innerWidth - 20) {
        x = event.pageX - tooltipRect.width - 15;
    }
    
    // 防止超出上边界
    if (y < 20) {
        y = event.pageY + 15;
    }
    
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
}

// 隐藏tooltip
function hideTooltip(tooltip) {
    if (!tooltip) return;
    tooltip.style.opacity = '0';
    tooltip.style.display = 'none';
}

// 显示固定数据面板
function showFixedData(data) {
    const panel = document.getElementById('fixed-data-panel');
    const content = document.getElementById('fixed-data-content');
    
    fixedData = data;
    
    let html = '';
    
    if (data.type === 'all') {
        // 显示所有能源类型的数据
        const energyTypes = ['Oil', 'Natural Gas', 'Coal', 'Nuclear', 'Renewables'];
        
        html = `
            <div class="fixed-data-header">
                <h4>${data.year}年能源消耗详情</h4>
                <p class="data-meta">
                    国家/地区: ${data.country} | 
                    数据范围: ${data.dataRange[0]}-${data.dataRange[1]}
                </p>
            </div>
            <div class="fixed-data-content">
        `;
        
        energyTypes.forEach(type => {
            const value = data.data[type] || 0;
            html += `
                <div class="fixed-data-item">
                    <div class="item-header">
                        <span class="item-color" style="background-color: ${chartColors[type]};"></span>
                        <span class="item-title">${translations[type] || type}</span>
                    </div>
                    <div class="item-value">
                        ${value.toFixed(2)}
                        <span class="item-unit">百万吨油当量</span>
                    </div>
                </div>
            `;
        });
        
        // 计算总值
        const total = energyTypes.reduce((sum, type) => sum + (data.data[type] || 0), 0);
        
        html += `
                <div class="fixed-data-item fixed-data-total">
                    <div class="item-header">
                        <span class="item-title">总计</span>
                    </div>
                    <div class="item-value">
                        ${total.toFixed(2)}
                        <span class="item-unit">百万吨油当量</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        // 显示单个能源类型的数据
        html = `
            <div class="fixed-data-header">
                <h4>${translations[data.type] || data.type} - 能源消耗详情</h4>
                <p class="data-meta">
                    ${data.year ? '年份: ' + data.year + '年 | ' : ''}
                    国家/地区: ${data.country} | 
                    数据范围: ${data.dataRange[0]}-${data.dataRange[1]}
                </p>
            </div>
            <div class="fixed-data-content">
                <div class="fixed-data-item">
                    <div class="item-header">
                        <span class="item-color" style="background-color: ${chartColors[data.type]};"></span>
                        <span class="item-title">消耗量</span>
                    </div>
                    <div class="item-value">
                        ${data.value.toFixed(2)}
                        <span class="item-unit">百万吨油当量</span>
                    </div>
                </div>
        `;
        
        if (data.percentage !== undefined) {
            html += `
                <div class="fixed-data-item">
                    <div class="item-header">
                        <span class="item-title">占比</span>
                    </div>
                    <div class="item-value">
                        ${data.percentage}%
                    </div>
                </div>
            `;
        }
        
        if (data.total !== undefined) {
            html += `
                <div class="fixed-data-item">
                    <div class="item-header">
                        <span class="item-title">累计值/总计</span>
                    </div>
                    <div class="item-value">
                        ${data.total.toFixed(2)}
                        <span class="item-unit">百万吨油当量</span>
                    </div>
                </div>
            `;
        }
        
        html += `</div>`;
    }
    
    content.innerHTML = html;
    panel.classList.remove('hidden');
    
    // 滚动到面板
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 渲染次级图表
function renderSecondaryCharts() {
    if (!currentData) return;
    
    // 渲染国家对比图表
    renderCountryComparisonChart();
    
    // 渲染可再生能源趋势图表
    renderRenewableTrendChart();
}

// 渲染国家对比图表
function renderCountryComparisonChart() {
    const container = document.getElementById('country-comparison-chart');
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = {top: 40, right: 30, bottom: 70, left: 60};
    
    // 准备数据 - 按国家聚合最新年份的数据
    const filteredData = currentData.filter(d => 
        d.Year >= currentYearRange[0] && d.Year <= currentYearRange[1]
    );
    
    const latestYear = d3.max(filteredData, d => d.Year);
    const latestData = filteredData.filter(d => d.Year === latestYear);
    
    // 更新副标题
    document.getElementById('country-comparison-subtitle').textContent = 
        `${latestYear}年能源消耗对比`;
    
    // 按国家聚合
    const aggregatedData = d3.rollup(
        latestData,
        v => d3.sum(v, d => d.Value),
        d => d.Country
    );
    
    // 转换为数组格式并排序
    const chartData = Array.from(aggregatedData, ([country, value]) => ({
        Country: country,
        Value: value
    })).sort((a, b) => b.Value - a.Value);
    
    // 创建SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // 比例尺
    const x = d3.scaleBand()
        .domain(chartData.map(d => d.Country))
        .range([0, innerWidth])
        .padding(0.2);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => d.Value) * 1.15])
        .range([innerHeight, 0]);
    
    // 颜色比例尺
    const color = d3.scaleOrdinal()
        .domain(chartData.map(d => d.Country))
        .range(d3.schemeCategory10);
    
    // 创建提示框
    const tooltip = document.getElementById('chart-tooltip');
    
    // 绘制柱状
    g.selectAll('.bar')
        .data(chartData)
        .join('rect')
        .attr('class', 'chart-element bar')
        .attr('x', d => x(d.Country))
        .attr('y', innerHeight)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', d => color(d.Country))
        .attr('opacity', 0.85)
        .on('mouseover', function(event, d) {
            // 高亮当前柱子
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 1);
            
            // 显示tooltip
            showTooltip(tooltip, event, {
                title: translations[d.Country] || d.Country,
                items: [
                    { label: '年份', value: latestYear + '年' },
                    { label: '能源消耗', value: d.Value.toFixed(2) + ' 百万吨油当量' }
                ]
            });
        })
        .on('mousemove', function(event) {
            moveTooltip(tooltip, event);
        })
        .on('mouseout', function() {
            // 恢复柱子样式
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 0.85);
            
            // 隐藏tooltip
            hideTooltip(tooltip);
        })
        .on('click', function(event, d) {
            // 点击固定数据展示
            event.stopPropagation();
            
            // 显示固定数据面板
            showFixedData({
                type: 'country',
                country: d.Country,
                year: latestYear,
                value: d.Value,
                dataRange: currentYearRange
            });
        })
        .transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .attr('y', d => y(d.Value))
        .attr('height', d => innerHeight - y(d.Value));
    
    // 添加数据标签
    chartData.forEach((d, i) => {
        g.append('text')
            .attr('class', 'bar-label')
            .attr('x', x(d.Country) + x.bandwidth() / 2)
            .attr('y', y(d.Value) - 8)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('font-weight', '600')
            .attr('fill', '#374151')
            .attr('opacity', 0)
            .text(d.Value.toFixed(1))
            .transition()
            .duration(500)
            .delay(1000 + i * 100)
            .attr('opacity', 1);
    });
    
    // 绘制坐标轴
    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '10px')
        .text(d => translations[d] || d);
    
    g.append('g')
        .call(d3.axisLeft(y).ticks(5))
        .style('font-size', '10px');
}

// 渲染可再生能源趋势图表
function renderRenewableTrendChart() {
    const container = document.getElementById('renewable-trend-chart');
    const width = container.clientWidth;
    const height = container.clientHeight;
    const margin = {top: 40, right: 120, bottom: 50, left: 60};
    
    // 准备数据 - 只筛选可再生能源数据
    let renewableData = currentData.filter(d => 
        d.Energy_Type === 'Renewables' &&
        d.Year >= currentYearRange[0] && 
        d.Year <= currentYearRange[1]
    );
    
    // 按年份和国家聚合
    const aggregatedData = d3.rollup(
        renewableData,
        v => d3.sum(v, d => d.Value),
        d => d.Year,
        d => d.Country
    );
    
    // 转换为数组格式
    const chartData = Array.from(aggregatedData, ([year, countries]) => {
        const obj = {Year: year};
        countries.forEach((value, country) => {
            obj[country] = value;
        });
        return obj;
    }).sort((a, b) => a.Year - b.Year);
    
    // 提取国家列表
    const countries = Array.from(new Set(renewableData.map(d => d.Country)));
    
    // 创建SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // 比例尺
    const x = d3.scaleLinear()
        .domain(d3.extent(chartData, d => d.Year))
        .range([0, innerWidth]);
    
    const maxY = d3.max(chartData, d => d3.max(countries, c => d[c] || 0));
    const y = d3.scaleLinear()
        .domain([0, maxY * 1.1])
        .range([innerHeight, 0]);
    
    // 颜色比例尺
    const color = d3.scaleOrdinal()
        .domain(countries)
        .range(d3.schemeCategory10);
    
    // 创建提示框
    const tooltip = document.getElementById('chart-tooltip');
    
    // 绘制折线
    countries.forEach((country, index) => {
        const line = d3.line()
            .x(d => x(d.Year))
            .y(d => y(d[country] || 0))
            .curve(d3.curveMonotoneX);
        
        // 绘制折线
        g.append('path')
            .datum(chartData)
            .attr('fill', 'none')
            .attr('stroke', color(country))
            .attr('stroke-width', 2)
            .attr('d', line)
            .attr('opacity', 0.8)
            .attr('class', `chart-element line-${country.replace(/\s+/g, '-')}`)
            .transition()
            .duration(1000)
            .delay(index * 200);
        
        // 绘制数据点
        g.selectAll(`.point-${country.replace(/\s+/g, '-')}`)
            .data(chartData)
            .join('circle')
            .attr('class', `chart-element point-${country.replace(/\s+/g, '-')}`)
            .attr('cx', d => x(d.Year))
            .attr('cy', d => y(d[country] || 0))
            .attr('r', 4)
            .attr('fill', color(country))
            .attr('stroke', 'white')
            .attr('stroke-width', 1.5)
            .attr('opacity', 0)
            .on('mouseover', function(event, d) {
                // 高亮当前点
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 6)
                    .attr('opacity', 1);
                
                // 显示tooltip
                showTooltip(tooltip, event, {
                    title: translations[country] || country,
                    items: [
                        { label: '年份', value: d.Year + '年' },
                        { label: '可再生能源', value: (d[country] || 0).toFixed(2) + ' 百万吨油当量' }
                    ]
                });
            })
            .on('mousemove', function(event) {
                moveTooltip(tooltip, event);
            })
            .on('mouseout', function() {
                // 恢复当前点样式
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('r', 4)
                    .attr('opacity', 0);
                
                // 隐藏tooltip
                hideTooltip(tooltip);
            })
            .transition()
            .duration(300)
            .delay(1000 + index * 200)
            .attr('opacity', 0.8);
    });
    
    // 添加图例
    const legend = g.append('g')
        .attr('transform', `translate(${innerWidth + 10}, 0)`);
    
    countries.forEach((country, i) => {
        const legendRow = legend.append('g')
            .attr('transform', `translate(0, ${i * 20})`);
        
        legendRow.append('rect')
            .attr('width', 10)
            .attr('height', 10)
            .attr('fill', color(country));
        
        legendRow.append('text')
            .attr('x', 15)
            .attr('y', 8)
            .text(translations[country] || country)
            .style('font-size', '10px')
            .style('fill', '#4b5563');
    });
    
    // 绘制坐标轴
    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format('d')))
        .style('font-size', '10px');
    
    g.append('g')
        .call(d3.axisLeft(y).ticks(5))
        .style('font-size', '10px');
}

// 更新统计信息
function updateStats() {
    if (!currentData) return;
    
    // 过滤数据
    let filteredData = currentData.filter(d => 
        d.Year >= currentYearRange[0] && d.Year <= currentYearRange[1]
    );
    
    if (currentCountry !== 'all') {
        filteredData = filteredData.filter(d => d.Country === currentCountry);
    }
    
    // 计算总能源消耗
    const totalConsumption = d3.sum(filteredData, d => d.Value);
    document.getElementById('total-consumption').textContent = 
        totalConsumption.toFixed(0);
    
    // 计算可再生能源占比
    const renewableData = filteredData.filter(d => d.Energy_Type === 'Renewables');
    const renewableTotal = d3.sum(renewableData, d => d.Value);
    const renewablePercentage = totalConsumption > 0 ? 
        (renewableTotal / totalConsumption * 100).toFixed(2) : 0;
    document.getElementById('renewable-percentage').textContent = 
        renewablePercentage + '%';
    
    // 计算年度增长率
    const latestYear = d3.max(filteredData, d => d.Year);
    const previousYear = latestYear - 1;
    
    const latestData = filteredData.filter(d => d.Year === latestYear);
    const previousData = filteredData.filter(d => d.Year === previousYear);
    
    const latestTotal = d3.sum(latestData, d => d.Value);
    const previousTotal = d3.sum(previousData, d => d.Value);
    
    let growthRate;
    if (previousTotal > 0) {
        growthRate = ((latestTotal - previousTotal) / previousTotal * 100).toFixed(2);
    } else {
        growthRate = '0.00';
    }
    
    document.getElementById('growth-rate').textContent = 
        `${parseFloat(growthRate) >= 0 ? '+' : ''}${growthRate}%`;
    
    // 简单的趋势预测
    const years = Array.from(new Set(filteredData.map(d => d.Year))).sort();
    const yearlyTotals = years.map(year => {
        const yearData = filteredData.filter(d => d.Year === year);
        return d3.sum(yearData, d => d.Value);
    });
    
    // 简单的线性回归预测未来趋势
    if (years.length >= 2) {
        const n = years.length;
        const sumX = d3.sum(years, d => d);
        const sumY = d3.sum(yearlyTotals, d => d);
        const sumXY = d3.sum(years.map((year, i) => year * yearlyTotals[i]));
        const sumX2 = d3.sum(years, d => d * d);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        
        // 更新预测趋势显示
        const trendElement = document.getElementById('prediction-trend');
        if (slope > 0) {
            trendElement.textContent = '上升';
            trendElement.style.color = 'var(--danger-color)';
        } else if (slope < 0) {
            trendElement.textContent = '下降';
            trendElement.style.color = 'var(--success-color)';
        } else {
            trendElement.textContent = '平稳';
            trendElement.style.color = 'var(--info-color)';
        }
    }
    
    // 更新能源类型分布
    updateEnergyDistribution(filteredData, totalConsumption);
}

// 更新能源类型分布
function updateEnergyDistribution(data, totalConsumption) {
    const container = document.getElementById('energy-distribution');
    if (!container) return;
    
    // 按能源类型聚合
    const aggregatedData = d3.rollup(
        data,
        v => d3.sum(v, d => d.Value),
        d => d.Energy_Type
    );
    
    const energyTypes = ['Oil', 'Natural Gas', 'Coal', 'Nuclear', 'Renewables'];
    
    let html = '';
    energyTypes.forEach(type => {
        const value = aggregatedData.get(type) || 0;
        const percentage = totalConsumption > 0 ? 
            (value / totalConsumption * 100).toFixed(1) : 0;
        
        html += `
            <div class="distribution-item">
                <div class="distribution-header">
                    <div class="distribution-name">
                        <span class="distribution-dot" style="background-color: ${chartColors[type]};"></span>
                        ${translations[type] || type}
                    </div>
                    <div class="distribution-value">${percentage}%</div>
                </div>
                <div class="distribution-bar">
                    <div class="distribution-bar-fill" 
                         style="width: ${percentage}%; background-color: ${chartColors[type]};"></div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}