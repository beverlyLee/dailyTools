document.addEventListener('DOMContentLoaded', function() {
    loadData();
    updateTime();
    setupEventListeners();
});

let currentData = [];

function loadData() {
    fetch('/api/data')
        .then(response => response.json())
        .then(data => {
            currentData = data;
            updateStats(data);
            updateTable(data);
        })
        .catch(error => {
            console.error('加载数据失败:', error);
        });
}

function updateStats(data) {
    const totalProvinces = data.length;
    const totalCases = data.reduce((sum, item) => sum + (item.cases || 0), 0);
    const avgPercentage = data.reduce((sum, item) => sum + (item.percentage || 0), 0) / data.length;
    
    const sortedByPercentage = [...data].sort((a, b) => b.percentage - a.percentage);
    const topProvince = sortedByPercentage[0];

    document.getElementById('totalProvinces').textContent = totalProvinces;
    document.getElementById('totalCases').textContent = totalCases.toLocaleString();
    document.getElementById('avgPercentage').textContent = avgPercentage.toFixed(1) + '%';
    document.getElementById('topProvince').textContent = topProvince ? topProvince.province : '-';
}

function updateTable(data) {
    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = '';

    const sortedData = [...data].sort((a, b) => b.percentage - a.percentage);

    sortedData.forEach(item => {
        const row = document.createElement('tr');
        
        const riskClass = getRiskClass(item.percentage);
        const riskLabel = getRiskLabel(item.percentage);

        row.innerHTML = `
            <td><strong>${item.province}</strong></td>
            <td>${item.percentage.toFixed(1)}%</td>
            <td>${item.cases.toLocaleString()}</td>
            <td><span class="risk-level ${riskClass}">${riskLabel}</span></td>
        `;
        tbody.appendChild(row);
    });
}

function getRiskClass(percentage) {
    if (percentage >= 7) return 'risk-very-high';
    if (percentage >= 5) return 'risk-high';
    if (percentage >= 3) return 'risk-medium';
    return 'risk-low';
}

function getRiskLabel(percentage) {
    if (percentage >= 7) return '极高';
    if (percentage >= 5) return '高';
    if (percentage >= 3) return '中';
    return '低';
}

function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('updateTime').textContent = timeStr;
}

function setupEventListeners() {
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', function() {
        this.classList.add('loading');
        this.textContent = '刷新中...';
        
        fetch('/api/refresh')
            .then(response => response.json())
            .then(result => {
                if (result.status === 'success') {
                    currentData = result.data;
                    updateStats(result.data);
                    updateTable(result.data);
                    
                    document.getElementById('heatmapFrame').src = '/charts/flu_heatmap.html?' + Date.now();
                    document.getElementById('scatterFrame').src = '/charts/flu_scatter.html?' + Date.now();
                    
                    updateTime();
                }
            })
            .catch(error => {
                console.error('刷新数据失败:', error);
            })
            .finally(() => {
                refreshBtn.classList.remove('loading');
                refreshBtn.innerHTML = '<span>🔄</span> 刷新数据';
            });
    });

    document.getElementById('viewHeatmapBtn').addEventListener('click', function() {
        openModal('/charts/flu_heatmap.html');
    });

    document.getElementById('viewScatterBtn').addEventListener('click', function() {
        openModal('/charts/flu_scatter.html');
    });

    const modal = document.getElementById('modal');
    const closeBtn = document.querySelector('.close');
    
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });

    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function openModal(src) {
    const modal = document.getElementById('modal');
    const modalFrame = document.getElementById('modalFrame');
    modalFrame.src = src;
    modal.style.display = 'block';
}
