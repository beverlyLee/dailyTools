<template>
  <div class="home-view">
    <div class="page-header">
      <h1 class="page-title">安全渗透测试工具箱</h1>
      <div class="status-info">
        <el-tag :type="backendStatus === 'connected' ? 'success' : 'danger'">
          后端服务: {{ backendStatus === 'connected' ? '已连接' : '未连接' }}
        </el-tag>
      </div>
    </div>

    <div class="grid-3">
      <el-card class="tool-card" @click="$router.push('/vuln-scanner')">
        <template #header>
          <div class="card-header">
            <el-icon size="32" color="#ff4d4f"><Bug /></el-icon>
            <span>Web 漏洞扫描器</span>
          </div>
        </template>
        <div class="tool-desc">
          <p>支持 SQL 注入、XSS、CSRF、弱口令等漏洞检测</p>
          <p>内置爬虫引擎，自动遍历站点链接</p>
          <p>生成详细漏洞报告，包含 Payload 证明</p>
        </div>
        <el-button type="primary" class="start-btn">开始扫描</el-button>
      </el-card>

      <el-card class="tool-card" @click="$router.push('/asset-analyzer')">
        <template #header>
          <div class="card-header">
            <el-icon size="32" color="#1890ff"><Monitor /></el-icon>
            <span>资产暴露面分析器</span>
          </div>
        </template>
        <div class="tool-desc">
          <p>扫描端口开放情况，服务指纹识别</p>
          <p>检测敏感文件泄露（.git, .env 等）</p>
          <p>构建资产画像，评估安全风险等级</p>
        </div>
        <el-button type="primary" class="start-btn">开始分析</el-button>
      </el-card>

      <el-card class="tool-card" @click="$router.push('/reports')">
        <template #header>
          <div class="card-header">
            <el-icon size="32" color="#52c41a"><Document /></el-icon>
            <span>报告管理</span>
          </div>
        </template>
        <div class="tool-desc">
          <p>查看历史扫描结果和分析报告</p>
          <p>导出报告为 HTML 或 PDF 格式</p>
          <p>对比多次扫描结果，追踪修复进度</p>
        </div>
        <el-button type="primary" class="start-btn">查看报告</el-button>
      </el-card>
    </div>

    <div class="statistics-section">
      <div class="card">
        <h3 class="card-title">快速统计</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ stats.totalScans }}</div>
            <div class="stat-label">总扫描次数</div>
          </div>
          <div class="stat-item critical">
            <div class="stat-value">{{ stats.criticalVulns }}</div>
            <div class="stat-label">严重漏洞</div>
          </div>
          <div class="stat-item high">
            <div class="stat-value">{{ stats.highVulns }}</div>
            <div class="stat-label">高危漏洞</div>
          </div>
          <div class="stat-item medium">
            <div class="stat-value">{{ stats.mediumVulns }}</div>
            <div class="stat-label">中危漏洞</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import axios from 'axios';

const backendStatus = ref('disconnected');
const stats = reactive({
  totalScans: 0,
  criticalVulns: 0,
  highVulns: 0,
  mediumVulns: 0,
});

onMounted(async () => {
  try {
    const response = await axios.get('/api/health');
    if (response.data.status === 'ok') {
      backendStatus.value = 'connected';
    }
  } catch (error) {
    console.log('Backend not available:', error.message);
  }

  const savedScans = localStorage.getItem('scanResults');
  if (savedScans) {
    const scans = JSON.parse(savedScans);
    stats.totalScans = scans.length;
    scans.forEach(scan => {
      if (scan.vulnerabilities) {
        scan.vulnerabilities.forEach(vuln => {
          if (vuln.severity === 'critical') stats.criticalVulns++;
          else if (vuln.severity === 'high') stats.highVulns++;
          else if (vuln.severity === 'medium') stats.mediumVulns++;
        });
      }
    });
  }
});
</script>

<style scoped>
.home-view {
  padding: 0;
}

.tool-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #e8e8e8;
}

.tool-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
}

.tool-desc {
  margin-bottom: 20px;
}

.tool-desc p {
  color: #666;
  font-size: 14px;
  margin: 8px 0;
  line-height: 1.6;
}

.start-btn {
  width: 100%;
}

.statistics-section {
  margin-top: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-item.critical {
  background: rgba(255, 77, 79, 0.1);
}

.stat-item.high {
  background: rgba(250, 173, 20, 0.1);
}

.stat-item.medium {
  background: rgba(24, 144, 255, 0.1);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a2e;
}

.stat-item.critical .stat-value {
  color: #ff4d4f;
}

.stat-item.high .stat-value {
  color: #faad14;
}

.stat-item.medium .stat-value {
  color: #1890ff;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-top: 8px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
