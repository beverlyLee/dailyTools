<template>
  <view class="container">
    <view class="search-section">
      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input 
          class="search-input" 
          type="text" 
          v-model="searchKeyword" 
          placeholder="搜索病害名称"
          @confirm="onSearch"
        />
        <view class="search-btn" @click="onSearch">
          <text>搜索</text>
        </view>
      </view>
    </view>

    <view class="category-section">
      <view class="section-header">
        <text class="section-title">按植物分类</text>
      </view>
      <view class="category-grid">
        <view 
          v-for="(category, index) in categories" 
          :key="index" 
          class="category-item"
          :class="{ 'category-active': activeCategory === index }"
          @click="onCategoryClick(index)"
        >
          <text class="category-icon">{{ category.icon }}</text>
          <text class="category-name">{{ category.name }}</text>
        </view>
      </view>
    </view>

    <view class="disease-list" v-if="filteredDiseases.length > 0">
      <view 
        v-for="(disease, index) in filteredDiseases" 
        :key="disease.disease_name" 
        class="disease-item card"
        @click="goToDiseaseDetail(disease.disease_name)"
      >
        <view class="disease-header">
          <text class="disease-name">{{ disease.disease_name }}</text>
          <view class="disease-arrow">›</view>
        </view>
        <view class="disease-content">
          <view class="symptoms-section">
            <text class="label">主要症状:</text>
            <text class="content-text" v-if="disease.symptoms && disease.symptoms.length > 0">
              {{ disease.symptoms[0] }}
              <text v-if="disease.symptoms.length > 1">...</text>
            </text>
          </view>
          <view class="tags-section" v-if="disease.recommended_pesticides && disease.recommended_pesticides.length > 0">
            <view 
              v-for="(pesticide, idx) in disease.recommended_pesticides.slice(0, 3)" 
              :key="idx" 
              class="tag tag-info"
            >{{ pesticide }}</view>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="empty-state">
      <view class="empty-icon">📖</view>
      <text class="empty-text">未找到相关病害</text>
      <text class="empty-hint">请尝试其他关键词或分类</text>
    </view>
  </view>
</template>

<script>
import api from '@/utils/api.js'

export default {
  data() {
    return {
      searchKeyword: '',
      activeCategory: -1,
      categories: [
        { name: '全部', icon: '🌿', diseases: [] },
        { name: '番茄', icon: '🍅', diseases: ['番茄早疫病', '番茄晚疫病', '番茄叶霉病', '番茄灰霉病'] },
        { name: '黄瓜', icon: '🥒', diseases: ['黄瓜霜霉病', '黄瓜白粉病', '黄瓜炭疽病'] },
        { name: '苹果', icon: '🍎', diseases: ['苹果腐烂病', '苹果炭疽病', '苹果轮纹病'] },
        { name: '葡萄', icon: '🍇', diseases: ['葡萄白粉病', '葡萄霜霉病', '葡萄炭疽病'] }
      ],
      allDiseases: [],
      filteredDiseases: []
    }
  },
  onShow() {
    this.loadDiseases()
  },
  methods: {
    async loadDiseases() {
      try {
        const diseases = await api.diseaseApi.getAllTreatments()
        this.allDiseases = diseases
        this.filterDiseases()
      } catch (error) {
        console.error('加载病害列表失败:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    },
    filterDiseases() {
      let result = [...this.allDiseases]
      
      if (this.activeCategory > 0) {
        const categoryDiseases = this.categories[this.activeCategory].diseases
        result = result.filter(d => categoryDiseases.includes(d.disease_name))
      }
      
      if (this.searchKeyword.trim()) {
        const keyword = this.searchKeyword.trim().toLowerCase()
        result = result.filter(d => 
          d.disease_name.toLowerCase().includes(keyword) ||
          (d.symptoms && d.symptoms.some(s => s.toLowerCase().includes(keyword)))
        )
      }
      
      this.filteredDiseases = result
    },
    onSearch() {
      this.filterDiseases()
    },
    onCategoryClick(index) {
      this.activeCategory = this.activeCategory === index ? -1 : index
      this.filterDiseases()
    },
    goToDiseaseDetail(diseaseName) {
      uni.navigateTo({
        url: `/pages/disease-detail/disease-detail?name=${encodeURIComponent(diseaseName)}`
      })
    }
  }
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #F8F8F8;
  padding: 30rpx;
}

.search-section {
  margin-bottom: 30rpx;
}

.search-box {
  display: flex;
  align-items: center;
  background-color: #FFFFFF;
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
}

.search-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
}

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333333;
}

.search-btn {
  padding: 12rpx 24rpx;
  background-color: #2B9939;
  border-radius: 8rpx;
  margin-left: 16rpx;
}

.search-btn text {
  font-size: 26rpx;
  color: #FFFFFF;
}

.category-section {
  margin-bottom: 30rpx;
}

.section-header {
  margin-bottom: 20rpx;
  padding: 0 10rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333333;
}

.category-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 140rpx;
  padding: 20rpx 0;
  background-color: #FFFFFF;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
}

.category-item.category-active {
  background-color: #E8F5E9;
  border-color: #2B9939;
}

.category-icon {
  font-size: 40rpx;
  margin-bottom: 8rpx;
}

.category-name {
  font-size: 24rpx;
  color: #333333;
}

.category-active .category-name {
  color: #2B9939;
  font-weight: 500;
}

.disease-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.disease-item {
  padding: 24rpx;
}

.disease-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.disease-name {
  font-size: 32rpx;
  font-weight: 500;
  color: #333333;
}

.disease-arrow {
  font-size: 32rpx;
  color: #CCCCCC;
}

.disease-content {
  padding-left: 8rpx;
}

.symptoms-section {
  display: flex;
  margin-bottom: 16rpx;
}

.label {
  font-size: 26rpx;
  color: #666666;
  margin-right: 8rpx;
  flex-shrink: 0;
}

.content-text {
  font-size: 26rpx;
  color: #333333;
  flex: 1;
}

.tags-section {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
}

.empty-icon {
  font-size: 100rpx;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 30rpx;
  color: #666666;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #999999;
}
</style>
