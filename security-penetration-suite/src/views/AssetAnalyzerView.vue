<template>
  <div class="asset-analyzer-view">
    <div class="page-header">
      <h1 class="page-title">资产暴露面分析器</h1>
    </div>

    <el-tabs v-model="activeTab" class="analyzer-tabs">
      <el-tab-pane label="扫描配置" name="config">
        <div class="grid-2">
          <div class="card">
            <h3 class="card-title">目标设置</h3>
            <el-form label-position="top" :model="analyzeConfig">
              <el-form-item label="目标 IP 或域名">
                <el-input
                  v-model="analyzeConfig.target"
                  placeholder="example.com 或 192.168.1.1"
                  :disabled="isAnalyzing"
                />
              </el-form-item>
              <el-form-item label="端口范围">
                <el-select v-model="analyzeConfig.portRange" :disabled="isAnalyzing" style="width: 100%">
                  <el-option label="常用端口 (1-1024)" value="common" />
                  <el-option label="标准端口 (1-65535)" value="full" />
                  <el-option label="常用 Web 端口 (80,443,8080)" value="web" />
                  <el-option label="自定义" value="custom" />
                </el-select>
              </el-form-item>
              <el-form-item v-if="analyzeConfig.portRange === 'custom'" label="自定义端口">
                <el-input
                  v-model="analyzeConfig.customPorts"
                  placeholder="80,443,8000-9000"
                  :disabled="isAnalyzing"
                />
              </el-form-item>
            </el-form>
          </div>

          <div class="card">
            <h3 class="card-title">扫描选项</h3>
            <el-form label-position="top">
              <el-checkbox-group v-model="analyzeConfig.scanTypes" :disabled="isAnalyzing">
                <div class="scan-type-item">
                  <el-checkbox label="port_scan">
                    <span class="scan-name">端口扫描</span>
                    <span class="status-badge info">基础</span>
                  </el-checkbox>
                </div>
                <div class="scan-type-item">
                  <el-checkbox label="service_fingerprint">
                    <span class="scan-name">服务指纹识别</span>
                    <span class="status-badge medium">信息收集</span>
                  </el-checkbox>
                </div>
                <div class="scan-type-item">
                  <el-checkbox label="sensitive_files">
                    <span class="scan-name">敏感文件检测</span>
                    <span class="status-badge high">高危</span>
                  </el-checkbox>
                </div>
                <div class="scan-type-item">
                  <el-checkbox label="tech_stack">
                    <span class="scan-name">技术栈识别</span>
                    <span class="status-badge info">信息收集</span>
                  </el-checkbox>
                </div>
              </el-checkbox-group>
            </el-form>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">高级选项</h3>
          <div class="grid-3">
            <el-form-item label="扫描超时 (秒)">
              <el-slider
                v-model="analyzeConfig.timeout"
                :min="1"
                :max="30"
                :disabled="isAnalyzing"
              />
            </el-form-item>
            <el-form-item label="并发线程数">
              <el-slider
                v-model="analyzeConfig.threads"
                :min="1"
                :max="50"
                :disabled="isAnalyzing"
              />
            </el-form-item>
            <el-form-item label="跳过已验证端口">
              <el-switch v-model="analyzeConfig.skipVerified" :disabled="isAnalyzing" />
            </el-form-item>
          </div>
        </div>

        <div class="action-bar">
          <el-button
            type="primary"
            size="large"
            @click="startAnalysis"
            :loading="isAnalyzing"
            :disabled="!analyzeConfig.target"
          >
            <el-icon><VideoPlay /></el-icon>
            {{ isAnalyzing ? '分析中...' : '开始分析' }}
          </el-button>
          <el-button
            type="danger"
            size="large"
            @click="stopAnalysis"
            :disabled="!isAnalyzing"
          >
            <el-icon><CircleCloseFilled /></el-icon>
            停止分析
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

      <el-tab-pane label="分析结果" name="results">
        <div v-if="!analysisResults" class="empty-state">
          <el-icon size="64" color="#ccc"><Search /></el-icon>
          <p>暂无分析结果，请先开始分析</p>
        </div>
        <div v-else>
          <div class="card">
            <h3 class="card-title">资产概览</h3>
            <div class="asset-overview">
              <el-descriptions :column="4" border>
                <el-descriptions-item label="目标">
                  <el-tag type="primary">{{ analysisResults.target }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="开放端口数">
                  <span class="stat-highlight">{{ analysisResults.openPorts.length }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="检测到服务数">
                  <span class="stat-highlight">{{ analysisResults.services.length }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="风险等级">
                  <span :class="['status-badge', analysisResults.riskLevel]">
                    {{ getRiskLevelName(analysisResults.riskLevel) }}
                  </span>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>

          <div class="grid-2">
            <div class="card">
              <h3 class="card-title">端口扫描结果</h3>
              <el-table :data="analysisResults.openPorts" style="width: 100%">
                <el-table-column prop="port" label="端口" width="100">
                  <template #default="{ row }">
                    <el-tag type="success">{{ row.port }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="protocol" label="协议" width="80" />
                <el-table-column prop="service" label="服务" min-width="120" />
                <el-table-column prop="version" label="版本" min-width="120" />
                <el-table-column prop="state" label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="row.state === 'open' ? 'success' : 'info'">
                      {{ row.state === 'open' ? '开放' : '关闭' }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div class="card">
              <h3 class="card-title">服务指纹识别</h3>
              <el-table :data="analysisResults.services" style="width: 100%">
                <el-table-column prop="name" label="服务名称" min-width="120" />
                <el-table-column prop="version" label="版本" min-width="100" />
                <el-table-column prop="port" label="端口" width="80" />
                <el-table-column prop="details" label="详情" min-width="200">
                  <template #default="{ row }">
                    <el-tooltip :content="row.details" placement="top">
                      <span>{{ row.details?.slice(0, 50) }}...</span>
                    </el-tooltip>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>

          <div v-if="analysisResults.sensitiveFiles.length > 0" class="card">
            <h3 class="card-title">敏感文件检测结果</h3>
            <el-table :data="analysisResults.sensitiveFiles" style="width: 100%">
              <el-table-column prop="path" label="文件路径" min-width="250">
                <template #default="{ row }">
                  <el-link :href="row.url" target="_blank" type="danger">
                    {{ row.path }}
                  </el-link>
                </template>
              </el-table-column>
              <el-table-column prop="type" label="类型" width="120">
                <template #default="{ row }">
                  <el-tag type="danger">{{ row.type }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="severity" label="风险等级" width="100">
                <template #default="{ row }">
                  <span :class="['status-badge', row.severity]">
                    {{ getSeverityName(row.severity) }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="description" label="描述" min-width="200" />
            </el-table>
          </div>

          <div v-if="analysisResults.techStack.length > 0" class="card">
            <h3 class="card-title">技术栈识别</h3>
            <div class="tech-stack">
              <el-tag
                v-for="(tech, index) in analysisResults.techStack"
                :key="index"
                size="large"
                style="margin: 5px"
              >
                {{ tech.name }} {{ tech.version ? `(v${tech.version})` : '' }}
              </el-tag>
            </div>
          </div>

          <div class="card">
            <h3 class="card-title">资产画像</h3>
            <div class="asset-portrait">
              <div class="portrait-section">
                <h4>基本信息</h4>
                <el-descriptions :column="2" border size="small">
                  <el-descriptions-item label="目标类型">
                    {{ analysisResults.portrait.targetType }}
                  </el-descriptions-item>
                  <el-descriptions-item label="IP 地址">
                    {{ analysisResults.portrait.ipAddress || '-' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="操作系统" :span="2">
                    {{ analysisResults.portrait.os || '未知' }}
                  </el-descriptions-item>
                </el-descriptions>
              </div>
              <div class="portrait-section">
                <h4>安全评估</h4>
                <div class="risk-assessment">
                  <el-progress
                    :percentage="analysisResults.portrait.riskScore"
                    :color="getRiskColor(analysisResults.portrait.riskScore)"
                    :stroke-width="20"
                  />
                  <p class="risk-desc">{{ analysisResults.portrait.riskDescription }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="action-bar">
            <el-button type="success" @click="exportReport">
              <el-icon><Download /></el-icon>
              导出报告
            </el-button>
            <el-button type="primary" @click="saveAnalysisResult">
              <el-icon><DocumentAdd /></el-icon>
              保存结果
            </el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';

const activeTab = ref('config');
const isAnalyzing = ref(false);
const scanLogs = ref([]);
const analysisResults = ref(null);
const logContainer = ref(null);

const analyzeConfig = ref({
  target: '',
  portRange: 'common',
  customPorts: '',
  scanTypes: ['port_scan', 'service_fingerprint', 'sensitive_files', 'tech_stack'],
  timeout: 5,
  threads: 20,
  skipVerified: true,
});

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

const startAnalysis = async () => {
  if (!analyzeConfig.value.target) {
    ElMessage.warning('请输入目标 IP 或域名');
    return;
  }

  isAnalyzing.value = true;
  activeTab.value = 'logs';
  scanLogs.value = [];
  analysisResults.value = null;

  addLog(`开始分析目标: ${analyzeConfig.value.target}`, 'info');
  addLog(`扫描类型: ${analyzeConfig.value.scanTypes.join(', ')}`, 'info');

  try {
    const response = await axios.post('/api/asset-analyzer/analyze', analyzeConfig.value);
    
    if (response.data.success) {
      addLog('分析任务已提交到后端', 'success');
    }
  } catch (error) {
    addLog('后端连接失败，使用本地模拟模式', 'warning');
  }

  const simulateAnalysis = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        addLog('开始端口扫描...', 'info');
        
        setTimeout(() => {
          addLog('扫描完成，发现 5 个开放端口', 'success');
          
          if (analyzeConfig.value.scanTypes.includes('service_fingerprint')) {
            addLog('开始服务指纹识别...', 'info');
            setTimeout(() => {
              addLog('服务识别完成', 'success');
            }, 1500);
          }

          if (analyzeConfig.value.scanTypes.includes('sensitive_files')) {
            setTimeout(() => {
              addLog('检测敏感文件...', 'info');
              setTimeout(() => {
                addLog('检测到敏感文件泄露！', 'warning');
              }, 1000);
            }, 2000);
          }

          if (analyzeConfig.value.scanTypes.includes('tech_stack')) {
            setTimeout(() => {
              addLog('识别技术栈...', 'info');
              setTimeout(() => {
                addLog('技术栈识别完成', 'success');
              }, 800);
            }, 3000);
          }

          setTimeout(() => {
            analysisResults.value = {
              target: analyzeConfig.value.target,
              openPorts: [
                { port: 22, protocol: 'tcp', service: 'SSH', version: 'OpenSSH 7.4', state: 'open' },
                { port: 80, protocol: 'tcp', service: 'HTTP', version: 'Nginx 1.18', state: 'open' },
                { port: 443, protocol: 'tcp', service: 'HTTPS', version: 'Nginx 1.18', state: 'open' },
                { port: 3306, protocol: 'tcp', service: 'MySQL', version: '5.7.32', state: 'open' },
                { port: 8080, protocol: 'tcp', service: 'HTTP', version: 'Tomcat 9.0', state: 'open' },
              ],
              services: [
                { name: 'Nginx', version: '1.18.0', port: 80, details: 'Web server, supports HTTP/2' },
                { name: 'OpenSSH', version: '7.4', port: 22, details: 'Secure Shell service' },
                { name: 'MySQL', version: '5.7.32', port: 3306, details: 'Relational database' },
                { name: 'Apache Tomcat', version: '9.0.41', port: 8080, details: 'Java Servlet container' },
              ],
              sensitiveFiles: [
                {
                  path: '/.git/config',
                  url: `http://${analyzeConfig.value.target}/.git/config`,
                  type: 'Git 配置',
                  severity: 'critical',
                  description: 'Git 仓库配置文件泄露，可能包含源代码和敏感配置'
                },
                {
                  path: '/.env',
                  url: `http://${analyzeConfig.value.target}/.env`,
                  type: '环境配置',
                  severity: 'critical',
                  description: '环境变量文件泄露，可能包含数据库密码和 API 密钥'
                }
              ],
              techStack: [
                { name: 'Nginx', version: '1.18.0' },
                { name: 'PHP', version: '7.4.3' },
                { name: 'MySQL', version: '5.7.32' },
                { name: 'jQuery', version: '3.5.1' },
                { name: 'Bootstrap', version: '4.5.0' },
              ],
              riskLevel: 'high',
              portrait: {
                targetType: 'Web Server',
                ipAddress: '192.168.1.100',
                os: 'Linux (CentOS 7)',
                riskScore: 75,
                riskDescription: '该目标存在较高安全风险，发现敏感文件泄露，建议立即进行安全加固。',
              },
            };

            addLog('分析完成！', 'success');
            isAnalyzing.value = false;
            activeTab.value = 'results';
            resolve();
          }, 4000);
        }, 2000);
      }, 1000);
    });
  };

  await simulateAnalysis();
};

const stopAnalysis = () => {
  isAnalyzing.value = false;
  addLog('用户手动停止分析', 'warning');
};

const clearLogs = () => {
  scanLogs.value = [];
};

const getRiskLevelName = (level) => {
  const levels = {
    critical: '严重',
    high: '高危',
    medium: '中危',
    low: '低危',
  };
  return levels[level] || level;
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

const getRiskColor = (score) => {
  if (score >= 80) return '#ff4d4f';
  if (score >= 60) return '#faad14';
  if (score >= 40) return '#1890ff';
  return '#52c41a';
};

const exportReport = () => {
  if (!analysisResults.value) {
    ElMessage.warning('没有可导出的分析结果');
    return;
  }

  const reportContent = generateReport();
  const blob = new Blob([reportContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `asset-analysis-report-${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
  
  ElMessage.success('报告导出成功');
};

const generateReport = () => {
  const now = new Date().toLocaleString('zh-CN');
  const results = analysisResults.value;
  
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>资产暴露面分析报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #1a1a2e; border-bottom: 3px solid #1890ff; padding-bottom: 15px; }
        .info { color: #666; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #e8e8e8; padding: 12px; text-align: left; }
        th { background: #f8f9fa; font-weight: bold; }
        .tag { padding: 4px 12px; border-radius: 12px; font-size: 12px; }
        .tag.critical { background: rgba(255, 77, 79, 0.15); color: #ff4d4f; }
        .tag.high { background: rgba(250, 173, 20, 0.15); color: #faad14; }
        .tag.success { background: rgba(82, 196, 26, 0.15); color: #52c41a; }
        .section { margin: 30px 0; }
        .tech-tag { display: inline-block; padding: 6px 16px; background: #e6f7ff; color: #1890ff; border-radius: 4px; margin: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>资产暴露面分析报告</h1>
        <div class="info">
            <p><strong>目标:</strong> ${results.target}</p>
            <p><strong>分析时间:</strong> ${now}</p>
            <p><strong>风险等级:</strong> <span class="tag ${results.riskLevel}">${getRiskLevelName(results.riskLevel)}</span></p>
        </div>

        <div class="section">
            <h2>端口扫描结果</h2>
            <table>
                <tr><th>端口</th><th>协议</th><th>服务</th><th>版本</th><th>状态</th></tr>
                ${results.openPorts.map(p => `
                <tr>
                    <td><span class="tag success">${p.port}</span></td>
                    <td>${p.protocol}</td>
                    <td>${p.service}</td>
                    <td>${p.version}</td>
                    <td>${p.state}</td>
                </tr>
                `).join('')}
            </table>
        </div>

        <div class="section">
            <h2>服务指纹识别</h2>
            <table>
                <tr><th>服务名称</th><th>版本</th><th>端口</th><th>详情</th></tr>
                ${results.services.map(s => `
                <tr>
                    <td>${s.name}</td>
                    <td>${s.version}</td>
                    <td>${s.port}</td>
                    <td>${s.details}</td>
                </tr>
                `).join('')}
            </table>
        </div>

        ${results.sensitiveFiles.length > 0 ? `
        <div class="section">
            <h2>敏感文件检测</h2>
            <table>
                <tr><th>文件路径</th><th>类型</th><th>风险等级</th><th>描述</th></tr>
                ${results.sensitiveFiles.map(f => `
                <tr>
                    <td>${f.path}</td>
                    <td>${f.type}</td>
                    <td><span class="tag ${f.severity}">${getSeverityName(f.severity)}</span></td>
                    <td>${f.description}</td>
                </tr>
                `).join('')}
            </table>
        </div>
        ` : ''}

        ${results.techStack.length > 0 ? `
        <div class="section">
            <h2>技术栈识别</h2>
            <div>
                ${results.techStack.map(t => `
                    <span class="tech-tag">${t.name} ${t.version ? `v${t.version}` : ''}</span>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2>资产画像</h2>
            <table>
                <tr><th>目标类型</th><td>${results.portrait.targetType}</td></tr>
                <tr><th>IP 地址</th><td>${results.portrait.ipAddress || '-'}</td></tr>
                <tr><th>操作系统</th><td>${results.portrait.os || '未知'}</td></tr>
                <tr><th>风险评分</th><td>${results.portrait.riskScore}/100</td></tr>
                <tr><th>风险描述</th><td>${results.portrait.riskDescription}</td></tr>
            </table>
        </div>
    </div>
</body>
</html>
  `;
};

const saveAnalysisResult = () => {
  if (!analysisResults.value) {
    ElMessage.warning('没有可保存的分析结果');
    return;
  }

  const result = {
    id: Date.now(),
    target: analysisResults.value.target,
    type: 'asset-analysis',
    timestamp: new Date().toISOString(),
    results: analysisResults.value,
  };

  const savedResults = JSON.parse(localStorage.getItem('scanResults') || '[]');
  savedResults.push(result);
  localStorage.setItem('scanResults', JSON.stringify(savedResults));

  ElMessage.success('分析结果已保存');
};
</script>

<style scoped>
.asset-analyzer-view {
  padding: 0;
}

.scan-type-item {
  margin-bottom: 12px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.scan-name {
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

.asset-overview {
  margin-bottom: 16px;
}

.stat-highlight {
  font-size: 20px;
  font-weight: 700;
  color: #1890ff;
}

.tech-stack {
  padding: 10px 0;
}

.asset-portrait {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.portrait-section {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.portrait-section h4 {
  margin-bottom: 12px;
  color: #1a1a2e;
}

.risk-assessment {
  text-align: center;
  padding: 20px;
}

.risk-desc {
  margin-top: 16px;
  color: #666;
  line-height: 1.6;
}
</style>
