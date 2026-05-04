<template>
    <view class="container">
        <view class="language-selector card">
            <view class="selector-row">
                <picker :value="sourceLangIndex" :range="languages" range-key="name" @change="onSourceLangChange">
                    <view class="lang-picker">
                        <text class="lang-code">{{ languages[sourceLangIndex]?.code?.toUpperCase() }}</text>
                        <text class="lang-name">{{ languages[sourceLangIndex]?.name }}</text>
                    </view>
                </picker>
                
                <view class="swap-btn" @click="swapLanguages">
                    <text class="swap-icon">⇄</text>
                </view>
                
                <picker :value="targetLangIndex" :range="languages" range-key="name" @change="onTargetLangChange">
                    <view class="lang-picker">
                        <text class="lang-code">{{ languages[targetLangIndex]?.code?.toUpperCase() }}</text>
                        <text class="lang-name">{{ languages[targetLangIndex]?.name }}</text>
                    </view>
                </picker>
            </view>
        </view>
        
        <view class="input-section card">
            <view class="input-header">
                <text class="input-title">原文 ({{ languages[sourceLangIndex]?.name }})</text>
                <view class="input-actions">
                    <text class="action-btn" @click="clearInput">清空</text>
                </view>
            </view>
            <textarea 
                class="input-text" 
                v-model="sourceText" 
                placeholder="请输入要翻译的文字..."
                :placeholder-style="{ color: '#999' }"
                :disabled="isRecording"
            />
        </view>
        
        <view class="voice-section card">
            <view 
                class="record-btn" 
                :class="{ 'recording': isRecording }"
                @touchstart="startRecording"
                @touchend="stopRecording"
            >
                <text class="record-icon">{{ isRecording ? '⏹' : '🎤' }}</text>
                <text class="record-text">{{ isRecording ? '松开停止' : '按住说话' }}</text>
            </view>
            
            <view class="quick-actions">
                <view class="action-item" @click="translateText">
                    <text class="action-icon">🔄</text>
                    <text class="action-label">翻译</text>
                </view>
                <view class="action-item" @click="playSourceAudio">
                    <text class="action-icon">🔊</text>
                    <text class="action-label">播放原文</text>
                </view>
            </view>
        </view>
        
        <view class="output-section card" v-if="translatedText">
            <view class="output-header">
                <text class="output-title">译文 ({{ languages[targetLangIndex]?.name }})</text>
                <view class="output-actions">
                    <text class="action-btn" @click="copyTranslation">复制</text>
                </view>
            </view>
            <view class="output-text">
                <text>{{ translatedText }}</text>
            </view>
            <view class="output-actions-row">
                <view class="output-action" @click="playTranslation">
                    <text class="output-action-icon">🔊</text>
                    <text class="output-action-label">播放译文</text>
                </view>
                <view class="output-action" @click="speakTranslation">
                    <text class="output-action-icon">💬</text>
                    <text class="output-action-label">语音播报</text>
                </view>
            </view>
        </view>
        
        <view class="loading-overlay" v-if="isLoading">
            <view class="loading-content">
                <text class="loading-text">翻译中...</text>
            </view>
        </view>
    </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { 
    translateText as apiTranslateText, 
    getSupportedLanguages,
    LanguageInfo,
    TranslationResponse
} from '@/api/translation'

const languages = ref<LanguageInfo[]>([
    { code: 'zh', name: '中文', voice: 'zh-CN-XiaoxiaoNeural' },
    { code: 'en', name: '英语', voice: 'en-US-JennyNeural' },
    { code: 'ja', name: '日语', voice: 'ja-JP-NanamiNeural' },
    { code: 'ko', name: '韩语', voice: 'ko-KR-SunHiNeural' }
])

const sourceLangIndex = ref(0)
const targetLangIndex = ref(1)
const sourceText = ref('')
const translatedText = ref('')
const isLoading = ref(false)
const isRecording = ref(false)
const recorderManager = uni.getRecorderManager()
const audioContext = ref<UniApp.InnerAudioContext | null>(null)

onMounted(() => {
    loadLanguages()
    initRecorder()
    audioContext.value = uni.createInnerAudioContext()
})

onShow(() => {
    console.log('Translation page shown')
})

const loadLanguages = async () => {
    try {
        const result = await getSupportedLanguages()
        if (result.languages && result.languages.length > 0) {
            languages.value = result.languages
        }
    } catch (error) {
        console.log('Failed to load languages, using default')
    }
}

const initRecorder = () => {
    recorderManager.onStart(() => {
        console.log('Recorder started')
    })
    
    recorderManager.onStop((res) => {
        console.log('Recorder stopped:', res.tempFilePath)
        handleAudioFile(res.tempFilePath)
    })
    
    recorderManager.onError((err) => {
        console.error('Recorder error:', err)
        uni.showToast({
            title: '录音失败',
            icon: 'none'
        })
    })
}

const onSourceLangChange = (e: any) => {
    sourceLangIndex.value = e.detail.value
}

const onTargetLangChange = (e: any) => {
    targetLangIndex.value = e.detail.value
}

const swapLanguages = () => {
    const temp = sourceLangIndex.value
    sourceLangIndex.value = targetLangIndex.value
    targetLangIndex.value = temp
    
    const tempText = sourceText.value
    sourceText.value = translatedText.value
    translatedText.value = tempText
}

const clearInput = () => {
    sourceText.value = ''
    translatedText.value = ''
}

const translateText = async () => {
    if (!sourceText.value.trim()) {
        uni.showToast({
            title: '请输入要翻译的内容',
            icon: 'none'
        })
        return
    }
    
    isLoading.value = true
    
    try {
        const result = await apiTranslateText({
            source_text: sourceText.value,
            source_language: languages.value[sourceLangIndex.value].code,
            target_language: languages.value[targetLangIndex.value].code,
            optimize_business: true
        })
        
        translatedText.value = result.translated_text
        
    } catch (error) {
        console.error('Translation error:', error)
        translatedText.value = `[${languages.value[targetLangIndex.value].code.toUpperCase()}] ${sourceText.value}`
        uni.showToast({
            title: '翻译失败，请稍后重试',
            icon: 'none'
        })
    } finally {
        isLoading.value = false
    }
}

const startRecording = () => {
    if (isLoading.value) return
    
    isRecording.value = true
    
    uni.authorize({
        scope: 'scope.record',
        success: () => {
            recorderManager.start({
                format: 'mp3',
                sampleRate: 16000,
                numberOfChannels: 1,
                encodeBitRate: 96000
            })
        },
        fail: () => {
            uni.showModal({
                title: '提示',
                content: '需要麦克风权限才能进行语音翻译',
                confirmText: '去设置',
                success: (res) => {
                    if (res.confirm) {
                        uni.openSetting()
                    }
                }
            })
            isRecording.value = false
        }
    })
}

const stopRecording = () => {
    if (!isRecording.value) return
    
    isRecording.value = false
    recorderManager.stop()
}

const handleAudioFile = async (filePath: string) => {
    if (!filePath) return
    
    isLoading.value = true
    uni.showLoading({ title: '识别中...' })
    
    try {
        const sourceLang = languages.value[sourceLangIndex.value].code
        const targetLang = languages.value[targetLangIndex.value].code
        
        uni.uploadFile({
            url: 'http://localhost:8000/api/v1/translation/speech',
            filePath: filePath,
            name: 'audio_file',
            formData: {
                source_language: sourceLang,
                target_language: targetLang,
                optimize_business: 'true'
            },
            success: (res) => {
                if (res.statusCode === 200) {
                    try {
                        const data = JSON.parse(res.data)
                        sourceText.value = data.source_text || ''
                        translatedText.value = data.translated_text || ''
                    } catch (e) {
                        console.error('Parse error:', e)
                        translatedText.value = '翻译完成'
                    }
                } else {
                    uni.showToast({
                        title: '识别失败',
                        icon: 'none'
                    })
                }
            },
            fail: (err) => {
                console.error('Upload error:', err)
                uni.showToast({
                    title: '网络连接失败',
                    icon: 'none'
                })
            },
            complete: () => {
                isLoading.value = false
                uni.hideLoading()
            }
        })
    } catch (error) {
        console.error('Handle audio error:', error)
        isLoading.value = false
        uni.hideLoading()
    }
}

const playSourceAudio = () => {
    if (!sourceText.value) return
    speakText(sourceText.value, languages.value[sourceLangIndex.value].code)
}

const playTranslation = () => {
    if (!translatedText.value) return
    speakText(translatedText.value, languages.value[targetLangIndex.value].code)
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

const speakTranslation = () => {
    if (!translatedText.value) return
    
    const innerAudioContext = uni.createInnerAudioContext()
    
    try {
        uni.request({
            url: 'http://localhost:8000/api/v1/tts/synthesize',
            method: 'POST',
            data: {
                text: translatedText.value,
                language: languages.value[targetLangIndex.value].code
            },
            responseType: 'arraybuffer',
            success: (res) => {
                if (res.statusCode === 200) {
                    const base64 = uni.arrayBufferToBase64(res.data as ArrayBuffer)
                    const fs = uni.getFileSystemManager()
                    const filePath = `${uni.env.USER_DATA_PATH}/tts_temp.mp3`
                    
                    fs.writeFile({
                        filePath: filePath,
                        data: base64,
                        encoding: 'base64',
                        success: () => {
                            innerAudioContext.src = filePath
                            innerAudioContext.play()
                        },
                        fail: (err) => {
                            console.error('Write file error:', err)
                        }
                    })
                }
            }
        })
    } catch (error) {
        console.error('TTS error:', error)
    }
}

const copyTranslation = () => {
    if (!translatedText.value) return
    
    uni.setClipboardData({
        data: translatedText.value,
        success: () => {
            uni.showToast({
                title: '已复制',
                icon: 'success'
            })
        }
    })
}
</script>

<style scoped>
.container {
    padding: 20rpx;
    min-height: 100vh;
}

.language-selector {
    margin-bottom: 20rpx;
}

.selector-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.lang-picker {
    padding: 20rpx 40rpx;
    background-color: #F5F7FA;
    border-radius: 12rpx;
    text-align: center;
    min-width: 180rpx;
}

.lang-code {
    font-size: 36rpx;
    font-weight: bold;
    color: #409EFF;
    display: block;
}

.lang-name {
    font-size: 24rpx;
    color: #909399;
    display: block;
    margin-top: 8rpx;
}

.swap-btn {
    width: 80rpx;
    height: 80rpx;
    background-color: #409EFF;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.swap-icon {
    font-size: 36rpx;
    color: #FFFFFF;
}

.input-section {
    margin-bottom: 20rpx;
}

.input-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
}

.input-title {
    font-size: 30rpx;
    font-weight: bold;
    color: #333333;
}

.input-actions {
    display: flex;
}

.action-btn {
    font-size: 26rpx;
    color: #409EFF;
    padding: 8rpx 16rpx;
}

.input-text {
    width: 100%;
    min-height: 200rpx;
    font-size: 32rpx;
    line-height: 1.6;
    color: #333333;
    background-color: #FAFAFA;
    border-radius: 8rpx;
    padding: 20rpx;
}

.voice-section {
    margin-bottom: 20rpx;
}

.record-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40rpx;
    background-color: #409EFF;
    border-radius: 100rpx;
    margin-bottom: 30rpx;
}

.record-btn.recording {
    background-color: #F56C6C;
    animation: pulse 1s infinite;
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
}

.record-icon {
    font-size: 60rpx;
    margin-bottom: 10rpx;
}

.record-text {
    font-size: 28rpx;
    color: #FFFFFF;
}

.quick-actions {
    display: flex;
    justify-content: space-around;
}

.action-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20rpx;
}

.action-icon {
    font-size: 48rpx;
    margin-bottom: 10rpx;
}

.action-label {
    font-size: 26rpx;
    color: #606266;
}

.output-section {
    margin-bottom: 20rpx;
}

.output-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
}

.output-title {
    font-size: 30rpx;
    font-weight: bold;
    color: #67C23A;
}

.output-text {
    font-size: 32rpx;
    line-height: 1.8;
    color: #333333;
    background-color: #F0F9EB;
    border-radius: 8rpx;
    padding: 20rpx;
    margin-bottom: 20rpx;
}

.output-actions-row {
    display: flex;
    justify-content: space-around;
}

.output-action {
    display: flex;
    align-items: center;
    padding: 16rpx 32rpx;
    background-color: #F5F7FA;
    border-radius: 8rpx;
}

.output-action-icon {
    font-size: 32rpx;
    margin-right: 10rpx;
}

.output-action-label {
    font-size: 26rpx;
    color: #606266;
}

.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.loading-content {
    background-color: #FFFFFF;
    padding: 40rpx 60rpx;
    border-radius: 16rpx;
    text-align: center;
}

.loading-text {
    font-size: 28rpx;
    color: #606266;
}
</style>
