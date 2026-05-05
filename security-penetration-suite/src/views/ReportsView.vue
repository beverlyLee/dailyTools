<template>
  <div class="reports-view">
    <div class="page-header">
      <h1 class="page-title">报告管理</h1>
      <div class="header-actions">
        <el-select v-model="filterType" placeholder="过滤类型" style="width: 150px">
          <el-option label="全部" value="" />
          <el-option label="漏洞扫描" value="vuln-scan" />
          <el-option label="资产分析" value="asset-analysis" />
        </el-select>
        <el-button type="primary" @click="loadReports">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button type="danger" @click="clearAllReports" :disabled="reports.length === 0">
          <el-icon><Delete /></el-icon>
          清空全部
        </el-button>
      </div>
    </div>

    <div v-if="reports.length === 0" class="empty-state">
      <el-icon size="64" color="#ccc"><Document /></el-icon>
      <p>暂无扫描报告</p>
      <p style="font-size: 14px; color: #999; margin-top: 8px">
        请先使用漏洞扫描器或资产分析器进行扫描
      </p>
    </div>

    <div v-else>
      <el-table :data="filteredReports" style="width: 100%">
        <el-table-column prop="type" label="类型" width="140">
          <template #default="{ row }">
            <el-tag :type="row.type === 'vuln-scan' ? 'danger' : 'primary'">
              {{ row.type === 'vuln-scan' ? '漏洞扫描' : '资产分析' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target" label="目标" min-width="200">
          <template #default="{ row }">
            <el-link type="primary">{{ row.target }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="timestamp" label="扫描时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column label="统计信息" min-width="250">
          <template #default="{ row }">
            <span v-if="row.type === 'vuln-scan'">
              <el-tag type="danger" size="small" style="margin-right: 5px">
                严重: {{ row.stats?.critical || 0 }}
              </el-tag>
              <el-tag type="warning" size="small" style="margin-right: 5px">
                高危: {{ row.stats?.high || 0 }}
              </el-tag>
              <el-tag size="small" style="margin-right: 5px">
                中危: {{ row.stats?.medium || 0 }}
              </el-tag>
              <el-tag type="success" size="small">
                低危: {{ row.stats?.low || 0 }}
              </el-tag>
            </span>
            <span v-else>
              <el-tag type="primary" size="small" style="margin-right: 5px">
                开放端口: {{ row.results?.openPorts?.length || 0 }}
              </el-tag>
              <el-tag :type="row.results?.riskLevel === 'critical' || row.results?.riskLevel === 'high' ? 'danger' : 'success'" size="small">
                风险等级: {{ getRiskLevelName(row.results?.riskLevel) }}
              </el-tag>
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="viewReport(row)">
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button size="small" type="success" @click="exportSingleReport(row)">
              <el-icon><Download /></el-icon>
              导出
            </el-button>
            <el-button size="small" type="danger" @click="deleteReport(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="filteredReports.length"
          layout="total, prev, pager, next"
          :page-sizes="[10, 20, 50]"
        />
      </div>
    </div>

    <el-dialog
      v-model="reportDetailVisible"
      title="报告详情"
      width="80%"
      :fullscreen="isFullscreen"
    >
      <template #header>
        <div class="dialog-header">
          <span>报告详情</span>
          <div class="dialog-actions">
            <el-button size="small" @click="isFullscreen = !isFullscreen">
              <el-icon><FullScreen /></el-icon>
            </el-button>
            <el-button size="small" type="success" @click="exportCurrentReport">
              <el-icon><Download /></el-icon>
              导出
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="currentReport" class="report-detail">
        <el-descriptions :column="3" border class="report-header">
          <el-descriptions-item label="报告类型">
            <el-tag :type="currentReport.type === 'vuln-scan' ? 'danger' : 'primary'">
              {{ currentReport.type === 'vuln-scan' ? '漏洞扫描' : '资产分析' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="目标">
            {{ currentReport.target }}
          </el-descriptions-item>
          <el-descriptions-item label="扫描时间">
            {{ formatDate(currentReport.timestamp) }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="currentReport.type === 'vuln-scan'">
          <h3 class="section-title">漏洞统计</h3>
          <div class="stats-row">
            <el-statistic title="严重漏洞" :value="currentReport.stats?.critical || 0">
              <template #suffix>
                <span class="text-danger">个</span>
              </template>
            </el-statistic>
            <el-statistic title="高危漏洞" :value="currentReport.stats?.high || 0">
              <template #suffix>
                <span class="text-warning">个</span>
              </template>
            </el-statistic>
            <el-statistic title="中危漏洞" :value="currentReport.stats?.medium || 0">
              <template #suffix>
                <span class="text-info">个</span>
              </template>
            </el-statistic>
            <el-statistic title="低危漏洞" :value="currentReport.stats?.low || 0">
              <template #suffix>
                <span class="text-success">个</span>
              </template>
            </el-statistic>
          </div>

          <h3 class="section-title">漏洞详情</h3>
          <el-table :data="currentReport.vulnerabilities || []" style="width: 100%">
            <el-table-column prop="type" label="漏洞类型" width="150">
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
            <el-table-column prop="url" label="目标 URL" min-width="200" />
            <el-table-column prop="description" label="描述" min-width="250" />
          </el-table>
        </div>

        <div v-else>
          <h3 class="section-title">资产概览</h3>
          <el-descriptions :column="4" border>
            <el-descriptions-item label="开放端口数">
              <span class="stat-highlight">{{ currentReport.results?.openPorts?.length || 0 }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="服务数">
              <span class="stat-highlight">{{ currentReport.results?.services?.length || 0 }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="敏感文件">
              <span class="stat-highlight">{{ currentReport.results?.sensitiveFiles?.length || 0 }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="风险等级">
              <span :class="['status-badge', currentReport.results?.riskLevel]">
                {{ getRiskLevelName(currentReport.results?.riskLevel) }}
              </span>
            </el-descriptions-item>
          </el-descriptions>

          <h3 class="section-title">端口扫描结果</h3>
          <el-table :data="currentReport.results?.openPorts || []" style="width: 100%">
            <el-table-column prop="port" label="端口" width="100">
              <template #default="{ row }">
                <el-tag type="success">{{ row.port }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="protocol" label="协议" width="80" />
            <el-table-column prop="service" label="服务" min-width="120" />
            <el-table-column prop="version" label="版本" min-width="120" />
            <el-table-column prop="state" label="状态" width="100" />
          </el-table>

          <div v-if="currentReport.results?.sensitiveFiles?.length > 0">
            <h3 class="section-title">敏感文件检测</h3>
            <el-table :data="currentReport.results?.sensitiveFiles || []" style="width: 100%">
              <el-table-column prop="path" label="文件路径" min-width="250" />
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
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const filterType = ref('');
const reports = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const reportDetailVisible = ref(false);
const currentReport = ref(null);
const isFullscreen = ref(false);

const filteredReports = computed(() => {
  if (!filterType.value) return reports.value;
  return reports.value.filter(r => r.type === filterType.value);
});

const loadReports = () => {
  const savedResults = localStorage.getItem('scanResults');
  if (savedResults) {
    reports.value = JSON.parse(savedResults).sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
  } else {
    reports.value = [];
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const getRiskLevelName = (level) => {
  if (!level) return '-';
  const levels = {
    critical: '严重',
    high: '高危',
    medium: '中危',
    low: '低危',
  };
  return levels[level] || level;
};

const getVulnTypeName = (type) => {
  if (!type) return '-';
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
  if (!severity) return '-';
  const severities = {
    critical: '严重',
    high: '高危',
    medium: '中危',
    low: '低危',
  };
  return severities[severity] || severity;
};

const getTagType = (severity) => {
  if (!severity) return 'info';
  const types = {
    critical: 'danger',
    high: 'warning',
    medium: '',
    low: 'success',
  };
  return types[severity] || 'info';
};

const viewReport = (row) => {
  currentReport.value = { ...row };
  reportDetailVisible.value = true;
};

const deleteReport = (row) => {
  ElMessageBox.confirm('确定要删除此报告吗？此操作不可恢复。', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    const index = reports.value.findIndex(r => r.id === row.id);
    if (index > -1) {
      reports.value.splice(index, 1);
      localStorage.setItem('scanResults', JSON.stringify(reports.value));
      ElMessage.success('报告已删除');
    }
  }).catch(() => {});
};

const clearAllReports = () => {
  ElMessageBox.confirm('确定要清空所有报告吗？此操作不可恢复。', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    reports.value = [];
    localStorage.removeItem('scanResults');
    ElMessage.success('所有报告已清空');
  }).catch(() => {});
};

const exportSingleReport = (row) => {
  currentReport.value = { ...row };
  exportCurrentReport();
};

const exportCurrentReport = () => {
  if (!currentReport.value) return;

  let reportContent = '';
  const now = new Date().toLocaleString('zh-CN');
  
  if (currentReport.value.type === 'vuln-scan') {
    reportContent = generateVulnReport();
  } else {
    reportContent = generateAssetReport();
  }

  const blob = new Blob([reportContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const type = currentReport.value.type === 'vuln-scan' ? 'vuln-scan' : 'asset-analysis';
  a.href = url;
  a.download = `${type}-report-${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
  
  ElMessage.success('报告导出成功');
};

const generateVulnReport = () => {
  const report = currentReport.value;
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
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #e8e8e8; padding: 12px; text-align: left; }
        th { background: #f8f9fa; font-weight: bold; }
        .tag { padding: 4px 12px; border-radius: 12px; font-size: 12px; }
        .tag.critical { background: rgba(255, 77, 79, 0.15); color: #ff4d4f; }
        .tag.high { background: rgba(250, 173, 20, 0.15); color: #faad14; }
        .tag.medium { background: rgba(24, 144, 255, 0.15); color: #1890ff; }
        .tag.low { background: rgba(82, 196, 26, 0.15); color: #52c41a; }
        .stats-row { display: flex; gap: 40px; margin: 20px 0; }
        .stat-item { text-align: center; }
        .stat-value { font-size: 32px; font-weight: bold; }
        .stat-label { color: #666; margin-top: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Web 漏洞扫描报告</h1>
        <div class="info">
            <p><strong>目标 URL:</strong> ${report.target}</p>
            <p><strong>扫描时间:</strong> ${formatDate(report.timestamp)}</p>
        </div>

        <h2>漏洞统计</h2>
        <div class="stats-row">
            <div class="stat-item">
                <div class="stat-value" style="color: #ff4d4f">${report.stats?.critical || 0}</div>
                <div class="stat-label">严重漏洞</div>
            </div>
            <div class="stat-item">
                <div class="stat-value" style="color: #faad14">${report.stats?.high || 0}</div>
                <div class="stat-label">高危漏洞</div>
            </div>
            <div class="stat-item">
                <div class="stat-value" style="color: #1890ff">${report.stats?.medium || 0}</div>
                <div class="stat-label">中危漏洞</div>
            </div>
            <div class="stat-item">
                <div class="stat-value" style="color: #52c41a">${report.stats?.low || 0}</div>
                <div class="stat-label">低危漏洞</div>
            </div>
        </div>

        <h2>漏洞详情</h2>
        <table>
            <tr><th>漏洞类型</th><th>严重程度</th><th>目标 URL</th><th>描述</th></tr>
            ${(report.vulnerabilities || []).map(v => `
            <tr>
                <td>${getVulnTypeName(v.type)}</td>
                <td><span class="tag ${v.severity}">${getSeverityName(v.severity)}</span></td>
                <td>${v.url}</td>
                <td>${v.description}</td>
            </tr>
            `).join('')}
        </table>
    </div>
</body>
</html>
  `;
};

const generateAssetReport = () => {
  const report = currentReport.value;
  const results = report.results || {};
  
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
    </style>
</head>
<body>
    <div class="container">
        <h1>资产暴露面分析报告</h1>
        <div class="info">
            <p><strong>目标:</strong> ${report.target}</p>
            <p><strong>分析时间:</strong> ${formatDate(report.timestamp)}</p>
            <p><strong>风险等级:</strong> <span class="tag ${results.riskLevel}">${getRiskLevelName(results.riskLevel)}</span></p>
        </div>

        <h2>端口扫描结果</h2>
        <table>
            <tr><th>端口</th><th>协议</th><th>服务</th><th>版本</th><th>状态</th></tr>
            ${(results.openPorts || []).map(p => `
            <tr>
                <td><span class="tag success">${p.port}</span></td>
                <td>${p.protocol}</td>
                <td>${p.service}</td>
                <td>${p.version}</td>
                <td>${p.state}</td>
            </tr>
            `).join('')}
        </table>

        <h2>服务指纹识别</h2>
        <table>
            <tr><th>服务名称</th><th>版本</th><th>端口</th><th>详情</th></tr>
            ${(results.services || []).map(s => `
            <tr>
                <td>${s.name}</td>
                <td>${s.version}</td>
                <td>${s.port}</td>
                <td>${s.details}</td>
            </tr>
            `).join('')}
        </table>

        ${(results.sensitiveFiles || []).length > 0 ? `
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
        ` : ''}
    </div>
</body>
</html>
  `;
};

onMounted(() => {
  loadReports();
});
</script>

<style scoped>
.reports-view {
  padding: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
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

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding: 20px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.dialog-actions {
  display: flex;
  gap: 10px;
}

.report-detail {
  padding: 10px 0;
}

.report-header {
  margin-bottom: 20px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 24px 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e8e8e8;
}

.stats-row {
  display: flex;
  justify-content: space-around;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-highlight {
  font-size: 20px;
  font-weight: 700;
  color: #1890ff;
}

.text-danger {
  color: #ff4d4f;
}

.text-warning {
  color: #faad14;
}

.text-info {
  color: #1890ff;
}

.text-success {
  color: #52c41a;
}
</style>
