<template>
    <view class="container">
        <view class="category-tabs">
            <scroll-view scroll-x class="tabs-scroll">
                <view class="tabs-container">
                    <view 
                        class="tab-item" 
                        :class="{ 'active': activeCategory === item }"
                        v-for="item in categories" 
                        :key="item"
                        @click="selectCategory(item)"
                    >
                        <text class="tab-text">{{ item }}</text>
                    </view>
                </view>
            </scroll-view>
        </view>
        
        <view class="search-section card">
            <view class="search-input-wrapper">
                <text class="search-icon">🔍</text>
                <input 
                    class="search-input" 
                    v-model="searchKeyword"
                    placeholder="搜索商务短语..."
                    @confirm="searchPhrases"
                />
                <text class="clear-btn" v-if="searchKeyword" @click="clearSearch">✕</text>
            </view>
        </view>
        
        <view class="phrases-list" v-if="phrasesList.length > 0">
            <view class="phrase-item card" v-for="(item, index) in phrasesList" :key="item.id">
                <view class="phrase-header">
                    <view class="phrase-category">
                        <text class="category-badge">{{ item.category }}</text>
                    </view>
                    <view class="phrase-lang">
                        <text class="lang-code">{{ item.language_code.toUpperCase() }} → {{ item.target_language.toUpperCase() }}</text>
                    </view>
                </view>
                
                <view class="phrase-content">
                    <view class="content-row original">
                        <text class="content-label">原文:</text>
                        <text class="content-text">{{ item.original_text }}</text>
                    </view>
                    <view class="content-row translated">
                        <text class="content-label">译文:</text>
                        <text class="content-text">{{ item.translated_text }}</text>
                    </view>
                </view>
                
                <view class="phrase-actions">
                    <view class="action-btn" @click="copyPhrase(item.translated_text)">
                        <text class="action-icon">📋</text>
                        <text class="action-text">复制</text>
                    </view>
                    <view class="action-btn" @click="speakPhrase(item.translated_text, item.target_language)">
                        <text class="action-icon">🔊</text>
                        <text class="action-text">播放</text>
                    </view>
                    <view class="action-btn" @click="usePhrase(item)">
                        <text class="action-icon">💬</text>
                        <text class="action-text">使用</text>
                    </view>
                </view>
            </view>
        </view>
        
        <view class="empty-state" v-else>
            <text class="empty-icon">📚</text>
            <text class="empty-text">暂无商务短语</text>
            <text class="empty-hint">尝试其他分类或搜索关键词</text>
        </view>
        
        <view class="add-phrase-btn" @click="showAddModal = true">
            <text class="add-icon">+</text>
        </view>
        
        <view class="modal-overlay" v-if="showAddModal" @click="showAddModal = false">
            <view class="modal-content" @click.stop>
                <view class="modal-header">
                    <text class="modal-title">添加商务短语</text>
                    <text class="modal-close" @click="showAddModal = false">✕</text>
                </view>
                
                <view class="modal-body">
                    <view class="form-item">
                        <text class="form-label">分类</text>
                        <picker :value="newPhraseCategoryIndex" :range="categories" @change="onCategoryChange">
                            <view class="form-picker">
                                <text>{{ categories[newPhraseCategoryIndex] }}</text>
                                <text class="picker-arrow">▼</text>
                            </view>
                        </picker>
                    </view>
                    
                    <view class="form-item">
                        <text class="form-label">源语言</text>
                        <picker :value="newPhraseLangIndex" :range="languages" range-key="name" @change="onLangChange">
                            <view class="form-picker">
                                <text>{{ languages[newPhraseLangIndex].name }}</text>
                                <text class="picker-arrow">▼</text>
                            </view>
                        </picker>
                    </view>
                    
                    <view class="form-item">
                        <text class="form-label">原文</text>
                        <textarea 
                            class="form-textarea" 
                            v-model="newPhraseOriginal"
                            placeholder="请输入原文..."
                        />
                    </view>
                    
                    <view class="form-item">
                        <text class="form-label">译文</text>
                        <textarea 
                            class="form-textarea" 
                            v-model="newPhraseTranslated"
                            placeholder="请输入译文..."
                        />
                    </view>
                </view>
                
                <view class="modal-footer">
                    <view class="modal-btn cancel" @click="showAddModal = false">
                        <text class="btn-text">取消</text>
                    </view>
                    <view class="modal-btn confirm" @click="addNewPhrase">
                        <text class="btn-text">保存</text>
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { 
    getPhrases, 
    getPhraseCategories, 
    createPhrase,
    usePhrase as apiUsePhrase,
    Phrase,
    LanguageInfo
} from '@/api/translation'

const categories = ref<string[]>([
    '全部',
    '问候与介绍',
    '商务会议',
    '价格谈判',
    '合同条款',
    '产品介绍',
    '客户服务',
    '日语常用',
    '韩语常用'
])

const languages = ref<LanguageInfo[]>([
    { code: 'zh', name: '中文', voice: 'zh-CN-XiaoxiaoNeural' },
    { code: 'en', name: '英语', voice: 'en-US-JennyNeural' },
    { code: 'ja', name: '日语', voice: 'ja-JP-NanamiNeural' },
    { code: 'ko', name: '韩语', voice: 'ko-KR-SunHiNeural' }
])

const activeCategory = ref('全部')
const searchKeyword = ref('')
const phrasesList = ref<Phrase[]>([])
const showAddModal = ref(false)

const newPhraseCategoryIndex = ref(1)
const newPhraseLangIndex = ref(0)
const newPhraseOriginal = ref('')
const newPhraseTranslated = ref('')

const selectCategory = (category: string) => {
    activeCategory.value = category
    loadPhrases()
}

const clearSearch = () => {
    searchKeyword.value = ''
    loadPhrases()
}

const searchPhrases = () => {
    loadPhrases()
}

const loadPhrases = async () => {
    try {
        const params: {
            category?: string
            language_code?: string
        } = {}
        
        if (activeCategory.value !== '全部') {
            params.category = activeCategory.value
        }
        
        let result = await getPhrases(params)
        
        if (searchKeyword.value) {
            result = result.filter(phrase => 
                phrase.original_text.includes(searchKeyword.value) ||
                phrase.translated_text.includes(searchKeyword.value)
            )
        }
        
        phrasesList.value = result
    } catch (error) {
        console.error('Load phrases error:', error)
    }
}

const loadCategories = async () => {
    try {
        const result = await getPhraseCategories()
        if (result.categories && result.categories.length > 0) {
            categories.value = ['全部', ...result.categories]
        }
    } catch (error) {
        console.log('Using default categories')
    }
}

const onCategoryChange = (e: any) => {
    newPhraseCategoryIndex.value = e.detail.value
}

const onLangChange = (e: any) => {
    newPhraseLangIndex.value = e.detail.value
}

const addNewPhrase = async () => {
    if (!newPhraseOriginal.value.trim() || !newPhraseTranslated.value.trim()) {
        uni.showToast({
            title: '请填写完整信息',
            icon: 'none'
        })
        return
    }
    
    try {
        await createPhrase({
            category: categories.value[newPhraseCategoryIndex.value],
            language_code: languages.value[newPhraseLangIndex.value].code,
            original_text: newPhraseOriginal.value,
            translated_text: newPhraseTranslated.value,
            target_language: 'en'
        })
        
        uni.showToast({
            title: '添加成功',
            icon: 'success'
        })
        
        showAddModal.value = false
        newPhraseOriginal.value = ''
        newPhraseTranslated.value = ''
        
        loadPhrases()
    } catch (error) {
        console.error('Add phrase error:', error)
        uni.showToast({
            title: '添加失败',
            icon: 'none'
        })
    }
}

const copyPhrase = (text: string) => {
    uni.setClipboardData({
        data: text,
        success: () => {
            uni.showToast({
                title: '已复制',
                icon: 'success'
            })
        }
    })
}

const speakPhrase = (text: string, lang: string) => {
    uni.setClipboardData({
        data: text,
        success: () => {
            uni.showToast({
                title: '已复制',
                icon: 'success'
            })
        }
    })
}

const usePhrase = async (phrase: Phrase) => {
    try {
        await apiUsePhrase(phrase.id)
    } catch (error) {
        console.error('Use phrase error:', error)
    }
    
    uni.navigateTo({
        url: `/pages/index/index?source=${encodeURIComponent(phrase.original_text)}&from=${phrase.language_code}&to=${phrase.target_language}`
    })
}

onMounted(() => {
    loadCategories()
    loadPhrases()
})

onShow(() => {
    loadPhrases()
})

watch(activeCategory, () => {
    loadPhrases()
})
</script>

<style scoped>
.container {
    padding: 20rpx;
    min-height: 100vh;
}

.category-tabs {
    margin-bottom: 20rpx;
}

.tabs-scroll {
    white-space: nowrap;
}

.tabs-container {
    display: flex;
    padding: 10rpx 0;
}

.tab-item {
    flex-shrink: 0;
    padding: 16rpx 32rpx;
    margin-right: 16rpx;
    background-color: #F5F7FA;
    border-radius: 32rpx;
}

.tab-item.active {
    background-color: #409EFF;
}

.tab-text {
    font-size: 26rpx;
    color: #606266;
}

.tab-item.active .tab-text {
    color: #FFFFFF;
}

.search-section {
    margin-bottom: 20rpx;
}

.search-input-wrapper {
    display: flex;
    align-items: center;
    background-color: #F5F7FA;
    border-radius: 8rpx;
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

.clear-btn {
    font-size: 28rpx;
    color: #909399;
    padding: 10rpx;
}

.phrases-list {
    padding-bottom: 120rpx;
}

.phrase-item {
    margin-bottom: 20rpx;
}

.phrase-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    padding-bottom: 20rpx;
    border-bottom: 1rpx solid #F0F0F0;
}

.phrase-category {
    display: flex;
    align-items: center;
}

.category-badge {
    font-size: 24rpx;
    color: #409EFF;
    background-color: #ECF5FF;
    padding: 6rpx 16rpx;
    border-radius: 4rpx;
}

.phrase-lang {
    display: flex;
    align-items: center;
}

.lang-code {
    font-size: 24rpx;
    color: #909399;
}

.phrase-content {
    margin-bottom: 20rpx;
}

.content-row {
    display: flex;
    margin-bottom: 16rpx;
}

.content-row:last-child {
    margin-bottom: 0;
}

.content-row.original .content-text {
    color: #333333;
}

.content-row.translated .content-text {
    color: #67C23A;
}

.content-label {
    font-size: 26rpx;
    color: #909399;
    margin-right: 10rpx;
    min-width: 60rpx;
}

.content-text {
    font-size: 28rpx;
    flex: 1;
    line-height: 1.6;
}

.phrase-actions {
    display: flex;
    justify-content: space-around;
    padding-top: 20rpx;
    border-top: 1rpx solid #F0F0F0;
}

.action-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10rpx 30rpx;
}

.action-icon {
    font-size: 36rpx;
    margin-bottom: 6rpx;
}

.action-text {
    font-size: 24rpx;
    color: #606266;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 100rpx 40rpx;
}

.empty-icon {
    font-size: 100rpx;
    margin-bottom: 30rpx;
}

.empty-text {
    font-size: 32rpx;
    color: #606266;
    margin-bottom: 16rpx;
}

.empty-hint {
    font-size: 26rpx;
    color: #909399;
}

.add-phrase-btn {
    position: fixed;
    right: 40rpx;
    bottom: 120rpx;
    width: 100rpx;
    height: 100rpx;
    background-color: #409EFF;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8rpx 24rpx rgba(64, 158, 255, 0.4);
    z-index: 100;
}

.add-icon {
    font-size: 48rpx;
    color: #FFFFFF;
    line-height: 1;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
}

.modal-content {
    width: 90%;
    max-width: 600rpx;
    background-color: #FFFFFF;
    border-radius: 16rpx;
    overflow: hidden;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #F0F0F0;
}

.modal-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333333;
}

.modal-close {
    font-size: 36rpx;
    color: #909399;
    padding: 10rpx;
}

.modal-body {
    padding: 30rpx;
}

.form-item {
    margin-bottom: 30rpx;
}

.form-item:last-child {
    margin-bottom: 0;
}

.form-label {
    display: block;
    font-size: 28rpx;
    color: #333333;
    margin-bottom: 16rpx;
}

.form-picker {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx 24rpx;
    background-color: #F5F7FA;
    border-radius: 8rpx;
}

.picker-arrow {
    font-size: 24rpx;
    color: #909399;
}

.form-textarea {
    width: 100%;
    min-height: 160rpx;
    padding: 20rpx 24rpx;
    background-color: #F5F7FA;
    border-radius: 8rpx;
    font-size: 28rpx;
    color: #333333;
}

.modal-footer {
    display: flex;
    border-top: 1rpx solid #F0F0F0;
}

.modal-btn {
    flex: 1;
    padding: 30rpx;
    text-align: center;
}

.modal-btn.cancel {
    border-right: 1rpx solid #F0F0F0;
}

.btn-text {
    font-size: 30rpx;
    color: #606266;
}

.modal-btn.confirm .btn-text {
    color: #409EFF;
    font-weight: bold;
}
</style>
