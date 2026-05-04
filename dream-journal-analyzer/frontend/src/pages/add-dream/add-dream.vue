<template>
  <view class="container">
    <view class="form-container">
      <view class="form-item">
        <text class="form-label">梦境标题</text>
        <input 
          class="form-input" 
          v-model="dream.title" 
          placeholder="请输入梦境标题"
          maxlength="50"
        />
      </view>

      <view class="form-item">
        <text class="form-label">梦境日期</text>
        <picker 
          mode="date" 
          :value="dream.date" 
          @change="onDateChange"
        >
          <view class="picker-box">
            <text class="picker-text">{{ dream.date || '请选择日期' }}</text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="form-label">梦境内容</text>
        <textarea 
          class="form-textarea" 
          v-model="dream.content" 
          placeholder="详细记录您的梦境内容..."
          :auto-height="true"
          maxlength="5000"
        />
        <view class="char-count">
          <text class="char-count-text">{{ dream.content.length }}/5000</text>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">情感倾向</text>
        <view class="emotion-options">
          <view 
            v-for="emotion in emotions" 
            :key="emotion.value"
            :class="['emotion-option', { 'emotion-selected': dream.emotion === emotion.value }]"
            @click="selectEmotion(emotion.value)"
          >
            <text class="emotion-icon">{{ emotion.icon }}</text>
            <text class="emotion-label">{{ emotion.label }}</text>
          </view>
        </view>
      </view>

      <view class="form-item">
        <text class="form-label">清晰度评分</text>
        <view class="clarity-slider">
          <view class="clarity-labels">
            <text class="clarity-label">模糊</text>
            <text class="clarity-label">清晰</text>
          </view>
          <slider 
            :value="dream.clarity" 
            :min="1" 
            :max="10" 
            :step="1"
            activeColor="#667eea"
            backgroundColor="#e0e0e0"
            @change="onClarityChange"
          />
          <view class="clarity-value">
            <text class="clarity-number">{{ dream.clarity }}</text>
            <text class="clarity-unit">/10</text>
          </view>
        </view>
      </view>
    </view>

    <view class="action-buttons">
      <view class="btn btn-secondary" @click="cancel">
        <text class="btn-text">取消</text>
      </view>
      <view class="btn btn-primary" @click="saveDream">
        <text class="btn-text">{{ isEdit ? '保存修改' : '保存梦境' }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import dreamApi from '@/api/index.js';

export default {
  data() {
    return {
      isEdit: false,
      dreamId: null,
      dream: {
        title: '',
        content: '',
        date: '',
        emotion: '',
        clarity: 5
      },
      emotions: [
        { value: '积极', label: '积极', icon: '😊' },
        { value: '中性', label: '中性', icon: '😐' },
        { value: '消极', label: '消极', icon: '😟' }
      ]
    };
  },
  onLoad(options) {
    if (options.id) {
      this.isEdit = true;
      this.dreamId = parseInt(options.id);
      this.loadDream();
    } else {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      this.dream.date = `${year}-${month}-${day}`;
    }
  },
  methods: {
    async loadDream() {
      try {
        const result = await dreamApi.getById(this.dreamId);
        const dream = result.dream;
        this.dream = {
          title: dream.title,
          content: dream.content,
          date: dream.date,
          emotion: dream.emotion || '',
          clarity: dream.clarity || 5
        };
      } catch (error) {
        console.error('加载梦境失败:', error);
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    },
    onDateChange(e) {
      this.dream.date = e.detail.value;
    },
    selectEmotion(value) {
      this.dream.emotion = value;
    },
    onClarityChange(e) {
      this.dream.clarity = e.detail.value;
    },
    cancel() {
      uni.navigateBack();
    },
    async saveDream() {
      if (!this.dream.title.trim()) {
        uni.showToast({
          title: '请输入梦境标题',
          icon: 'none'
        });
        return;
      }
      if (!this.dream.content.trim()) {
        uni.showToast({
          title: '请输入梦境内容',
          icon: 'none'
        });
        return;
      }
      if (!this.dream.date) {
        uni.showToast({
          title: '请选择日期',
          icon: 'none'
        });
        return;
      }

      uni.showLoading({
        title: '保存中...'
      });

      try {
        if (this.isEdit) {
          await dreamApi.update(this.dreamId, this.dream);
          uni.hideLoading();
          uni.showToast({
            title: '保存成功',
            icon: 'success'
          });
        } else {
          await dreamApi.create(this.dream);
          uni.hideLoading();
          uni.showToast({
            title: '保存成功',
            icon: 'success'
          });
        }
        
        setTimeout(() => {
          uni.switchTab({
            url: '/pages/index/index'
          });
        }, 1500);
      } catch (error) {
        uni.hideLoading();
        console.error('保存失败:', error);
        uni.showToast({
          title: '保存失败',
          icon: 'none'
        });
      }
    }
  }
};
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #f8f8f8;
  padding: 30rpx;
  padding-bottom: 150rpx;
}

.form-container {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
}

.form-item {
  margin-bottom: 40rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.form-input {
  width: 100%;
  height: 88rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #333;
}

.picker-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 88rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  padding: 0 24rpx;
}

.picker-text {
  font-size: 28rpx;
  color: #333;
}

.picker-text:empty::after {
  content: '请选择日期';
  color: #999;
}

.picker-arrow {
  font-size: 36rpx;
  color: #999;
}

.form-textarea {
  width: 100%;
  min-height: 300rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  padding: 24rpx;
  font-size: 28rpx;
  color: #333;
  line-height: 1.8;
}

.char-count {
  text-align: right;
  margin-top: 12rpx;
}

.char-count-text {
  font-size: 24rpx;
  color: #999;
}

.emotion-options {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
}

.emotion-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30rpx 20rpx;
  background-color: #f5f5f5;
  border-radius: 16rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
}

.emotion-selected {
  background-color: #f0f4ff;
  border-color: #667eea;
}

.emotion-icon {
  font-size: 48rpx;
  margin-bottom: 12rpx;
}

.emotion-label {
  font-size: 26rpx;
  color: #666;
}

.emotion-selected .emotion-label {
  color: #667eea;
  font-weight: 500;
}

.clarity-slider {
  padding: 0 10rpx;
}

.clarity-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.clarity-label {
  font-size: 24rpx;
  color: #999;
}

.clarity-value {
  text-align: center;
  margin-top: 16rpx;
}

.clarity-number {
  font-size: 48rpx;
  font-weight: bold;
  color: #667eea;
}

.clarity-unit {
  font-size: 24rpx;
  color: #999;
}

.action-buttons {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.btn {
  flex: 1;
}

.btn-text {
  font-size: 30rpx;
  font-weight: 500;
}
</style>
