<template>
  <div class="essay-list-container fade-in">
    <el-card class="card-container">
      <div class="card-header">
        <h2 class="card-title">
          <el-icon><List /></el-icon>
          作文列表
        </h2>
        <el-button type="primary" @click="goToGrading">
          <el-icon><Plus /></el-icon>
          新建作文
        </el-button>
      </div>
      
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="学生姓名">
          <el-input v-model="searchForm.student_name" placeholder="请输入学生姓名" clearable />
        </el-form-item>
        <el-form-item label="班级">
          <el-input v-model="searchForm.class_name" placeholder="请输入班级" clearable />
        </el-form-item>
        <el-form-item label="年级">
          <el-input v-model="searchForm.grade" placeholder="请输入年级" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
      
      <el-table :data="essayList" v-loading="loading" border stripe>
        <el-table-column prop="title" label="作文标题" min-width="200">
          <template #default="scope">
            <el-link type="primary" @click="viewDetail(scope.row.id)">
              {{ scope.row.title }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="student_name" label="学生姓名" width="120" />
        <el-table-column prop="class_name" label="班级" width="120" />
        <el-table-column prop="grade" label="年级" width="100" />
        <el-table-column prop="word_count" label="字数" width="100" />
        <el-table-column label="评分状态" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.is_graded ? 'success' : 'warning'">
              {{ scope.row.is_graded ? '已批改' : '未批改' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="总分" width="100">
          <template #default="scope">
            <span v-if="scope.row.is_graded && scope.row.grading?.total_score !== undefined">
              <strong>{{ scope.row.grading.total_score }}</strong>
            </span>
            <span v-else class="no-score">--</span>
          </template>
        </el-table-column>
        <el-table-column prop="submitted_at" label="提交时间" width="180">
          <template #default="scope">
            {{ formatTime(scope.row.submitted_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="viewDetail(scope.row.id)">
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button 
              v-if="!scope.row.is_graded" 
              size="small" 
              type="success" 
              :loading="gradingIds.includes(scope.row.id)"
              @click="gradeEssay(scope.row)"
            >
              <el-icon><MagicStick /></el-icon>
              批改
            </el-button>
            <el-button size="small" type="danger" @click="deleteEssay(scope.row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="loadEssays"
        @current-change="loadEssays"
        class="mt-20"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { List, Plus, Search, Refresh, View, MagicStick, Delete } from '@element-plus/icons-vue'
import { essayGradingApi } from '@/api'

const router = useRouter()

const loading = ref(false)
const gradingIds = ref([])
const essayList = ref([])
const searchForm = ref({
  student_name: '',
  class_name: '',
  grade: ''
})

const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

const goToGrading = () => {
  router.push('/essay-grading')
}

const viewDetail = (id) => {
  router.push(`/essay-detail/${id}`)
}

const loadEssays = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      page_size: pagination.value.pageSize,
      ...searchForm.value
    }
    
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key]
      }
    })
    
    const response = await essayGradingApi.getEssays(params)
    
    if (response.data.success) {
      essayList.value = response.data.data.items || []
      pagination.value.total = response.data.data.total || 0
    }
  } catch (error) {
    console.error('加载作文列表失败:', error)
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.value.page = 1
  loadEssays()
}

const handleReset = () => {
  searchForm.value = {
    student_name: '',
    class_name: '',
    grade: ''
  }
  pagination.value.page = 1
  loadEssays()
}

const gradeEssay = async (row) => {
  gradingIds.value.push(row.id)
  ElMessage.info('开始批改...')
  
  essayGradingApi.gradeEssay(row.id)
    .then(response => {
      if (response.data.success) {
        ElMessage.success('批改完成')
        loadEssays()
      }
    })
    .catch(error => {
      console.error('批改失败:', error)
      ElMessage.error('批改失败')
    })
    .finally(() => {
      const index = gradingIds.value.indexOf(row.id)
      if (index > -1) {
        gradingIds.value.splice(index, 1)
      }
    })
}

const deleteEssay = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除作文「${row.title}」吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    ElMessage.success('删除成功')
    loadEssays()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const formatTime = (timeString) => {
  if (!timeString) return '-'
  const date = new Date(timeString)
  return date.toLocaleString('zh-CN')
}

onMounted(() => {
  loadEssays()
})
</script>

<style scoped>
.essay-list-container {
  max-width: 1400px;
  margin: 0 auto;
}

.search-form {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.no-score {
  color: #909399;
}
</style>
