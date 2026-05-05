<template>
  <div class="probes">
    <h2 class="page-title">黑盒探测管理</h2>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-header">HTTP 探测目标</div>
        <table class="table">
          <thead>
            <tr>
              <th>名称</th>
              <th>URL</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="probe in httpProbes" :key="probe.name">
              <td>{{ probe.name }}</td>
              <td>{{ probe.url }}</td>
              <td>
                <span :class="getStatusBadge(probe.status)">
                  {{ probe.status }}
                </span>
              </td>
              <td>
                <button class="btn btn-outline btn-sm" @click="testProbe(probe, 'http')">
                  测试
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="card-header">TCP 探测目标</div>
        <table class="table">
          <thead>
            <tr>
              <th>名称</th>
              <th>地址:端口</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="probe in tcpProbes" :key="probe.name">
              <td>{{ probe.name }}</td>
              <td>{{ probe.url }}</td>
              <td>
                <span :class="getStatusBadge(probe.status)">
                  {{ probe.status }}
                </span>
              </td>
              <td>
                <button class="btn btn-outline btn-sm" @click="testProbe(probe, 'tcp')">
                  测试
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-top: 2rem;">
      <div class="card-header">探测统计</div>
      <div class="grid grid-4">
        <div class="stat-card blue">
          <div class="stat-value">{{ totalProbes }}</div>
          <div class="stat-label">总探测数</div>
        </div>
        <div class="stat-card green">
          <div class="stat-value">{{ healthyProbes }}</div>
          <div class="stat-label">健康</div>
        </div>
        <div class="stat-card orange">
          <div class="stat-value">{{ httpProbes.length }}</div>
          <div class="stat-label">HTTP 探测</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ tcpProbes.length }}</div>
          <div class="stat-label">TCP 探测</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top: 2rem;">
      <div class="card-header">新增探测目标</div>
      <form @submit.prevent="addProbe" class="form-grid">
        <div class="form-group">
          <label>探测类型</label>
          <select v-model="newProbe.type" class="form-control">
            <option value="http">HTTP</option>
            <option value="tcp">TCP</option>
          </select>
        </div>
        <div class="form-group">
          <label>名称</label>
          <input type="text" v-model="newProbe.name" class="form-control" placeholder="例如: api-health-check" required>
        </div>
        <div class="form-group">
          <label>目标地址</label>
          <input type="text" v-model="newProbe.url" class="form-control" placeholder="HTTP: https://example.com | TCP: example.com:80" required>
        </div>
        <div class="form-group">
          <label>&nbsp;</label>
          <button type="submit" class="btn btn-primary" style="width: 100%;">
            添加探测
          </button>
        </div>
      </form>
    </div>

    <div class="card" style="margin-top: 2rem;">
      <div class="card-header">Blackbox 探测说明</div>
      <div class="probe-info">
        <h4>HTTP 探测</h4>
        <p>HTTP 探测用于检查 HTTP 服务的可用性。支持以下特性：</p>
        <ul>
          <li>检查 HTTP 状态码（2xx 为成功）</li>
          <li>支持 HTTPS 协议</li>
          <li>可配置超时时间</li>
          <li>支持自定义 HTTP 方法和头部</li>
        </ul>

        <h4 style="margin-top: 1.5rem;">TCP 探测</h4>
        <p>TCP 探测用于检查 TCP 端口的连通性。适用于：</p>
        <ul>
          <li>数据库服务（MySQL:3306, PostgreSQL:5432）</li>
          <li>缓存服务（Redis:6379）</li>
          <li>消息队列（RabbitMQ:5672）</li>
          <li>其他 TCP 协议服务</li>
        </ul>

        <h4 style="margin-top: 1.5rem;">Prometheus 指标</h4>
        <ul>
          <li><code>http_probe_status</code> - HTTP 探测状态（1=成功，0=失败）</li>
          <li><code>tcp_probe_status</code> - TCP 探测状态（1=成功，0=失败）</li>
          <li><code>probe_duration_seconds</code> - 探测耗时</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { BlackboxTarget } from '../lib/api'

interface ProbeTarget extends BlackboxTarget {
  status: string
}

const httpProbes = ref<ProbeTarget[]>([
  { name: 'example-http', url: 'http://example.com', type: 'http', status: 'healthy' },
  { name: 'api-gateway', url: 'https://api.example.com/health', type: 'http', status: 'healthy' },
  { name: 'user-service', url: 'https://user.example.com/ping', type: 'http', status: 'warning' }
])

const tcpProbes = ref<ProbeTarget[]>([
  { name: 'example-tcp', url: 'example.com:80', type: 'tcp', status: 'healthy' },
  { name: 'mysql-primary', url: 'db.example.com:3306', type: 'tcp', status: 'healthy' },
  { name: 'redis-cache', url: 'cache.example.com:6379', type: 'tcp', status: 'healthy' }
])

const newProbe = ref({
  type: 'http',
  name: '',
  url: ''
})

const totalProbes = computed(() => httpProbes.value.length + tcpProbes.value.length)
const healthyProbes = computed(() => {
  const httpHealthy = httpProbes.value.filter(p => p.status === 'healthy').length
  const tcpHealthy = tcpProbes.value.filter(p => p.status === 'healthy').length
  return httpHealthy + tcpHealthy
})

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'healthy':
      return 'badge badge-success'
    case 'warning':
      return 'badge badge-warning'
    case 'failed':
      return 'badge badge-danger'
    default:
      return 'badge badge-secondary'
  }
}

const testProbe = (probe: ProbeTarget, type: string) => {
  const isSuccess = Math.random() > 0.2
  probe.status = isSuccess ? 'healthy' : (Math.random() > 0.5 ? 'warning' : 'failed')
}

const addProbe = () => {
  if (!newProbe.value.name || !newProbe.value.url) return

  const probe: ProbeTarget = {
    name: newProbe.value.name,
    url: newProbe.value.url,
    type: newProbe.value.type,
    status: 'healthy'
  }

  if (newProbe.value.type === 'http') {
    httpProbes.value.push(probe)
  } else {
    tcpProbes.value.push(probe)
  }

  newProbe.value = {
    type: 'http',
    name: '',
    url: ''
  }
}
</script>

<style scoped>
.probes {
  max-width: 100%;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #1f2937;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  align-items: end;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.form-control {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.probe-info {
  line-height: 1.8;
}

.probe-info h4 {
  color: #374151;
  margin-bottom: 0.5rem;
}

.probe-info ul {
  padding-left: 1.5rem;
  margin-top: 0.5rem;
}

.probe-info code {
  background: #f3f4f6;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.875rem;
}
</style>
