<template>
    <view class="container">
        <view class="settings-section">
            <view class="section-header">
                <text class="section-title">语音设置</text>
            </view>
            
            <view class="setting-item card">
                <view class="setting-left">
                    <text class="setting-label">ASR模型</text>
                    <text class="setting-desc">选择语音识别模型</text>
                </view>
                <picker :value="asrModelIndex" :range="asrModels" range-key="name" @change="onAsrModelChange">
                    <view class="setting-right">
                        <text class="setting-value">{{ asrModels[asrModelIndex].name }}</text>
                        <text class="setting-arrow">›</text>
                    </view>
                </picker>
            </view>
            
            <view class="setting-item card">
                <view class="setting-left">
                    <text class="setting-label">默认源语言</text>
                    <text class="setting-desc">语音识别默认语言</text>
                </view>
                <picker :value="defaultSourceLangIndex" :range="languages" range-key="name" @change="onSourceLangChange">
                    <view class="setting-right">
                        <text class="setting-value">{{ languages[defaultSourceLangIndex].name }}</text>
                        <text class="setting-arrow">›</text>
                    </view>
                </picker>
            </view>
            
            <view class="setting-item card">
                <view class="setting-left">
                    <text class="setting-label">默认目标语言</text>
                    <text class="setting-desc">翻译默认目标语言</text>
                </view>
                <picker :value="defaultTargetLangIndex" :range="languages" range-key="name" @change="onTargetLangChange">
                    <view class="setting-right">
                        <text class="setting-value">{{ languages[defaultTargetLangIndex].name }}</text>
                        <text class="setting-arrow">›</text>
                    </view>
                </picker>
            </view>
        </view>
        
        <view class="settings-section">
            <view class="section-header">
                <text class="section-title">TTS语音设置</text>
            </view>
            
            <view class="setting-item card">
                <view class="setting-left">
                    <text class="setting-label">中文语音</text>
                    <text class="setting-desc">选择中文语音合成音色</text>
                </view>
                <picker :value="zhVoiceIndex" :range="zhVoices" range-key="name" @change="onZhVoiceChange">
                    <view class="setting-right">
                        <text class="setting-value">{{ zhVoices[zhVoiceIndex].name }}</text>
                        <text class="setting-arrow">›</text>
                    </view>
                </picker>
            </view>
            
            <view class="setting-item card">
                <view class="setting-left">
                    <text class="setting-label">英文语音</text>
                    <text class="setting-desc">选择英文语音合成音色</text>
                </view>
                <picker :value="enVoiceIndex" :range="enVoices" range-key="name" @change="onEnVoiceChange">
                    <view class="setting-right">
                        <text class="setting-value">{{ enVoices[enVoiceIndex].name }}</text>
                        <text class="setting-arrow">›</text>
                    </view>
                </picker>
            </view>
            
            <view class="setting-item card">
                <view class="setting-left">
                    <text class="setting-label">语速</text>
                    <text class="setting-desc">语音播放速度</text>
                </view>
                <view class="setting-right">
                    <slider 
                        :value="speechRate" 
                        :min="50" 
                        :max="200" 
                        :step="10"
                        activeColor="#409EFF"
                        backgroundColor="#E4E7ED"
                        block-size="20"
                        @change="onRateChange"
                    />
                    <text class="rate-value">{{ speechRate }}%</text>
                </view>
            </view>
            
            <view class="setting-item card">
                <view class="setting-left">
                    <text class="setting-label">音调</text>
                    <text class="setting-desc">语音播放音调</text>
                </view>
                <view class="setting-right">
                    <slider 
                        :value="speechPitch" 
                        :min="50" 
                        :max="200" 
                        :step="10"
                        activeColor="#409EFF"
                        backgroundColor="#E4E7ED"
                        block-size="20"
                        @change="onPitchChange"
                    />
                    <text class="rate-value">{{ speechPitch }}%</text>
                </view>
            </view>
        </view>
        
        <view class="settings-section">
            <view class="section-header">
                <text class="section-title">其他设置</text>
            </view>
            
            <view class="setting-item card">
                <view class="setting-left">
                    <text class="setting-label">自动保存历史</text>
                    <text class="setting-desc">自动保存翻译记录</text>
                </view>
                <view class="setting-right">
                    <switch 
                        :checked="autoSaveHistory" 
                        color="#409EFF"
                        @change="onAutoSaveChange"
                    />
                </view>
            </view>
            
            <view class="setting-item card">
                <view class="setting-left">
                    <text class="setting-label">商务术语优化</text>
                    <text class="setting-desc">优化商务场景翻译</text>
                </view>
                <view class="setting-right">
                    <switch 
                        :checked="optimizeBusiness" 
                        color="#409EFF"
                        @change="onOptimizeBusinessChange"
                    />
                </view>
            </view>
            
            <view class="setting-item card" @click="clearHistory">
                <view class="setting-left">
                    <text class="setting-label">清除历史记录</text>
                    <text class="setting-desc">删除所有翻译历史</text>
                </view>
                <view class="setting-right">
                    <text class="setting-arrow">›</text>
                </view>
            </view>
        </view>
        
        <view class="settings-section">
            <view class="section-header">
                <text class="section-title">关于</text>
            </view>
            
            <view class="setting-item card">
                <view class="setting-left">
                    <text class="setting-label">版本</text>
                </view>
                <view class="setting-right">
                    <text class="setting-value text-secondary">1.0.0</text>
                </view>
            </view>
            
            <view class="setting-item card">
                <view class="setting-left">
                    <text class="setting-label">服务地址</text>
                </view>
                <view class="setting-right" @click="showServerInput = true">
                    <text class="setting-value text-secondary">{{ serverAddress }}</text>
                    <text class="setting-arrow">›</text>
                </view>
            </view>
        </view>
        
        <view class="footer-info">
            <text class="footer-text">实时翻译助手 - 跨境商务翻译专家</text>
        </view>
        
        <view class="modal-overlay" v-if="showServerInput" @click="showServerInput = false">
            <view class="modal-content" @click.stop>
                <view class="modal-header">
                    <text class="modal-title">设置服务地址</text>
                    <text class="modal-close" @click="showServerInput = false">✕</text>
                </view>
                
                <view class="modal-body">
                    <input 
                        class="server-input" 
                        v-model="serverAddress"
                        placeholder="请输入服务地址，如: http://localhost:8000"
                    />
                </view>
                
                <view class="modal-footer">
                    <view class="modal-btn cancel" @click="showServerInput = false">
                        <text class="btn-text">取消</text>
                    </view>
                    <view class="modal-btn confirm" @click="saveServerAddress">
                        <text class="btn-text">保存</text>
                    </view>
                </view>
            </view>
        </view>
    </view>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { LanguageInfo } from '@/api/translation'

const languages = ref<LanguageInfo[]>([
    { code: 'zh', name: '中文', voice: 'zh-CN-XiaoxiaoNeural' },
    { code: 'en', name: '英语', voice: 'en-US-JennyNeural' },
    { code: 'ja', name: '日语', voice: 'ja-JP-NanamiNeural' },
    { code: 'ko', name: '韩语', voice: 'ko-KR-SunHiNeural' }
])

const asrModels = ref([
    { name: '基础模型 (base)', value: 'base' },
    { name: '小型模型 (small)', value: 'small' },
    { name: '中型模型 (medium)', value: 'medium' },
    { name: '大型模型 (large)', value: 'large' }
])

const zhVoices = ref([
    { name: '晓晓 (女)', value: 'zh-CN-XiaoxiaoNeural' },
    { name: '云希 (男)', value: 'zh-CN-YunxiNeural' },
    { name: '晓伊 (女)', value: 'zh-CN-XiaoyiNeural' }
])

const enVoices = ref([
    { name: 'Jenny (女)', value: 'en-US-JennyNeural' },
    { name: 'Guy (男)', value: 'en-US-GuyNeural' },
    { name: 'Aria (女)', value: 'en-US-AriaNeural' }
])

const asrModelIndex = ref(0)
const defaultSourceLangIndex = ref(0)
const defaultTargetLangIndex = ref(1)
const zhVoiceIndex = ref(0)
const enVoiceIndex = ref(0)
const speechRate = ref(100)
const speechPitch = ref(100)
const autoSaveHistory = ref(true)
const optimizeBusiness = ref(true)
const serverAddress = ref('http://localhost:8000')
const showServerInput = ref(false)

const onAsrModelChange = (e: any) => {
    asrModelIndex.value = e.detail.value
    uni.setStorageSync('asrModel', asrModels.value[asrModelIndex.value].value)
}

const onSourceLangChange = (e: any) => {
    defaultSourceLangIndex.value = e.detail.value
    uni.setStorageSync('defaultSourceLang', languages.value[defaultSourceLangIndex.value].code)
}

const onTargetLangChange = (e: any) => {
    defaultTargetLangIndex.value = e.detail.value
    uni.setStorageSync('defaultTargetLang', languages.value[defaultTargetLangIndex.value].code)
}

const onZhVoiceChange = (e: any) => {
    zhVoiceIndex.value = e.detail.value
    uni.setStorageSync('zhVoice', zhVoices.value[zhVoiceIndex.value].value)
}

const onEnVoiceChange = (e: any) => {
    enVoiceIndex.value = e.detail.value
    uni.setStorageSync('enVoice', enVoices.value[enVoiceIndex.value].value)
}

const onRateChange = (e: any) => {
    speechRate.value = e.detail.value
    uni.setStorageSync('speechRate', speechRate.value)
}

const onPitchChange = (e: any) => {
    speechPitch.value = e.detail.value
    uni.setStorageSync('speechPitch', speechPitch.value)
}

const onAutoSaveChange = (e: any) => {
    autoSaveHistory.value = e.detail.value
    uni.setStorageSync('autoSaveHistory', autoSaveHistory.value)
}

const onOptimizeBusinessChange = (e: any) => {
    optimizeBusiness.value = e.detail.value
    uni.setStorageSync('optimizeBusiness', optimizeBusiness.value)
}

const clearHistory = () => {
    uni.showModal({
        title: '提示',
        content: '确定要清除所有翻译历史吗？此操作不可恢复。',
        confirmText: '清除',
        confirmColor: '#F56C6C',
        success: (res) => {
            if (res.confirm) {
                uni.setStorageSync('translationHistory', [])
                uni.showToast({
                    title: '已清除',
                    icon: 'success'
                })
            }
        }
    })
}

const saveServerAddress = () => {
    if (!serverAddress.value.trim()) {
        uni.showToast({
            title: '请输入服务地址',
            icon: 'none'
        })
        return
    }
    
    uni.setStorageSync('serverAddress', serverAddress.value)
    showServerInput.value = false
    
    uni.showToast({
        title: '保存成功',
        icon: 'success'
    })
}

const loadSettings = () => {
    const savedAsrModel = uni.getStorageSync('asrModel')
    if (savedAsrModel) {
        const index = asrModels.value.findIndex(m => m.value === savedAsrModel)
        if (index !== -1) asrModelIndex.value = index
    }
    
    const savedSourceLang = uni.getStorageSync('defaultSourceLang')
    if (savedSourceLang) {
        const index = languages.value.findIndex(l => l.code === savedSourceLang)
        if (index !== -1) defaultSourceLangIndex.value = index
    }
    
    const savedTargetLang = uni.getStorageSync('defaultTargetLang')
    if (savedTargetLang) {
        const index = languages.value.findIndex(l => l.code === savedTargetLang)
        if (index !== -1) defaultTargetLangIndex.value = index
    }
    
    const savedZhVoice = uni.getStorageSync('zhVoice')
    if (savedZhVoice) {
        const index = zhVoices.value.findIndex(v => v.value === savedZhVoice)
        if (index !== -1) zhVoiceIndex.value = index
    }
    
    const savedEnVoice = uni.getStorageSync('enVoice')
    if (savedEnVoice) {
        const index = enVoices.value.findIndex(v => v.value === savedEnVoice)
        if (index !== -1) enVoiceIndex.value = index
    }
    
    const savedRate = uni.getStorageSync('speechRate')
    if (savedRate) speechRate.value = savedRate
    
    const savedPitch = uni.getStorageSync('speechPitch')
    if (savedPitch) speechPitch.value = savedPitch
    
    const savedAutoSave = uni.getStorageSync('autoSaveHistory')
    if (savedAutoSave !== undefined) autoSaveHistory.value = savedAutoSave
    
    const savedOptimize = uni.getStorageSync('optimizeBusiness')
    if (savedOptimize !== undefined) optimizeBusiness.value = savedOptimize
    
    const savedServer = uni.getStorageSync('serverAddress')
    if (savedServer) serverAddress.value = savedServer
}

onMounted(() => {
    loadSettings()
})
</script>

<style scoped>
.container {
    padding: 20rpx;
    padding-bottom: 40rpx;
    min-height: 100vh;
}

.settings-section {
    margin-bottom: 30rpx;
}

.section-header {
    padding: 20rpx 10rpx;
}

.section-title {
    font-size: 26rpx;
    color: #909399;
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rpx;
}

.setting-left {
    flex: 1;
}

.setting-label {
    display: block;
    font-size: 30rpx;
    color: #333333;
    margin-bottom: 6rpx;
}

.setting-desc {
    display: block;
    font-size: 24rpx;
    color: #909399;
}

.setting-right {
    display: flex;
    align-items: center;
}

.setting-value {
    font-size: 28rpx;
    color: #606266;
    margin-right: 10rpx;
}

.setting-value.text-secondary {
    color: #909399;
}

.setting-arrow {
    font-size: 36rpx;
    color: #C0C4CC;
}

.rate-value {
    font-size: 26rpx;
    color: #409EFF;
    margin-left: 20rpx;
    min-width: 80rpx;
    text-align: right;
}

.footer-info {
    padding: 40rpx 0;
    text-align: center;
}

.footer-text {
    font-size: 24rpx;
    color: #C0C4CC;
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
    width: 85%;
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

.server-input {
    width: 100%;
    padding: 24rpx;
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
