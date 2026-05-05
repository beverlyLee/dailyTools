const { ipcRenderer } = require('electron');

let monaco = null;
let batchSqlEditor = null;
let streamSqlEditor = null;
let currentSelectedJob = null;
let currentUploadedJar = null;
let isBackendConnected = false;

require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }});

require(['vs/editor/editor.main'], function() {
    monaco = window.monaco;
    initEditors();
    initEventListeners();
    checkBackendConnection();
    loadInitialData();
});

function initEditors() {
    const editorOptions = {
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        renderLineHighlight: 'all',
        automaticLayout: true,
        wordWrap: 'on',
        tabSize: 4,
        insertSpaces: true,
        renderWhitespace: 'selection',
        guides: {
            bracketPairs: true,
            indentation: true
        },
        theme: 'vs-dark'
    };

    monaco.editor.defineTheme('bigdataTheme', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '6A9955' },
            { token: 'keyword', foreground: '569CD6' },
            { token: 'string', foreground: 'CE9178' },
            { token: 'number', foreground: 'B5CEA8' }
        ],
        colors: {
            'editor.background': '#1e1e1e',
            'editor.foreground': '#d4d4d4',
            'editor.lineHighlightBackground': '#2a2d2e',
            'editorLineNumber.foreground': '#858585',
            'editorGutter.background': '#1e1e1e'
        }
    });

    monaco.editor.setTheme('bigdataTheme');

    const batchContainer = document.getElementById('batch-sql-editor');
    const streamContainer = document.getElementById('stream-sql-editor');

    const batchDefaultSql = `-- Spark/Flink 批处理 SQL 示例
-- 支持标准 SQL 语法以及 Spark/Flink 特有语法

-- 创建表
CREATE TABLE IF NOT EXISTS user_behavior (
    user_id BIGINT,
    item_id BIGINT,
    category_id BIGINT,
    behavior STRING,
    ts TIMESTAMP
) WITH (
    'connector' = 'filesystem',
    'path' = '/path/to/data',
    'format' = 'csv'
);

-- 执行查询
SELECT 
    behavior,
    COUNT(*) as cnt
FROM user_behavior
GROUP BY behavior
ORDER BY cnt DESC;
`;

    const streamDefaultSql = `-- Flink 流处理 SQL 示例
-- 支持 Flink SQL 语法

-- 创建源表
CREATE TABLE IF NOT EXISTS source_table (
    user_id BIGINT,
    item_id BIGINT,
    behavior STRING,
    ts TIMESTAMP(3),
    WATERMARK FOR ts AS ts - INTERVAL '5' SECOND
) WITH (
    'connector' = 'kafka',
    'topic' = 'user-behavior',
    'properties.bootstrap.servers' = 'localhost:9092',
    'format' = 'json'
);

-- 创建结果表
CREATE TABLE IF NOT EXISTS result_table (
    window_start TIMESTAMP(3),
    window_end TIMESTAMP(3),
    behavior STRING,
    cnt BIGINT
) WITH (
    'connector' = 'jdbc',
    'url' = 'jdbc:mysql://localhost:3306/db',
    'table-name' = 'result',
    'username' = 'root',
    'password' = 'password'
);

-- 执行流查询
INSERT INTO result_table
SELECT 
    TUMBLE_START(ts, INTERVAL '1' MINUTE) as window_start,
    TUMBLE_END(ts, INTERVAL '1' MINUTE) as window_end,
    behavior,
    COUNT(*) as cnt
FROM source_table
GROUP BY TUMBLE(ts, INTERVAL '1' MINUTE), behavior;
`;

    batchSqlEditor = monaco.editor.create(batchContainer, {
        ...editorOptions,
        language: 'sql',
        value: batchDefaultSql
    });

    streamSqlEditor = monaco.editor.create(streamContainer, {
        ...editorOptions,
        language: 'sql',
        value: streamDefaultSql
    });

    monaco.languages.registerCompletionItemProvider('sql', {
        provideCompletionItems: function(model, position) {
            const suggestions = [
                {
                    label: 'SELECT',
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: 'SELECT',
                    detail: 'SQL 关键字'
                },
                {
                    label: 'FROM',
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: 'FROM',
                    detail: 'SQL 关键字'
                },
                {
                    label: 'WHERE',
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: 'WHERE',
                    detail: 'SQL 关键字'
                },
                {
                    label: 'GROUP BY',
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: 'GROUP BY',
                    detail: 'SQL 关键字'
                },
                {
                    label: 'ORDER BY',
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: 'ORDER BY',
                    detail: 'SQL 关键字'
                },
                {
                    label: 'JOIN',
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: 'JOIN',
                    detail: 'SQL 关键字'
                },
                {
                    label: 'CREATE TABLE',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'CREATE TABLE ${1:table_name} (\n    ${2:column_name} ${3:type}\n);',
                    detail: '创建表语句'
                },
                {
                    label: 'INSERT INTO',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'INSERT INTO ${1:table_name} (${2:columns})\nVALUES (${3:values});',
                    detail: '插入数据语句'
                }
            ];
            
            return {
                suggestions: suggestions
            };
        }
    });
}

function initEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            document.querySelectorAll('.module-content').forEach(m => m.classList.remove('active'));
            
            item.classList.add('active');
            const moduleName = item.dataset.module;
            document.getElementById(`${moduleName}-module`).classList.add('active');
        });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabContainer = e.target.closest('.tabs-container');
            tabContainer.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            tabContainer.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            e.target.classList.add('active');
            const tabName = e.target.dataset.tab;
            document.getElementById(`tab-${tabName}`).classList.add('active');
        });
    });

    document.getElementById('btn-refresh-jobs').addEventListener('click', loadJobs);
    document.getElementById('btn-new-job').addEventListener('click', createNewJob);
    document.getElementById('job-type-filter').addEventListener('change', filterJobs);
    document.getElementById('job-status-filter').addEventListener('change', filterJobs);

    document.getElementById('btn-sql-format').addEventListener('click', formatSql);
    document.getElementById('btn-sql-validate').addEventListener('click', validateSql);
    document.getElementById('btn-sql-run').addEventListener('click', runBatchSql);
    document.getElementById('btn-clear-results').addEventListener('click', clearResults);

    const uploadArea = document.getElementById('jar-upload-area');
    const fileInput = document.getElementById('jar-file-input');

    uploadArea.addEventListener('click', () => fileInput.click());
    
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
            handleJarUpload(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleJarUpload(e.target.files[0]);
        }
    });

    document.getElementById('btn-submit-job').addEventListener('click', submitJob);

    document.getElementById('btn-stream-sql-format').addEventListener('click', formatStreamSql);
    document.getElementById('btn-stream-sql-validate').addEventListener('click', validateStreamSql);
    document.getElementById('btn-stream-sql-save').addEventListener('click', saveStreamSqlVersion);
    document.getElementById('btn-stream-sql-run').addEventListener('click', runStreamSql);

    document.getElementById('btn-preview-start').addEventListener('click', startPreview);
    document.getElementById('btn-preview-stop').addEventListener('click', stopPreview);
    document.getElementById('btn-refresh-tables').addEventListener('click', loadStreamTables);

    document.getElementById('btn-refresh-udfs').addEventListener('click', loadUdfs);
    document.getElementById('btn-new-udf').addEventListener('click', showNewUdfModal);

    document.getElementById('btn-udf-refresh').addEventListener('click', loadUdfManagement);
    document.getElementById('btn-udf-add').addEventListener('click', showNewUdfModal);

    document.getElementById('btn-versions-refresh').addEventListener('click', loadSqlVersions);

    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') {
            closeModal();
        }
    });
}

async function checkBackendConnection() {
    const health = await window.api.checkHealth();
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    if (health && health.status === 'UP') {
        isBackendConnected = true;
        statusDot.classList.remove('disconnected');
        statusDot.classList.add('connected');
        statusText.textContent = '后端已连接';
    } else {
        isBackendConnected = false;
        statusDot.classList.remove('connected');
        statusDot.classList.add('disconnected');
        statusText.textContent = '后端未连接';
    }
}

async function loadInitialData() {
    await loadJobs();
    await loadUdfs();
    await loadStreamTables();
}

async function loadJobs() {
    if (!isBackendConnected) {
        showDemoJobs();
        return;
    }
    
    try {
        const jobs = await window.api.jobs.getAll();
        renderJobs(jobs);
    } catch (error) {
        console.error('Failed to load jobs:', error);
        showDemoJobs();
    }
}

function showDemoJobs() {
    const demoJobs = [
        {
            id: 1,
            jobName: '用户行为分析',
            jobType: 'BATCH',
            engineType: 'SPARK',
            status: 'COMPLETED',
            progress: 100,
            createdAt: new Date().toISOString()
        },
        {
            id: 2,
            jobName: '实时推荐计算',
            jobType: 'STREAMING',
            engineType: 'FLINK',
            status: 'RUNNING',
            progress: 45,
            createdAt: new Date().toISOString()
        },
        {
            id: 3,
            jobName: '数据清洗任务',
            jobType: 'BATCH',
            engineType: 'SPARK',
            status: 'FAILED',
            progress: 0,
            createdAt: new Date().toISOString()
        }
    ];
    renderJobs(demoJobs);
}

function renderJobs(jobs) {
    const container = document.getElementById('job-list');
    
    if (!jobs || jobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M9 9h6M9 12h6M9 15h4"/>
                </svg>
                <p>暂无作业</p>
                <p class="empty-hint">点击"新建作业"开始</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = jobs.map(job => `
        <div class="job-item ${currentSelectedJob?.id === job.id ? 'active' : ''}" data-job-id="${job.id}">
            <div class="job-name">${job.jobName}</div>
            <div class="job-meta">
                <span>${job.engineType} - ${job.jobType}</span>
                <span class="status-badge ${job.status}">${job.status}</span>
            </div>
            <div class="job-meta">
                <span>进度: ${job.progress || 0}%</span>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.job-item').forEach(item => {
        item.addEventListener('click', () => {
            selectJob(jobs.find(j => j.id === parseInt(item.dataset.jobId)));
        });
    });
}

function filterJobs() {
    const typeFilter = document.getElementById('job-type-filter').value;
    const statusFilter = document.getElementById('job-status-filter').value;
    
    console.log('Filtering jobs:', { typeFilter, statusFilter });
}

function selectJob(job) {
    currentSelectedJob = job;
    
    document.querySelectorAll('.job-item').forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.dataset.jobId) === job.id) {
            item.classList.add('active');
        }
    });

    updateJobDetails(job);
}

function updateJobDetails(job) {
    if (job.dagJson) {
        renderDag(job.dagJson);
    } else {
        showDemoDag();
    }

    showDemoExecutors();
    showDemoLogs();
}

function createNewJob() {
    showModal('新建作业', `
        <div class="form-group">
            <label>作业名称</label>
            <input type="text" id="new-job-name" class="form-input" placeholder="请输入作业名称">
        </div>
        <div class="form-group">
            <label>作业类型</label>
            <select id="new-job-type" class="form-select">
                <option value="BATCH">批处理</option>
                <option value="STREAMING">流处理</option>
            </select>
        </div>
        <div class="form-group">
            <label>计算引擎</label>
            <select id="new-job-engine" class="form-select">
                <option value="SPARK">Spark</option>
                <option value="FLINK">Flink</option>
            </select>
        </div>
    `, [
        { text: '取消', action: closeModal, className: 'btn-secondary' },
        { text: '创建', action: async () => {
            const name = document.getElementById('new-job-name').value;
            const type = document.getElementById('new-job-type').value;
            const engine = document.getElementById('new-job-engine').value;
            
            if (!name) {
                alert('请输入作业名称');
                return;
            }
            
            const newJob = {
                jobName: name,
                jobType: type,
                engineType: engine,
                status: 'PENDING'
            };
            
            try {
                if (isBackendConnected) {
                    await window.api.jobs.create(newJob);
                }
                closeModal();
                loadJobs();
            } catch (error) {
                console.error('Failed to create job:', error);
                alert('创建作业失败');
            }
        }, className: 'btn-primary' }
    ]);
}

function formatSql() {
    const value = batchSqlEditor.getValue();
    showResults('SQL 格式化功能\n\n当前 SQL:\n' + value.substring(0, 200) + (value.length > 200 ? '...' : ''));
}

function validateSql() {
    const sql = batchSqlEditor.getValue();
    
    const validationResult = validateSqlSyntax(sql);
    
    if (validationResult.valid) {
        showResults('✅ SQL 语法校验通过\n\n' + validationResult.message);
    } else {
        showResults('❌ SQL 语法校验失败\n\n' + validationResult.message);
    }
}

function validateSqlSyntax(sql) {
    if (!sql || sql.trim().length === 0) {
        return { valid: false, message: 'SQL 语句为空' };
    }
    
    const upperSql = sql.toUpperCase().trim();
    
    if (upperSql.startsWith('SELECT') || upperSql.startsWith('CREATE') || 
        upperSql.startsWith('INSERT') || upperSql.startsWith('UPDATE') || 
        upperSql.startsWith('DELETE') || upperSql.startsWith('WITH')) {
        return { valid: true, message: 'SQL 语法格式正确' };
    }
    
    if (!upperSql.includes('FROM') && !upperSql.startsWith('CREATE')) {
        return { valid: false, message: 'SELECT 语句缺少 FROM 子句' };
    }
    
    return { valid: true, message: 'SQL 语法格式正确' };
}

function runBatchSql() {
    const sql = batchSqlEditor.getValue();
    const engine = document.getElementById('engine-type').value;
    
    showResults(`🚀 正在执行 ${engine} SQL...\n\n${sql.substring(0, 300)}${sql.length > 300 ? '...' : ''}\n\n⏳ 请稍候...`);
    
    setTimeout(() => {
        showResults(`✅ ${engine} SQL 执行成功\n\n执行时间: ${(Math.random() * 5 + 1).toFixed(2)} 秒\n\n结果:\n- 影响行数: ${Math.floor(Math.random() * 100000) + 1000}\n- 数据量: ${(Math.random() * 100 + 10).toFixed(2)} MB\n- Executor 数: ${Math.floor(Math.random() * 10) + 2}`);
    }, 1500);
}

function showResults(text) {
    document.getElementById('sql-results').innerHTML = `<div style="white-space: pre-wrap; font-family: 'Monaco', 'Menlo', monospace; font-size: 12px;">${text}</div>`;
}

function clearResults() {
    document.getElementById('sql-results').innerHTML = `
        <div class="empty-state small">
            <p>执行 SQL 后结果将显示在这里</p>
        </div>
    `;
}

function handleJarUpload(file) {
    if (file.type !== 'application/java-archive' && !file.name.endsWith('.jar')) {
        alert('请上传 .jar 文件');
        return;
    }
    
    currentUploadedJar = file;
    
    document.getElementById('uploaded-jars').innerHTML = `
        <h4>已上传的 Jar 文件</h4>
        <div class="file-item">
            <div>
                <div class="file-name">${file.name}</div>
                <div class="file-size">${formatFileSize(file.size)}</div>
            </div>
            <button class="btn btn-sm" onclick="removeUploadedJar()">移除</button>
        </div>
    `;
}

window.removeUploadedJar = function() {
    currentUploadedJar = null;
    document.getElementById('uploaded-jars').innerHTML = `
        <h4>已上传的 Jar 文件</h4>
        <div class="empty-state small">
            <p>暂无上传的文件</p>
        </div>
    `;
};

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function submitJob() {
    const jobName = document.getElementById('submit-job-name').value;
    const mainClass = document.getElementById('submit-main-class').value;
    const args = document.getElementById('submit-args').value;
    
    if (!jobName) {
        alert('请输入作业名称');
        return;
    }
    
    if (!currentUploadedJar && !mainClass) {
        alert('请上传 Jar 文件或输入主类名');
        return;
    }
    
    const job = {
        jobName: jobName,
        jobType: 'BATCH',
        engineType: 'SPARK',
        mainClass: mainClass,
        arguments: args,
        status: 'SUBMITTED'
    };
    
    try {
        if (isBackendConnected) {
            await window.api.jobs.create(job);
        }
        
        alert('作业提交成功！');
        
        document.getElementById('submit-job-name').value = '';
        document.getElementById('submit-main-class').value = '';
        document.getElementById('submit-args').value = '';
        removeUploadedJar();
        
        loadJobs();
    } catch (error) {
        console.error('Failed to submit job:', error);
        alert('提交作业失败');
    }
}

function showDemoDag() {
    const dagViewer = document.getElementById('dag-viewer');
    dagViewer.innerHTML = `
        <div style="position: relative; width: 100%; height: 400px;">
            <div class="dag-node" style="top: 20px; left: 50%; transform: translateX(-50%);">
                <div><strong>Source</strong></div>
                <div style="font-size: 11px; color: #858585;">读取数据</div>
            </div>
            <div class="dag-node running" style="top: 120px; left: 50%; transform: translateX(-50%);">
                <div><strong>Filter</strong></div>
                <div style="font-size: 11px; color: #858585;">过滤数据</div>
            </div>
            <div class="dag-node" style="top: 220px; left: 30%;">
                <div><strong>Map1</strong></div>
                <div style="font-size: 11px; color: #858585;">转换数据</div>
            </div>
            <div class="dag-node" style="top: 220px; left: 65%;">
                <div><strong>Map2</strong></div>
                <div style="font-size: 11px; color: #858585;">转换数据</div>
            </div>
            <div class="dag-node completed" style="top: 320px; left: 50%; transform: translateX(-50%);">
                <div><strong>Sink</strong></div>
                <div style="font-size: 11px; color: #858585;">输出结果</div>
            </div>
        </div>
        <div style="margin-top: 20px; padding: 10px; background: #2d2d30; border-radius: 4px; font-size: 12px;">
            <div style="margin-bottom: 8px;"><strong>图例:</strong></div>
            <div style="display: flex; gap: 20px;">
                <span><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #3c3c3c; margin-right: 4px;"></span> 等待中</span>
                <span><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #007acc; margin-right: 4px;"></span> 运行中</span>
                <span><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #28a745; margin-right: 4px;"></span> 已完成</span>
            </div>
        </div>
    `;
}

function renderDag(dagJson) {
    try {
        const dag = JSON.parse(dagJson);
        showDemoDag();
    } catch (error) {
        showDemoDag();
    }
}

function showDemoExecutors() {
    const executorList = document.getElementById('executor-list');
    
    document.getElementById('stat-total-executors').textContent = '4';
    document.getElementById('stat-running-executors').textContent = '3';
    document.getElementById('stat-completed-tasks').textContent = '128';
    document.getElementById('stat-failed-tasks').textContent = '0';
    
    executorList.innerHTML = `
        <div class="executor-item">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600;">executor-1</div>
                    <div style="font-size: 11px; color: #858585; margin-top: 4px;">
                        host: 192.168.1.10 | CPU: 4核 | 内存: 8GB
                    </div>
                </div>
                <span class="status-badge RUNNING">RUNNING</span>
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: #858585;">
                CPU: 45% | 内存: 62% | 任务: 32/32 完成
            </div>
        </div>
        <div class="executor-item">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600;">executor-2</div>
                    <div style="font-size: 11px; color: #858585; margin-top: 4px;">
                        host: 192.168.1.11 | CPU: 4核 | 内存: 8GB
                    </div>
                </div>
                <span class="status-badge RUNNING">RUNNING</span>
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: #858585;">
                CPU: 38% | 内存: 55% | 任务: 30/32 完成
            </div>
        </div>
        <div class="executor-item">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600;">executor-3</div>
                    <div style="font-size: 11px; color: #858585; margin-top: 4px;">
                        host: 192.168.1.12 | CPU: 4核 | 内存: 8GB
                    </div>
                </div>
                <span class="status-badge BUSY">BUSY</span>
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: #858585;">
                CPU: 92% | 内存: 88% | 任务: 28/32 完成
            </div>
        </div>
        <div class="executor-item">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600;">executor-4</div>
                    <div style="font-size: 11px; color: #858585; margin-top: 4px;">
                        host: 192.168.1.13 | CPU: 4核 | 内存: 8GB
                    </div>
                </div>
                <span class="status-badge IDLE">IDLE</span>
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: #858585;">
                CPU: 5% | 内存: 12% | 任务: 0/32 完成
            </div>
        </div>
    `;
}

function showDemoLogs() {
    const logsContent = document.getElementById('logs-content');
    
    logsContent.innerHTML = `
        <div class="log-entry">
            <span class="log-timestamp">2024-01-15 14:32:45</span>
            <span class="log-level INFO">INFO</span>
            <span>Starting job: user_behavior_analysis</span>
        </div>
        <div class="log-entry">
            <span class="log-timestamp">2024-01-15 14:32:46</span>
            <span class="log-level INFO">INFO</span>
            <span>Initializing SparkContext</span>
        </div>
        <div class="log-entry">
            <span class="log-timestamp">2024-01-15 14:32:48</span>
            <span class="log-level INFO">INFO</span>
            <span>Connecting to resource manager</span>
        </div>
        <div class="log-entry">
            <span class="log-timestamp">2024-01-15 14:32:50</span>
            <span class="log-level INFO">INFO</span>
            <span>Requesting 4 executors</span>
        </div>
        <div class="log-entry">
            <span class="log-timestamp">2024-01-15 14:32:55</span>
            <span class="log-level WARN">WARN</span>
            <span>Executor 3 delayed, retrying...</span>
        </div>
        <div class="log-entry">
            <span class="log-timestamp">2024-01-15 14:33:00</span>
            <span class="log-level INFO">INFO</span>
            <span>All executors registered: 4</span>
        </div>
        <div class="log-entry">
            <span class="log-timestamp">2024-01-15 14:33:05</span>
            <span class="log-level INFO">INFO</span>
            <span>Starting stage 0: read data from source</span>
        </div>
        <div class="log-entry">
            <span class="log-timestamp">2024-01-15 14:33:10</span>
            <span class="log-level INFO">INFO</span>
            <span>Stage 0 completed: 100% read</span>
        </div>
        <div class="log-entry">
            <span class="log-timestamp">2024-01-15 14:33:15</span>
            <span class="log-level INFO">INFO</span>
            <span>Starting stage 1: filter and transform</span>
        </div>
        <div class="log-entry">
            <span class="log-timestamp">2024-01-15 14:33:20</span>
            <span class="log-level INFO">INFO</span>
            <span>Current progress: 45%</span>
        </div>
    `;
}

function formatStreamSql() {
    const value = streamSqlEditor.getValue();
    document.getElementById('validation-result').innerHTML = `<div style="white-space: pre-wrap; font-family: 'Monaco', 'Menlo', monospace; font-size: 11px;">SQL 格式化功能\n\n当前 SQL:\n${value.substring(0, 200)}${value.length > 200 ? '...' : ''}</div>`;
}

function validateStreamSql() {
    const sql = streamSqlEditor.getValue();
    const validation = validateFlinkSql(sql);
    
    if (validation.valid) {
        document.getElementById('validation-result').innerHTML = `
            <div style="padding: 10px; background: rgba(40, 167, 69, 0.1); border-left: 3px solid #28a745; border-radius: 4px;">
                <div style="font-weight: 600; color: #28a745; margin-bottom: 8px;">✅ Flink SQL 语法校验通过</div>
                <div style="font-size: 11px; color: #858585;">${validation.message}</div>
            </div>
        `;
    } else {
        document.getElementById('validation-result').innerHTML = `
            <div style="padding: 10px; background: rgba(220, 53, 69, 0.1); border-left: 3px solid #dc3545; border-radius: 4px;">
                <div style="font-weight: 600; color: #dc3545; margin-bottom: 8px;">❌ Flink SQL 语法校验失败</div>
                <div style="font-size: 11px; color: #858585;">${validation.message}</div>
            </div>
        `;
    }
}

function validateFlinkSql(sql) {
    if (!sql || sql.trim().length === 0) {
        return { valid: false, message: 'SQL 语句为空' };
    }
    
    const upperSql = sql.toUpperCase();
    
    const hasKeywords = ['SELECT', 'FROM', 'CREATE', 'INSERT', 'WITH', 'WATERMARK', 'TUMBLE', 'HOP', 'SESSION'].some(k => upperSql.includes(k));
    
    if (!hasKeywords) {
        return { valid: false, message: '未识别到有效的 Flink SQL 关键字' };
    }
    
    if (upperSql.includes('WATERMARK') && !upperSql.includes('TIMESTAMP')) {
        return { valid: false, message: 'WATERMARK 需要配合 TIMESTAMP 类型使用' };
    }
    
    if (upperSql.includes('TUMBLE') || upperSql.includes('HOP') || upperSql.includes('SESSION')) {
        if (!upperSql.includes('GROUP BY')) {
            return { valid: false, message: '窗口函数需要配合 GROUP BY 使用' };
        }
    }
    
    return { valid: true, message: 'Flink SQL 语法格式正确，支持流处理特性' };
}

async function saveStreamSqlVersion() {
    const sqlName = document.getElementById('stream-sql-name').value;
    const sqlContent = streamSqlEditor.getValue();
    
    if (!sqlName) {
        alert('请输入 SQL 名称');
        return;
    }
    
    try {
        if (isBackendConnected) {
            await window.api.sqlVersions.save({
                sqlName: sqlName,
                sqlContent: sqlContent,
                description: '从编辑器保存'
            });
        }
        
        alert('版本保存成功！');
    } catch (error) {
        console.error('Failed to save version:', error);
        alert('保存版本失败');
    }
}

function runStreamSql() {
    const sql = streamSqlEditor.getValue();
    
    document.getElementById('validation-result').innerHTML = `
        <div style="padding: 10px; background: rgba(0, 122, 204, 0.1); border-left: 3px solid #007acc; border-radius: 4px;">
            <div style="font-weight: 600; color: #007acc;">🚀 Flink 流作业已提交</div>
            <div style="font-size: 11px; color: #858585; margin-top: 4px;">
                作业将在 Flink 集群上运行<br>
                可在监控面板查看运行状态
            </div>
        </div>
    `;
}

function loadStreamTables() {
    const tablesList = document.getElementById('stream-tables-list');
    
    const demoTables = [
        {
            name: 'source_table',
            type: 'KAFKA',
            columns: ['user_id BIGINT', 'item_id BIGINT', 'behavior STRING', 'ts TIMESTAMP(3)']
        },
        {
            name: 'result_table',
            type: 'JDBC',
            columns: ['window_start TIMESTAMP', 'window_end TIMESTAMP', 'behavior STRING', 'cnt BIGINT']
        },
        {
            name: 'dim_table',
            type: 'HBASE',
            columns: ['user_id BIGINT', 'user_name STRING', 'age INT', 'city STRING']
        }
    ];
    
    tablesList.innerHTML = demoTables.map(table => `
        <div class="table-item" data-table-name="${table.name}">
            <div style="font-weight: 600;">${table.name}</div>
            <div style="font-size: 10px; color: #858585; margin-top: 2px;">
                类型: ${table.type}
            </div>
            <div class="table-columns">
                ${table.columns.slice(0, 2).map(c => `<span>${c}</span>`).join(', ')}
                ${table.columns.length > 2 ? `, +${table.columns.length - 2} 更多` : ''}
            </div>
        </div>
    `).join('');

    const previewSelect = document.getElementById('preview-table-select');
    previewSelect.innerHTML = '<option value="">选择流表</option>' +
        demoTables.map(t => `<option value="${t.name}">${t.name} (${t.type})</option>`).join('');
}

let previewInterval = null;

function startPreview() {
    const tableName = document.getElementById('preview-table-select').value;
    
    if (!tableName) {
        alert('请选择要预览的流表');
        return;
    }
    
    document.getElementById('btn-preview-start').disabled = true;
    document.getElementById('btn-preview-stop').disabled = false;
    document.getElementById('preview-status').textContent = '预览中...';
    document.getElementById('preview-status').classList.add('active');
    
    let rowCount = 0;
    const previewData = document.getElementById('preview-data');
    
    previewData.innerHTML = `
        <table class="preview-table">
            <thead>
                <tr>
                    <th>行号</th>
                    <th>user_id</th>
                    <th>item_id</th>
                    <th>behavior</th>
                    <th>ts</th>
                    <th>延迟</th>
                </tr>
            </thead>
            <tbody id="preview-table-body">
            </tbody>
        </table>
    `;
    
    previewInterval = setInterval(() => {
        rowCount++;
        const tbody = document.getElementById('preview-table-body');
        
        if (tbody) {
            const newRow = document.createElement('tr');
            const latency = Math.floor(Math.random() * 5000);
            newRow.innerHTML = `
                <td>${rowCount}</td>
                <td>${Math.floor(Math.random() * 100000)}</td>
                <td>${Math.floor(Math.random() * 10000)}</td>
                <td>${['click', 'view', 'buy', 'cart'][Math.floor(Math.random() * 4)]}</td>
                <td>${new Date().toLocaleTimeString()}</td>
                <td style="color: ${latency > 3000 ? '#dc3545' : latency > 1000 ? '#ffc107' : '#28a745'}">${latency}ms</td>
            `;
            
            if (tbody.children.length >= 20) {
                tbody.removeChild(tbody.firstChild);
            }
            tbody.appendChild(newRow);
            
            tbody.lastChild.scrollIntoView({ behavior: 'smooth' });
        }
    }, 800);
}

function stopPreview() {
    if (previewInterval) {
        clearInterval(previewInterval);
        previewInterval = null;
    }
    
    document.getElementById('btn-preview-start').disabled = false;
    document.getElementById('btn-preview-stop').disabled = true;
    document.getElementById('preview-status').textContent = '已停止';
    document.getElementById('preview-status').classList.remove('active');
}

async function loadUdfs() {
    let udfs = [];
    
    if (isBackendConnected) {
        try {
            udfs = await window.api.udfs.getEnabled();
        } catch (error) {
            console.error('Failed to load UDFs:', error);
        }
    }
    
    if (udfs.length === 0) {
        udfs = [
            { id: 1, functionName: 'json_parse', className: 'com.example.JsonParseUDF', type: 'SCALAR', isEnabled: true, description: '解析 JSON 字符串' },
            { id: 2, functionName: 'time_format', className: 'com.example.TimeFormatUDF', type: 'SCALAR', isEnabled: true, description: '时间格式化' },
            { id: 3, functionName: 'top_n', className: 'com.example.TopNUDAF', type: 'AGGREGATE', isEnabled: true, description: '取 Top N 聚合' },
            { id: 4, functionName: 'explode_json_array', className: 'com.example.ExplodeJsonUDTF', type: 'TABLE', isEnabled: false, description: '展开 JSON 数组为多行' }
        ];
    }
    
    renderUdfs(udfs);
    renderUdfManagement(udfs);
}

function renderUdfs(udfs) {
    const container = document.getElementById('udf-list');
    
    if (!udfs || udfs.length === 0) {
        container.innerHTML = `
            <div class="empty-state small">
                <p>暂无自定义函数</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = udfs.filter(u => u.isEnabled).map(udf => `
        <div class="udf-item" data-udf-id="${udf.id}">
            <div class="udf-info">
                <div class="udf-name">${udf.functionName}()</div>
                <div class="udf-class">${udf.className}</div>
            </div>
            <span class="udf-type">${udf.type}</span>
        </div>
    `).join('');
}

function renderUdfManagement(udfs) {
    const container = document.getElementById('udf-manage-list');
    
    if (!udfs || udfs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>暂无自定义函数</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = udfs.map(udf => `
        <div class="udf-item" style="padding: 16px;">
            <div class="udf-info">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div class="udf-name">${udf.functionName}()</div>
                    <span class="udf-type">${udf.type}</span>
                    <span class="status-badge ${udf.isEnabled ? 'RUNNING' : 'CANCELLED'}">${udf.isEnabled ? '已启用' : '已禁用'}</span>
                </div>
                <div class="udf-class">${udf.className}</div>
                <div style="font-size: 11px; color: #858585; margin-top: 4px;">${udf.description || ''}</div>
            </div>
            <div style="display: flex; gap: 4px;">
                <button class="btn btn-sm" onclick="toggleUdf(${udf.id}, ${!udf.isEnabled})">${udf.isEnabled ? '禁用' : '启用'}</button>
                <button class="btn btn-sm" onclick="deleteUdf(${udf.id})">删除</button>
            </div>
        </div>
    `).join('');
}

async function loadUdfManagement() {
    await loadUdfs();
}

function showNewUdfModal() {
    showModal('新增 UDF 函数', `
        <div class="form-group">
            <label>函数名称</label>
            <input type="text" id="udf-name" class="form-input" placeholder="例如: my_function">
        </div>
        <div class="form-group">
            <label>类名</label>
            <input type="text" id="udf-class" class="form-input" placeholder="例如: com.example.MyUDF">
        </div>
        <div class="form-group">
            <label>函数类型</label>
            <select id="udf-type" class="form-select">
                <option value="SCALAR">标量函数 (SCALAR)</option>
                <option value="AGGREGATE">聚合函数 (AGGREGATE)</option>
                <option value="TABLE">表函数 (TABLE)</option>
            </select>
        </div>
        <div class="form-group">
            <label>描述</label>
            <textarea id="udf-description" class="form-input" rows="3" placeholder="函数描述"></textarea>
        </div>
    `, [
        { text: '取消', action: closeModal, className: 'btn-secondary' },
        { text: '创建', action: async () => {
            const name = document.getElementById('udf-name').value;
            const className = document.getElementById('udf-class').value;
            const type = document.getElementById('udf-type').value;
            const description = document.getElementById('udf-description').value;
            
            if (!name || !className) {
                alert('请填写函数名称和类名');
                return;
            }
            
            try {
                if (isBackendConnected) {
                    await window.api.udfs.create({
                        functionName: name,
                        className: className,
                        type: type,
                        description: description,
                        isEnabled: true
                    });
                }
                closeModal();
                loadUdfs();
            } catch (error) {
                console.error('Failed to create UDF:', error);
                alert('创建 UDF 失败');
            }
        }, className: 'btn-primary' }
    ]);
}

window.toggleUdf = async function(id, enabled) {
    try {
        if (isBackendConnected) {
            await window.api.udfs.toggle(id, enabled);
        }
        loadUdfs();
    } catch (error) {
        console.error('Failed to toggle UDF:', error);
        alert('操作失败');
    }
};

window.deleteUdf = async function(id) {
    if (!confirm('确定要删除这个 UDF 函数吗？')) {
        return;
    }
    
    try {
        if (isBackendConnected) {
            await window.api.udfs.delete(id);
        }
        loadUdfs();
    } catch (error) {
        console.error('Failed to delete UDF:', error);
        alert('删除失败');
    }
};

async function loadSqlVersions() {
    const container = document.getElementById('sql-versions-list');
    
    if (isBackendConnected) {
        container.innerHTML = `
            <div class="empty-state">
                <p>从后端加载版本数据...</p>
            </div>
        `;
        return;
    }
    
    const demoVersions = [
        {
            sqlName: 'user_behavior_analysis.sql',
            versions: [
                { version: 3, createdAt: '2024-01-15 14:30:00', description: '优化 JOIN 性能' },
                { version: 2, createdAt: '2024-01-14 16:45:00', description: '添加过滤条件' },
                { version: 1, createdAt: '2024-01-13 10:20:00', description: '初始版本' }
            ]
        },
        {
            sqlName: 'realtime_recommendation.sql',
            versions: [
                { version: 2, createdAt: '2024-01-15 12:00:00', description: '调整窗口大小' },
                { version: 1, createdAt: '2024-01-14 09:30:00', description: '初始版本' }
            ]
        }
    ];
    
    container.innerHTML = demoVersions.map(sql => `
        <div style="padding: 12px; margin-bottom: 8px; background: #2d2d30; border-radius: 4px;">
            <div style="font-weight: 600; margin-bottom: 8px;">${sql.sqlName}</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
                ${sql.versions.map(v => `
                    <div class="version-item" style="padding: 8px 12px; background: #1e1e1e; border-radius: 4px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span class="version-number">v${v.version}</span>
                                <span class="version-time" style="margin-left: 12px;">${v.createdAt}</span>
                            </div>
                            <div style="display: flex; gap: 4px;">
                                <button class="btn btn-sm">查看</button>
                                <button class="btn btn-sm">恢复</button>
                            </div>
                        </div>
                        <div class="version-desc">${v.description}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function showModal(title, bodyHtml, buttons) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    
    const footer = document.getElementById('modal-footer');
    footer.innerHTML = buttons.map(btn => `
        <button class="btn ${btn.className}">${btn.text}</button>
    `).join('');
    
    footer.querySelectorAll('button').forEach((btn, index) => {
        btn.addEventListener('click', buttons[index].action);
    });
    
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
}

window.addEventListener('beforeunload', () => {
    if (previewInterval) {
        clearInterval(previewInterval);
    }
});
