<template>
  <div>
    <a-row :gutter="[16, 16]">
      <a-col :span="24">
        <a-card title="系统概览" bordered="false">
          <a-descriptions :column="3" bordered>
            <a-descriptions-item label="系统名称">方程求解与数据预测系统</a-descriptions-item>
            <a-descriptions-item label="前端技术栈">Vue 3 + ECharts + Ant Design Vue</a-descriptions-item>
            <a-descriptions-item label="后端技术栈">Python + Flask + SciPy + Scikit-learn</a-descriptions-item>
            <a-descriptions-item label="数据库">SQLite</a-descriptions-item>
            <a-descriptions-item label="状态">运行中</a-descriptions-item>
            <a-descriptions-item label="版本">1.0.0</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>

      <a-col :span="12">
        <a-card title="常微分方程求解器" bordered="false" hoverable>
          <template #extra>
            <router-link to="/ode-solver">进入系统</router-link>
          </template>
          <a-list>
            <a-list-item>
              <template #prefix>
                <CheckCircleOutlined style="color: #52c41a" />
              </template>
              洛伦兹吸引子、捕食者-猎物模型等经典案例
            </a-list-item>
            <a-list-item>
              <template #prefix>
                <CheckCircleOutlined style="color: #52c41a" />
              </template>
              欧拉法、龙格-库塔法（RK4）等数值算法
            </a-list-item>
            <a-list-item>
              <template #prefix>
                <CheckCircleOutlined style="color: #52c41a" />
              </template>
              动态绘制轨迹曲线、相空间图、庞加莱截面
            </a-list-item>
            <a-list-item>
              <template #prefix>
                <CheckCircleOutlined style="color: #52c41a" />
              </template>
              参数扫描功能，观察系统动力学行为
            </a-list-item>
          </a-list>
        </a-card>
      </a-col>

      <a-col :span="12">
        <a-card title="房价走势线性回归预测器" bordered="false" hoverable>
          <template #extra>
            <router-link to="/housing-predictor">进入系统</router-link>
          </template>
          <a-list>
            <a-list-item>
              <template #prefix>
                <CheckCircleOutlined style="color: #52c41a" />
              </template>
              加载历史房价及影响因素 CSV 数据集
            </a-list-item>
            <a-list-item>
              <template #prefix>
                <CheckCircleOutlined style="color: #52c41a" />
              </template>
              数据清洗、归一化，训练多元线性回归模型
            </a-list-item>
            <a-list-item>
              <template #prefix>
                <CheckCircleOutlined style="color: #52c41a" />
              </template>
              交互式滑块实时调整影响因素预测房价
            </a-list-item>
            <a-list-item>
              <template #prefix>
                <CheckCircleOutlined style="color: #52c41a" />
              </template>
              可视化展示特征重要性、残差分布
            </a-list-item>
          </a-list>
        </a-card>
      </a-col>

      <a-col :span="24">
        <a-card title="快速开始" bordered="false">
          <a-steps :current="0">
            <a-step title="选择功能模块" description="选择 ODE 求解器或房价预测器" />
            <a-step title="配置参数" description="设置方程参数或特征值" />
            <a-step title="运行计算" description="执行数值求解或模型预测" />
            <a-step title="查看结果" description="可视化分析结果" />
          </a-steps>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { CheckCircleOutlined } from '@ant-design/icons-vue'
</script>

<style scoped>
.ant-card {
  height: 100%;
}

.ant-card-hoverable:hover {
  border-color: #1890ff;
}
</style>
