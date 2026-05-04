<template>
  <view class="container">
    <view class="search-section">
      <view class="search-box">
        <text class="search-icon">🔍</text>
        <input 
          class="search-input" 
          type="text" 
          placeholder="搜索垃圾分类知识..."
          v-model="searchKeyword"
          @confirm="doSearch"
        />
        <button v-if="searchKeyword" class="clear-btn" @tap="clearSearch">
          <text>✕</text>
        </button>
      </view>
      <button class="search-btn" @tap="doSearch">
        <text>搜索</text>
      </button>
    </view>

    <view v-if="searchResults" class="search-results">
      <view class="result-section" v-if="searchResults.matched_categories?.length > 0">
        <text class="result-title">相关分类</text>
        <view class="result-list">
          <view 
            v-for="cat in searchResults.matched_categories" 
            :key="cat.name"
            class="result-item card-item"
            @tap="viewCategoryDetail(cat)"
          >
            <view :class="['category-icon-badge', getCategoryClass(cat.name)]">
              <text class="icon-text">{{ getCategoryIcon(cat.name) }}</text>
            </view>
            <view class="item-info">
              <text class="item-title">{{ cat.name }}</text>
              <text class="item-desc">{{ cat.description }}</text>
            </view>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>

      <view class="result-section" v-if="searchResults.matched_items?.length > 0">
        <text class="result-title">相关物品</text>
        <view class="result-list">
          <view 
            v-for="item in searchResults.matched_items" 
            :key="item.name"
            class="result-item card-item"
          >
            <view :class="['category-icon-badge', getCategoryClass(item.category)]">
              <text class="icon-text">{{ getCategoryIcon(item.category) }}</text>
            </view>
            <view class="item-info">
              <text class="item-title">{{ item.name }}</text>
              <text class="item-cat">{{ item.category }}</text>
            </view>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="category-section">
      <view class="section-header">
        <text class="section-title">垃圾分类指南</text>
      </view>

      <view 
        v-for="cat in categories" 
        :key="cat.name"
        class="category-card"
        @tap="viewCategoryDetail(cat)"
      >
        <view class="card-header">
          <view :class="['category-badge', getCategoryClass(cat.name)]">
            <text class="badge-icon">{{ getCategoryIcon(cat.name) }}</text>
            <text class="badge-text">{{ cat.name }}</text>
          </view>
          <text class="arrow">›</text>
        </view>
        
        <text class="card-desc">{{ cat.description }}</text>
        
        <view v-if="cat.examples?.length > 0" class="card-examples">
          <text class="examples-label">常见物品：</text>
          <view class="examples-list">
            <text 
              v-for="(example, index) in cat.examples.slice(0, 5)" 
              :key="index"
              class="example-tag"
            >
              {{ example }}
            </text>
          </view>
        </view>
      </view>

      <view class="tips-section">
        <view class="section-header">
          <text class="section-title">分类小技巧</text>
        </view>
        
        <view class="tips-list">
          <view class="tip-item">
            <view class="tip-number">1</view>
            <view class="tip-content">
              <text class="tip-title">看颜色识分类</text>
              <text class="tip-text">蓝色=可回收物，绿色=厨余垃圾，红色=有害垃圾，灰色=其他垃圾</text>
            </view>
          </view>
          
          <view class="tip-item">
            <view class="tip-number">2</view>
            <view class="tip-content">
              <text class="tip-title">投放前请沥干</text>
              <text class="tip-text">厨余垃圾请沥干水分，可回收物请保持清洁干燥</text>
            </view>
          </view>
          
          <view class="tip-item">
            <view class="tip-number">3</view>
            <view class="tip-content">
              <text class="tip-title">去除包装再分类</text>
              <text class="tip-text">过期食品请去除外包装后再投入厨余垃圾</text>
            </view>
          </view>
          
          <view class="tip-item">
            <view class="tip-number">4</view>
            <view class="tip-content">
              <text class="tip-title">有害垃圾单独放</text>
              <text class="tip-text">废电池、废药品等有害垃圾请投放到专门收集点</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="showCategoryDetail" class="detail-modal" @tap="closeDetail">
      <view class="detail-content" @tap.stop>
        <view class="detail-header">
          <view :class="['detail-badge', getCategoryClass(selectedCategory?.name || '')]">
            <text class="detail-icon">{{ getCategoryIcon(selectedCategory?.name || '') }}</text>
            <text class="detail-title">{{ selectedCategory?.name }}</text>
          </view>
          <button class="close-btn" @tap="closeDetail">
            <text>✕</text>
          </button>
        </view>
        
        <view class="detail-body">
          <view class="detail-section">
            <text class="detail-section-title">分类说明</text>
            <text class="detail-text">{{ selectedCategory?.description }}</text>
          </view>
          
          <view class="detail-section">
            <text class="detail-section-title">投放要求</text>
            <text class="detail-text">{{ selectedCategory?.disposal_guide }}</text>
          </view>
          
          <view v-if="selectedCategory?.examples?.length > 0" class="detail-section">
            <text class="detail-section-title">常见物品</text>
            <view class="detail-examples">
              <text 
                v-for="(example, index) in selectedCategory?.examples" 
                :key="index"
                class="detail-example-tag"
              >
                {{ example }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiService, CategoryInfo } from '@/services/api'

const searchKeyword = ref<string>('')
const categories = ref<CategoryInfo[]>([])
const searchResults = ref<{
  matched_categories: CategoryInfo[]
  matched_items: Array<{ name: string; category: string; disposal_tips: string }>
} | null>(null)
const showCategoryDetail = ref<boolean>(false)
const selectedCategory = ref<CategoryInfo | null>(null)

const categoryIcons: Record<string, string> = {
  '可回收物': '♻️',
  '厨余垃圾': '🍎',
  '有害垃圾': '⚠️',
  '其他垃圾': '🗑️'
}

const getCategoryClass = (category: string): string => {
  const map: Record<string, string> = {
    '可回收物': 'cat-recyclable',
    '厨余垃圾': 'cat-kitchen',
    '有害垃圾': 'cat-hazardous',
    '其他垃圾': 'cat-other'
  }
  return map[category] || 'cat-other'
}

const getCategoryIcon = (category: string): string => {
  return categoryIcons[category] || '🗑️'
}

const loadCategories = async () => {
  try {
    const result = await apiService.getKnowledgeCategories()
    if (result.success) {
      categories.value = result.data
    }
  } catch (error) {
    console.error('Failed to load categories:', error)
    categories.value = [
      { 
        name: '可回收物', 
        description: '适宜回收和资源利用的垃圾', 
        color: '蓝色', 
        disposal_guide: '轻投轻放，清洁干燥，避免污染',
        examples: ['纸类', '塑料', '玻璃', '金属', '织物']
      },
      { 
        name: '厨余垃圾', 
        description: '日常生活产生的易腐性垃圾', 
        color: '绿色', 
        disposal_guide: '纯流质的食物垃圾应直接倒进下水口',
        examples: ['剩菜剩饭', '瓜皮果核', '茶渣', '蛋壳']
      },
      { 
        name: '有害垃圾', 
        description: '对人体健康或自然环境造成直接或潜在危害的垃圾', 
        color: '红色', 
        disposal_guide: '投放时请注意轻放，易破损的请包裹后投放',
        examples: ['废电池', '废灯管', '废药品', '废油漆']
      },
      { 
        name: '其他垃圾', 
        description: '除上述垃圾之外的其他生活垃圾', 
        color: '灰色', 
        disposal_guide: '尽量沥干水分，难以辨识类别的投入其他垃圾',
        examples: ['餐巾纸', '尿不湿', '烟蒂', '陶瓷']
      }
    ]
  }
}

const doSearch = async () => {
  if (!searchKeyword.value.trim()) {
    searchResults.value = null
    return
  }

  try {
    const result = await apiService.searchKnowledge(searchKeyword.value.trim())
    if (result.success) {
      searchResults.value = result.data
    }
  } catch (error) {
    console.error('Search failed:', error)
    uni.showToast({ title: '搜索失败', icon: 'none' })
  }
}

const clearSearch = () => {
  searchKeyword.value = ''
  searchResults.value = null
}

const viewCategoryDetail = (category: CategoryInfo) => {
  selectedCategory.value = category
  showCategoryDetail.value = true
}

const closeDetail = () => {
  showCategoryDetail.value = false
  selectedCategory.value = null
}

onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding: 20rpx;
  padding-bottom: 120rpx;
}

.search-section {
  display: flex;
  gap: 16rpx;
  margin-bottom: 30rpx;
  padding: 0 10rpx;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 40rpx;
  padding: 0 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.search-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
}

.search-input {
  flex: 1;
  height: 80rpx;
  font-size: 28rpx;
}

.clear-btn {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #E0E0E0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  font-size: 24rpx;
  color: #999;
}

.search-btn {
  width: 140rpx;
  height: 80rpx;
  background: linear-gradient(135deg, #4CAF50, #45a049);
  border-radius: 40rpx;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  font-size: 28rpx;
}

.search-results {
  padding: 0 10rpx;
}

.result-section {
  margin-bottom: 40rpx;
}

.result-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.result-list {
  background: #FFFFFF;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.result-item {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid #F0F0F0;
}

.result-item:last-child {
  border-bottom: none;
}

.category-icon-badge {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.icon-text {
  font-size: 36rpx;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.item-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
}

.item-desc, .item-cat {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}

.arrow {
  font-size: 36rpx;
  color: #CCCCCC;
}

.category-section {
  padding: 0 10rpx;
}

.section-header {
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}

.category-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.category-card:active {
  background: #FAFAFA;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.category-badge {
  display: flex;
  align-items: center;
  padding: 12rpx 24rpx;
  border-radius: 32rpx;
}

.badge-icon {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.badge-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #FFFFFF;
}

.card-desc {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 20rpx;
}

.card-examples {
  padding-top: 20rpx;
  border-top: 1rpx solid #F0F0F0;
}

.examples-label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 16rpx;
}

.examples-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.example-tag {
  font-size: 24rpx;
  color: #666;
  background: #F5F5F5;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
}

.tips-section {
  margin-top: 50rpx;
}

.tips-list {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 20rpx 0;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.tip-item {
  display: flex;
  padding: 24rpx 30rpx;
  border-bottom: 1rpx solid #F0F0F0;
}

.tip-item:last-child {
  border-bottom: none;
}

.tip-number {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: #FFFFFF;
  font-size: 26rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.tip-content {
  flex: 1;
}

.tip-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #999;
  line-height: 1.5;
}

.detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.detail-content {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 80vh;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1rpx solid #F0F0F0;
}

.detail-badge {
  display: flex;
  align-items: center;
  padding: 16rpx 32rpx;
  border-radius: 40rpx;
}

.detail-icon {
  font-size: 44rpx;
  margin-right: 16rpx;
}

.detail-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.close-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #F5F5F5;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  font-size: 28rpx;
  color: #999;
}

.detail-body {
  padding: 30rpx;
  padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
}

.detail-section {
  margin-bottom: 32rpx;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 16rpx;
  display: block;
}

.detail-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.8;
}

.detail-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.detail-example-tag {
  font-size: 26rpx;
  color: #4CAF50;
  background: rgba(76, 175, 80, 0.1);
  padding: 12rpx 28rpx;
  border-radius: 24rpx;
}

.cat-recyclable {
  background: linear-gradient(135deg, #2196F3, #1976D2);
}

.cat-kitchen {
  background: linear-gradient(135deg, #4CAF50, #388E3C);
}

.cat-hazardous {
  background: linear-gradient(135deg, #F44336, #D32F2F);
}

.cat-other {
  background: linear-gradient(135deg, #9E9E9E, #757575);
}
</style>
