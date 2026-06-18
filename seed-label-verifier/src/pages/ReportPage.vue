<script setup lang="ts">
import { ref } from 'vue';
import { api } from '@/api/client';
import { useVerifyCache } from '@/composables/useVerifyCache';
import { AlertTriangle, FileText, Download, Copy, CheckCircle, RefreshCw, Camera, Info, XCircle } from 'lucide-vue-next';
import html2canvas from 'html2canvas';
import type { ReportLetter, VerifyResponse, LabelCheckResponse, SeedInfo } from '../../shared/types';

const { getCachedResult, setCachedResult } = useVerifyCache();

const qrInput = ref('');
const isGenerating = ref(false);
const reportLetter = ref<ReportLetter | null>(null);
const copied = ref(false);
const screenshotUrl = ref<string | null>(null);
const reportContainer = ref<HTMLDivElement | null>(null);
const toastMessage = ref('');
const toastType = ref<'success' | 'error' | 'warning'>('success');
const showToast = ref(false);
const isVerifying = ref(false);
const usingCached = ref(false);

const currentVerifyResult = ref<VerifyResponse | null>(null);
const currentLabelResult = ref<LabelCheckResponse | null>(null);
const currentSeedInfo = ref<Partial<SeedInfo>>({});

function displayToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
  toastMessage.value = message;
  toastType.value = type;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 4000);
}

async function fallbackCopy(text: string): Promise<boolean> {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (e) {
    console.error('Fallback copy error:', e);
    return false;
  }
}

async function ensureVerified(qrContent: string): Promise<{
  verifyResult: VerifyResponse;
  labelCheckResult?: LabelCheckResponse;
  seedInfo?: Partial<SeedInfo>;
}> {
  const trimmedQr = qrContent.trim();
  
  const cached = getCachedResult(trimmedQr);
  if (cached) {
    usingCached.value = true;
    return {
      verifyResult: cached.verifyResult,
      labelCheckResult: cached.labelCheckResult,
      seedInfo: cached.seedInfo
    };
  }
  
  usingCached.value = false;
  isVerifying.value = true;
  
  const verifyResult = await api.verifySeed({ qrContent: trimmedQr });
  
  let labelCheckResult: LabelCheckResponse | undefined;
  let seedInfo: Partial<SeedInfo> | undefined;
  
  if (verifyResult.seed) {
    seedInfo = { ...verifyResult.seed };
    try {
      labelCheckResult = await api.checkLabel({ qrContent: trimmedQr });
    } catch (e) {
      console.error('Label check error:', e);
    }
  }
  
  setCachedResult(trimmedQr, verifyResult, labelCheckResult, seedInfo);
  
  return { verifyResult, labelCheckResult, seedInfo };
}

async function handleGenerate() {
  if (!qrInput.value.trim()) return;
  
  isGenerating.value = true;
  try {
    const { verifyResult, labelCheckResult, seedInfo } = await ensureVerified(qrInput.value);
    
    currentVerifyResult.value = verifyResult;
    currentLabelResult.value = labelCheckResult;
    currentSeedInfo.value = seedInfo || {};
    
    reportLetter.value = await api.generateReport({
      qrContent: qrInput.value.trim(),
      verifyResult,
      labelCheckResult,
      seedInfo
    });
    
    displayToast('举报信生成成功', 'success');
  } catch (e) {
    reportLetter.value = {
      title: '生成失败',
      content: '举报信生成失败，请稍后重试',
      timestamp: new Date().toISOString(),
      evidence: []
    };
    displayToast('举报信生成失败，请稍后重试', 'error');
  } finally {
    isGenerating.value = false;
    isVerifying.value = false;
  }
}

async function handleScreenshot() {
  if (!reportContainer.value) return;
  
  try {
    const canvas = await html2canvas(reportContainer.value, {
      backgroundColor: '#ffffff',
      scale: 2
    });
    screenshotUrl.value = canvas.toDataURL('image/png');
    displayToast('证据截图生成成功', 'success');
  } catch (e) {
    console.error('Screenshot error:', e);
    displayToast('截图生成失败，请手动截图保存', 'error');
  }
}

async function handleCopy() {
  if (!reportLetter.value) return;
  
  try {
    await navigator.clipboard.writeText(reportLetter.value.content);
    copied.value = true;
    displayToast('内容已复制到剪贴板', 'success');
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (e) {
    console.error('Clipboard copy error:', e);
    
    const fallbackSuccess = await fallbackCopy(reportLetter.value.content);
    if (fallbackSuccess) {
      copied.value = true;
      displayToast('内容已复制到剪贴板（兼容模式）', 'success');
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    } else {
      displayToast('复制失败：浏览器不支持剪贴板操作，请手动选中内容复制', 'warning');
    }
  }
}

function handleDownload() {
  if (reportLetter.value) {
    const blob = new Blob([reportLetter.value.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportLetter.value.title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9-]/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    displayToast('举报信已下载', 'success');
  }
}

function handleDownloadScreenshot() {
  if (screenshotUrl.value) {
    const a = document.createElement('a');
    a.href = screenshotUrl.value;
    a.download = '证据截图.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    displayToast('证据截图已下载', 'success');
  }
}

function handleReset() {
  qrInput.value = '';
  reportLetter.value = null;
  screenshotUrl.value = null;
  currentVerifyResult.value = null;
  currentLabelResult.value = null;
  currentSeedInfo.value = {};
  usingCached.value = false;
}

function loadExample() {
  qrInput.value = 'fake-seed-999';
}

function loadBlacklistExample() {
  qrInput.value = 'blacklist-seed-001';
}
</script>

<template>
  <div class="space-y-4 relative">
    <transition name="toast">
      <div
        v-if="showToast"
        class="fixed top-4 left-4 right-4 z-50 px-5 py-4 rounded-xl shadow-lg flex items-center gap-3"
        :class="{
          'bg-green-500 text-white': toastType === 'success',
          'bg-red-500 text-white': toastType === 'error',
          'bg-amber-500 text-white': toastType === 'warning'
        }"
      >
        <CheckCircle v-if="toastType === 'success'" class="w-5 h-5 flex-shrink-0" />
        <XCircle v-else-if="toastType === 'error'" class="w-5 h-5 flex-shrink-0" />
        <AlertTriangle v-else class="w-5 h-5 flex-shrink-0" />
        <span class="font-medium">{{ toastMessage }}</span>
      </div>
    </transition>

    <div class="bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl p-6 text-white shadow-lg">
      <h2 class="text-lg font-bold mb-2">📝 举报取证</h2>
      <p class="text-red-100 text-sm">生成举报信模板，打包截图证据，维护合法权益</p>
    </div>

    <div v-if="!reportLetter" class="space-y-4">
      <div class="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 space-y-4">
        <label class="block text-sm font-medium text-gray-700 flex items-center gap-2">
          <FileText class="w-5 h-5 text-red-500" />
          输入二维码内容生成举报信
        </label>
        <input
          v-model="qrInput"
          type="text"
          placeholder="请输入或粘贴二维码内容"
          class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none transition-colors text-lg"
        />
        
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div class="flex items-start gap-3">
            <AlertTriangle class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p class="text-amber-800 font-medium text-sm">举报须知</p>
              <p class="text-amber-700 text-xs mt-1">本工具生成的举报信仅供参考，正式举报请向当地农业农村主管部门提交，并配合提供实物证据。</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <button
            @click="loadExample"
            class="bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Info class="w-4 h-4" />
            未备案示例
          </button>
          <button
            @click="loadBlacklistExample"
            class="bg-red-100 text-red-700 py-3 px-4 rounded-xl font-medium hover:bg-red-200 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <AlertTriangle class="w-4 h-4" />
            黑名单企业示例
          </button>
        </div>

        <button
          @click="handleGenerate"
          :disabled="!qrInput.trim() || isGenerating"
          class="w-full bg-gradient-to-r from-red-500 to-rose-500 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:from-red-600 hover:to-rose-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <RefreshCw v-if="isGenerating || isVerifying" class="w-5 h-5 animate-spin" />
          <FileText v-else class="w-5 h-5" />
          {{ isVerifying ? '正在核验种子信息...' : isGenerating ? '生成中...' : '生成举报信' }}
        </button>
      </div>
    </div>

    <div v-if="reportLetter" class="space-y-4">
      <div v-if="usingCached" class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <Info class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p class="text-blue-800 font-medium text-sm">使用缓存核验结果</p>
            <p class="text-blue-600 text-xs mt-1">系统检测到该二维码最近已核验，自动复用核验结果。如需重新核验，请点击"重新生成"。</p>
          </div>
        </div>
      </div>

      <div v-if="currentVerifyResult && !currentVerifyResult.isRegistered" class="bg-red-50 border border-red-200 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <AlertTriangle class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p class="text-red-800 font-medium text-sm">未查询到备案信息</p>
            <p class="text-red-600 text-xs mt-1">该种子未在农业农村部门备案系统中查询到信息，请谨慎购买。</p>
          </div>
        </div>
      </div>

      <div ref="reportContainer" class="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div class="border-b border-dashed border-gray-300 rounded-xl p-6 bg-gray-50">
          <pre class="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">{{ reportLetter.content }}</pre>
        </div>
      </div>

      <div v-if="reportLetter.evidence.length > 0" class="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
        <h4 class="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Camera class="w-5 h-5 text-red-500" />
          证据清单
        </h4>
        <ul class="space-y-2">
          <li
            v-for="(item, index) in reportLetter.evidence"
            :key="index"
            class="text-gray-700 text-sm flex items-center gap-2"
          >
            <span class="text-gray-400">•</span>
            <span>{{ item }}</span>
          </li>
        </ul>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <button
          @click="handleCopy"
          class="bg-blue-500 text-white py-3 px-4 rounded-xl font-bold hover:bg-blue-600 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <CheckCircle v-if="copied" class="w-5 h-5" />
          <Copy v-else class="w-5 h-5" />
          {{ copied ? '已复制' : '复制内容' }}
        </button>
        <button
          @click="handleDownload"
          class="bg-green-500 text-white py-3 px-4 rounded-xl font-bold hover:bg-green-600 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Download class="w-5 h-5" />
          下载举报信
        </button>
      </div>

      <button
        v-if="!screenshotUrl"
        @click="handleScreenshot"
        class="w-full bg-purple-500 text-white py-3 px-4 rounded-xl font-bold hover:bg-purple-600 transition-all duration-200 flex items-center justify-center gap-2"
      >
        <Camera class="w-5 h-5" />
        生成证据截图
      </button>

      <div v-if="screenshotUrl" class="space-y-3">
        <div class="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
          <img :src="screenshotUrl" alt="证据截图" class="w-full rounded-xl" />
        </div>
        <button
          @click="handleDownloadScreenshot"
          class="w-full bg-purple-500 text-white py-3 px-4 rounded-xl font-bold hover:bg-purple-600 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Download class="w-5 h-5" />
          下载证据截图
        </button>
      </div>

      <button
        @click="handleReset"
        class="w-full bg-gray-100 text-gray-700 py-4 px-4 rounded-xl font-bold hover:bg-gray-200 transition-all duration-200 flex items-center justify-center gap-2"
      >
        <RefreshCw class="w-5 h-5" />
        重新生成
      </button>
    </div>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
