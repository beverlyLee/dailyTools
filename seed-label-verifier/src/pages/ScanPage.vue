<script setup lang="ts">
import { ref, watch } from 'vue';
import { useQrScanner } from '@/composables/useQrScanner';
import { api } from '@/api/client';
import { Camera, CameraOff, RefreshCw, Search, CheckCircle, XCircle, AlertTriangle, Package, Factory, Calendar, Scale, Shield } from 'lucide-vue-next';
import type { VerifyResponse, SeedInfo } from '../../shared/types';

const videoRef = ref<HTMLVideoElement | null>(null);
const manualInput = ref('');
const isVerifying = ref(false);
const verifyResult = ref<VerifyResponse | null>(null);
const showManualInput = ref(false);

const { scanning, scannedResult, error, startScan, stopScan, clearResult } = useQrScanner();

watch(scannedResult, async (result) => {
  if (result) {
    await verifySeed(result);
  }
});

async function handleStartScan() {
  if (videoRef.value) {
    verifyResult.value = null;
    await startScan(videoRef.value);
  }
}

function handleStopScan() {
  stopScan();
}

function handleReset() {
  stopScan();
  clearResult();
  verifyResult.value = null;
  manualInput.value = '';
  showManualInput.value = false;
}

async function verifySeed(qrContent: string) {
  if (!qrContent.trim()) return;
  
  isVerifying.value = true;
  try {
    verifyResult.value = await api.verifySeed({ qrContent: qrContent.trim() });
  } catch (e) {
    verifyResult.value = {
      success: false,
      message: '验证失败，请稍后重试',
      isRegistered: false
    };
  } finally {
    isVerifying.value = false;
  }
}

async function handleManualVerify() {
  await verifySeed(manualInput.value);
}

function isWarningResult(): boolean {
  return verifyResult.value !== null && !verifyResult.value.isRegistered;
}

function isBlacklistedResult(): boolean {
  return verifyResult.value?.message.includes('黑名单') || false;
}
</script>

<template>
  <div class="space-y-4">
    <div class="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
      <h2 class="text-lg font-bold mb-2">📱 扫码核验</h2>
      <p class="text-green-100 text-sm">扫描种子包装袋二维码，快速验证备案信息真伪</p>
    </div>

    <div v-if="!scanning && !verifyResult" class="space-y-4">
      <div class="relative bg-gray-900 rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
        <div class="text-center text-gray-400 p-8">
          <Camera class="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p class="text-lg">点击下方按钮开始扫描</p>
          <p class="text-sm mt-2">请将二维码对准扫描框</p>
        </div>
      </div>

      <button
        @click="handleStartScan"
        class="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 active:scale-98 flex items-center justify-center gap-2"
      >
        <Camera class="w-6 h-6" />
        开始扫码
      </button>

      <button
        @click="showManualInput = !showManualInput"
        class="w-full bg-white border-2 border-gray-200 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2"
      >
        <Search class="w-5 h-5" />
        手动输入二维码内容
      </button>

      <div v-if="showManualInput" class="bg-white rounded-xl p-4 shadow-md border border-gray-100 space-y-3 animate-fadeIn">
        <label class="block text-sm font-medium text-gray-700">输入二维码内容</label>
        <input
          v-model="manualInput"
          type="text"
          placeholder="请输入或粘贴二维码内容"
          class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none transition-colors"
        />
        <button
          @click="handleManualVerify"
          :disabled="!manualInput.trim() || isVerifying"
          class="w-full bg-green-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <RefreshCw v-if="isVerifying" class="w-5 h-5 animate-spin" />
          <Search v-else class="w-5 h-5" />
          {{ isVerifying ? '验证中...' : '查询验证' }}
        </button>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <AlertTriangle class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p class="text-amber-800 font-medium text-sm">示例测试数据</p>
            <p class="text-amber-700 text-xs mt-1">• 合法备案：valid-seed-001</p>
            <p class="text-amber-700 text-xs">• 未备案测试：fake-seed-999</p>
            <p class="text-amber-700 text-xs">• 黑名单企业：valid-seed-002 (M002)</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="scanning" class="space-y-4">
      <div class="relative bg-gray-900 rounded-2xl overflow-hidden aspect-square">
        <video
          ref="videoRef"
          class="w-full h-full object-cover"
          playsinline
          muted
        />
        <div class="absolute inset-0 pointer-events-none">
          <div class="absolute inset-0 border-[3px] border-transparent">
            <div class="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-green-400 rounded-tl-xl" />
            <div class="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-green-400 rounded-tr-xl" />
            <div class="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-green-400 rounded-bl-xl" />
            <div class="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-green-400 rounded-br-xl" />
          </div>
          <div class="absolute inset-x-8 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-scan" />
        </div>
        <div class="absolute bottom-4 left-0 right-0 text-center">
          <span class="bg-black/50 text-white px-4 py-2 rounded-full text-sm">
            正在扫描二维码...
          </span>
        </div>
      </div>

      <div v-if="error" class="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
        {{ error }}
      </div>

      <button
        @click="handleStopScan"
        class="w-full bg-red-500 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:bg-red-600 transition-all duration-200 flex items-center justify-center gap-2"
      >
        <CameraOff class="w-6 h-6" />
        停止扫描
      </button>
    </div>

    <div v-if="verifyResult" class="space-y-4">
      <div
        class="rounded-2xl p-6 shadow-lg transition-all duration-500"
        :class="[
          isWarningResult() || isBlacklistedResult()
            ? 'bg-gradient-to-br from-red-500 to-rose-600 animate-shake'
            : 'bg-gradient-to-br from-green-500 to-emerald-600'
        ]"
      >
        <div class="flex items-center gap-4 mb-4">
          <div
            class="w-16 h-16 rounded-full flex items-center justify-center"
            :class="[
              isWarningResult() || isBlacklistedResult()
                ? 'bg-white/20'
                : 'bg-white/20'
            ]"
          >
            <XCircle v-if="isWarningResult()" class="w-10 h-10 text-white" />
            <AlertTriangle v-else-if="isBlacklistedResult()" class="w-10 h-10 text-white" />
            <CheckCircle v-else class="w-10 h-10 text-white" />
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-bold text-white">
              {{ isWarningResult() ? '⚠️ 风险警示' : isBlacklistedResult() ? '🚫 黑名单企业' : '✅ 验证通过' }}
            </h3>
            <p class="text-white/90 text-sm mt-1">{{ verifyResult.message }}</p>
          </div>
        </div>

        <div v-if="isWarningResult()" class="bg-white/20 backdrop-blur rounded-xl p-4">
          <p class="text-white font-bold text-lg">未查询到备案信息，谨防假冒</p>
          <p class="text-white/80 text-sm mt-2">该二维码未在农业农村部门备案系统中查询到相关信息，请谨慎购买。建议向当地农业农村主管部门举报。</p>
        </div>
      </div>

      <div v-if="verifyResult.seed" class="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 space-y-4">
        <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Package class="w-5 h-5 text-green-500" />
          种子详情
        </h3>
        
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-green-50 rounded-xl p-3">
            <p class="text-xs text-gray-500 mb-1">种子名称</p>
            <p class="font-bold text-gray-800">{{ verifyResult.seed.seedName }}</p>
          </div>
          <div class="bg-green-50 rounded-xl p-3">
            <p class="text-xs text-gray-500 mb-1">作物种类</p>
            <p class="font-bold text-gray-800">{{ verifyResult.seed.cropType }}</p>
          </div>
          <div class="bg-green-50 rounded-xl p-3">
            <p class="text-xs text-gray-500 mb-1">品种</p>
            <p class="font-bold text-gray-800">{{ verifyResult.seed.variety }}</p>
          </div>
          <div class="bg-green-50 rounded-xl p-3">
            <p class="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Shield class="w-3 h-3" />
              审定编号
            </p>
            <p class="font-bold text-gray-800 text-sm">{{ verifyResult.seed.registrationNumber }}</p>
          </div>
          <div class="bg-green-50 rounded-xl p-3">
            <p class="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Calendar class="w-3 h-3" />
              生产年月
            </p>
            <p class="font-bold text-gray-800">{{ verifyResult.seed.productionDate }}</p>
          </div>
          <div class="bg-green-50 rounded-xl p-3">
            <p class="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Scale class="w-3 h-3" />
              净含量
            </p>
            <p class="font-bold text-gray-800">{{ verifyResult.seed.netContent }}</p>
          </div>
        </div>

        <div class="border-t border-gray-100 pt-4 space-y-3">
          <div class="flex items-start gap-3">
            <Factory class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p class="text-xs text-gray-500">生产企业</p>
              <p class="font-medium text-gray-800">{{ verifyResult.seed.manufacturer }}</p>
              <p class="text-xs text-gray-500 mt-1">企业编号：{{ verifyResult.seed.manufacturerId }}</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <Shield class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p class="text-xs text-gray-500">质量标准</p>
              <p class="font-medium text-gray-800">{{ verifyResult.seed.quality }}</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <AlertTriangle class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p class="text-xs text-gray-500">警示说明</p>
              <p class="font-medium text-gray-800">{{ verifyResult.seed.warning }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="flex gap-3">
        <button
          @click="handleReset"
          class="flex-1 bg-gray-100 text-gray-700 py-4 px-4 rounded-xl font-bold hover:bg-gray-200 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <RefreshCw class="w-5 h-5" />
          重新扫描
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes scan {
  0%, 100% { transform: translateY(-100%); opacity: 0; }
  50% { transform: translateY(0); opacity: 1; }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-scan {
  animation: scan 2s ease-in-out infinite;
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

.active\:scale-98:active {
  transform: scale(0.98);
}
</style>
