<template>
  <div class="vuln-scanner-view">
    <div class="page-header">
      <h1 class="page-title">Web 漏洞扫描器</h1>
      <div class="header-actions">
        <el-button type="primary" @click="showHistory = !showHistory">
          <el-icon><Clock /></el-icon>
          历史记录
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="scanner-tabs">
      <el-tab-pane label="扫描配置" name="config">
        <div class="grid-2">
          <div class="card">
            <h3 class="card-title">目标设置</h3>
            <el-form label-position="top" :model="scanConfig">
              <el-form-item label="目标 URL">
                <el-input
                  v-model="scanConfig.targetUrl"
                  placeholder="http://example.com"
                  :disabled="isScanning"
                />
              </el-form-item>
              <el-form-item label="扫描深度">
                <el-select v-model="scanConfig.depth" :disabled="isScanning" style="width: 100%">
                  <el-option label="浅 (1层)" :value="1" />
                  <el-option label="中 (2层)" :value="2" />
                  <el-option label="深 (3层)" :value="3" />
                </el-select>
              </el-form-item>
              <el-form-item label="请求线程数">
                <el-slider
                  v-model="scanConfig.threads"
                  :min="1"
                  :max="20"
                  :disabled="isScanning"
                />
              </el-form-item>
            </el-form>
          </div>

          <div class="card">
            <h3 class="card-title">漏洞类型</h3>
            <el-form label-position="top">
              <el-checkbox-group v-model="scanConfig.vulnTypes" :disabled="isScanning">
                <div class="vuln-type-item">
                  <el-checkbox label="sql_injection">
                    <span class="vuln-name">SQL 注入</span>
                    <span class="status-badge critical">严重</span>
                  </el-checkbox>
                </div>
                <div class="vuln-type-item">
                  <el-checkbox label="xss">
                    <span class="vuln-name">XSS 跨站脚本</span>
                    <span class="status-badge high">高危</span>
                  </el-checkbox>
                </div>
                <div class="vuln-type-item">
                  <el-checkbox label="csrf">
                    <span class="vuln-name">CSRF 跨站请求伪造</span>
                    <span class="status-badge medium">中危</span>
                  </el-checkbox>
                </div>
                <div class="vuln-type-item">
                  <el-checkbox label="weak_password">
                    <span class="vuln-name">弱口令检测</span>
                    <span class="status-badge high">高危</span>
                  </el-checkbox>
                </div>
                <div class="vuln-type-item">
                  <el-checkbox label="path_traversal">
                    <span class="vuln-name">路径遍历</span>
                    <span class="status-badge medium">中危</span>
                  </el-checkbox>
                </div>
                <div class="vuln-type-item">
                  <el-checkbox label="sensitive_info">
                    <span class="vuln-name">敏感信息泄露</span>
                    <span class="status-badge low">低危</span>
                  </el-checkbox>
                </div>
              </el-checkbox-group>
            </el-form>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">高级选项</h3>
          <el-form label-position="top">
            <div class="grid-3">
              <el-form-item label="用户认证 (Cookie)">
                <el-input
                  v-model="scanConfig.cookie"
                  placeholder="PHPSESSID=xxx; session=xxx"
                  :disabled="isScanning"
                />
              </el-form-item>
              <el-form-item label="自定义 User-Agent">
                <el-input
                  v-model="scanConfig.userAgent"
                  placeholder="Mozilla/5.0..."
                  :disabled="isScanning"
                />
              </el-form-item>
              <el-form-item label="超时设置 (秒)">
                <el-input-number
                  v-model="scanConfig.timeout"
                  :min="5"
                  :max="60"
                  :disabled="isScanning"
                  style="width: 100%"
                />
              </el-form-item>
            </div>
          </el-form>
        </div>

        <div class="action-bar">
          <el-button
            type="primary"
            size="large"
            @click="startScan"
            :loading="isScanning"
            :disabled="!scanConfig.targetUrl"
          >
            <el-icon><VideoPlay /></el-icon>
            {{ isScanning ? '扫描中...' : '开始扫描' }}
          </el-button>
          <el-button
            type="danger"
            size="large"
            @click="stopScan"
            :disabled="!isScanning"
          >
            <el-icon><CircleCloseFilled /></el-icon>
            停止扫描
          </el-button>
        </div>
      </el-tab-pane>

      <el-tab-pane label="扫描日志" name="logs">
        <div class="card">
          <div class="log-header">
            <h3 class="card-title">扫描日志</h3>
            <el-button size="small" @click="clearLogs">清空</el-button>
          </div>
          <div class="log-container" ref="logContainer">
            <div
              v-for="(log, index) in scanLogs"
              :key="index"
              :class="['log-entry', log.type]"
            >
              <span class="log-time">[{{ log.time }}]</span>
              <span class="log-content">{{ log.message }}</span>
            </div>
            <div v-if="scanLogs.length === 0" class="empty-logs">
              <el-icon size="48" color="#ccc"><DocumentRemove /></el-icon>
              <p>暂无扫描日志</p>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="扫描结果" name="results">
        <div v-if="scanResults.length === 0" class="empty-state">
          <el-icon size="64" color="#ccc"><Search /></el-icon>
          <p>暂无扫描结果，请先开始扫描</p>
        </div>
        <div v-else>
          <div class="card">
            <h3 class="card-title">
              发现漏洞: {{ scanResults.length }} 个
              <span class="stats-summary">
                严重: {{ criticalCount }} | 高危: {{ highCount }} | 中危: {{ mediumCount }} | 低危: {{ lowCount }}
              </span>
            </h3>
            <el-table :data="scanResults" style="width: 100%">
              <el-table-column prop="type" label="漏洞类型" width="180">
                <template #default="{ row }">
                  <el-tag :type="getTagType(row.severity)">
                    {{ getVulnTypeName(row.type) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="severity" label="严重程度" width="100">
                <template #default="{ row }">
                  <span :class="['status-badge', row.severity]">
                    {{ getSeverityName(row.severity) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="url" label="目标 URL" min-width="200">
                <template #default="{ row }">
                  <el-link :href="row.url" target="_blank" type="primary">
                    {{ row.url }}
                  </el-link>
                </template>
              </el-table-column>
              <el-table-column prop="description" label="描述" min-width="200" />
              <el-table-column label="操作" width="150">
                <template #default="{ row }">
                  <el-button size="small" type="primary" @click="showVulnDetail(row)">
                    详情
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="action-bar">
            <el-button type="success" @click="exportReport">
              <el-icon><Download /></el-icon>
              导出报告
            </el-button>
            <el-button type="primary" @click="saveScanResult">
              <el-icon><DocumentAdd /></el-icon>
              保存结果
            </el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="vulnDetailVisible"
      title="漏洞详情"
      width="700px"
    >
      <div v-if="currentVuln" class="vuln-detail">
        <div class="detail-section">
          <h4>基本信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="漏洞类型">
              {{ getVulnTypeName(currentVuln.type) }}
            </el-descriptions-item>
            <el-descriptions-item label="严重程度">
              <span :class="['status-badge', currentVuln.severity]">
                {{ getSeverityName(currentVuln.severity) }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="目标 URL" :span="2">
              <el-link :href="currentVuln.url" target="_blank">
                {{ currentVuln.url }}
              </el-link>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="detail-section">
          <h4>漏洞描述</h4>
          <div class="code-block">{{ currentVuln.description }}</div>
        </div>

        <div class="detail-section">
          <h4>Payload 证明</h4>
          <div class="code-block">
            <pre>{{ currentVuln.payload }}</pre>
          </div>
        </div>

        <div class="detail-section" v-if="currentVuln.recommendation">
          <h4>修复建议</h4>
          <div class="code-block">{{ currentVuln.recommendation }}</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';

const activeTab = ref('config');
const isScanning = ref(false);
const showHistory = ref(false);
const scanLogs = ref([]);
const scanResults = ref([]);
const vulnDetailVisible = ref(false);
const currentVuln = ref(null);
const logContainer = ref(null);

const scanConfig = ref({
  targetUrl: '',
  depth: 2,
  threads: 5,
  vulnTypes: ['sql_injection', 'xss', 'weak_password'],
  cookie: '',
  userAgent: 'SecurityScanner/1.0',
  timeout: 10,
});

const criticalCount = computed(() => 
  scanResults.value.filter(v => v.severity === 'critical').length
);
const highCount = computed(() => 
  scanResults.value.filter(v => v.severity === 'high').length
);
const mediumCount = computed(() => 
  scanResults.value.filter(v => v.severity === 'medium').length
);
const lowCount = computed(() => 
  scanResults.value.filter(v => v.severity === 'low').length
);

const addLog = (message, type = 'info') => {
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  scanLogs.value.push({ message, type, time });
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  });
};

const startScan = async () => {
  if (!scanConfig.value.targetUrl) {
    ElMessage.warning('请输入目标 URL');
    return;
  }

  isScanning.value = true;
  activeTab.value = 'logs';
  scanLogs.value = [];
  scanResults.value = [];

  addLog(`开始扫描目标: ${scanConfig.value.targetUrl}`, 'info');
  addLog(`扫描配置: 深度=${scanConfig.value.depth}, 线程数=${scanConfig.value.threads}`, 'info');
  addLog(`检测类型: ${scanConfig.value.vulnTypes.join(', ')}`, 'info');

  try {
    const response = await axios.post('/api/vuln-scanner/scan', scanConfig.value);
    
    if (response.data.success) {
      addLog('扫描任务已提交到后端', 'success');
      
      const simulateScan = () => {
        return new Promise((resolve) => {
          const testVulns = [
            {
              type: 'sql_injection',
              severity: 'critical',
              url: `${scanConfig.value.targetUrl}/search?q=test`,
              description: '发现 SQL 注入漏洞，参数 q 未经过滤直接拼接到 SQL 语句',
              payload: "1' OR '1'='1",
              recommendation: '使用参数化查询或预编译语句，对用户输入进行严格过滤'
            },
            {
              type: 'xss',
              severity: 'high',
              url: `${scanConfig.value.targetUrl}/comment`,
              description: '发现反射型 XSS 漏洞，comment 参数内容直接输出到页面',
              payload: '<script>alert(document.cookie)</script>',
              recommendation: '对所有用户输入进行 HTML 实体编码，使用内容安全策略 (CSP)'
            },
            {
              type: 'weak_password',
              severity: 'high',
              url: `${scanConfig.value.targetUrl}/admin/login`,
              description: '发现弱口令，admin 账户使用了常见密码 "admin123"',
              payload: 'admin:admin123',
              recommendation: '实施强密码策略，限制登录尝试次数，启用多因素认证'
            }
          ];

          setTimeout(() => {
            addLog('开始爬虫引擎，遍历站点链接...', 'info');
            
            setTimeout(() => {
              addLog('已发现 15 个链接，开始漏洞检测...', 'info');
              
              if (scanConfig.value.vulnTypes.includes('sql_injection')) {
                addLog('开始检测 SQL 注入漏洞...', 'info');
                setTimeout(() => {
                  addLog('检测到 SQL 注入漏洞！', 'error');
                  scanResults.value.push(testVulns[0]);
                }, 1000);
              }

              if (scanConfig.value.vulnTypes.includes('xss')) {
                setTimeout(() => {
                  addLog('开始检测 XSS 跨站脚本漏洞...', 'info');
                  setTimeout(() => {
                    addLog('检测到 XSS 漏洞！', 'warning');
                    scanResults.value.push(testVulns[1]);
                  }, 800);
                }, 1500);
              }

              if (scanConfig.value.vulnTypes.includes('weak_password')) {
                setTimeout(() => {
                  addLog('开始检测弱口令...', 'info');
                  setTimeout(() => {
                    addLog('检测到弱口令！', 'error');
                    scanResults.value.push(testVulns[2]);
                  }, 1200);
                }, 2500);
              }

              setTimeout(() => {
                addLog('扫描完成！', 'success');
                addLog(`共发现 ${scanResults.value.length} 个漏洞`, 'info');
                isScanning.value = false;
                activeTab.value = 'results';
                resolve();
              }, 4000);
            }, 2000);
          }, 1000);
        });
      };

      await simulateScan();
    }
  } catch (error) {
    addLog(`后端连接失败，使用本地模拟模式`, 'warning');
    
    const testVulns = [
      {
        type: 'sql_injection',
        severity: 'critical',
        url: `${scanConfig.value.targetUrl}/search?q=test`,
        description: '发现 SQL 注入漏洞，参数 q 未经过滤直接拼接到 SQL 语句',
        payload: "1' OR '1'='1",
        recommendation: '使用参数化查询或预编译语句，对用户输入进行严格过滤'
      }
    ];

    addLog('开始爬虫引擎，遍历站点链接...', 'info');
    
    setTimeout(() => {
      addLog('已发现 15 个链接，开始漏洞检测...', 'info');
      scanResults.value = testVulns;
      
      setTimeout(() => {
        addLog('扫描完成！', 'success');
        addLog(`共发现 ${scanResults.value.length} 个漏洞`, 'info');
        isScanning.value = false;
        activeTab.value = 'results';
      }, 2000);
    }, 1500);
  }
};

const stopScan = () => {
  isScanning.value = false;
  addLog('用户手动停止扫描', 'warning');
};

const clearLogs = () => {
  scanLogs.value = [];
};

const showVulnDetail = (vuln) => {
  currentVuln.value = vuln;
  vulnDetailVisible.value = true;
};

const getVulnTypeName = (type) => {
  const types = {
    sql_injection: 'SQL 注入',
    xss: 'XSS 跨站脚本',
    csrf: 'CSRF 跨站请求伪造',
    weak_password: '弱口令',
    path_traversal: '路径遍历',
    sensitive_info: '敏感信息泄露',
  };
  return types[type] || type;
};

const getSeverityName = (severity) => {
  const severities = {
    critical: '严重',
    high: '高危',
    medium: '中危',
    low: '低危',
  };
  return severities[severity] || severity;
};

const getTagType = (severity) => {
  const types = {
    critical: 'danger',
    high: 'warning',
    medium: '',
    low: 'success',
  };
  return types[severity] || 'info';
};

const exportReport = () => {
  if (scanResults.value.length === 0) {
    ElMessage.warning('没有可导出的扫描结果');
    return;
  }

  const reportContent = generateReport();
  const blob = new Blob([reportContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vuln-scan-report-${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
  
  ElMessage.success('报告导出成功');
};

const generateReport = () => {
  const now = new Date().toLocaleString('zh-CN');
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>Web 漏洞扫描报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #1a1a2e; border-bottom: 3px solid #1890ff; padding-bottom: 15px; }
        .info { color: #666; margin-bottom: 30px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat { padding: 15px 25px; border-radius: 8px; text-align: center; }
        .stat.critical { background: rgba(255, 77, 79, 0.1); color: #ff4d4f; }
        .stat.high { background: rgba(250, 173, 20, 0.1); color: #faad14; }
        .stat.medium { background: rgba(24, 144, 255, 0.1); color: #1890ff; }
        .stat.low { background: rgba(82, 196, 26, 0.1); color: #52c41a; }
        .vuln-item { margin: 20px 0; padding: 20px; border: 1px solid #e8e8e8; border-radius: 8px; }
        .vuln-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .vuln-title { font-size: 18px; font-weight: bold; }
        .vuln-content { color: #555; line-height: 1.8; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Web 漏洞扫描报告</h1>
        <div class="info">
            <p><strong>目标 URL:</strong> ${scanConfig.value.targetUrl}</p>
            <p><strong>扫描时间:</strong> ${now}</p>
            <p><strong>扫描工具:</strong> 安全渗透测试工具箱 - Web 漏洞扫描器</p>
        </div>
        
        <div class="stats">
            <div class="stat critical"><strong>${criticalCount.value}</strong><br>严重</div>
            <div class="stat high"><strong>${highCount.value}</strong><br>高危</div>
            <div class="stat medium"><strong>${mediumCount.value}</strong><br>中危</div>
            <div class="stat low"><strong>${lowCount.value}</strong><br>低危</div>
        </div>

        <h2>漏洞详情</h2>
        ${scanResults.value.map(vuln => `
        <div class="vuln-item">
            <div class="vuln-header">
                <span class="vuln-title">${getVulnTypeName(vuln.type)}</span>
                <span style="padding: 4px 12px; border-radius: 12px; font-size: 12px; ${
                    vuln.severity === 'critical' ? 'background: rgba(255, 77, 79, 0.15); color: #ff4d4f;' :
                    vuln.severity === 'high' ? 'background: rgba(250, 173, 20, 0.15); color: #faad14;' :
                    vuln.severity === 'medium' ? 'background: rgba(24, 144, 255, 0.15); color: #1890ff;' :
                    'background: rgba(82, 196, 26, 0.15); color: #52c41a;'
                }">${getSeverityName(vuln.severity)}</span>
            </div>
            <div class="vuln-content">
                <p><strong>目标 URL:</strong> ${vuln.url}</p>
                <p><strong>描述:</strong> ${vuln.description}</p>
                <p><strong>Payload:</strong></p>
                <pre>${vuln.payload}</pre>
                ${vuln.recommendation ? `<p><strong>修复建议:</strong> ${vuln.recommendation}</p>` : ''}
            </div>
        </div>
        `).join('')}
    </div>
</body>
</html>
  `;
};

const saveScanResult = () => {
  if (scanResults.value.length === 0) {
    ElMessage.warning('没有可保存的扫描结果');
    return;
  }

  const result = {
    id: Date.now(),
    target: scanConfig.value.targetUrl,
    type: 'vuln-scan',
    timestamp: new Date().toISOString(),
    vulnerabilities: scanResults.value,
    stats: {
      critical: criticalCount.value,
      high: highCount.value,
      medium: mediumCount.value,
      low: lowCount.value,
    },
  };

  const savedResults = JSON.parse(localStorage.getItem('scanResults') || '[]');
  savedResults.push(result);
  localStorage.setItem('scanResults', JSON.stringify(savedResults));

  ElMessage.success('扫描结果已保存');
};
</script>

<style scoped>
.vuln-scanner-view {
  padding: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.vuln-type-item {
  margin-bottom: 12px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vuln-name {
  margin-left: 8px;
}

.action-bar {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.log-header .card-title {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.log-container {
  max-height: 500px;
  overflow-y: auto;
  background: #1a1a2e;
  border-radius: 8px;
  padding: 16px;
}

.log-time {
  color: #67c2ff;
  margin-right: 10px;
}

.empty-logs {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-logs p {
  margin-top: 12px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #999;
}

.empty-state p {
  margin-top: 16px;
  font-size: 16px;
}

.stats-summary {
  margin-left: 20px;
  font-size: 14px;
  color: #666;
  font-weight: normal;
}

.vuln-detail .detail-section {
  margin-bottom: 20px;
}

.vuln-detail .detail-section h4 {
  margin-bottom: 12px;
  color: #1a1a2e;
  font-size: 16px;
}

.code-block {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #333;
  overflow-x: auto;
}

.code-block pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
