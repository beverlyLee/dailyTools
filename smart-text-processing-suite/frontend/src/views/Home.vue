<template>
  <div class="home-container fade-in">
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card class="system-card" shadow="hover" @click.native="goToEssayGrading">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon class="card-icon"><EditPen /></el-icon>
                中文作文智能批改系统
              </span>
            </div>
          </template>
          <div class="card-content">
            <p class="card-description">
              集成清华 THUNLP 模型，对学生作文进行句法分析、错别字检测、成语使用恰当性判断。
            </p>
            <el-divider />
            <div class="feature-list">
              <div class="feature-item">
                <el-icon><Check /></el-icon>
                <span>多维度评分：内容立意、语言表达、结构层次</span>
              </div>
              <div class="feature-item">
                <el-icon><Check /></el-icon>
                <span>智能评语生成</span>
              </div>
              <div class="feature-item">
                <el-icon><Check /></el-icon>
                <span>班级学情分析</span>
              </div>
              <div class="feature-item">
                <el-icon><Check /></el-icon>
                <span>MySQL 数据存储</span>
              </div>
            </div>
          </div>
          <div class="card-footer">
            <el-button type="primary" size="large">
              进入系统
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card class="system-card" shadow="hover" @click.native="goToDocumentProofreading">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon class="card-icon"><Document /></el-icon>
                公文写作智能校对系统
              </span>
            </div>
          </template>
          <div class="card-content">
            <p class="card-description">
              针对政府或企业公文场景，利用规则引擎和 BERT 模型进行专业校对。
            </p>
            <el-divider />
            <div class="feature-list">
              <div class="feature-item">
                <el-icon><Check /></el-icon>
                <span>政治术语使用检测</span>
              </div>
              <div class="feature-item">
                <el-icon><Check /></el-icon>
                <span>固定搭配错误检测</span>
              </div>
              <div class="feature-item">
                <el-icon><Check /></el-icon>
                <span>标点符号误用检测</span>
              </div>
              <div class="feature-item">
                <el-icon><Check /></el-icon>
                <span>红头文件格式规范检查</span>
              </div>
              <div class="feature-item">
                <el-icon><Check /></el-icon>
                <span>口语化表达润色</span>
              </div>
              <div class="feature-item">
                <el-icon><Check /></el-icon>
                <span>版本回溯支持</span>
              </div>
            </div>
          </div>
          <div class="card-footer">
            <el-button type="primary" size="large">
              进入系统
              <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon class="card-icon"><Cpu /></el-icon>
                技术架构
              </span>
            </div>
          </template>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="前端技术">
              <el-tag type="primary">Vue 3</el-tag>
              <el-tag type="primary" style="margin-left: 8px;">Monaco Editor</el-tag>
              <el-tag type="info" style="margin-left: 8px;">Element Plus</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="后端技术">
              <el-tag type="success">Python</el-tag>
              <el-tag type="success" style="margin-left: 8px;">FastAPI</el-tag>
              <el-tag type="warning" style="margin-left: 8px;">微服务架构</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="AI 模型">
              <el-tag type="danger">THUNLP</el-tag>
              <el-tag type="danger" style="margin-left: 8px;">BERT</el-tag>
              <el-tag type="info" style="margin-left: 8px;">规则引擎</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="数据库">
              <el-tag type="warning">MySQL</el-tag>
              <el-tag type="info" style="margin-left: 8px;">SQLite</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="部署方式">
              <el-tag type="success">Docker</el-tag>
              <el-tag type="success" style="margin-left: 8px;">独立服务</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="API 文档">
              <el-tag type="primary">Swagger UI</el-tag>
              <el-tag type="primary" style="margin-left: 8px;">OpenAPI</el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { EditPen, Document, Check, ArrowRight, Cpu } from '@element-plus/icons-vue'

const router = useRouter()

const goToEssayGrading = () => {
  router.push('/essay-grading')
}

const goToDocumentProofreading = () => {
  router.push('/document-proofreading')
}
</script>

<style scoped>
.home-container {
  max-width: 1400px;
  margin: 0 auto;
}

.system-card {
  cursor: pointer;
  transition: transform 0.3s ease;
}

.system-card:hover {
  transform: translateY(-5px);
}

.card-header {
  display: flex;
  align-items: center;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.card-icon {
  margin-right: 10px;
  font-size: 20px;
}

.card-content {
  min-height: 300px;
}

.card-description {
  color: #606266;
  line-height: 1.8;
  margin: 0;
}

.feature-list {
  margin-top: 10px;
}

.feature-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  color: #606266;
}

.feature-item .el-icon {
  color: #67c23a;
  margin-right: 8px;
  font-size: 16px;
}

.card-footer {
  text-align: center;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
  margin-top: 15px;
}
</style>
