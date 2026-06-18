<script setup lang="ts">
import { ref } from 'vue';
import { api } from '@/api/client';
import { AlertTriangle, FileText, Download, Copy, CheckCircle, RefreshCw, Camera, Info } from 'lucide-vue-next';
import html2canvas from 'html2canvas';
import type { ReportLetter, VerifyResponse, LabelCheckResponse, SeedInfo } from '../../shared/types';

const qrInput = ref('');
const isGenerating = ref(false);
const reportLetter = ref<ReportLetter | null>(null);
const copied = ref(false);
const screenshotUrl = ref<string | null>(null);
const reportContainer = ref<HTMLDivElement | null>(null);

const mockVerifyResult = ref<VerifyResponse>({
  success: true,
  message: '未查询到备案信息，谨防假冒',
  isRegistered: false
});

const mockLabelResult = ref<LabelCheckResponse | null>(null);

const seedInfo = ref<Partial<SeedInfo>>({});

async function handleGenerate() {
  if (!qrInput.value.trim()) return;
  
  isGenerating.value = true;
  try {
    reportLetter.value = await api.generateReport({
      qrContent: qrInput.value.trim(),
      verifyResult: mockVerifyResult.value,
      labelCheckResult: mockLabelResult.value,
      seedInfo: seedInfo.value
    });
  } catch (e) {
    reportLetter.value = {
      title: '生成失败',
      content: '举报信生成失败，请稍后重试',
      timestamp: new Date().toISOString(),
      evidence: []
    };
  } finally {
    isGenerating.value = false;
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
  } catch (e) {
    console.error('Screenshot error:', e);
  }
}

async function handleCopy() {
  if (!reportLetter.value) return;
  try {
    await navigator.clipboard.writeText(reportLetter.value.content);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (e) {
    console.error('Copy error:', e);
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
  }
}

function handleReset() {
  qrInput.value = '';
  reportLetter.value = null;
  screenshotUrl.value = null;
}

function loadExample() {
  qrInput.value = 'fake-seed-999';
}
</script>

<template>
  <div class="space-y-4">
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

        <button
          @click="loadExample"
          class="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <Info class="w-5 h-5" />
          加载示例数据（fake-seed-999）
        </button>

        <button
          @click="handleGenerate"
          :disabled="!qrInput.trim() || isGenerating"
          class="w-full bg-gradient-to-r from-red-500 to-rose-500 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:from-red-600 hover:to-rose-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <RefreshCw v-if="isGenerating" class="w-5 h-5 animate-spin" />
          <FileText v-else class="w-5 h-5" />
          {{ isGenerating ? '生成中...' : '生成举报信' }}
        </button>
      </div>
    </div>

    <div v-if="reportLetter" class="space-y-4">
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
