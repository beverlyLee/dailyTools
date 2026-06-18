<script setup lang="ts">
import { ref, computed } from 'vue';
import { api } from '@/api/client';
import { FileCheck, Search, CheckCircle, XCircle, AlertTriangle, RefreshCw, Info } from 'lucide-vue-next';
import type { LabelCheckResponse, LabelCheckItem } from '../../shared/types';

const qrInput = ref('');
const isChecking = ref(false);
const checkResult = ref<LabelCheckResponse | null>(null);

async function handleCheck() {
  if (!qrInput.value.trim()) return;
  
  isChecking.value = true;
  try {
    checkResult.value = await api.checkLabel({ qrContent: qrInput.value.trim() });
  } catch (e) {
    checkResult.value = {
      compliant: false,
      checks: [],
      missingFields: [],
      suggestions: ['审查失败，请稍后重试']
    };
  } finally {
    isChecking.value = false;
  }
}

function handleReset() {
  qrInput.value = '';
  checkResult.value = null;
}

const compliancePercentage = computed(() => {
  if (!checkResult.value) return 0;
  const requiredChecks = checkResult.value.checks.filter(c => c.required);
  if (requiredChecks.length === 0) return 100;
  const passed = requiredChecks.filter(c => c.present).length;
  return Math.round((passed / requiredChecks.length) * 100);
});

function getCheckIcon(item: LabelCheckItem) {
  if (!item.required) return item.present ? CheckCircle : Info;
  return item.present ? CheckCircle : XCircle;
}

function getCheckClass(item: LabelCheckItem) {
  if (!item.required) return 'text-gray-500 bg-gray-50';
  return item.present ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
}
</script>

<template>
  <div class="space-y-4">
    <div class="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-6 text-white shadow-lg">
      <h2 class="text-lg font-bold mb-2">📋 标签合规性审查</h2>
      <p class="text-blue-100 text-sm">依据GB 20464-2006《农作物种子标签通则》自动检查标签完整性</p>
    </div>

    <div v-if="!checkResult" class="space-y-4">
      <div class="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 space-y-4">
        <label class="block text-sm font-medium text-gray-700 flex items-center gap-2">
          <FileCheck class="w-5 h-5 text-blue-500" />
          输入二维码内容进行审查
        </label>
        <input
          v-model="qrInput"
          type="text"
          placeholder="请输入或粘贴二维码内容"
          class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
        />
        <button
          @click="handleCheck"
          :disabled="!qrInput.trim() || isChecking"
          class="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <RefreshCw v-if="isChecking" class="w-5 h-5 animate-spin" />
          <Search v-else class="w-5 h-5" />
          {{ isChecking ? '审查中...' : '开始审查' }}
        </button>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <Info class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p class="text-blue-800 font-medium text-sm">GB 20464-2006 标准要求</p>
            <p class="text-blue-700 text-xs mt-1">种子标签必须标注：审定编号、生产年月、净含量、警示标志、种子名称、作物种类、生产企业等信息。</p>
          </div>
        </div>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <AlertTriangle class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p class="text-amber-800 font-medium text-sm">示例测试数据</p>
            <p class="text-amber-700 text-xs mt-1">• 合规标签：valid-seed-001</p>
            <p class="text-amber-700 text-xs mt-1">• 缺失信息：fake-seed-999（无备案信息）</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="checkResult" class="space-y-4">
      <div
        class="rounded-2xl p-6 shadow-lg"
        :class="[
          checkResult.compliant
            ? 'bg-gradient-to-br from-green-500 to-emerald-600'
            : 'bg-gradient-to-br from-amber-500 to-orange-600'
        ]"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-xl font-bold text-white">
              {{ checkResult.compliant ? '✅ 标签合规' : '⚠️ 标签不合规' }}
            </h3>
            <p class="text-white/90 text-sm mt-1">
              {{ checkResult.compliant ? '标签信息完整，符合国家标准' : '存在缺失信息，请补充完善' }}
            </p>
          </div>
          <div class="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
            <span class="text-3xl font-bold text-white">{{ compliancePercentage }}%</span>
          </div>
        </div>
        <div class="mt-4 bg-white/20 rounded-full h-3 overflow-hidden">
          <div
            class="h-full bg-white transition-all duration-500"
            :style="{ width: compliancePercentage + '%' }"
          />
        </div>
      </div>

      <div class="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 space-y-3">
        <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
          <FileCheck class="w-5 h-5 text-blue-500" />
          检查项目明细
        </h3>
        
        <div
          v-for="(item, index) in checkResult.checks"
          :key="index"
          class="flex items-center justify-between p-4 rounded-xl transition-all duration-200"
          :class="getCheckClass(item)"
        >
          <div class="flex items-center gap-3">
            <component :is="getCheckIcon(item)" class="w-5 h-5" />
            <div>
              <p class="font-medium">{{ item.name }}</p>
              <p v-if="item.value" class="text-sm opacity-70">{{ item.value }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs px-2 py-1 rounded-full" :class="item.required ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'">
              {{ item.required ? '必填' : '选填' }}
            </span>
            <span class="text-sm font-medium">
              {{ item.present ? '✓' : '✗' }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="checkResult.missingFields.length > 0" class="bg-red-50 border border-red-200 rounded-2xl p-5">
        <h4 class="font-bold text-red-800 mb-3 flex items-center gap-2">
          <XCircle class="w-5 h-5" />
          缺失的必填信息
        </h4>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="field in checkResult.missingFields"
            :key="field"
            class="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium"
          >
            {{ field }}
          </span>
        </div>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h4 class="font-bold text-blue-800 mb-3 flex items-center gap-2">
          <Info class="w-5 h-5" />
          审查建议
        </h4>
        <ul class="space-y-2">
          <li
            v-for="(suggestion, index) in checkResult.suggestions"
            :key="index"
            class="text-blue-700 text-sm flex items-start gap-2"
          >
            <span class="text-blue-500 font-bold">{{ index + 1 }}.</span>
            <span>{{ suggestion }}</span>
          </li>
        </ul>
      </div>

      <button
        @click="handleReset"
        class="w-full bg-gray-100 text-gray-700 py-4 px-4 rounded-xl font-bold hover:bg-gray-200 transition-all duration-200 flex items-center justify-center gap-2"
      >
        <RefreshCw class="w-5 h-5" />
        重新审查
      </button>
    </div>
  </div>
</template>
