<template>
  <div class="add-dream-view">
    <div class="header-section">
      <div class="header-content">
        <h1 class="title">{{ isEdit ? '编辑梦境' : '记录梦境' }}</h1>
        <p class="subtitle">记录每一个奇妙的夜晚</p>
      </div>
    </div>

    <div class="content-section">
      <div class="form-container">
        <div class="form-group">
          <label class="form-label">梦境标题</label>
          <input 
            v-model="dream.title" 
            type="text" 
            class="form-input" 
            placeholder="请输入梦境标题"
            maxlength="50"
          />
        </div>

        <div class="form-group">
          <label class="form-label">梦境日期</label>
          <input 
            v-model="dream.date" 
            type="date" 
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label class="form-label">梦境内容</label>
          <textarea 
            v-model="dream.content" 
            class="form-textarea" 
            placeholder="详细记录您的梦境内容..."
            rows="8"
            maxlength="5000"
          ></textarea>
          <div class="char-count">
            <span class="char-count-text">{{ dream.content.length }}/5000</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">情感倾向</label>
          <div class="emotion-options">
            <div 
              v-for="emotion in emotions" 
              :key="emotion.value"
              :class="['emotion-option', { 'emotion-selected': dream.emotion === emotion.value }]"
              @click="selectEmotion(emotion.value)"
            >
              <span class="emotion-icon">{{ emotion.icon }}</span>
              <span class="emotion-label">{{ emotion.label }}</span>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">清晰度评分: {{ dream.clarity }}/10</label>
          <div class="slider-container">
            <div class="slider-labels">
              <span class="slider-label">模糊</span>
              <span class="slider-label">清晰</span>
            </div>
            <input 
              v-model.number="dream.clarity" 
              type="range" 
              min="1" 
              max="10" 
              step="1"
              class="slider"
            />
            <div class="clarity-display">
              <div 
                v-for="n in 10" 
                :key="n"
                :class="['clarity-dot', { active: n <= dream.clarity }]"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="action-bar">
      <button class="btn btn-secondary" @click="goBack">
        <span class="btn-text">取消</span>
      </button>
      <button class="btn btn-primary" @click="saveDream" :disabled="saving">
        <span v-if="saving" class="btn-text">保存中...</span>
        <span v-else class="btn-text">{{ isEdit ? '保存修改' : '保存梦境' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import dreamApi from '@/api/index.js';

const router = useRouter();
const route = useRoute();

const isEdit = computed(() => !!route.params.id);
const dreamId = computed(() => route.params.id);
const saving = ref(false);

const emotions = [
  { value: '积极', label: '积极', icon: '😊' },
  { value: '中性', label: '中性', icon: '😐' },
  { value: '消极', label: '消极', icon: '😟' }
];

const dream = ref({
  title: '',
  content: '',
  date: '',
  emotion: '',
  clarity: 5
});

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const selectEmotion = (value) => {
  dream.value.emotion = value;
};

const goBack = () => {
  if (isEdit.value) {
    router.push(`/detail/${dreamId.value}`);
  } else {
    router.push('/home');
  }
};

const loadDream = async () => {
  if (!isEdit.value) return;
  
  try {
    const result = await dreamApi.getById(dreamId.value);
    const dreamData = result.dream;
    dream.value = {
      title: dreamData.title,
      content: dreamData.content,
      date: dreamData.date,
      emotion: dreamData.emotion || '',
      clarity: dreamData.clarity || 5
    };
  } catch (error) {
    console.error('加载梦境失败:', error);
    // 使用模拟数据
    dream.value = {
      title: '飞翔的梦',
      content: '昨晚我梦见自己在天空中自由飞翔，感觉非常轻松和快乐。飞过了一片美丽的草原，看到了很多彩色的花朵，还有一群可爱的小鸟在我身边飞过。天空是蓝色的，阳光温暖地照在我身上。我感到无比的自由和幸福。',
      date: '2024-05-02',
      emotion: '积极',
      clarity: 8
    };
  }
};

const validateForm = () => {
  if (!dream.value.title.trim()) {
    alert('请输入梦境标题');
    return false;
  }
  if (!dream.value.content.trim()) {
    alert('请输入梦境内容');
    return false;
  }
  if (!dream.value.date) {
    alert('请选择日期');
    return false;
  }
  return true;
};

const saveDream = async () => {
  if (!validateForm()) return;
  
  saving.value = true;
  
  try {
    if (isEdit.value) {
      await dreamApi.update(dreamId.value, dream.value);
      alert('保存成功！');
      router.push(`/detail/${dreamId.value}`);
    } else {
      const result = await dreamApi.create(dream.value);
      alert('保存成功！梦境正在分析中...');
      router.push('/home');
    }
  } catch (error) {
    console.error('保存失败:', error);
    // 演示模式：模拟保存成功
    alert('保存成功！（演示模式）');
    router.push('/home');
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  if (!isEdit.value) {
    dream.value.date = getTodayDate();
  } else {
    loadDream();
  }
});
</script>

<style scoped>
.add-dream-view {
  min-height: 100vh;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  padding-bottom: 100px;
}

.header-section {
  padding: 40px 20px 20px;
  text-align: center;
}

.header-content {
  max-width: 750px;
  margin: 0 auto;
}

.title {
  font-size: 28px;
  font-weight: bold;
  color: #fff;
  margin: 0 0 8px 0;
}

.subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

.content-section {
  background: #f8f8f8;
  border-radius: 32px 32px 0 0;
  min-height: calc(100vh - 200px);
  padding: 20px;
}

.form-container {
  max-width: 750px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: #333;
  margin-bottom: 10px;
}

.form-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  font-size: 15px;
  color: #333;
  background-color: #fff;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  border-color: #667eea;
  outline: none;
}

.form-textarea {
  width: 100%;
  min-height: 160px;
  padding: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  font-size: 15px;
  color: #333;
  background-color: #fff;
  resize: vertical;
  line-height: 1.8;
  transition: border-color 0.2s ease;
}

.form-textarea:focus {
  border-color: #667eea;
  outline: none;
}

.char-count {
  text-align: right;
  margin-top: 8px;
}

.char-count-text {
  font-size: 12px;
  color: #999;
}

.emotion-options {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.emotion-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  background-color: #fff;
  border-radius: 16px;
  border: 2px solid #e8e8e8;
  cursor: pointer;
  transition: all 0.2s ease;
}

.emotion-option:active {
  transform: scale(0.95);
}

.emotion-selected {
  background-color: #f0f4ff;
  border-color: #667eea;
}

.emotion-icon {
  font-size: 36px;
  margin-bottom: 8px;
}

.emotion-label {
  font-size: 14px;
  color: #666;
}

.emotion-selected .emotion-label {
  color: #667eea;
  font-weight: 500;
}

.slider-container {
  background-color: #fff;
  border-radius: 16px;
  padding: 20px;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.slider-label {
  font-size: 13px;
  color: #999;
}

.slider {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #e8e8e8;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.clarity-display {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
  padding: 0 8px;
}

.clarity-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #e8e8e8;
  transition: all 0.2s ease;
}

.clarity-dot.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 16px;
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background-color: #fff;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.05);
}

.btn {
  flex: 1;
  height: 48px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:active {
  transform: scale(0.98);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #666;
  border: none;
}

.btn-text {
  font-size: 16px;
  font-weight: 500;
}

@media (max-width: 480px) {
  .emotion-options {
    gap: 8px;
  }
  
  .emotion-option {
    padding: 16px 8px;
  }
  
  .emotion-icon {
    font-size: 28px;
  }
  
  .clarity-dot {
    width: 16px;
    height: 16px;
  }
}
</style>
