<template>
  <div class="tasks-view">
    <div class="tasks-card card">
      <div class="tasks-header">
        <h2>任务列表</h2>
        <button class="btn btn-primary" @click="showAddModal = true">
          + 添加任务
        </button>
      </div>
      
      <div class="task-filters">
        <button
          :class="['filter-btn', { active: currentFilter === 'all' }]"
          @click="currentFilter = 'all'"
        >
          全部
        </button>
        <button
          :class="['filter-btn', { active: currentFilter === 'active' }]"
          @click="currentFilter = 'active'"
        >
          进行中
        </button>
        <button
          :class="['filter-btn', { active: currentFilter === 'completed' }]"
          @click="currentFilter = 'completed'"
        >
          已完成
        </button>
      </div>
      
      <div class="task-list" v-if="filteredTasks.length > 0">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          :class="['task-item', { completed: task.completed }]"
        >
          <div class="task-checkbox" @click="toggleTaskCompletion(task)">
            <span v-if="task.completed">✓</span>
          </div>
          <div class="task-content">
            <h3 class="task-title">{{ task.title }}</h3>
            <p class="task-description" v-if="task.description">{{ task.description }}</p>
            <div class="task-meta">
              <span class="pomodoro-count">
                🍅 {{ task.completed_pomodoros }} / {{ task.estimated_pomodoros }}
              </span>
              <span class="task-date">
                创建于 {{ formatDate(task.created_at) }}
              </span>
            </div>
          </div>
          <div class="task-actions">
            <button class="action-btn edit" @click="editTask(task)">编辑</button>
            <button class="action-btn delete" @click="deleteTask(task)">删除</button>
          </div>
        </div>
      </div>
      
      <div class="empty-state" v-else>
        <p>暂无任务，点击上方按钮添加一个新任务</p>
      </div>
    </div>
    
    <div class="modal-overlay" v-if="showAddModal || showEditModal">
      <div class="modal card">
        <h3>{{ showEditModal ? '编辑任务' : '添加新任务' }}</h3>
        <div class="form-group">
          <label>任务标题 *</label>
          <input
            type="text"
            v-model="formData.title"
            class="input"
            placeholder="输入任务标题..."
          />
        </div>
        <div class="form-group">
          <label>任务描述</label>
          <textarea
            v-model="formData.description"
            class="input"
            placeholder="输入任务描述（可选）..."
            rows="3"
          ></textarea>
        </div>
        <div class="form-group">
          <label>预计番茄数</label>
          <input
            type="number"
            v-model.number="formData.estimated_pomodoros"
            class="input"
            min="1"
            max="20"
          />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="saveTask" :disabled="!formData.title">
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { api, Task } from '@/api'

type FilterType = 'all' | 'active' | 'completed'

const tasks = ref<Task[]>([])
const currentFilter = ref<FilterType>('all')
const showAddModal = ref(false)
const showEditModal = ref(false)
const editingTaskId = ref<number | null>(null)

const formData = reactive({
  title: '',
  description: '',
  estimated_pomodoros: 1
})

const filteredTasks = computed(() => {
  switch (currentFilter.value) {
    case 'active':
      return tasks.value.filter(t => !t.completed)
    case 'completed':
      return tasks.value.filter(t => t.completed)
    default:
      return tasks.value
  }
})

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

async function loadTasks() {
  tasks.value = await api.getTasks()
}

function resetForm() {
  formData.title = ''
  formData.description = ''
  formData.estimated_pomodoros = 1
  editingTaskId.value = null
}

function closeModal() {
  showAddModal.value = false
  showEditModal.value = false
  resetForm()
}

function editTask(task: Task) {
  editingTaskId.value = task.id
  formData.title = task.title
  formData.description = task.description || ''
  formData.estimated_pomodoros = task.estimated_pomodoros
  showEditModal.value = true
}

async function saveTask() {
  if (!formData.title.trim()) return
  
  if (showEditModal.value && editingTaskId.value) {
    const task = tasks.value.find(t => t.id === editingTaskId.value)
    if (task) {
      task.title = formData.title
      task.description = formData.description || null
      task.estimated_pomodoros = formData.estimated_pomodoros
      await api.updateTask(task)
    }
  } else {
    const newTask = await api.createTask(
      formData.title,
      formData.description || null,
      formData.estimated_pomodoros
    )
    tasks.value.unshift(newTask)
  }
  
  await loadTasks()
  closeModal()
}

async function toggleTaskCompletion(task: Task) {
  task.completed = !task.completed
  await api.updateTask(task)
}

async function deleteTask(task: Task) {
  if (confirm(`确定要删除任务 "${task.title}" 吗？`)) {
    await api.deleteTask(task.id)
    await loadTasks()
  }
}

onMounted(async () => {
  await loadTasks()
})
</script>

<style scoped>
.tasks-view {
  width: 100%;
  max-width: 700px;
}

.tasks-card {
  width: 100%;
}

.tasks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.tasks-header h2 {
  margin: 0;
  color: #333;
}

.task-filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.filter-btn {
  padding: 0.5rem 1rem;
  border: none;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #666;
}

.filter-btn:hover {
  background: rgba(102, 126, 234, 0.2);
}

.filter-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.task-item {
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 0.75rem;
  gap: 1rem;
  transition: all 0.3s ease;
}

.task-item:hover {
  background: rgba(102, 126, 234, 0.1);
}

.task-item.completed {
  opacity: 0.6;
}

.task-item.completed .task-title {
  text-decoration: line-through;
}

.task-checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(102, 126, 234, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
  margin-top: 2px;
}

.task-checkbox:hover {
  border-color: #667eea;
}

.task-item.completed .task-checkbox {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: transparent;
  color: white;
}

.task-content {
  flex: 1;
}

.task-title {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: #333;
}

.task-description {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  color: #666;
  line-height: 1.5;
}

.task-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  color: #999;
}

.pomodoro-count {
  font-weight: 500;
}

.task-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.25rem 0.75rem;
  border: none;
  border-radius: 0.25rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn.edit {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

.action-btn.edit:hover {
  background: rgba(102, 126, 234, 0.2);
}

.action-btn.delete {
  background: rgba(245, 87, 108, 0.1);
  color: #f5576c;
}

.action-btn.delete:hover {
  background: rgba(245, 87, 108, 0.2);
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #999;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  width: 90%;
  max-width: 500px;
}

.modal h3 {
  margin: 0 0 1.5rem 0;
  color: #333;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
}
</style>
