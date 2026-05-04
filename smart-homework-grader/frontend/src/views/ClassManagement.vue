<template>
  <div class="class-management-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>班级管理</span>
          <el-button type="primary" @click="showCreateDialog = true">
            <el-icon><Plus /></el-icon>
            创建班级
          </el-button>
        </div>
      </template>

      <el-row :gutter="20">
        <el-col :span="8" v-for="cls in classes" :key="cls.id">
          <el-card class="class-card" shadow="hover" @click="goToClassDetail(cls.id)">
            <div class="class-header">
              <h3>{{ cls.name }}</h3>
              <el-tag size="small">{{ cls.student_count }}人</el-tag>
            </div>
            <p class="class-desc">{{ cls.description || '暂无描述' }}</p>
            <div class="class-footer">
              <span class="teacher">老师：{{ cls.teacher_name }}</span>
              <span class="time">{{ formatDate(cls.created_at) }}</span>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <el-dialog v-model="showCreateDialog" title="创建班级" width="500px">
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="班级名称" required>
          <el-input v-model="createForm.name" placeholder="请输入班级名称" />
        </el-form-item>
        <el-form-item label="班级描述">
          <el-input 
            v-model="createForm.description" 
            type="textarea"
            :rows="3"
            placeholder="请输入班级描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createClass" :loading="creating">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { classApi } from '../api'

const router = useRouter()

const classes = ref([
  {
    id: 1,
    name: '高三(1)班',
    teacher_name: '张老师',
    student_count: 45,
    description: '高中三年级文科重点班，主要负责语文、英语等文科教学',
    created_at: '2023-09-01T08:00:00'
  },
  {
    id: 2,
    name: '初二(3)班',
    teacher_name: '李老师',
    student_count: 38,
    description: '初中二年级普通班',
    created_at: '2023-09-01T08:00:00'
  },
  {
    id: 3,
    name: '六年级(2)班',
    teacher_name: '王老师',
    student_count: 42,
    description: '小学六年级毕业班',
    created_at: '2023-09-01T08:00:00'
  }
])

const showCreateDialog = ref(false)
const creating = ref(false)
const createForm = ref({
  name: '',
  description: ''
})

onMounted(() => {
  loadClasses()
})

const loadClasses = async () => {
  try {
    const response = await classApi.getAll({ teacher_id: 1 })
    if (response.data && response.data.length > 0) {
      classes.value = response.data
    }
  } catch (error) {
    console.log('使用模拟数据')
  }
}

const goToClassDetail = (id) => {
  router.push(`/class/${id}`)
}

const createClass = async () => {
  if (!createForm.value.name.trim()) {
    ElMessage.warning('请输入班级名称')
    return
  }
  
  creating.value = true
  try {
    const response = await classApi.create({
      name: createForm.value.name,
      description: createForm.value.description,
      teacher_id: 1
    })
    
    if (response.data.success) {
      ElMessage.success('班级创建成功')
      showCreateDialog.value = false
      createForm.value = { name: '', description: '' }
      loadClasses()
    }
  } catch (error) {
    ElMessage.error('创建失败：' + error.message)
  } finally {
    creating.value = false
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '--'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.class-management-container {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.class-card {
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.class-card:hover {
  transform: translateY(-5px);
}

.class-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.class-header h3 {
  margin: 0;
  color: #303133;
  font-size: 18px;
}

.class-desc {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 15px;
  height: 42px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.class-footer {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
}
</style>
