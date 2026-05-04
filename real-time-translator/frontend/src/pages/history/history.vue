<template>
    <view class="container">
        <view class="history-list" v-if="historyList.length > 0">
            <view class="history-item card" v-for="(item, index) in historyList" :key="item.id">
                <view class="history-header">
                    <view class="lang-pair">
                        <text class="lang-source">{{ getLangName(item.source_language) }}</text>
                        <text class="lang-arrow">→</text>
                        <text class="lang-target">{{ getLangName(item.target_language) }}</text>
                    </view>
                    <text class="history-time">{{ formatTime(item.created_at) }}</text>
                </view>
                
                <view class="history-content">
                    <view class="content-row">
                        <text class="content-label">原文:</text>
                        <text class="content-text">{{ item.source_text }}</text>
                    </view>
                    <view class="content-row">
                        <text class="content-label">译文:</text>
                        <text class="content-text translated">{{ item.translated_text }}</text>
                    </view>
                </view>
                
                <view class="history-actions">
                    <view class="action-btn" @click="copyText(item.translated_text)">
                        <text class="action-icon">📋</text>
                        <text class="action-text">复制译文</text>
                    </view>
                    <view class="action-btn" @click="speakText(item.translated_text, item.target_language)">
                        <text class="action-icon">🔊</text>
                        <text class="action-text">播放</text>
                    </view>
                    <view class="action-btn" @click="reTranslate(item)">
                        <text class="action-icon">🔄</text>
                        <text class="action-text">重新翻译</text>
                    </view>
                </view>
            </view>
        </view>
        
        <view class="empty-state" v-else>
            <text class="empty-icon">📝</text>
            <text class="empty-text">暂无翻译历史</text>
            <text class="empty-hint">开始翻译，记录将自动保存</text>
        </view>
        
        <view class="load-more" v-if="hasMore" @click="loadMore">
            <text class="load-more-text">加载更多</text>
        </view>
    </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getTranslationHistory, TranslationHistoryItem } from '@/api/translation'

const historyList = ref<TranslationHistoryItem[]>([])
const skip = ref(0)
const limit = ref(20)
const hasMore = ref(true)
const isLoading = ref(false)

const langMap: Record<string, string> = {
    'zh': '中文',
    'en': '英语',
    'ja': '日语',
    'ko': '韩语',
    'fr': '法语',
    'de': '德语',
    'es': '西班牙语'
}

const getLangName = (code: string): string => {
    return langMap[code] || code.toUpperCase()
}

const formatTime = (time: string): string => {
    if (!time) return ''
    
    const date = new Date(time)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) {
        return '刚刚'
    } else if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}分钟前`
    } else if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)}小时前`
    } else {
        return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
    }
}

const loadHistory = async () => {
    if (isLoading.value) return
    
    isLoading.value = true
    
    try {
        const result = await getTranslationHistory(skip.value, limit.value)
        
        if (result.length < limit.value) {
            hasMore.value = false
        }
        
        if (skip.value === 0) {
            historyList.value = result
        } else {
            historyList.value = [...historyList.value, ...result]
        }
        
    } catch (error) {
        console.error('Load history error:', error)
        uni.showToast({
            title: '加载失败',
            icon: 'none'
        })
    } finally {
        isLoading.value = false
    }
}

const loadMore = () => {
    if (hasMore.value && !isLoading.value) {
        skip.value += limit.value
        loadHistory()
    }
}

const copyText = (text: string) => {
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

const speakText = (text: string, lang: string) => {
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

const reTranslate = (item: TranslationHistoryItem) => {
    uni.navigateTo({
        url: `/pages/index/index?source=${encodeURIComponent(item.source_text)}&from=${item.source_language}&to=${item.target_language}`
    })
}

onMounted(() => {
    loadHistory()
})

onShow(() => {
    skip.value = 0
    hasMore.value = true
    loadHistory()
})
</script>

<style scoped>
.container {
    padding: 20rpx;
    min-height: 100vh;
}

.history-list {
    padding-bottom: 40rpx;
}

.history-item {
    margin-bottom: 20rpx;
}

.history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    padding-bottom: 20rpx;
    border-bottom: 1rpx solid #F0F0F0;
}

.lang-pair {
    display: flex;
    align-items: center;
}

.lang-source {
    font-size: 28rpx;
    font-weight: bold;
    color: #409EFF;
}

.lang-arrow {
    font-size: 28rpx;
    color: #909399;
    margin: 0 10rpx;
}

.lang-target {
    font-size: 28rpx;
    font-weight: bold;
    color: #67C23A;
}

.history-time {
    font-size: 24rpx;
    color: #909399;
}

.history-content {
    margin-bottom: 20rpx;
}

.content-row {
    display: flex;
    margin-bottom: 16rpx;
}

.content-row:last-child {
    margin-bottom: 0;
}

.content-label {
    font-size: 26rpx;
    color: #909399;
    margin-right: 10rpx;
    min-width: 60rpx;
}

.content-text {
    font-size: 28rpx;
    color: #333333;
    flex: 1;
    line-height: 1.6;
}

.content-text.translated {
    color: #67C23A;
}

.history-actions {
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

.load-more {
    display: flex;
    justify-content: center;
    padding: 30rpx;
}

.load-more-text {
    font-size: 28rpx;
    color: #409EFF;
}
</style>
