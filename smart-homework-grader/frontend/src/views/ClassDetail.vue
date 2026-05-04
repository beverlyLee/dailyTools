<template>
  <div class="class-detail-container">
    <el-card class="info-card">
      <template #header>
        <div class="card-header">
          <div class="class-info">
            <h2>{{ classDetail.name }}</h2>
            <el-tag size="small">{{ classDetail.student_count }}名学生</el-tag>
          </div>
          <div class="actions">
            <el-button size="small" @click="showAddStudent = true">
              <el-icon><UserPlus /></el-icon>
              添加学生
            </el-button>
            <el-button size="small" @click="showAddAssignment = true">
              <el-icon><Plus /></el-icon>
              布置作业
            </el-button>
            <el-button size="small" @click="$router.back()">
              <el-icon><Back /></el-icon>
              返回
            </el-button>
          </div>
        </div>
      </template>
      <p>{{ classDetail.description || '暂无描述' }}</p>
    </el-card>

    <el-tabs v-model="activeTab" style="margin-top: 20px;">
      <el-tab-pane label="学生列表" name="students">
        <el-card>
          <el-table :data="students" style="width: 100%">
            <el-table-column prop="username" label="学生姓名" width="150" />
            <el-table-column prop="email" label="邮箱" min-width="200" />
            <el-table-column prop="essay_count" label="作文数量" width="100">
              <template #default="scope">
                <el-tag type="primary" size="small">{{ scope.row.essay_count || 0 }}篇</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="avg_score" label="平均分" width="100">
              <template #default="scope">
                <span :style="{ color: getScoreColor(scope.row.avg_score) }">
                  {{ scope.row.avg_score || '--' }}分
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="joined_at" label="加入时间" width="180">
              <template #default="scope">
                {{ formatDate(scope.row.joined_at) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="作业列表" name="assignments">
        <el-card>
          <el-table :data="assignments" style="width: 100%">
            <el-table-column prop="title" label="作业标题" min-width="200">
              <template #default="scope">
                <el-link type="primary">{{ scope.row.title }}</el-link>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="250" />
            <el-table-column prop="essay_count" label="提交数" width="100">
              <template #default="scope">
                <el-tag type="success" size="small">{{ scope.row.essay_count || 0 }}/{{ classDetail.student_count }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="deadline" label="截止时间" width="180">
              <template #default="scope">
                {{ scope.row.deadline ? formatDate(scope.row.deadline) : '无截止' }}
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="发布时间" width="180">
              <template #default="scope">
                {{ formatDate(scope.row.created_at) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="成绩统计" name="stats">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-card class="stat-card">
              <div class="stat-content">
                <div class="stat-value">{{ overview?.average_score || 0 }}</div>
                <div class="stat-label">班级平均分</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card">
              <div class="stat-content">
                <div class="stat-value">{{ overview?.essay_count || 0 }}</div>
                <div class="stat-label">作文总数</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card">
              <div class="stat-content">
                <div class="stat-value">{{ errorStats?.total_errors || 0 }}</div>
                <div class="stat-label">检测错误数</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card">
              <div class="stat-content">
                <div class="stat-value">{{ overview?.student_count || 0 }}</div>
                <div class="stat-label">学生人数</div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-card style="margin-top: 20px;">
          <template #header>
            <span>分数分布</span>
          </template>
          <div ref="scoreChart" style="height: 300px;"></div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="showAddStudent" title="添加学生" width="500px">
      <el-form :model="addStudentForm" label-width="80px">
        <el-form-item label="学生ID" required>
          <el-input v-model="addStudentForm.student_id" placeholder="请输入学生ID" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddStudent = false">取消</el-button>
        <el-button type="primary" @click="addStudent">添加</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showAddAssignment" title="布置作业" width="600px">
      <el-form :model="addAssignmentForm" label-width="80px">
        <el-form-item label="作业标题" required>
          <el-input v-model="addAssignmentForm.title" placeholder="请输入作业标题" />
        </el-form-item>
        <el-form-item label="作业描述">
          <el-input 
            v-model="addAssignmentForm.description" 
            type="textarea"
            :rows="3"
            placeholder="请输入作业描述"
          />
        </el-form-item>
        <el-form-item label="写作要求">
          <el-input 
            v-model="addAssignmentForm.requirements" 
            type="textarea"
            :rows="3"
            placeholder="请输入写作要求"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddAssignment = false">取消</el-button>
        <el-button type="primary" @click="addAssignment">发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { classApi, analysisApi } from '../api'

const route = useRoute()

const classDetail = ref({
  name: '高三(1)班',
  teacher_name: '张老师',
  student_count: 45,
  description: '高中三年级文科重点班'
})

const activeTab = ref('students')
const showAddStudent = ref(false)
const showAddAssignment = ref(false)
const scoreChart = ref(null)

const students = ref([
  { id: 1, username: '张三', email: 'zhangsan@example.com', essay_count: 12, avg_score: 85, joined_at: '2023-09-01' },
  { id: 2, username: '李四', email: 'lisi@example.com', essay_count: 10, avg_score: 78, joined_at: '2023-09-01' },
  { id: 3, username: '王五', email: 'wangwu@example.com', essay_count: 15, avg_score: 92, joined_at: '2023-09-01' },
  { id: 4, username: '赵六', email: 'zhaoliu@example.com', essay_count: 8, avg_score: 72, joined_at: '2023-09-01' },
  { id: 5, username: '钱七', email: 'qianqi@example.com', essay_count: 13, avg_score: 88, joined_at: '2023-09-01' },
])

const assignments = ref([
  { id: 1, title: '我的妈妈', description: '写一篇关于母亲的作文', essay_count: 40, deadline: null, created_at: '2024-01-10' },
  { id: 2, title: '难忘的一天', description: '记述一件难忘的事情', essay_count: 35, deadline: '2024-01-20', created_at: '2024-01-08' },
])

const overview = ref({
  average_score: 82.5,
  essay_count: 156,
  student_count: 45
})

const errorStats = ref({
  total_errors: 89
})

const addStudentForm = ref({ student_id: '' })
const addAssignmentForm = ref({ title: '', description: '', requirements: '' })

onMounted(() => {
  loadClassDetail()
})

const loadClassDetail = async () => {
  const classId = route.params.id
  if (!classId) return
  
  try {
    const [classRes, overviewRes, errorsRes] = await Promise.all([
      classApi.getById(classId),
      analysisApi.getClassOverview(classId),
      analysisApi.getClassErrors(classId)
    ])
    
    if (classRes.data) {
      classDetail.value = classRes.data
      students.value = classRes.data.students || []
      assignments.value = classRes.data.assignments || []
    }
    if (overviewRes.data) {
      overview.value = overviewRes.data
    }
    if (errorStats.data) {
      errorStats.value = errorsRes.data
    }
  } catch (error) {
    console.log('使用模拟数据')
  }
  
  nextTick(() => {
    initChart()
  })
}

const initChart = () => {
  if (!scoreChart.value) return
  
  const chart = echarts.init(scoreChart.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    xAxis: {
      type: 'category',
      data: ['优秀(90+)', '良好(80-89)', '中等(70-79)', '及格(60-69)', '不及格(<60)']
    },
    yAxis: {
      type: 'value',
      name: '人数'
    },
    series: [{
      type: 'bar',
      data: [8, 15, 12, 7, 3],
      itemStyle: {
        color: function(params) {
          const colors = ['#67c23a', '#409eff', '#e6a23c', '#909399', '#f56c6c']
          return colors[params.dataIndex]
        }
      }
    }]
  }
  
  chart.setOption(option)
  
  window.addEventListener('resize', () => chart.resize())
}

const addStudent = async () => {
  if (!addStudentForm.value.student_id) {
    ElMessage.warning('请输入学生ID')
    return
  }
  
  try {
    const response = await classApi.addStudent(route.params.id, {
      student_id: addStudentForm.value.student_id
    })
    
    if (response.data.success) {
      ElMessage.success('学生添加成功')
      showAddStudent.value = false
      addStudentForm.value = { student_id: '' }
      loadClassDetail()
    }
  } catch (error) {
    ElMessage.error('添加失败：' + error.message)
  }
}

const addAssignment = async () => {
  if (!addAssignmentForm.value.title.trim()) {
    ElMessage.warning('请输入作业标题')
    return
  }
  
  try {
    const response = await classApi.createAssignment(route.params.id, {
      title: addAssignmentForm.value.title,
      description: addAssignmentForm.value.description,
      requirements: addAssignmentForm.value.requirements
    })
    
    if (response.data.success) {
      ElMessage.success('作业发布成功')
      showAddAssignment.value = false
      addAssignmentForm.value = { title: '', description: '', requirements: '' }
      loadClassDetail()
    }
  } catch (error) {
    ElMessage.error('发布失败：' + error.message)
  }
}

const getScoreColor = (score) => {
  if (!score) return '#909399'
  if (score >= 90) return '#67c23a'
  if (score >= 80) return '#409eff'
  if (score >= 70) return '#e6a23c'
  if (score >= 60) return '#909399'
  return '#f56c6c'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '--'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.class-detail-container {
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.class-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.class-info h2 {
  margin: 0;
  color: #303133;
}

.actions {
  display: flex;
  gap: 10px;
}

.stat-card {
  text-align: center;
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}
</style>
