let network = null;
let currentData = null;
let currentDataSource = null;
let dataSources = {};

document.addEventListener('DOMContentLoaded', function() {
    const keywordInput = document.getElementById('keywordInput');
    keywordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchNetwork();
        }
    });
    
    fetch('/api/data-sources')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                dataSources = data.data_sources;
                updateDataSourceUI();
            }
        })
        .catch(console.error);
    
    setupFileUpload();
});

function updateDataSourceUI() {
    const select = document.getElementById('dataSourceSelect');
    const selectedSource = select.value;
    
    const sourceInfo = dataSources[selectedSource];
    if (sourceInfo) {
        document.getElementById('dataSourceBadge').textContent = `数据源: ${sourceInfo.name}`;
        document.getElementById('dsDescription').textContent = sourceInfo.description;
        document.getElementById('dsFeatures').textContent = sourceInfo.features.join('、');
        document.getElementById('dsLimitations').textContent = sourceInfo.limitations.join('；');
    }
    
    const keywordInput = document.getElementById('keywordInput');
    const customUploadSection = document.getElementById('customUploadSection');
    
    if (selectedSource === 'custom') {
        keywordInput.style.display = 'none';
        customUploadSection.style.display = 'block';
    } else {
        keywordInput.style.display = 'block';
        customUploadSection.style.display = 'none';
    }
    
    if (selectedSource === 'test') {
        keywordInput.disabled = true;
        keywordInput.placeholder = '测试数据不支持关键词搜索';
    } else {
        keywordInput.disabled = false;
        keywordInput.placeholder = '输入搜索关键词，如：Large Language Model';
    }
}

function searchNetwork() {
    const select = document.getElementById('dataSourceSelect');
    const dataSource = select.value;
    
    if (dataSource === 'test') {
        loadTestData();
        return;
    }
    
    if (dataSource === 'custom') {
        alert('请先上传自定义数据文件');
        return;
    }
    
    showLoading(true);
    const keyword = document.getElementById('keywordInput').value.trim();
    
    fetch(`/api/crossref-network?keyword=${encodeURIComponent(keyword)}&max_papers=10`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentData = data;
                renderNetwork(data.network);
                updateStats(data);
                updateTopPapers(data.top_papers);
                
                if (data.message) {
                    showNotification(data.message, 'info');
                }
            } else {
                    showNotification(data.error || '获取数据失败', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('网络错误，请重试', 'error');
        })
        .finally(() => {
            showLoading(false);
        });
}

function loadTestData() {
    showLoading(true);
    
    fetch('/api/test-network')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentData = data;
                renderNetwork(data.network);
                updateStats(data);
                updateTopPapers(data.top_papers);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('加载测试数据失败', 'error');
        })
        .finally(() => {
            showLoading(false);
        });
}

function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
}

function handleFileUpload(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    showLoading(true);
    
    fetch('/api/upload-custom', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            currentData = data;
            renderNetwork(data.network);
            updateStats(data);
            updateTopPapers(data.top_papers);
            
            if (data.warnings && data.warnings.length > 0) {
                showNotification('警告: ' + data.warnings.join('，'), 'warning');
            }
        } else {
            showNotification(data.error || '上传失败', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('上传失败: ' + error.message, 'error');
    })
    .finally(() => {
        showLoading(false);
    });
}

function showTemplate(format) {
    fetch(`/api/template/${format}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                document.getElementById('templateTitle').textContent = `${format.toUpperCase()} 格式模板`;
                document.getElementById('templateContent').textContent = data.template;
                document.getElementById('templateModal').style.display = 'flex';
            }
        })
        .catch(console.error);
}

function closeTemplate() {
    document.getElementById('templateModal').style.display = 'none';
}

function copyTemplate() {
    const content = document.getElementById('templateContent').textContent;
    navigator.clipboard.writeText(content).then(() => {
        showNotification('模板已复制到剪贴板', 'success');
    }).catch(() => {
        showNotification('复制失败，请手动复制', 'error');
    });
}

function showNotification(message, type) {
    const colors = {
        success: '#4caf50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196f3'
    };
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${colors[type] || colors.info};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function renderNetwork(networkData) {
    const container = document.getElementById('network');
    
    const maxPagerank = Math.max(...networkData.nodes.map(n => n.pagerank));
    const minPagerank = Math.min(...networkData.nodes.map(n => n.pagerank));
    const rangePagerank = maxPagerank - minPagerank || 1;
    
    const maxCitation = Math.max(...networkData.nodes.map(n => n.citation_count));
    const minCitation = Math.min(...networkData.nodes.map(n => n.citation_count));
    const rangeCitation = maxCitation - minCitation || 1;
    
    const nodes = new vis.DataSet(networkData.nodes.map(node => {
        const normalizedPR = (node.pagerank - minPagerank) / rangePagerank;
        const normalizedCit = (node.citation_count - minCitation) / rangeCitation;
        
        const size = 15 + normalizedCit * 35;
        
        let color;
        if (normalizedPR > 0.66) {
            color = '#ff6b6b';
        } else if (normalizedPR > 0.33) {
            color = '#4ecdc4';
        } else {
            color = '#45b7d1';
        }
        
        const showLabels = document.getElementById('showLabels').checked;
        
        return {
            id: node.id,
            label: showLabels ? truncateTitle(node.title, 25) : '',
            title: `${node.title}\n\n作者: ${node.authors.join(', ')}\n年份: ${node.year}\n引用数: ${node.citation_count}\nPageRank: ${node.pagerank.toFixed(4)}`,
            value: size,
            color: {
                background: color,
                border: '#333',
                highlight: {
                    background: '#ffd93d',
                    border: '#333'
                }
            },
            font: {
                size: 11,
                face: 'Arial',
                color: '#333'
            }
        };
    }));
    
    const edges = new vis.DataSet(networkData.edges.map(edge => ({
        from: edge.source,
        to: edge.target,
        arrows: 'to',
        color: {
            color: '#ddd',
            highlight: '#667eea'
        },
        smooth: {
            type: 'continuous'
        }
    })));
    
    const data = {
        nodes: nodes,
        edges: edges
    };
    
    const options = {
        nodes: {
            shape: 'dot',
            scaling: {
                min: 10,
                max: 50
            },
            borderWidth: 2,
            borderWidthSelected: 4
        },
        edges: {
            width: 1.5,
            arrowStrikethrough: false
        },
        physics: {
            enabled: true,
            barnesHut: {
                gravitationalConstant: -3000,
                centralGravity: 0.3,
                springLength: 150,
                springConstant: 0.04
            },
            stabilization: {
                iterations: 200
            }
        },
        interaction: {
            hover: true,
            tooltipDelay: 100,
            hideEdgesOnDrag: false
        }
    };
    
    if (network) {
        network.destroy();
    }
    
    network = new vis.Network(container, data, options);
    
    network.on('click', function(params) {
        if (params.nodes.length > 0) {
            const paperId = params.nodes[0];
            showPaperDetail(paperId);
        }
    });
}

function updateVisualization() {
    if (currentData) {
        renderNetwork(currentData.network);
    }
}

function updateStats(data) {
    const analysis = data.analysis || data.network;
    document.getElementById('nodeCount').textContent = data.network.num_nodes || '-';
    document.getElementById('edgeCount').textContent = data.network.num_edges || '-';
    document.getElementById('density').textContent = analysis.density ? analysis.density.toFixed(4) : '-';
}

function updateTopPapers(topPapers) {
    const container = document.getElementById('topPapersList');
    
    if (!topPapers || topPapers.length === 0) {
        container.innerHTML = '<p class="placeholder">暂无数据</p>';
        return;
    }
    
    container.innerHTML = topPapers.slice(0, 8).map((paper, index) => `
        <div class="paper-item" onclick="showPaperDetail('${paper.id}')">
            <div class="paper-title">#${index + 1} ${truncateTitle(paper.title, 45)}</div>
            <div class="paper-meta">
                <span>PageRank: ${paper.pagerank.toFixed(4)}</span>
            </div>
        </div>
    `).join('');
}

function showPaperDetail(paperId) {
    const node = currentData.network.nodes.find(n => n.id === paperId);
    if (!node) {
        return;
    }
    
    const card = document.getElementById('paperDetailCard');
    const content = document.getElementById('paperDetailContent');
    
    const cites = currentData.network.edges
        .filter(e => e.source === paperId)
        .map(e => currentData.network.nodes.find(n => n.id === e.target))
        .filter(Boolean);
    
    const citedBy = currentData.network.edges
        .filter(e => e.target === paperId)
        .map(e => currentData.network.nodes.find(n => n.id === e.source))
        .filter(Boolean);
    
    content.innerHTML = `
        <div class="detail-title">${node.title}</div>
        <div class="detail-authors">${node.authors.slice(0, 3).join(', ')}${node.authors.length > 3 ? ' et al.' : ''}</div>
        <div class="detail-stats">
            <div class="detail-stat">
                <span class="detail-stat-value">${node.year || '-'}</span>
                <span class="detail-stat-label">年份</span>
            </div>
            <div class="detail-stat">
                <span class="detail-stat-value">${node.citation_count.toLocaleString()}</span>
                <span class="detail-stat-label">引用数</span>
            </div>
            <div class="detail-stat">
                <span class="detail-stat-value">${node.pagerank.toFixed(4)}</span>
                <span class="detail-stat-label">PageRank</span>
            </div>
            <div class="detail-stat">
                <span class="detail-stat-value">${citedBy.length}</span>
                <span class="detail-stat-label">被引用数</span>
            </div>
        </div>
        ${citedBy.length > 0 ? `
        <div class="detail-section">
            <h4>被这些论文引用 (${citedBy.length})</h4>
            <div class="detail-list">
                ${citedBy.map(p => `<div class="detail-list-item" onclick="showPaperDetail('${p.id}')" style="cursor: pointer;">${truncateTitle(p.title, 40)}</div>`).join('')}
            </div>
        </div>
        ` : ''}
        ${cites.length > 0 ? `
        <div class="detail-section">
            <h4>引用这些论文 (${cites.length})</h4>
            <div class="detail-list">
                ${cites.map(p => `<div class="detail-list-item" onclick="showPaperDetail('${p.id}')" style="cursor: pointer;">${truncateTitle(p.title, 40)}</div>`).join('')}
            </div>
        </div>
        ` : ''}
    `;
    
    card.classList.add('show');
    card.style.display = 'block';
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.add('show');
    } else {
        loading.classList.remove('show');
    }
}

function truncateTitle(title, maxLength) {
    if (title.length <= maxLength) {
        return title;
    }
    return title.substring(0, maxLength) + '...';
}